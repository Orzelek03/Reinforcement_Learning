import type { RLActionResponse, RLStepPayload } from "../types/rl";

export async function sendStepToAPI(payload: RLStepPayload): Promise<RLActionResponse | null> {
    try{
        const response = await fetch ('http://localhost:8000/api/rl-step',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if(!response.ok){
            const errorBody = await response.text();
            console.error("Szczegóły błędu 422 z FASTAPI", errorBody);
            throw new Error(`Bład HTTP: ${response.status}`);
        }
        const data: RLActionResponse = await response.json();
        return data;
    } catch (error){
        //błąd z połączeniem -> gra działa na starym poziomie trudności
        console.error("Błąd komunikacji z FastAPI", error);
        return null;
    }
}