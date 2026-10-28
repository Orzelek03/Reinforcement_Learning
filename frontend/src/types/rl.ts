export interface RLStepPayload{
session_id: string;
game_id : string;
state:{
        accuracy: number;
        step_count: number;
    };
reward: number;
}

export interface RLActionResponse{
    action:{
        difficulty_modifier_1: number;
        difficulty_modifier_2: number;
    };
}