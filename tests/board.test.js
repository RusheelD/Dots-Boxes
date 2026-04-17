const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

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

function runTest(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error.stack || error);
    process.exitCode = 1;
  }
}

const { createBoard, getAvailableMoves, applyMove } = loadGameModule();

function expectedEdgeCount(size) {
  return 2 * size * (size - 1);
}

runTest("createBoard sets correct dot/edge/box counts for sizes 6, 7, 10", () => {
  [6, 7, 10].forEach((size) => {
    const board = createBoard(size);
    assert.strictEqual(board.size, size);
    assert.strictEqual(board.dots.length, size * size);
    assert.strictEqual(Object.keys(board.edges).length, expectedEdgeCount(size));
    assert.strictEqual(Object.keys(board.boxes).length, (size - 1) * (size - 1));
  });
});

runTest("createBoard initializes edges with adjacency and unclaimed state", () => {
  const board = createBoard(6);
  const edgeIds = Object.keys(board.edges);
  assert(edgeIds.length > 0);
  edgeIds.slice(0, 10).forEach((edgeId) => {
    const edge = board.edges[edgeId];
    assert(edge);
    assert(edge.adjacentBoxIds.length === 1 || edge.adjacentBoxIds.length === 2);
    assert.strictEqual(edge.claimedBy, null);
  });
});

runTest("getAvailableMoves returns all unclaimed edges initially", () => {
  const board = createBoard(6);
  const moves = getAvailableMoves(board);
  assert.strictEqual(moves.length, expectedEdgeCount(6));
  const edgeIds = Object.keys(board.edges);
  edgeIds.forEach((edgeId) => {
    assert(moves.includes(edgeId));
  });
});

runTest("applyMove claims edge and completes box on fourth edge", () => {
  let board = createBoard(6);
  const playerId = "player-1";
  const box = board.boxes["b-r0c0"];
  assert(box, "expected box b-r0c0 to exist");
  const [top, right, bottom, left] = box.edgeIds;

  let result = applyMove(board, top, playerId);
  board = result.boardState;
  assert.strictEqual(board.edges[top].claimedBy, playerId);
  assert(Array.isArray(result.completedBoxIds));
  assert.strictEqual(result.completedBoxIds.length, 0);

  result = applyMove(board, right, playerId);
  board = result.boardState;
  assert(Array.isArray(result.completedBoxIds));
  assert.strictEqual(result.completedBoxIds.length, 0);

  result = applyMove(board, bottom, playerId);
  board = result.boardState;
  assert(Array.isArray(result.completedBoxIds));
  assert.strictEqual(result.completedBoxIds.length, 0);

  result = applyMove(board, left, playerId);
  board = result.boardState;
  assert(result.completedBoxIds.includes("b-r0c0"));
  assert.strictEqual(board.boxes["b-r0c0"].ownerId, playerId);
});

runTest("applyMove removes claimed edge from available moves", () => {
  let board = createBoard(6);
  const playerId = "player-2";
  const edgeId = Object.keys(board.edges)[0];
  const result = applyMove(board, edgeId, playerId);
  board = result.boardState;
  const moves = getAvailableMoves(board);
  assert(!moves.includes(edgeId));
  assert.strictEqual(moves.length, expectedEdgeCount(6) - 1);
});

runTest("applyMove rotates turn when no box is completed", () => {
  const board = createBoard(6);
  const playerOrder = ["p1", "p2"];
  const edgeId = Object.keys(board.edges)[0];
  const result = applyMove(board, edgeId, "p1", {
    scores: { p1: 0, p2: 0 },
    currentPlayerId: "p1",
    playerOrder,
  });

  assert.strictEqual(result.completedBoxIds.length, 0);
  assert.strictEqual(result.currentPlayerId, "p2");
  assert.deepStrictEqual(result.scores, { p1: 0, p2: 0 });
});

runTest("applyMove keeps turn and increments score on box completion", () => {
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

  assert(result.completedBoxIds.includes("b-r0c0"));
  assert.strictEqual(result.scores.p2, 1);
  assert.strictEqual(result.currentPlayerId, "p2");
  assert.strictEqual(result.isGameOver, false);
});

runTest("applyMove awards two boxes when a shared edge completes both", () => {
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

  assert.strictEqual(finalResult.completedBoxIds.length, 2);
  assert(finalResult.completedBoxIds.includes(leftBox.id));
  assert(finalResult.completedBoxIds.includes(rightBox.id));
  assert.strictEqual(finalResult.scores.p1, 2);
});

runTest("applyMove reports game over and winner after final edge", () => {
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

  assert.strictEqual(result.isGameOver, true);
  assert.strictEqual(result.winnerId, "p1");
});

runTest("applyMove reports tie when scores are equal at game over", () => {
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

  assert.strictEqual(result.isGameOver, true);
  assert.strictEqual(result.winnerId, null);
});
