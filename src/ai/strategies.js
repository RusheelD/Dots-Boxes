import "../../game.js";

const getDotsBoxes = () => {
  if (!globalThis?.DotsBoxes) {
    throw new Error("DotsBoxes game utilities are not available.");
  }
  return globalThis.DotsBoxes;
};

const randomPick = (items) => items[Math.floor(Math.random() * items.length)];

const cloneBoard = (board) => JSON.parse(JSON.stringify(board));

const countClaimedEdges = (board, box) => {
  return box.edgeIds.reduce((total, edgeId) => {
    return total + (board.edges[edgeId]?.claimedBy ? 1 : 0);
  }, 0);
};

const countThreeEdgeBoxes = (board) => {
  return Object.values(board.boxes).reduce((total, box) => {
    if (!box.ownerId && countClaimedEdges(board, box) === 3) {
      return total + 1;
    }
    return total;
  }, 0);
};

const getScoringBoxCount = (board, edgeId) => {
  const edge = board.edges[edgeId];
  if (!edge) return 0;
  return edge.adjacentBoxIds.reduce((total, boxId) => {
    const box = board.boxes[boxId];
    if (!box || box.ownerId) return total;
    return total + (countClaimedEdges(board, box) === 3 ? 1 : 0);
  }, 0);
};

const isRiskyMove = (board, edgeId) => {
  const edge = board.edges[edgeId];
  if (!edge) return false;
  return edge.adjacentBoxIds.some((boxId) => {
    const box = board.boxes[boxId];
    if (!box || box.ownerId) return false;
    return countClaimedEdges(board, box) === 2;
  });
};

const chooseRandomMove = (moves) => (moves.length ? randomPick(moves) : null);

export const computeEasyMove = (state) => {
  const { getAvailableMoves } = getDotsBoxes();
  const moves = getAvailableMoves(state.board);
  if (!moves.length) return null;
  const safeMoves = moves.filter((edgeId) => !isRiskyMove(state.board, edgeId));
  return chooseRandomMove(safeMoves.length ? safeMoves : moves);
};

export const computeMediumMove = (state) => {
  const { getAvailableMoves } = getDotsBoxes();
  const moves = getAvailableMoves(state.board);
  if (!moves.length) return null;

  let bestScore = -1;
  let scoringMoves = [];
  moves.forEach((edgeId) => {
    const score = getScoringBoxCount(state.board, edgeId);
    if (score > 0 && score >= bestScore) {
      if (score > bestScore) {
        scoringMoves = [];
        bestScore = score;
      }
      scoringMoves.push(edgeId);
    }
  });

  if (scoringMoves.length) {
    return chooseRandomMove(scoringMoves);
  }

  const safeMoves = moves.filter((edgeId) => !isRiskyMove(state.board, edgeId));
  return chooseRandomMove(safeMoves.length ? safeMoves : moves);
};

const serializeBoard = (board) => {
  const edgeClaims = Object.values(board.edges)
    .map((edge) => `${edge.id}:${edge.claimedBy ?? ""}`)
    .join("|");
  const boxOwners = Object.values(board.boxes)
    .map((box) => `${box.id}:${box.ownerId ?? ""}`)
    .join("|");
  return `${edgeClaims}#${boxOwners}`;
};

const evaluateBoard = (board, maximizingPlayerId, minimizingPlayerId) => {
  const owned = Object.values(board.boxes);
  const score = owned.reduce((total, box) => {
    if (box.ownerId === maximizingPlayerId) return total + 1;
    if (box.ownerId === minimizingPlayerId) return total - 1;
    return total;
  }, 0);
  const riskPenalty = countThreeEdgeBoxes(board) * 0.25;
  return score - riskPenalty;
};

const evaluateState = (board, currentPlayerId, maximizingPlayerId, minimizingPlayerId, depth, cache) => {
  const { getAvailableMoves, applyMove } = getDotsBoxes();
  const moves = getAvailableMoves(board);
  if (!moves.length || depth <= 0) {
    return evaluateBoard(board, maximizingPlayerId, minimizingPlayerId);
  }

  const cacheKey = `${serializeBoard(board)}:${currentPlayerId}:${depth}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const isMaximizing = currentPlayerId === maximizingPlayerId;
  let bestValue = isMaximizing ? -Infinity : Infinity;

  moves.forEach((edgeId) => {
    const nextBoard = cloneBoard(board);
    const { completedBoxIds } = applyMove(nextBoard, edgeId, currentPlayerId);
    const nextPlayerId =
      completedBoxIds.length > 0
        ? currentPlayerId
        : currentPlayerId === maximizingPlayerId
          ? minimizingPlayerId
          : maximizingPlayerId;
    const value = evaluateState(
      nextBoard,
      nextPlayerId,
      maximizingPlayerId,
      minimizingPlayerId,
      depth - 1,
      cache
    );
    if (isMaximizing) {
      bestValue = Math.max(bestValue, value);
    } else {
      bestValue = Math.min(bestValue, value);
    }
  });

  cache.set(cacheKey, bestValue);
  return bestValue;
};

export const computeHardMove = (state, options = {}) => {
  const { getAvailableMoves, applyMove } = getDotsBoxes();
  const moves = getAvailableMoves(state.board);
  if (!moves.length) return null;

  const depth = Number.isInteger(options.depth) ? options.depth : 2;
  const cache = new Map();
  const currentPlayerId = state.currentPlayerId;
  const opponentId =
    state.players.find((player) => player.id !== currentPlayerId)?.id ?? currentPlayerId;

  let bestScore = -Infinity;
  let bestMoves = [];

  moves.forEach((edgeId) => {
    const nextBoard = cloneBoard(state.board);
    const { completedBoxIds } = applyMove(nextBoard, edgeId, currentPlayerId);
    const nextPlayerId = completedBoxIds.length > 0 ? currentPlayerId : opponentId;
    const score = evaluateState(nextBoard, nextPlayerId, currentPlayerId, opponentId, depth - 1, cache);

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [edgeId];
    } else if (score === bestScore) {
      bestMoves.push(edgeId);
    }
  });

  return chooseRandomMove(bestMoves.length ? bestMoves : moves);
};
