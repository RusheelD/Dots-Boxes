import "../game.js";
import { GameMode, AIDifficulty, PlayerType } from "../contracts/game.js";
import { computeEasyMove, computeMediumMove, computeHardMove } from "./ai/strategies.js";

const DEFAULT_SIZE = 6;
const DEFAULT_DELAY_RANGE = [200, 400];

const getDotsBoxes = () => {
  if (!globalThis?.DotsBoxes) {
    throw new Error("DotsBoxes game utilities are not available.");
  }
  return globalThis.DotsBoxes;
};

const createPlayers = (mode) => {
  const players = [
    { id: "player-1", name: "Player 1", color: "var(--p1)", label: "P1", type: PlayerType.Human },
    { id: "player-2", name: "Player 2", color: "var(--p2)", label: "P2", type: PlayerType.Human },
  ];
  if (mode === GameMode.VsAI) {
    players[1] = {
      ...players[1],
      name: "AI",
      label: "AI",
      type: PlayerType.AI,
    };
  }
  return players;
};

const createScores = (players) => {
  return players.reduce((acc, player) => {
    acc[player.id] = 0;
    return acc;
  }, {});
};

const normalizeDifficulty = (difficulty) => {
  if (difficulty === AIDifficulty.Medium) return AIDifficulty.Medium;
  if (difficulty === AIDifficulty.Hard) return AIDifficulty.Hard;
  return AIDifficulty.Easy;
};

const chooseAICompute = (difficulty) => {
  const normalized = normalizeDifficulty(difficulty);
  if (normalized === AIDifficulty.Hard) return computeHardMove;
  if (normalized === AIDifficulty.Medium) return computeMediumMove;
  return computeEasyMove;
};

export const createGameState = ({ size = DEFAULT_SIZE, mode = GameMode.TwoPlayer, aiDifficulty } = {}) => {
  const { createBoard } = getDotsBoxes();
  const boardSize = Number.isInteger(size) ? size : DEFAULT_SIZE;
  const players = createPlayers(mode);
  return {
    board: createBoard(boardSize),
    players,
    scores: createScores(players),
    currentPlayerId: players[0].id,
    mode,
    aiDifficulty: mode === GameMode.VsAI ? normalizeDifficulty(aiDifficulty) : null,
    settings: {
      boardSize,
      mode,
      aiDifficulty: mode === GameMode.VsAI ? normalizeDifficulty(aiDifficulty) : null,
    },
    isGameOver: false,
    winnerId: null,
  };
};

export const applyMoveToState = (state, edgeId) => {
  if (!state || state.isGameOver) {
    return { state, completedBoxIds: [] };
  }

  const { applyMove, getAvailableMoves } = getDotsBoxes();
  const currentPlayerId = state.currentPlayerId;
  const { boardState, completedBoxIds } = applyMove(state.board, edgeId, currentPlayerId);
  if (completedBoxIds.length) {
    completedBoxIds.forEach((boxId) => {
      state.scores[currentPlayerId] = (state.scores[currentPlayerId] ?? 0) + 1;
    });
  } else {
    const currentIndex = state.players.findIndex((player) => player.id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % state.players.length;
    state.currentPlayerId = state.players[nextIndex].id;
  }

  const remainingMoves = getAvailableMoves(boardState);
  if (!remainingMoves.length) {
    state.isGameOver = true;
    const [player1, player2] = state.players;
    const score1 = state.scores[player1.id] ?? 0;
    const score2 = state.scores[player2.id] ?? 0;
    if (score1 > score2) state.winnerId = player1.id;
    else if (score2 > score1) state.winnerId = player2.id;
    else state.winnerId = null;
  }

  return { state, completedBoxIds };
};

export const getAIPlayer = (state) => {
  if (!state || state.mode !== GameMode.VsAI) return null;
  return state.players.find((player) => player.type === PlayerType.AI) ?? null;
};

export const isAITurn = (state) => {
  const aiPlayer = getAIPlayer(state);
  return Boolean(aiPlayer && state.currentPlayerId === aiPlayer.id);
};

export const computeAIMove = (state) => {
  if (!isAITurn(state)) return null;
  const computeMove = chooseAICompute(state.aiDifficulty);
  return computeMove(state);
};

const pickDelay = (range = DEFAULT_DELAY_RANGE) => {
  const [min, max] = range;
  const lower = Number.isFinite(min) ? min : DEFAULT_DELAY_RANGE[0];
  const upper = Number.isFinite(max) ? max : DEFAULT_DELAY_RANGE[1];
  const finalMax = Math.max(lower, upper);
  return Math.floor(lower + Math.random() * (finalMax - lower + 1));
};

export const scheduleAIMove = (state, onMove, options = {}) => {
  if (!isAITurn(state)) return null;
  const delay = pickDelay(options.delayRange || DEFAULT_DELAY_RANGE);
  const timeoutId = setTimeout(() => {
    const edgeId = computeAIMove(state);
    if (edgeId) {
      onMove(edgeId);
    }
  }, delay);
  return () => clearTimeout(timeoutId);
};
