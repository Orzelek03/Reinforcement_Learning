import { act, useState } from "react";
import AimTrainer from './components/AimTrainer'

function App() {
  const [difficulty, setDifficulty] = useState<number>(1);
  const [activegame, setActivegame] = useState<string | null>(null);
  const [agentStatus, setagentStatus] = useState<string>(
    "Oczekuje na akcję gracza...",
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-700 text-slate-100 font-san">
      <header className="bg-slate-900 px-6 py-4 border-b border-slate-900 items-center shadow-xl">
        <div className="w-full text-center ">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 min-h-[9vh] font-bitcount">
            Reinforcement-Learning Engine
          </h1>
          <h2 className="text-2xl pt-4 text-transparent bg-gradient-to-r bg-clip-text from-blue-400 via-emerald-400 to-blue-400 min-h-[4vh] font-anta">
            Auto-Adaptation Engine for Difficulty
          </h2>
        </div>
      </header>

      <main className="flex-1 min-h-[60vh] flex flex-row gap-5 items-center justify-center p-5">
        {/* Left column for games */}

        <div className="main-side-div flex-col gap-10 shrink-0  justify-center  ">
          <div className="text-center flex flex-col min-h-[5vh] gap-3 text-lg ">
            <h2 className="font-anta text-xl uppercase tracking-wider text-green-600/90 font-bold mb-6">
              Lista gier:
            </h2>
          </div>
          {/* game grid*/}
          <div className="grid grid-cols-2 gap-8 w-full">
            
           
            <div className="relative group w-full aspect-[4/3]">
              <div className="bt-div"></div>
              <button className="bt-game w-full h-full flex items-center justify-center text-center leading-tight"
              onClick={() => setActivegame('reaction')}>
                Trening celności
              </button>
            </div>

           
            <div className="relative group w-full aspect-[4/3]">
              <div className="bt-div"></div>
              <button className="bt-game w-full h-full flex items-center justify-center text-center  leading-tight">
                Pamięć
              </button>
            </div>

           
            <div className="relative group w-full aspect-[4/3]">
              <div className="bt-div"></div>
              <button className="bt-game w-full h-full flex items-center justify-center text-center  leading-tight">
                Logika
              </button>
            </div>

          </div>
        </div>

        {/* Center column for gamearea */}
        <div className="w-[45vw] bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-7 min-h-[65vh] flex flex-col items-center justify-center relative overflow-hidden">
          {activegame === 'reaction' ? (
            <AimTrainer />
          ):(
          <div className="text-center ">
            <h2 className="text-2xl font-semibold text-slate-300 mb-2 font-anta">
              Wybierz grę
            </h2>
            <p className="text-slate-500 mb-10 font-anta">
              Oczekiwanie na wyniki...
            </p>
          </div>
          )}
          </div>
        {/* Right column for agent comments */}
        <div className="main-side-div">
          <div className="items-center gap-5 text-center">
            <span className="text-slate-400 text-sm font-anta">
              Poziom trudności:
            </span>
            <div className=" w-full items-center text-center mt-4">
              <span className="text-center bg-slate-700 px-3 py-1 rounded-full font-bold text-emerald-400 border text-center border-slate-600 max-w-[4vw]">
                {difficulty}
              </span>
            </div>
          </div>
        </div>
      </main>

      <footer className="flex-none min-h-[6vh] flex justify-between items-center text-lg text-slate-500 bg-slate-950 px-6 py-3 border-t border-slate-800 font-anta">
        <div>
          <span>Status połączenia: </span>
          <span className="text-emerald-500">● Online (FastAPI)</span>
        </div>
        <div>
          <span>Model RL: </span>
          <span className="text-blue-400 ">{agentStatus}</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
