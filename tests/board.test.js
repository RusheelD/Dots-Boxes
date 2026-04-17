import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadGameModule() {
  const code = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  const sandbox = {
    module: { exports: {} },
    exports: {},
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(`${code}\nmodule.exports = { createBoard, getAvailableMoves, applyMove };`, sandbox);
  return sandbox.module.exports;
}

let createBoard;
let getAvailableMoves;
let applyMove;

beforeAll(() => {
  ({ createBoard, getAvailableMoves, applyMove } = loadGameModule());
});

function expectedEdgeCount(size) {
  return 2 * size * (size - 1);
}

describe("board logic", () => {
  it("createBoard sets correct dot/edge/box counts for sizes 6, 7, 10", () => {
    [6, 7, 10].forEach((size) => {
      const board = createBoard(size);
      expect(board.size).toBe(size);
      expect(board.dots.length).toBe(size * size);
      expect(Object.keys(board.edges).length).toBe(expectedEdgeCount(size));
      expect(Object.keys(board.boxes).length).toBe((size - 1) * (size - 1));
    });
  });

  it("createBoard initializes edges with adjacency and unclaimed state", () => {
    const board = createBoard(6);
    const edgeIds = Object.keys(board.edges);
    expect(edgeIds.length).toBeGreaterThan(0);
    edgeIds.slice(0, 10).forEach((edgeId) => {
      const edge = board.edges[edgeId];
      expect(edge).toBeTruthy();
      expect([1, 2]).toContain(edge.adjacentBoxIds.length);
      expect(edge.claimedBy).toBe(null);
    });
  });

  it("getAvailableMoves returns all unclaimed edges initially", () => {
    const board = createBoard(6);
    const moves = getAvailableMoves(board);
    expect(moves.length).toBe(expectedEdgeCount(6));
    Object.keys(board.edges).forEach((edgeId) => {
      expect(moves.includes(edgeId)).toBe(true);
    });
  });

  it("applyMove claims edge and completes box on fourth edge", () => {
    let board = createBoard(6);
    const playerId = "player-1";
    const box = board.boxes["b-r0c0"];
    expect(box).toBeTruthy();
    const [top, right, bottom, left] = box.edgeIds;

    let result = applyMove(board, top, playerId);
    board = result.boardState;
    expect(board.edges[top].claimedBy).toBe(playerId);
    expect(result.completedBoxIds.length).toBe(0);

    result = applyMove(board, right, playerId);
    board = result.boardState;
    expect(result.completedBoxIds.length).toBe(0);

    result = applyMove(board, bottom, playerId);
    board = result.boardState;
    expect(result.completedBoxIds.length).toBe(0);

    result = applyMove(board, left, playerId);
    board = result.boardState;
    expect(result.completedBoxIds).toContain("b-r0c0");
    expect(board.boxes["b-r0c0"].ownerId).toBe(playerId);
  });

  it("applyMove removes claimed edge from available moves", () => {
    let board = createBoard(6);
    const playerId = "player-2";
    const edgeId = Object.keys(board.edges)[0];
    const result = applyMove(board, edgeId, playerId);
    board = result.boardState;
    const moves = getAvailableMoves(board);
    expect(moves.includes(edgeId)).toBe(false);
    expect(moves.length).toBe(expectedEdgeCount(6) - 1);
  });
});
