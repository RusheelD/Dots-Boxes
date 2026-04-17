import { renderBoard } from "./src/boardRenderer.js";

const BOARD_SIZES = [6, 7, 8, 9, 10];
const { createBoard, applyMove, getGameOutcome } = window;

if (!createBoard || !applyMove) {
  console.error("Game logic not loaded.");
}

const state = {
  board: null,
  players: [
    { id: "player-1", name: "Player 1", color: "var(--p1)" },
    { id: "player-2", name: "Player 2", color: "var(--p2)" },
  ],
  scores: {},
  currentPlayerId: "player-1",
  hoveredEdgeId: null,
  activeEdgeId: null,
  isGameOver: false,
  winnerId: null,
  isTie: false,
  size: 6,
};

const ui = {
  container: document.getElementById("game"),
  sizeSelect: document.getElementById("board-size"),
  sizeLabel: document.getElementById("board-size-label"),
  board: document.getElementById("board"),
  scoreboard: document.getElementById("scoreboard"),
  currentPlayer: document.getElementById("current-player"),
  status: document.getElementById("game-status"),
  resetButton: document.getElementById("reset-game"),
};

const getOrientation = () => (window.innerWidth >= 900 ? "landscape" : "portrait");

const toBoardRenderState = () => {
  const edges = Object.values(state.board.edges).map((edge) => {
    const [, rowMatch, colMatch] = edge.fromDotId.match(/d-r(\d+)c(\d+)/) || [];
    return {
      id: edge.id,
      row: Number(rowMatch ?? 0),
      col: Number(colMatch ?? 0),
      orientation: edge.orientation,
      claimed: Boolean(edge.claimedBy),
      color: edge.claimedBy ? state.players.find((p) => p.id === edge.claimedBy)?.color : null,
    };
  });

  const boxes = Object.values(state.board.boxes).map((box) => ({
    id: box.id,
    row: box.row,
    col: box.col,
    owner: box.ownerId,
  }));

  return {
    size: state.board.size - 1,
    edges,
    boxes,
    players: state.players,
    hoveredEdgeId: state.hoveredEdgeId,
    activeEdgeId: state.activeEdgeId,
  };
};

const updateScoreboard = () => {
  if (!ui.scoreboard) return;
  ui.scoreboard.innerHTML = "";
  state.players.forEach((player) => {
    const card = document.createElement("div");
    card.className = "score-card";
    card.setAttribute("data-player", player.id);
    card.setAttribute("aria-current", player.id === state.currentPlayerId ? "true" : "false");
    card.style.borderColor = player.color;
    const name = document.createElement("span");
    name.className = "score-name";
    name.textContent = player.name;
    const value = document.createElement("span");
    value.className = "score-value";
    value.textContent = String(state.scores[player.id] ?? 0);
    card.append(name, value);
    ui.scoreboard.append(card);
  });
};

const updateStatus = () => {
  if (!ui.currentPlayer || !ui.status) return;
  const activePlayer = state.players.find((player) => player.id === state.currentPlayerId);
  ui.currentPlayer.textContent = state.isGameOver
    ? "Game over"
    : activePlayer
      ? `Current turn: ${activePlayer.name}`
      : "";
  ui.currentPlayer.style.color = activePlayer?.color || "";

  if (state.isGameOver) {
    if (state.isTie) {
      ui.status.textContent = "It’s a tie!";
    } else if (state.winnerId) {
      const winner = state.players.find((player) => player.id === state.winnerId);
      ui.status.textContent = winner ? `${winner.name} wins!` : "Game complete.";
    } else {
      ui.status.textContent = "Game complete.";
    }
  } else {
    ui.status.textContent = "";
  }
};

const updateSizeLabel = () => {
  if (!ui.sizeLabel) return;
  ui.sizeLabel.textContent = `Current board size: ${state.size} x ${state.size}`;
};

const render = () => {
  if (!state.board || !ui.board) return;
  renderBoard(ui.board, toBoardRenderState());
  updateScoreboard();
  updateStatus();
  updateSizeLabel();
  updateEdgeVisibility();
};

const resetGame = (size) => {
  const resolvedSize = BOARD_SIZES.includes(size) ? size : 6;
  state.size = resolvedSize;
  state.board = createBoard(resolvedSize);
  state.scores = state.players.reduce((acc, player) => {
    acc[player.id] = 0;
    return acc;
  }, {});
  state.currentPlayerId = state.players[0]?.id ?? "player-1";
  state.hoveredEdgeId = null;
  state.activeEdgeId = null;
  state.isGameOver = false;
  state.winnerId = null;
  state.isTie = false;
  render();
};

const handleEdgeInteraction = (edgeId, interaction) => {
  if (!state.board || state.isGameOver) return;
  if (!edgeId) return;
  const edge = state.board.edges[edgeId];
  if (!edge || edge.claimedBy) return;

  if (interaction === "hover") {
    state.hoveredEdgeId = edgeId;
  }

  if (interaction === "leave") {
    if (state.hoveredEdgeId === edgeId) {
      state.hoveredEdgeId = null;
    }
  }

  if (interaction === "down") {
    state.activeEdgeId = edgeId;
  }

  if (interaction === "up") {
    state.activeEdgeId = null;
    const result = applyMove(state.board, edgeId, state.currentPlayerId, {
      scores: state.scores,
      currentPlayerId: state.currentPlayerId,
      playerOrder: state.players.map((player) => player.id),
    });
    state.scores = result.scores;
    state.currentPlayerId = result.currentPlayerId;
    state.isGameOver = result.isGameOver;
    state.winnerId = result.winnerId;
    state.isTie = state.isGameOver ? getGameOutcome(state.scores).isTie : false;
  }

  render();
};

const updateEdgeVisibility = () => {
  if (!ui.board) return;
  ui.board.querySelectorAll("[data-edge-id]").forEach((node) => {
    const edgeId = node.dataset.edgeId;
    if (!edgeId) return;
    const edge = state.board?.edges[edgeId];
    if (edge?.claimedBy) {
      node.setAttribute("tabindex", "-1");
      node.setAttribute("aria-disabled", "true");
    } else {
      node.setAttribute("tabindex", "0");
      node.removeAttribute("aria-disabled");
    }
  });
};

const attachBoardListeners = () => {
  if (!ui.board) return;
  ui.board.addEventListener("pointerover", (event) => {
    const target = event.target.closest("[data-edge-id]");
    if (!target) return;
    handleEdgeInteraction(target.dataset.edgeId, "hover");
  });
  ui.board.addEventListener("pointerout", (event) => {
    const target = event.target.closest("[data-edge-id]");
    if (!target) return;
    handleEdgeInteraction(target.dataset.edgeId, "leave");
  });
  ui.board.addEventListener("pointerdown", (event) => {
    const target = event.target.closest("[data-edge-id]");
    if (!target) return;
    handleEdgeInteraction(target.dataset.edgeId, "down");
  });
  ui.board.addEventListener("pointerup", (event) => {
    const target = event.target.closest("[data-edge-id]");
    if (!target) return;
    handleEdgeInteraction(target.dataset.edgeId, "up");
  });
  ui.board.addEventListener("keydown", (event) => {
    const target = event.target.closest("[data-edge-id]");
    if (!target) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleEdgeInteraction(target.dataset.edgeId, "up");
  });
  if (ui.resetButton) {
    ui.resetButton.addEventListener("click", () => resetGame(state.size));
  }
};

const initializeSizeSelector = () => {
  if (!ui.sizeSelect) return;
  if (!BOARD_SIZES.includes(Number(ui.sizeSelect.value))) {
    ui.sizeSelect.value = "6";
  }
  ui.sizeSelect.addEventListener("change", (event) => {
    const nextSize = Number(event.target.value);
    resetGame(nextSize);
  });
};

const onResize = () => {
  if (!ui.container) return;
  const orientation = getOrientation();
  ui.container.classList.toggle("is-landscape", orientation === "landscape");
  ui.container.classList.toggle("is-portrait", orientation === "portrait");
};

const init = () => {
  if (!ui.board || !ui.sizeSelect || !ui.scoreboard || !ui.currentPlayer) return;
  if (typeof createBoard !== "function" || typeof applyMove !== "function") return;
  initializeSizeSelector();
  attachBoardListeners();
  resetGame(Number(ui.sizeSelect.value));
  onResize();
  window.addEventListener("resize", onResize);
};

init();
