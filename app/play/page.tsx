import { Suspense } from "react";
import GameCanvas from "@/components/GameCanvas";
import { isGameMode, type GameMode } from "@/lib/game/types";

type SearchParams = { mode?: string | string[] };

export default function PlayPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = Array.isArray(searchParams.mode)
    ? searchParams.mode[0]
    : searchParams.mode;
  const mode: GameMode = isGameMode(raw) ? raw : "classic";
  return (
    <Suspense fallback={null}>
      <GameCanvas key={mode} mode={mode} />
    </Suspense>
  );
}
