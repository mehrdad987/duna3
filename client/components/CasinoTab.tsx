import { HomePage } from "./HomePage";

interface CasinoTabProps {
  onGameSelect?: (gameId: string) => void;
}

export function CasinoTab({ onGameSelect }: CasinoTabProps) {
  return <HomePage onGameSelect={onGameSelect} />;
}


