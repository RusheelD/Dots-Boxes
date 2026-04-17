/**
 * Shared data contracts for Dots-and-Boxes board logic.
 * These typedefs and signatures are the agreement layer for UI + game logic.
 */

/**
 * @typedef {"h" | "v"} EdgeOrientation
 */

/**
 * @typedef {Object} Dot
 * @property {string} id - Unique dot id (e.g., "d-r{row}c{col}").
 * @property {number} row
 * @property {number} col
 */

/**
 * @typedef {Object} Edge
 * @property {string} id - Unique edge id (e.g., "e-h-r{row}c{col}" or "e-v-r{row}c{col}").
 * @property {EdgeOrientation} orientation
 * @property {string} fromDotId
 * @property {string} toDotId
 * @property {string | null} claimedBy - Player id who claimed the edge.
 * @property {string[]} adjacentBoxIds - Box ids that share this edge (1 or 2).
 */

/**
 * @typedef {Object} Box
 * @property {string} id - Unique box id (e.g., "b-r{row}c{col}").
 * @property {number} row
 * @property {number} col
 * @property {string[]} edgeIds - [top, right, bottom, left] edge ids.
 * @property {string | null} ownerId - Player id who owns this box once completed.
 */

/**
 * @typedef {Object} BoardState
 * @property {number} size - Dot grid size N (valid 6–10).
 * @property {Dot[]} dots
 * @property {Object.<string, Edge>} edges - Map of edge id -> edge.
 * @property {Object.<string, Box>} boxes - Map of box id -> box.
 */

/**
 * @typedef {Object.<string, number>} ScoreState
 */

/**
 * @typedef {Object} GameOutcome
 * @property {string | null} winnerId
 * @property {boolean} isTie
 */

/**
 * @typedef {Object} GameState
 * @property {BoardState} board
 * @property {ScoreState} scores
 * @property {string} currentPlayerId
 * @property {boolean} isGameOver
 * @property {string | null} winnerId
 * @property {boolean} isTie
 */

/**
 * @typedef {Object} MoveResult
 * @property {BoardState} boardState
 * @property {string[]} completedBoxIds
 * @property {ScoreState} scores
 * @property {string} currentPlayerId
 * @property {boolean} isGameOver
 * @property {string | null} winnerId
 */

/**
 * Create a new board state for a given size.
 * @param {number} size - Dot grid size N (6–10).
 * @returns {BoardState}
 */
function createBoard(size) {
  if (!Number.isInteger(size) || size < 6 || size > 10) {
    throw new Error(`Invalid board size: ${size}. Expected 6–10.`);
  }

  const dots = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      dots.push({ id: `d-r${row}c${col}`, row, col });
    }
  }

  const edges = {};
  const boxes = {};

  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const id = `b-r${row}c${col}`;
      boxes[id] = {
        id,
        row,
        col,
        edgeIds: [
          `e-h-r${row}c${col}`,
          `e-v-r${row}c${col + 1}`,
          `e-h-r${row + 1}c${col}`,
          `e-v-r${row}c${col}`,
        ],
        ownerId: null,
      };
    }
  }

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const id = `e-h-r${row}c${col}`;
      const adjacentBoxIds = [];
      if (row > 0) {
        adjacentBoxIds.push(`b-r${row - 1}c${col}`);
      }
      if (row < size - 1) {
        adjacentBoxIds.push(`b-r${row}c${col}`);
      }
      edges[id] = {
        id,
        orientation: "h",
        fromDotId: `d-r${row}c${col}`,
        toDotId: `d-r${row}c${col + 1}`,
        claimedBy: null,
        adjacentBoxIds,
      };
    }
  }

  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const id = `e-v-r${row}c${col}`;
      const adjacentBoxIds = [];
      if (col > 0) {
        adjacentBoxIds.push(`b-r${row}c${col - 1}`);
      }
      if (col < size - 1) {
        adjacentBoxIds.push(`b-r${row}c${col}`);
      }
      edges[id] = {
        id,
        orientation: "v",
        fromDotId: `d-r${row}c${col}`,
        toDotId: `d-r${row + 1}c${col}`,
        claimedBy: null,
        adjacentBoxIds,
      };
    }
  }

  return {
    size,
    dots,
    edges,
    boxes,
  };
}

/**
 * Return all unclaimed edge ids for a given board state.
 * @param {BoardState} boardState
 * @returns {string[]} edge ids
 */
function getAvailableMoves(boardState) {
  return Object.values(boardState.edges)
    .filter((edge) => edge.claimedBy === null)
    .map((edge) => edge.id);
}

/**
 * Apply a move to the board state and return any completed boxes.
 * @param {BoardState} boardState
 * @param {string} edgeId - Edge id to claim.
 * @param {string} playerId - Player id claiming the edge.
 * @returns {{ boardState: BoardState, completedBoxIds: string[] }}
 */
function applyMove(boardState, edgeId, playerId) {
  const edge = boardState.edges[edgeId];
  if (!edge || edge.claimedBy) {
    return { boardState, completedBoxIds: [] };
  }

  edge.claimedBy = playerId;
  const completedBoxIds = [];

  edge.adjacentBoxIds.forEach((boxId) => {
    const box = boardState.boxes[boxId];
    if (!box || box.ownerId) {
      return;
    }
    const isCompleted = box.edgeIds.every((id) => {
      const currentEdge = boardState.edges[id];
      return currentEdge && currentEdge.claimedBy;
    });
    if (isCompleted) {
      box.ownerId = playerId;
      completedBoxIds.push(boxId);
    }
  });

  return { boardState, completedBoxIds };
}

function runBoardSizeChecks() {
  for (let size = 6; size <= 10; size += 1) {
    const board = createBoard(size);
    const expectedDots = size * size;
    const expectedEdges = 2 * size * (size - 1);
    const expectedBoxes = (size - 1) * (size - 1);

    console.assert(
      board.dots.length === expectedDots,
      `Size ${size}: expected ${expectedDots} dots, got ${board.dots.length}`
    );
    console.assert(
      Object.keys(board.edges).length === expectedEdges,
      `Size ${size}: expected ${expectedEdges} edges, got ${Object.keys(board.edges).length}`
    );
    console.assert(
      Object.keys(board.boxes).length === expectedBoxes,
      `Size ${size}: expected ${expectedBoxes} boxes, got ${Object.keys(board.boxes).length}`
    );
  }
}

if (typeof console !== "undefined" && console.assert) {
  runBoardSizeChecks();
}
