import { ThemeName } from "./contracts/game.js";

const state = {
  size: 6,
  currentPlayer: 0,
  players: [
    { name: "Player 1", color: "var(--p1)", score: 0, label: "P1" },
    { name: "Player 2", color: "var(--p2)", score: 0, label: "P2" },
  ],
  edges: new Map(),
  boxes: new Map(),
};

const boardEl = document.getElementById("board");
const sizeSelect = document.getElementById("size-select");
const resetButton = document.getElementById("reset-button");
const scoreboardEl = document.getElementById("scoreboard");
const currentPlayerEl = document.getElementById("current-player");
const themeSelect = document.getElementById("theme-select");
const endgameModal = document.getElementById("endgame-modal");
const endgameTitle = document.getElementById("endgame-title");
const endgameSummary = document.getElementById("endgame-summary");
const endgameScores = document.getElementById("endgame-scores");
const playAgainButton = document.getElementById("play-again-button");

const GRID_PADDING = 24;
const DOT_RADIUS = 6;
const VIEWBOX_SIZE = 500;

const THEMES = [
  { name: ThemeName.Classic, label: "Classic" },
  { name: ThemeName.Neon, label: "Neon" },
  { name: ThemeName.Pastel, label: "Pastel" },
  { name: ThemeName.Mono, label: "Mono" },
  { name: ThemeName.Sunset, label: "Sunset" },
];

function init() {
  setupThemes();

  sizeSelect.value = String(state.size);
  sizeSelect.addEventListener("change", (event) => {
    state.size = Number(event.target.value);
    resetBoard();
  });

  resetButton.addEventListener("click", () => resetBoard());
  playAgainButton.addEventListener("click", () => {
    closeEndgameModal();
    resetBoard();
  });

  endgameModal.addEventListener("click", (event) => {
    if (event.target === endgameModal) {
      closeEndgameModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !endgameModal.hidden) {
      closeEndgameModal();
    }
  });

  resetBoard();
}

function resetBoard() {
  state.edges.clear();
  state.boxes.clear();
  state.currentPlayer = 0;
  state.players.forEach((player) => {
    player.score = 0;
  });

  closeEndgameModal();
  render();
}

function edgeKey(x, y, orientation) {
  return `${x}-${y}-${orientation}`;
}

function boxKey(x, y) {
  return `${x}-${y}`;
}

function render() {
  renderScoreboard();
  renderBoard();
  checkGameOver();
}

function renderScoreboard() {
  scoreboardEl.innerHTML = "";
  state.players.forEach((player, index) => {
    const card = document.createElement("div");
    card.className = "score-card";
    card.style.border = `2px solid ${player.color}`;
    const name = document.createElement("span");
    name.textContent = player.name;
    const score = document.createElement("span");
    score.textContent = player.score;
    card.append(name, score);
    if (index === state.currentPlayer) {
      card.style.background = player.color;
      card.style.color = "#fff";
    }
    scoreboardEl.append(card);
  });

  const activePlayer = state.players[state.currentPlayer];
  currentPlayerEl.textContent = activePlayer.name;
  currentPlayerEl.style.color = activePlayer.color;
}

function setupThemes() {
  themeSelect.innerHTML = "";
  THEMES.forEach((theme) => {
    const option = document.createElement("option");
    option.value = theme.name;
    option.textContent = theme.label;
    themeSelect.append(option);
  });

  const storedTheme = localStorage.getItem("dots-theme");
  const initialTheme = THEMES.find((theme) => theme.name === storedTheme)?.name || ThemeName.Classic;
  applyTheme(initialTheme);
  themeSelect.value = initialTheme;

  themeSelect.addEventListener("change", (event) => {
    const selectedTheme = event.target.value;
    applyTheme(selectedTheme);
  });
}

function applyTheme(themeName) {
  document.body.dataset.theme = themeName;
  localStorage.setItem("dots-theme", themeName);
}

function checkGameOver() {
  const totalBoxes = (state.size - 1) * (state.size - 1);
  const claimedBoxes = state.boxes.size;
  if (claimedBoxes < totalBoxes) return;
  showEndgameModal();
}

function showEndgameModal() {
  const maxScore = Math.max(...state.players.map((player) => player.score));
  const winners = state.players.filter((player) => player.score === maxScore);
  const isTie = winners.length > 1;

  endgameTitle.textContent = isTie ? "It's a tie!" : `${winners[0].name} wins!`;
  endgameSummary.textContent = isTie
    ? "Great game! Both players finished with the same score."
    : "Nice work! Here's the final score.";

  endgameScores.innerHTML = "";
  state.players.forEach((player) => {
    const item = document.createElement("div");
    item.className = "modal__score";
    item.style.borderColor = player.color;

    const name = document.createElement("span");
    name.textContent = player.name;

    const score = document.createElement("span");
    score.textContent = player.score;

    item.append(name, score);
    endgameScores.append(item);
  });

  endgameModal.hidden = false;
  endgameModal.classList.add("is-visible");
  playAgainButton.focus();
}

function closeEndgameModal() {
  endgameModal.hidden = true;
  endgameModal.classList.remove("is-visible");
}

function renderBoard() {
  boardEl.innerHTML = "";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("board");
  svg.setAttribute("viewBox", `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Dots and boxes board");

  const gridSize = state.size - 1;
  const step = (VIEWBOX_SIZE - GRID_PADDING * 2) / gridSize;

  renderBoxes(svg, step);
  renderEdges(svg, step);
  renderDots(svg, step);

  boardEl.append(svg);
}

function renderBoxes(svg, step) {
  const max = state.size - 1;
  for (let x = 0; x < max; x += 1) {
    for (let y = 0; y < max; y += 1) {
      const owner = state.boxes.get(boxKey(x, y));
      if (owner == null) continue;
      const player = state.players[owner];
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      const xPos = GRID_PADDING + x * step + DOT_RADIUS;
      const yPos = GRID_PADDING + y * step + DOT_RADIUS;
      rect.setAttribute("x", xPos);
      rect.setAttribute("y", yPos);
      rect.setAttribute("width", step - DOT_RADIUS * 2);
      rect.setAttribute("height", step - DOT_RADIUS * 2);
      rect.setAttribute("fill", player.color);
      rect.classList.add("box-fill");
      svg.append(rect);

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.classList.add("box-label");
      label.textContent = player.label;
      label.setAttribute("x", xPos + (step - DOT_RADIUS * 2) / 2);
      label.setAttribute("y", yPos + (step - DOT_RADIUS * 2) / 2);
      svg.append(label);
    }
  }
}

function renderEdges(svg, step) {
  const gridSize = state.size - 1;
  const orientations = ["h", "v"];

  orientations.forEach((orientation) => {
    const maxX = orientation === "h" ? gridSize : state.size;
    const maxY = orientation === "h" ? state.size : gridSize;

    for (let x = 0; x < maxX; x += 1) {
      for (let y = 0; y < maxY; y += 1) {
        const key = edgeKey(x, y, orientation);
        const owner = state.edges.get(key);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        const hit = document.createElementNS("http://www.w3.org/2000/svg", "line");

        const startX = GRID_PADDING + x * step;
        const startY = GRID_PADDING + y * step;
        const endX = orientation === "h" ? startX + step : startX;
        const endY = orientation === "h" ? startY : startY + step;

        line.setAttribute("x1", startX);
        line.setAttribute("y1", startY);
        line.setAttribute("x2", endX);
        line.setAttribute("y2", endY);
        line.classList.add("edge");

        if (owner != null) {
          line.classList.add("claimed");
          line.style.stroke = state.players[owner].color;
        }

        line.dataset.orientation = orientation;

        hit.setAttribute("x1", startX);
        hit.setAttribute("y1", startY);
        hit.setAttribute("x2", endX);
        hit.setAttribute("y2", endY);
        hit.classList.add("edge-hit");
        hit.setAttribute("aria-label", "Claim edge");
        hit.setAttribute("tabindex", "0");

        hit.addEventListener("mouseenter", () => {
          if (state.edges.has(key)) return;
          line.classList.add("hovered");
        });

        hit.addEventListener("mouseleave", () => {
          line.classList.remove("hovered");
          line.classList.remove("active");
        });

        hit.addEventListener("pointerdown", () => {
          if (state.edges.has(key)) return;
          line.classList.add("active");
        });

        hit.addEventListener("pointerup", () => {
          if (state.edges.has(key)) return;
          line.classList.remove("active");
          claimEdge(key, x, y, orientation);
        });

        svg.append(line, hit);
      }
    }
  });
}

function renderDots(svg, step) {
  for (let x = 0; x < state.size; x += 1) {
    for (let y = 0; y < state.size; y += 1) {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.classList.add("dot");
      dot.setAttribute("cx", GRID_PADDING + x * step);
      dot.setAttribute("cy", GRID_PADDING + y * step);
      dot.setAttribute("r", DOT_RADIUS);
      svg.append(dot);
    }
  }
}

function claimEdge(key, x, y, orientation) {
  state.edges.set(key, state.currentPlayer);
  const completed = checkCompletedBoxes(x, y, orientation);

  if (completed.length > 0) {
    completed.forEach((box) => {
      state.boxes.set(boxKey(box.x, box.y), state.currentPlayer);
      state.players[state.currentPlayer].score += 1;
    });
  } else {
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  }

  render();
}

function checkCompletedBoxes(x, y, orientation) {
  const boxes = [];
  const candidates = [];

  if (orientation === "h") {
    if (y > 0) candidates.push({ x, y: y - 1 });
    if (y < state.size - 1) candidates.push({ x, y });
  } else {
    if (x > 0) candidates.push({ x: x - 1, y });
    if (x < state.size - 1) candidates.push({ x, y });
  }

  candidates.forEach((box) => {
    const top = edgeKey(box.x, box.y, "h");
    const bottom = edgeKey(box.x, box.y + 1, "h");
    const left = edgeKey(box.x, box.y, "v");
    const right = edgeKey(box.x + 1, box.y, "v");

    if (state.edges.has(top) && state.edges.has(bottom) && state.edges.has(left) && state.edges.has(right)) {
      boxes.push(box);
    }
  });

  return boxes;
}

init();
