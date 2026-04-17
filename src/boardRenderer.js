const DEFAULT_VIEWBOX = 100;
const GRID_PADDING = 8;

const getPlayerMap = (players = []) => {
  return players.reduce((acc, player) => {
    acc[player.id] = player;
    return acc;
  }, {});
};

const createSvg = (documentRef, size) => {
  const svg = documentRef.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${DEFAULT_VIEWBOX} ${DEFAULT_VIEWBOX}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Dots and boxes board");
  svg.setAttribute("data-size", size);
  return svg;
};

const appendBox = (svg, { x, y, step, box, player }) => {
  const rect = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.classList.add("box-fill");
  rect.setAttribute("data-box-id", box.id);
  if (player) {
    rect.setAttribute("data-owner-id", player.id);
    rect.setAttribute("fill", player.color);
  }
  rect.setAttribute("x", x);
  rect.setAttribute("y", y);
  rect.setAttribute("width", step);
  rect.setAttribute("height", step);
  svg.append(rect);

};

const appendDot = (svg, { x, y, radius }) => {
  const dot = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.classList.add("dot");
  dot.setAttribute("data-dot", "true");
  dot.setAttribute("cx", x);
  dot.setAttribute("cy", y);
  dot.setAttribute("r", radius);
  svg.append(dot);
};

const appendEdge = (
  svg,
  { edge, startX, startY, endX, endY, hoveredEdgeId, activeEdgeId, hitStrokeWidth }
) => {
  const group = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("data-edge-id", edge.id);
  group.setAttribute("tabindex", "0");
  group.setAttribute("role", "button");
  group.setAttribute("aria-label", "Claim edge");
  group.classList.add("edge-group");
  if (edge.id === hoveredEdgeId) group.classList.add("is-hovered");
  if (edge.id === activeEdgeId) group.classList.add("is-active");

  const hit = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
  hit.classList.add("edge-hit");
  hit.setAttribute("data-hit-target", "true");
  hit.setAttribute("x1", startX);
  hit.setAttribute("y1", startY);
  hit.setAttribute("x2", endX);
  hit.setAttribute("y2", endY);
  if (hitStrokeWidth) {
    hit.style.setProperty("--edge-hit-width", String(hitStrokeWidth));
  }

  const line = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
  line.classList.add("edge");
  line.setAttribute("x1", startX);
  line.setAttribute("y1", startY);
  line.setAttribute("x2", endX);
  line.setAttribute("y2", endY);
  if (edge.claimed) {
    line.classList.add("claimed");
    if (edge.color) line.setAttribute("stroke", edge.color);
  }

  group.append(hit, line);
  svg.append(group);
};

export const renderBoard = (container, options) => {
  if (!container) return null;
  const { size, edges = [], boxes = [], players = [], hoveredEdgeId = null, activeEdgeId = null } = options || {};
  const documentRef = container.ownerDocument || document;
  container.innerHTML = "";

  const gridSize = Number(size ?? 0);
  if (!gridSize) return null;

  const svg = createSvg(documentRef, gridSize);
  const step = (DEFAULT_VIEWBOX - GRID_PADDING * 2) / gridSize;
  const dotRadius = Math.max(1.4, step * 0.08);
  const hitStrokeWidth = Math.max(8, step * 0.18);
  const playerMap = getPlayerMap(players);

  boxes.forEach((box) => {
    const player = box.owner ? playerMap[box.owner] : null;
    const x = GRID_PADDING + box.col * step;
    const y = GRID_PADDING + box.row * step;
    appendBox(svg, { x, y, step, box, player });
  });

  edges.forEach((edge) => {
    const startX = GRID_PADDING + edge.col * step;
    const startY = GRID_PADDING + edge.row * step;
    const endX = edge.orientation === "h" ? startX + step : startX;
    const endY = edge.orientation === "h" ? startY : startY + step;
    appendEdge(svg, {
      edge,
      startX,
      startY,
      endX,
      endY,
      hoveredEdgeId,
      activeEdgeId,
      hitStrokeWidth,
    });
  });

  for (let row = 0; row <= gridSize; row += 1) {
    for (let col = 0; col <= gridSize; col += 1) {
      const x = GRID_PADDING + col * step;
      const y = GRID_PADDING + row * step;
      appendDot(svg, { x, y, radius: dotRadius });
    }
  }

  container.append(svg);
  return svg;
};
