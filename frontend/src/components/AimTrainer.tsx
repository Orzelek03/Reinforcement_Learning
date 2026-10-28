import { useState, useRef, useEffect } from "react";
import type { RLStepPayload, RLActionResponse } from "../types/rl";
import { sendStepToAPI } from "../api/rlClient";

type GameState = "waiting" | "playing" | "finished";

export default function ReactionGame() {
  const [gameState, setGameState] = useState<GameState>("waiting");
  const [score, setScore] = useState({ hits: 0, misses: 0 });
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });

  // Parametry środowiska (FastAPI)
  const [targetSize, setTargetSize] = useState(50); // piksele
  const [targetLifespan, setTargetLifespan] = useState(1200); // czas do zniknięcia (ms)

  const sessionIdRef = useRef<string>("");
  const isPlayingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // Zwróć uwagę na window.clearTimeout - to ratuje przed błędem TS!
  const clearTargetTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const processRLStep = async (reward: number) => {
    const total = score.hits + score.misses;
    const accuracy = total > 0 ? score.hits / total : 0.5;

    const payload: RLStepPayload = {
      session_id: sessionIdRef.current,
      game_id: "aim_trainer",
      state: {
        accuracy: accuracy,
        step_count: total,
      },
      reward: reward,
    };
    const response = await sendStepToAPI(payload);

    if (response) {
      setTargetSize((prev) => {
        const newSize = Math.round(
          prev * response.action.difficulty_modifier_1,
        );
        return Math.max(20, Math.min(newSize, 120)); //20px-120px -> Limit
      });

      setTargetLifespan((prev) => {
        const newLifespan = Math.round(
          prev * response.action.difficulty_modifier_2,
        );
        return Math.max(400, Math.min(newLifespan, 2000)); //400ms-2000ms -> Limit
      });

      console.log(
        `Model RL zaaplikował : Rozmiar x${response.action.difficulty_modifier_1}, Czas x${response.action.difficulty_modifier_2}`,
      );
    }
  };

  function handleMiss() {
    if (!isPlayingRef.current) return;
    setScore((prev) => ({ ...prev, misses: prev.misses + 1 }));
    processRLStep(-1);
    // TODO: Wysłanie ujemnej nagrody do FastAPI
    spawnTarget();
  }

  function spawnTarget() {
    if (!isPlayingRef.current) return;

    // Losowanie współrzędnych (0-90, żeby kółko nie wyszło poza ramkę)
    const newX = Math.floor(Math.random() * 90);
    const newY = Math.floor(Math.random() * 90);
    setTargetPos({ x: newX, y: newY });

    clearTargetTimer();

    timerRef.current = window.setTimeout(() => {
      handleMiss();
    }, targetLifespan);
  }

  const startGame = () => {
    sessionIdRef.current = crypto.randomUUID();
    setScore({ hits: 0, misses: 0 });
    setTargetSize(50);
    setTargetLifespan(1200);
    setGameState("playing");
    isPlayingRef.current = true;
    spawnTarget();
  };

  const stopGame = () => {
    isPlayingRef.current = false;
    setGameState("finished");
    clearTargetTimer();
  };

  const handleHit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Blokuje "przebicie" kliknięcia w tło
    if (!isPlayingRef.current) return;
    setScore((prev) => ({ ...prev, hits: prev.hits + 1 }));
    processRLStep(1);
    spawnTarget();
  };

  const handleBackgroundClick = () => {
    if (gameState === "playing" && isPlayingRef.current) {
      handleMiss();
    }
  };

  useEffect(() => {
    return () => clearTargetTimer();
  }, []);

  const total = score.hits + score.misses;
  const accuracy = total > 0 ? Math.round((score.hits / total) * 100) : 0;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex justify-between w-full max-w-2xl mb-4 text-slate-300 font-anta">
        <h2 className="text-2xl font-bold">Trening celności</h2>
        {gameState === "playing" && (
          <div className="flex flex-col items-end gap-2 text-lg">
            <div className="flex gap-4 text-lg">
              <span className="text-green-400">Trafienia : {score.hits}</span>
              <span className="text-red-400">Pudła : {score.misses}</span>
              <span className="text-blue-400">Celność : {accuracy}%</span>
            </div>
            {/*Diagnoza*/}
            <div className="flex gap-4 text-sm text-yellow-400 bg-slate-800 px-3 py-1 rounded border border-yellow-700/50">
              <span>Rozmiar: {targetSize}px</span>
              <span>Czas : {targetLifespan}</span>
            </div>
          </div>
        )}
      </div>

      {/* Div gry (Plansza) */}
      <div
        onClick={handleBackgroundClick}
        className="w-full max-w-2xl h-96 bg-slate-700 rounded-lg border-2 border-slate-500 relative overflow-hidden cursor-crosshair shadow-inner"
      >
        {gameState === "waiting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 z-10">
            <button
              onClick={startGame}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold rounded-lg transition-colors font-anta cursor-pointer"
            >
              Rozpocznij test
            </button>
          </div>
        )}

        {/* Cel - kółko */}
        {gameState === "playing" && (
          <button
            onClick={handleHit}
            style={{
              position: "absolute",
              left: `${targetPos.x}%`,
              top: `${targetPos.y}%`,
              width: `${targetSize}px`,
              height: `${targetSize}px`,
            }}
            className="bg-red-500 rounded-full hover:bg-red-400 transition-colors shadow-lg active:scale-95 cursor-crosshair"
          />
        )}

        {/* Ekran końcowy */}
        {gameState === "finished" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/90 text-slate-200 font-anta z-10">
            <h3 className="text-3xl mb-2 font-bold">Koniec</h3>
            <p className="text-xl">Ostateczna celność: {accuracy}%</p>
            <button
              onClick={startGame}
              className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer"
            >
              Zagraj ponownie
            </button>
          </div>
        )}
      </div>

      {gameState === "playing" && (
        <button
          onClick={stopGame}
          className="mt-4 text-sm text-slate-500 hover:text-slate-400 underline font-anta cursor-pointer"
        >
          Zakończ rozgrywkę
        </button>
      )}
    </div>
  );
}
