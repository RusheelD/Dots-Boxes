import { renderBoard } from "./src/boardRenderer.js";
import * as game from "./game-module.js";
import { AIDifficulty, GameMode, ThemeName } from "./contracts/game.js";

const BOARD_SIZES = [6, 7, 8, 9, 10];
const THEMES = [
  { name: ThemeName.Classic, label: "Classic" },
  { name: ThemeName.Neon, label: "Neon" },
  { name: ThemeName.Pastel, label: "Pastel" },
  { name: ThemeName.Mono, label: "Mono" },
  { name: ThemeName.Sunset, label: "Sunset" },
];

const resolveGameApi = (key, fallback) => {
  const candidate = globalThis?.[key];
  if (typeof candidate === "function") {
    return candidate;
  }
  return fallback;
};

const createBoard = resolveGameApi("createBoard", game.createBoard);
const applyMove = resolveGameApi("applyMove", game.applyMove);
const getAvailableMoves = resolveGameApi("getAvailableMoves", game.getAvailableMoves);
const getGameOutcome = resolveGameApi(
  "getGameOutcome",
  game.getGameOutcome || ((scores) => {
    const entries = Object.entries(scores || {});
    if (!entries.length) {
      return { winnerId: null, isTie: true };
    }
    let topScore = -Infinity;
    let winnerId = null;
    let isTie = false;
    entries.forEach(([playerId, score]) => {
      if (score > topScore) {
        topScore = score;
        winnerId = playerId;
        isTie = false;
      } else if (score === topScore) {
        isTie = true;
      }
    });
    return { winnerId: isTie ? null : winnerId, isTie };
  })
);

if (!createBoard || !applyMove || !getAvailableMoves) {
  throw new Error("Game logic helpers unavailable.");
}

const state = {
  board: null,
  players: [
    { id: "player-1", name: "Player 1", color: "var(--p1)", type: "human" },
    { id: "player-2", name: "Player 2", color: "var(--p2)", type: "human" },
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
  mode: GameMode.TwoPlayer,
  aiDifficulty: AIDifficulty.Medium,
  aiPending: false,
};

const ui = {
  container: document.getElementById("app") || document.getElementById("game"),
  sizeSelect: document.getElementById("board-size") || document.getElementById("size-select"),
  sizeLabel: document.getElementById("board-size-label"),
  board: document.getElementById("board"),
  scoreboard: document.getElementById("scoreboard"),
  currentPlayer: document.getElementById("current-player"),
  status: document.getElementById("game-status"),
  resetButton: document.getElementById("reset-game") || document.getElementById("reset-button"),
  modeSelect: document.getElementById("mode-select"),
  aiSelect: document.getElementById("ai-select"),
  themeSelect: document.getElementById("theme-select"),
  endgameModal: document.getElementById("endgame-modal"),
  endgameTitle: document.getElementById("endgame-title"),
  endgameSummary: document.getElementById("endgame-summary"),
  endgameScores: document.getElementById("endgame-scores"),
  playAgainButton: document.getElementById("play-again-button"),
};

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

const getEdgeRowCol = (edge) => {
  const match = edge.fromDotId?.match(/d-r(\d+)c(\d+)/);
  return {
    row: Number(match?.[1] ?? 0),
    col: Number(match?.[2] ?? 0),
  };
};

const toBoardRenderState = () => {
  const edges = Object.values(state.board.edges).map((edge) => {
    const { row, col } = getEdgeRowCol(edge);
    return {
      id: edge.id,
      row,
      col,
      orientation: edge.orientation,
      claimed: Boolean(edge.claimedBy),
      color: edge.claimedBy
        ? state.players.find((player) => player.id === edge.claimedBy)?.color
        : null,
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
  if (state.isGameOver) {
    ui.currentPlayer.textContent = "Game over";
  } else {
    ui.currentPlayer.textContent = activePlayer ? `Current turn: ${activePlayer.name}` : "";
  }
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

const render = () => {
  if (!state.board || !ui.board) return;
  renderBoard(ui.board, toBoardRenderState());
  updateScoreboard();
  updateStatus();
  updateSizeLabel();
  updateEdgeVisibility();
  if (getAvailableMoves(state.board).length === 0 && !state.isGameOver) {
    state.isGameOver = true;
    const outcome = getGameOutcome(state.scores);
    state.winnerId = outcome.winnerId;
    state.isTie = outcome.isTie;
    showEndgameModal();
  }
  maybeScheduleAiMove();
};

const resetGame = (size) => {
  const resolvedSize = BOARD_SIZES.includes(size) ? size : 6;
  state.size = resolvedSize;
  state.board = createBoard(resolvedSize);
  if (!state.board) {
    return;
  }
  state.scores = state.players.reduce((acc, player) => {
    acc[player.id] = 0;
    return acc;
  }, {});
  state.currentPlayerId = state.players[0]?.id ?? "player-1";
  state.hoveredEdgeId = null;
  state.activeEdgeId = null;
  state.activePointerId = null;
  state.isGameOver = false;
  state.winnerId = null;
  state.isTie = false;
  state.aiPending = false;
  closeEndgameModal();
  render();
};

const getEdgeIdFromEvent = (event) => {
  const target = event?.target instanceof Element ? event.target : null;
  if (!target) return null;
  const directEdgeId = target.getAttribute?.("data-edge-id");
  if (directEdgeId) return directEdgeId;
  const edgeGroup = target.closest?.("[data-edge-id]");
  if (edgeGroup) {
    return edgeGroup.getAttribute("data-edge-id");
  }
  const path = typeof event?.composedPath === "function" ? event.composedPath() : [];
  const pathMatch = path.find(
    (node) => node instanceof Element && node.hasAttribute?.("data-edge-id")
  );
  return pathMatch?.getAttribute?.("data-edge-id") ?? null;
};

const handleEdgeInteraction = (edgeId, interaction, event) => {
  if (!state.board || state.isGameOver) return;
  if (!edgeId) return;
  const edge = state.board.edges[edgeId];
  if (!edge || edge.claimedBy) return;
  if (isAiTurn()) return;

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
    const isDirectTap = state.activeEdgeId === null && state.activePointerId === null;
    state.activeEdgeId = null;
    state.activePointerId = null;
    if (!isPointerMatch && !isDirectTap) {
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
    if (state.isGameOver) {
      showEndgameModal();
    }
  }

  render();
};

const attachBoardListeners = () => {
  if (!ui.board) return;
  ui.board.addEventListener("pointerover", (event) => {
    const edgeId = getEdgeIdFromEvent(event);
    if (!edgeId) return;
    handleEdgeInteraction(edgeId, "hover", event);
  });
  ui.board.addEventListener("pointerout", (event) => {
    const edgeId = getEdgeIdFromEvent(event);
    if (!edgeId) return;
    handleEdgeInteraction(edgeId, "leave", event);
  });
  ui.board.addEventListener("pointerdown", (event) => {
    const edgeId = getEdgeIdFromEvent(event);
    if (!edgeId) return;
    handleEdgeInteraction(edgeId, "down", event);
  });
  ui.board.addEventListener("pointerup", (event) => {
    const edgeId = getEdgeIdFromEvent(event) ?? state.activeEdgeId;
    if (!edgeId) return;
    handleEdgeInteraction(edgeId, "up", event);
  });
  ui.board.addEventListener("pointercancel", () => {
    state.activeEdgeId = null;
    state.activePointerId = null;
    state.hoveredEdgeId = null;
    render();
  });
  ui.board.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const edgeId = getEdgeIdFromEvent(event);
    if (!edgeId) return;
    event.preventDefault();
    handleEdgeInteraction(edgeId, "up", event);
  });

  if (ui.resetButton) {
    ui.resetButton.addEventListener("click", () => resetGame(state.size));
  }

  if (ui.playAgainButton) {
    ui.playAgainButton.addEventListener("click", () => {
      closeEndgameModal();
      resetGame(state.size);
    });
  }

  if (ui.endgameModal) {
    ui.endgameModal.addEventListener("click", (event) => {
      if (event.target === ui.endgameModal) {
        closeEndgameModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ui.endgameModal && !ui.endgameModal.hidden) {
      closeEndgameModal();
    }
  });
};

const showEndgameModal = () => {
  if (!ui.endgameModal || !ui.endgameTitle || !ui.endgameSummary || !ui.endgameScores) return;
  const outcome = getGameOutcome(state.scores);
  if (outcome.isTie) {
    ui.endgameTitle.textContent = "It’s a tie!";
    ui.endgameSummary.textContent = "Great game! Both players finished with the same score.";
  } else {
    const winner = state.players.find((player) => player.id === outcome.winnerId);
    ui.endgameTitle.textContent = winner ? `${winner.name} wins!` : "Game complete.";
    ui.endgameSummary.textContent = "Nice work! Here’s the final score.";
  }

  ui.endgameScores.innerHTML = "";
  state.players.forEach((player) => {
    const item = document.createElement("div");
    item.className = "modal__score";
    item.style.borderColor = player.color;
    const name = document.createElement("span");
    name.textContent = player.name;
    const score = document.createElement("span");
    score.textContent = String(state.scores[player.id] ?? 0);
    item.append(name, score);
    ui.endgameScores.append(item);
  });

  ui.endgameModal.hidden = false;
  ui.endgameModal.classList.add("is-visible");
  ui.playAgainButton?.focus();
};

const closeEndgameModal = () => {
  if (!ui.endgameModal) return;
  ui.endgameModal.hidden = true;
  ui.endgameModal.classList.remove("is-visible");
};

const initializeSizeSelector = () => {
  if (!ui.sizeSelect) return;
  ui.sizeSelect.innerHTML = "";
  BOARD_SIZES.forEach((size) => {
    const option = document.createElement("option");
    option.value = String(size);
    option.textContent = `${size} x ${size}`;
    ui.sizeSelect.append(option);
  });
  ui.sizeSelect.value = String(state.size);
  ui.sizeSelect.addEventListener("change", (event) => {
    const nextSize = Number(event.target.value);
    resetGame(nextSize);
  });
};

const initializeModeSelector = () => {
  if (!ui.modeSelect) return;
  ui.modeSelect.value = state.mode;
  ui.modeSelect.addEventListener("change", (event) => {
    const nextMode = event.target.value === GameMode.VsAI ? GameMode.VsAI : GameMode.TwoPlayer;
    state.mode = nextMode;
    applyModeSettings();
    resetGame(state.size);
  });
};

const initializeAiSelector = () => {
  if (!ui.aiSelect) return;
  ui.aiSelect.value = state.aiDifficulty;
  ui.aiSelect.addEventListener("change", (event) => {
    const value = event.target.value;
    if (value === AIDifficulty.Easy || value === AIDifficulty.Medium || value === AIDifficulty.Hard) {
      state.aiDifficulty = value;
    }
  });
};

const initializeThemeSelector = () => {
  if (!ui.themeSelect) return;
  ui.themeSelect.innerHTML = "";
  THEMES.forEach((theme) => {
    const option = document.createElement("option");
    option.value = theme.name;
    option.textContent = theme.label;
    ui.themeSelect.append(option);
  });

  const storedTheme = localStorage.getItem("dots-theme");
  const initialTheme = THEMES.find((theme) => theme.name === storedTheme)?.name || ThemeName.Classic;
  applyTheme(initialTheme);
  ui.themeSelect.value = initialTheme;

  ui.themeSelect.addEventListener("change", (event) => {
    applyTheme(event.target.value);
  });
};

const applyTheme = (themeName) => {
  document.body.dataset.theme = themeName;
  localStorage.setItem("dots-theme", themeName);
};

const applyModeSettings = () => {
  if (state.mode === GameMode.VsAI) {
    state.players = [
      { id: "player-1", name: "Player 1", color: "var(--p1)", type: "human" },
      { id: "player-2", name: "AI", color: "var(--p2)", type: "ai" },
    ];
    if (ui.aiSelect) {
      ui.aiSelect.disabled = false;
    }
  } else {
    state.players = [
      { id: "player-1", name: "Player 1", color: "var(--p1)", type: "human" },
      { id: "player-2", name: "Player 2", color: "var(--p2)", type: "human" },
    ];
    if (ui.aiSelect) {
      ui.aiSelect.disabled = true;
    }
  }
};

const isAiTurn = () => {
  if (state.mode !== GameMode.VsAI) return false;
  const currentPlayer = state.players.find((player) => player.id === state.currentPlayerId);
  return currentPlayer?.type === "ai";
};

const getBoxCompletingMoves = () => {
  const available = getAvailableMoves(state.board);
  return available.filter((edgeId) => {
    const edge = state.board.edges[edgeId];
    return edge?.adjacentBoxIds.some((boxId) => {
      const box = state.board.boxes[boxId];
      if (!box || box.ownerId) return false;
      const claimedEdges = box.edgeIds.filter((id) => state.board.edges[id]?.claimedBy).length;
      return claimedEdges === 3;
    });
  });
};

const getRiskyMoves = () => {
  const available = getAvailableMoves(state.board);
  return available.filter((edgeId) => {
    const edge = state.board.edges[edgeId];
    return edge?.adjacentBoxIds.some((boxId) => {
      const box = state.board.boxes[boxId];
      if (!box || box.ownerId) return false;
      const claimedEdges = box.edgeIds.filter((id) => state.board.edges[id]?.claimedBy).length;
      return claimedEdges === 2;
    });
  });
};

const chooseAiMove = () => {
  const available = getAvailableMoves(state.board);
  if (available.length === 0) return null;

  if (state.aiDifficulty === AIDifficulty.Easy) {
    const safeMoves = available.filter((edgeId) => !getRiskyMoves().includes(edgeId));
    return randomItem(safeMoves.length ? safeMoves : available);
  }

  const scoringMoves = getBoxCompletingMoves();
  if (scoringMoves.length) {
    return randomItem(scoringMoves);
  }

  const riskyMoves = new Set(getRiskyMoves());
  const safeMoves = available.filter((edgeId) => !riskyMoves.has(edgeId));
  if (safeMoves.length) {
    return randomItem(safeMoves);
  }

  return randomItem(available);
};

const maybeScheduleAiMove = () => {
  if (!isAiTurn() || state.aiPending || state.isGameOver) return;
  state.aiPending = true;
  const delay = 200 + Math.random() * 200;
  window.setTimeout(() => {
    state.aiPending = false;
    if (!isAiTurn() || state.isGameOver) return;
    const edgeId = chooseAiMove();
    if (!edgeId) return;
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
    if (state.isGameOver) {
      showEndgameModal();
    }
    render();
  }, delay);
};

const onResize = () => {
  if (!ui.container) return;
  const orientation = window.innerWidth >= 900 ? "landscape" : "portrait";
  ui.container.classList.toggle("is-landscape", orientation === "landscape");
  ui.container.classList.toggle("is-portrait", orientation === "portrait");
};

const init = () => {
  if (!ui.board || !ui.sizeSelect || !ui.scoreboard || !ui.currentPlayer) return;
  initializeSizeSelector();
  initializeModeSelector();
  initializeAiSelector();
  initializeThemeSelector();
  applyModeSettings();
  attachBoardListeners();
  resetGame(Number(ui.sizeSelect.value));
  onResize();
  window.addEventListener("resize", onResize);
};

init();
