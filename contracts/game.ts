export enum GameMode {
  TwoPlayer = "two-player",
  VsAI = "vs-ai",
}

export enum AIDifficulty {
  Easy = "easy",
  Medium = "medium",
  Hard = "hard",
}

export type PlayerNumber = 1 | 2;

export type PlayerId = string;

export interface TurnState {
  mode: GameMode;
  currentPlayer: PlayerId;
}

export interface PlayerProfile {
  id: PlayerId;
  name: string;
  color: string;
  label?: string;
  type?: "human" | "ai";
}

export type EdgeOrientation = "h" | "v";

export interface Dot {
  id: string;
  row: number;
  col: number;
}

export interface Edge {
  id: string;
  orientation: EdgeOrientation;
  fromDotId: string;
  toDotId: string;
  claimedBy: PlayerId | null;
  adjacentBoxIds: string[];
}

export interface Box {
  id: string;
  row: number;
  col: number;
  edgeIds: string[];
  ownerId: PlayerId | null;
}

export interface BoardState {
  size: number;
  dots: Dot[];
  edges: Record<string, Edge>;
  boxes: Record<string, Box>;
}

export interface MoveResult {
  boardState: BoardState;
  completedBoxIds: string[];
  scores: ScoreState;
  currentPlayerId: PlayerId;
  isGameOver: boolean;
  winnerId: PlayerId | null;
}

export interface ScoreState {
  [playerId: PlayerId]: number;
}

export interface GameOutcome {
  winnerId: PlayerId | null;
  isTie: boolean;
}

export interface GameState {
  board: BoardState;
  players: PlayerProfile[];
  scores: ScoreState;
  currentPlayerId: PlayerId;
  mode: GameMode;
  aiDifficulty?: AIDifficulty | null;
  isGameOver: boolean;
  winnerId: PlayerId | null;
  isTie: boolean;
}

export interface RenderEdge {
  id: string;
  orientation: EdgeOrientation;
  row: number;
  col: number;
  claimed?: boolean;
  color?: string;
}

export interface RenderBox {
  id: string;
  row: number;
  col: number;
  owner?: PlayerId | null;
}

export interface RenderBoardState {
  size: number;
  edges: RenderEdge[];
  boxes: RenderBox[];
  players: PlayerProfile[];
  hoveredEdgeId?: string | null;
  activeEdgeId?: string | null;
}
