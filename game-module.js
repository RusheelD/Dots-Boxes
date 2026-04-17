import "./game.js";

const fallback = {
  createBoard: undefined,
  getAvailableMoves: undefined,
  applyMove: undefined,
  getGameOutcome: undefined,
};

const api = globalThis?.DotsBoxes ?? fallback;

export const createBoard = api.createBoard;
export const getAvailableMoves = api.getAvailableMoves;
export const applyMove = api.applyMove;
export const getGameOutcome = api.getGameOutcome;
