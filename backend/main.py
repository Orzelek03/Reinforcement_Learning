from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from collections import deque
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import random
 
# PYDANTIC SCHEMAS -> DANE

class StatePayload(BaseModel):
    accuracy: float
    step_count: int

class RLStepPayload(BaseModel):
    session_id: str
    game_id: str
    state: StatePayload
    reward: float #Nagroda 

class ActionModifier(BaseModel):
    difficulty_modifier_1:float
    difficulty_modifier_2:float
class RLActionResponse(BaseModel):
    action: ActionModifier


#Sieć neuronowa
class DDANetwork(nn.Module):
    def __init__(self,input_dim=2, output_dim=5):
        super(DDANetwork, self).__init__()
        #MLP
        self.net = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 64),
            nn.ReLU(),
            nn.Linear(64, output_dim) #wartości q dla 5 akcji
        )

    def forward(self,x):
        return self.net(x)

#Q-Learning

class DQNAgent:
    def __init__(self):
        self.state_dim = 2 #znormalizowany czas
        self.action_dim = 5 #dyskretyzacja poziomów trudności

        self.device = torch.device("cuda" if torch.cuda.is_available()else "cpu")
        self.model = DDANetwork(self.state_dim, self.action_dim).to(self.device)
        self.optimizer = optim.Adam(self.model.parameters(), lr=0.001)
        self.criterion = nn.MSELoss()

        #Pamięć do przełamywania korelacji

        self.memory = deque(maxlen=2000)

        #hiperparametry
        self.gamma = 0.95 #Dyskontowanie gamma
        self.epsilon = 1.0 #Losowość akcji na początku
        self.epsilon_min = 0.1 #Minimalna eksploracja
        self.epsilon_decay = 0.995 #Szybkość wygaszania eksploracji

    def get_action(self, state_vector):
            if np.random.rand() <= self.epsilon:
                return random.randrange(self.action_dim)

            state_tensor = torch.FloatTensor(state_vector).unsqueeze(0).to(self.device)
            with torch.no_grad():
                q_values = self.model(state_tensor)
            return torch.argmax(q_values[0]).item()
        
    def remember(self, state, action, reward, next_state):
            self.memory.append((state,action,reward, next_state))

    def train_step(self, batch_size =32):
            if len(self.memory)< batch_size:
                return #oczekiwanie na odpowiednią ilość danych

            minibatch = random.sample(self.memory, batch_size)
            states = torch.FloatTensor(np.array([m[0] for m in minibatch])).to(self.device)
            actions = torch.LongTensor(np.array([m[1] for m in minibatch])).to(self.device)
            rewards = torch.FloatTensor(np.array([m[2] for m in minibatch])).to(self.device)
            next_states = torch.FloatTensor(np.array([m[3] for m in minibatch])).to(self.device)

            #Równanie Bellmana -> Obliczanie wartości Q

            current_q_values = self.model(states).gather(1, actions.unsqueeze(1)).squeeze(1)
            with torch.no_grad():
                max_next_q_values = self.model(next_states).max(1)[0]
                target_q_values = rewards + (self.gamma * max_next_q_values)

            #Propagacja wsteczna
            loss = self.criterion(current_q_values, target_q_values)
            self.optimizer.zero_grad()
            loss.backward()
            self.optimizer.step()

            #Zmniejszanie eksploracji
            if self.epsilon > self.epsilon_min:
                self.epsilon *= self.epsilon_decay

        #Konfiguracja FastAPI i Stanu

app = FastAPI(title="DDA RL Engine")

#Cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = DQNAgent()
active_sessions ={} #Przechowanie poprzedniego stanu

#Mapowanie akcji agenta na mnożniki -> Zmiana trudnośći
ACTION_SPACE ={
    0: (0.85, 0.85), #Największe utrudnienie
    1: (0.95,0.95),
    2: (1.00, 1.00), #Bez zmian 
    3: (1.05, 1.05),
    4: (1.15, 1.15) #Największe ułatwienie
}

@app.post("/api/rl-step", response_model=RLActionResponse)
async def rl_step(payload: RLStepPayload):
    session = payload.session_id

    #Normalizacja stanu, dzielenie przez 60

    current_state = np.array([
        payload.state.accuracy,
        min(payload.state.step_count/ 60.0 , 1.0)
    ])

    #Obliczanie nagrody. Założenie -> gracz ma mieć ok 75% celności
    target_accuracy = 0.75
    flow_reward = 1.0 - (abs(payload.state.accuracy - target_accuracy) * 3)

    #Nauka jeśli sesja trwa
    if session in active_sessions:
        prev_state = active_sessions[session]['state']
        prev_action = active_sessions[session]['action']

        #Zapis w pamięci epizodycznej
        agent.remember(prev_state, prev_action, flow_reward, current_state)

        #Krok treningowy na danych z pamięci
        agent.train_step()
    
    #Decyzja na podstawie stanu
    action_idx = agent.get_action(current_state)

    #Zapis stanu w sesji
    active_sessions[session] = {
        'state': current_state,
        'action': action_idx
    }

    #Tłumaczenie dezycji sieci na wartości w React
    mod_size, mod_time = ACTION_SPACE[action_idx]

    return RLActionResponse(
        action = ActionModifier(
            difficulty_modifier_1 = mod_size,
            difficulty_modifier_2 = mod_time
        )
    )

