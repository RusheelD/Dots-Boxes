import { describe, it, expect } from "vitest";
import "../game.js";
import { computeEasyMove, computeMediumMove, computeHardMove } from "../src/ai/strategies.js";

const { createBoard } = globalThis.DotsBoxes;

const buildState = (board, currentPlayerId = "player-1") => ({
  board,
  currentPlayerId,
  players: [
    { id: "player-1", name: "Player 1" },
    { id: "player-2", name: "Player 2" },
  ],
});

describe("AI strategy helpers", () => {
  it("computeEasyMove avoids risky edges when safe moves exist", () => {
    const board = createBoard(6);
    const box = board.boxes["b-r0c0"];
    const [top, right, bottom, left] = box.edgeIds;

    board.edges[top].claimedBy = "player-1";
    board.edges[right].claimedBy = "player-2";

    const move = computeEasyMove(buildState(board));
    expect(move).toBeTruthy();
    expect([bottom, left]).not.toContain(move);
  });

  it("computeMediumMove prioritizes a scoring edge", () => {
    const board = createBoard(6);
    const box = board.boxes["b-r0c0"];
    const [top, right, bottom, left] = box.edgeIds;

    board.edges[top].claimedBy = "player-1";
    board.edges[right].claimedBy = "player-2";
    board.edges[bottom].claimedBy = "player-1";

    const move = computeMediumMove(buildState(board));
    expect(move).toBe(left);
  });

  it("computeHardMove returns the only available edge", () => {
    const board = createBoard(6);
    const edgeIds = Object.keys(board.edges);
    const remaining = edgeIds[0];

    edgeIds.slice(1).forEach((edgeId) => {
      board.edges[edgeId].claimedBy = "player-1";
    });

    const move = computeHardMove(buildState(board), { depth: 1 });
    expect(move).toBe(remaining);
  });
});
