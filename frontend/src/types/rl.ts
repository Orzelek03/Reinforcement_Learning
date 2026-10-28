export interface RLStepPayload{
session_id: string;
game_id : string;
state:{
        accurancy: number;
        step_count: number;
    };
reward: number;
}

export interface RLActionResponse{
    action:{
        difficulty_modifier_1: number;
        diddifulty_modifier_2: number;
    };
}