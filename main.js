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
