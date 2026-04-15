const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadGameModule() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
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

runTest('createBoard sets correct dot/edge/box counts for sizes 6, 7, 10', () => {
  [6, 7, 10].forEach((size) => {
    const board = createBoard(size);
    assert.strictEqual(board.size, size);
    assert.strictEqual(board.dots.length, size * size);
    assert.strictEqual(Object.keys(board.edges).length, expectedEdgeCount(size));
    assert.strictEqual(Object.keys(board.boxes).length, (size - 1) * (size - 1));
  });
});

runTest('createBoard initializes edges with adjacency and unclaimed state', () => {
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

runTest('getAvailableMoves returns all unclaimed edges initially', () => {
  const board = createBoard(6);
  const moves = getAvailableMoves(board);
  assert.strictEqual(moves.length, expectedEdgeCount(6));
  const edgeIds = Object.keys(board.edges);
  edgeIds.forEach((edgeId) => {
    assert(moves.includes(edgeId));
  });
});

runTest('applyMove claims edge and completes box on fourth edge', () => {
  let board = createBoard(6);
  const playerId = 'player-1';
  const box = board.boxes['b-r0c0'];
  assert(box, 'expected box b-r0c0 to exist');
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
  assert(result.completedBoxIds.includes('b-r0c0'));
  assert.strictEqual(board.boxes['b-r0c0'].ownerId, playerId);
});

runTest('applyMove removes claimed edge from available moves', () => {
  let board = createBoard(6);
  const playerId = 'player-2';
  const edgeId = Object.keys(board.edges)[0];
  const result = applyMove(board, edgeId, playerId);
  board = result.boardState;
  const moves = getAvailableMoves(board);
  assert(!moves.includes(edgeId));
  assert.strictEqual(moves.length, expectedEdgeCount(6) - 1);
});
