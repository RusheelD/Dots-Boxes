import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadGameModule = () => {
  const code = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  const sandbox = {
    module: { exports: {} },
    exports: {},
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(`${code}\nmodule.exports = { createBoard, getAvailableMoves, applyMove };`, sandbox);
  return sandbox.module.exports;
};

const { createBoard, getAvailableMoves, applyMove } = loadGameModule();

const expectedEdgeCount = (size) => 2 * size * (size - 1);

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
      expect(edge.adjacentBoxIds.length === 1 || edge.adjacentBoxIds.length === 2).toBe(true);
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
    expect(result.completedBoxIds.includes("b-r0c0")).toBe(true);
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

  it("applyMove rotates turn when no box is completed", () => {
    const board = createBoard(6);
    const playerOrder = ["p1", "p2"];
    const edgeId = Object.keys(board.edges)[0];
    const result = applyMove(board, edgeId, "p1", {
      scores: { p1: 0, p2: 0 },
      currentPlayerId: "p1",
      playerOrder,
    });

    expect(result.completedBoxIds.length).toBe(0);
    expect(result.currentPlayerId).toBe("p2");
    expect(result.scores).toEqual({ p1: 0, p2: 0 });
  });

  it("applyMove keeps turn and increments score on box completion", () => {
    let board = createBoard(6);
    const playerOrder = ["p1", "p2"];
    const box = board.boxes["b-r0c0"];
    const [top, right, bottom, left] = box.edgeIds;

    let scores = { p1: 0, p2: 0 };
    let currentPlayerId = "p1";

    let result = applyMove(board, top, "p1", { scores, currentPlayerId, playerOrder });
    board = result.boardState;
    scores = result.scores;
    currentPlayerId = result.currentPlayerId;

    result = applyMove(board, right, "p2", { scores, currentPlayerId, playerOrder });
    board = result.boardState;
    scores = result.scores;
    currentPlayerId = result.currentPlayerId;

    result = applyMove(board, bottom, "p1", { scores, currentPlayerId, playerOrder });
    board = result.boardState;
    scores = result.scores;
    currentPlayerId = result.currentPlayerId;

    result = applyMove(board, left, "p2", { scores, currentPlayerId, playerOrder });

    expect(result.completedBoxIds.includes("b-r0c0")).toBe(true);
    expect(result.scores.p2).toBe(1);
    expect(result.currentPlayerId).toBe("p2");
    expect(result.isGameOver).toBe(false);
  });

  it("applyMove awards two boxes when a shared edge completes both", () => {
    const board = createBoard(6);
    const playerOrder = ["p1"];
    const leftBox = board.boxes["b-r0c0"];
    const rightBox = board.boxes["b-r0c1"];
    const sharedEdge = leftBox.edgeIds[1];
    const edgesToClaim = new Set([...leftBox.edgeIds, ...rightBox.edgeIds]);
    edgesToClaim.delete(sharedEdge);

    let scores = { p1: 0 };
    let currentPlayerId = "p1";

    edgesToClaim.forEach((edgeId) => {
      const result = applyMove(board, edgeId, currentPlayerId, {
        scores,
        currentPlayerId,
        playerOrder,
      });
      scores = result.scores;
      currentPlayerId = result.currentPlayerId;
    });

    const finalResult = applyMove(board, sharedEdge, currentPlayerId, {
      scores,
      currentPlayerId,
      playerOrder,
    });

    expect(finalResult.completedBoxIds.length).toBe(2);
    expect(finalResult.completedBoxIds.includes(leftBox.id)).toBe(true);
    expect(finalResult.completedBoxIds.includes(rightBox.id)).toBe(true);
    expect(finalResult.scores.p1).toBe(2);
  });

  it("applyMove reports game over and winner after final edge", () => {
    const board = createBoard(6);
    const edgeIds = Object.keys(board.edges);
    edgeIds.slice(0, -1).forEach((edgeId) => {
      board.edges[edgeId].claimedBy = "p1";
    });
    const lastEdge = edgeIds[edgeIds.length - 1];

    const result = applyMove(board, lastEdge, "p1", {
      scores: { p1: 5, p2: 3 },
      currentPlayerId: "p1",
      playerOrder: ["p1", "p2"],
    });

    expect(result.isGameOver).toBe(true);
    expect(result.winnerId).toBe("p1");
  });

  it("applyMove reports tie when scores are equal at game over", () => {
    const board = createBoard(6);
    Object.values(board.edges).forEach((edge) => {
      edge.claimedBy = "p1";
    });
    const edgeId = Object.keys(board.edges)[0];

    const result = applyMove(board, edgeId, "p1", {
      scores: { p1: 2, p2: 2 },
      currentPlayerId: "p1",
      playerOrder: ["p1", "p2"],
    });

    expect(result.isGameOver).toBe(true);
    expect(result.winnerId).toBe(null);
  });
});
