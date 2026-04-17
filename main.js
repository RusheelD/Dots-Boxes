import { applyLayout } from "./src/layout.js";
import { renderBoard } from "./src/boardRenderer.js";

const app = document.getElementById("app");

const players = [
  { id: "p1", name: "Player 1", color: "#38bdf8" },
  { id: "p2", name: "Player 2", color: "#f472b6" },
];

const state = {
  size: 6,
  edges: [],
  boxes: [],
  hoveredEdgeId: null,
  activeEdgeId: null,
};

let layout = null;
let boardEl = null;
let currentOrientation = null;

const getOrientation = () => (window.innerWidth > window.innerHeight ? "landscape" : "portrait");

const buildEdges = (size) => {
  const edges = [];
  for (let row = 0; row <= size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      edges.push({ id: `h-${row}-${col}`, orientation: "h", row, col });
    }
  }
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col <= size; col += 1) {
      edges.push({ id: `v-${row}-${col}`, orientation: "v", row, col });
    }
  }
  return edges;
};

const buildBoxes = (size) => {
  const boxes = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      boxes.push({ id: `b-${row}-${col}`, row, col, owner: null });
    }
  }
  return boxes;
};

const seedBoard = (size) => {
  const edges = buildEdges(size).map((edge) => ({ ...edge, claimed: false, color: undefined }));
  const boxes = buildBoxes(size);
  if (boxes[0]) boxes[0].owner = players[0].id;
  if (boxes[1]) boxes[1].owner = players[1].id;

  edges.slice(0, 4).forEach((edge, index) => {
    edge.claimed = true;
    edge.color = players[index % players.length].color;
  });

  state.edges = edges;
  state.boxes = boxes;
};

const render = () => {
  if (!boardEl) return;
  renderBoard(boardEl, {
    size: state.size,
    edges: state.edges,
    boxes: state.boxes,
    players,
    hoveredEdgeId: state.hoveredEdgeId,
    activeEdgeId: state.activeEdgeId,
  });
};

const getEdgeIdFromEvent = (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const edgeGroup = target?.closest("[data-edge-id]");
  return edgeGroup?.getAttribute("data-edge-id") ?? null;
};

const isEdgeClaimed = (edgeId) => state.edges.find((edge) => edge.id === edgeId)?.claimed;

const handlePointerMove = (event) => {
  const edgeId = getEdgeIdFromEvent(event);
  if (edgeId === state.hoveredEdgeId) return;
  state.hoveredEdgeId = edgeId;
  render();
};

const handlePointerDown = (event) => {
  const edgeId = getEdgeIdFromEvent(event);
  if (!edgeId || isEdgeClaimed(edgeId)) return;
  if (edgeId === state.activeEdgeId) return;
  state.activeEdgeId = edgeId;
  render();
};

const handlePointerUp = () => {
  if (!state.activeEdgeId) return;
  state.activeEdgeId = null;
  render();
};

const handlePointerLeave = () => {
  if (!state.hoveredEdgeId && !state.activeEdgeId) return;
  state.hoveredEdgeId = null;
  state.activeEdgeId = null;
  render();
};

const attachBoardListeners = (board) => {
  board.addEventListener("pointermove", handlePointerMove);
  board.addEventListener("pointerdown", handlePointerDown);
  board.addEventListener("pointerup", handlePointerUp);
  board.addEventListener("pointerleave", handlePointerLeave);
};

const buildToolbar = (toolbar) => {
  toolbar.innerHTML = "";
  const sizeLabel = document.createElement("label");
  sizeLabel.setAttribute("for", "board-size");
  sizeLabel.textContent = "Board size";

  const sizeSelect = document.createElement("select");
  sizeSelect.id = "board-size";

  for (let size = 6; size <= 10; size += 1) {
    const option = document.createElement("option");
    option.value = String(size);
    option.textContent = `${size} x ${size}`;
    if (size === state.size) option.selected = true;
    sizeSelect.append(option);
  }

  sizeSelect.addEventListener("change", (event) => {
    const nextSize = Number(event.target.value);
    state.size = nextSize;
    seedBoard(nextSize);
    render();
  });

  toolbar.append(sizeLabel, sizeSelect);
};

const ensureLayout = () => {
  if (!app) return;
  const orientation = getOrientation();
  if (layout && orientation === currentOrientation) return;
  currentOrientation = orientation;
  layout = applyLayout(app, { orientation });
  if (!layout) return;
  buildToolbar(layout.toolbar);
  boardEl = layout.board;
  attachBoardListeners(boardEl);
  render();
};

if (app) {
  seedBoard(state.size);
  ensureLayout();
  window.addEventListener("resize", ensureLayout);
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
  activePointerId: null,
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

const handleEdgeInteraction = (edgeId, interaction, event) => {
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
    if (event?.pointerId !== undefined) {
      state.activePointerId = event.pointerId;
      event.target?.setPointerCapture?.(event.pointerId);
    }
  }

  if (interaction === "up") {
    const isPointerMatch =
      state.activeEdgeId === edgeId &&
      (state.activePointerId === null || state.activePointerId === event?.pointerId);
    state.activeEdgeId = null;
    state.activePointerId = null;
    if (!isPointerMatch) {
      render();
      return;
    }
    const result = applyMove(state.board, edgeId, state.currentPlayerId, {
      scores: state.scores,
      currentPlayerId: state.currentPlayerId,
      playerOrder: state.players.map((player) => player.id),
    });
    state.scores = result.scores;
    state.currentPlayerId = result.currentPlayerId;
    state.isGameOver = result.isGameOver;
    state.winnerId = result.winnerId;
    state.isTie = state.isGameOver ? getGameOutcome(result.scores).isTie : false;
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
    handleEdgeInteraction(target.dataset.edgeId, "hover", event);
  });
  ui.board.addEventListener("pointerout", (event) => {
    const target = event.target.closest("[data-edge-id]");
    if (!target) return;
    handleEdgeInteraction(target.dataset.edgeId, "leave", event);
  });
  ui.board.addEventListener("pointerdown", (event) => {
    const target = event.target.closest("[data-edge-id]");
    if (!target) return;
    handleEdgeInteraction(target.dataset.edgeId, "down", event);
  });
  ui.board.addEventListener("pointerup", (event) => {
    const target = event.target.closest("[data-edge-id]");
    if (!target) return;
    handleEdgeInteraction(target.dataset.edgeId, "up", event);
  });
  ui.board.addEventListener("pointercancel", (event) => {
    state.activeEdgeId = null;
    state.activePointerId = null;
    const target = event.target.closest("[data-edge-id]");
    if (!target) return;
    handleEdgeInteraction(target.dataset.edgeId, "leave", event);
  });
  ui.board.addEventListener("keydown", (event) => {
    const target = event.target.closest("[data-edge-id]");
    if (!target) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleEdgeInteraction(target.dataset.edgeId, "up", event);
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
