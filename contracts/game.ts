export enum GameMode {
  TwoPlayer = "two-player",
  VsAI = "vs-ai",
}

export type PlayerNumber = 1 | 2;

export interface TurnState {
  mode: GameMode;
  currentPlayer: PlayerNumber;
}
