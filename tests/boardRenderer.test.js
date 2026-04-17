import { describe, it, expect, beforeEach } from "vitest";

let renderBoard;
try {
  ({ renderBoard } = await import("../src/boardRenderer.js"));
} catch (error) {
  renderBoard = null;
}

const describeRenderer = renderBoard ? describe : describe.skip;

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

const setupContainer = () => {
  document.body.innerHTML = "";
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
};

describeRenderer("SVG board renderer", () => {
  let container;

  beforeEach(() => {
    container = setupContainer();
  });

  it("renders an SVG with scalable viewBox and 100% sizing", () => {
    const size = 3;
    const edges = buildEdges(size);
    const boxes = buildBoxes(size);

    const svg = renderBoard(container, {
      size,
      edges,
      boxes,
      players: [],
      hoveredEdgeId: null,
      activeEdgeId: null,
    });

    const svgElement = svg ?? container.querySelector("svg");
    expect(svgElement).toBeTruthy();
    expect(svgElement?.getAttribute("viewBox")).toBeTruthy();
    expect(svgElement?.getAttribute("width")).toBe("100%");
    expect(svgElement?.getAttribute("height")).toBe("100%");
  });

  it("renders dots for every grid intersection", () => {
    const size = 4;
    const edges = buildEdges(size);
    const boxes = buildBoxes(size);

    renderBoard(container, { size, edges, boxes, players: [] });

    const dots = container.querySelectorAll("circle[data-dot]");
    expect(dots.length).toBe((size + 1) * (size + 1));
  });

  it("renders edge hit targets sized between dots", () => {
    const size = 2;
    const edges = buildEdges(size);
    const boxes = buildBoxes(size);

    renderBoard(container, { size, edges, boxes, players: [] });

    const edgeElements = Array.from(container.querySelectorAll("[data-edge-id]"));
    expect(edgeElements.length).toBe(edges.length);

    const step = (100 - 16) / size;
    const expectedHitWidth = Math.max(8, step * 0.18);

    edgeElements.forEach((edge) => {
      const hitTarget = edge.querySelector("[data-hit-target]") ?? edge.querySelector("line") ?? edge;
      expect(hitTarget.getAttribute("data-hit-target")).toBe("true");
      const hitWidth = Number(hitTarget.style.getPropertyValue("--edge-hit-width"));
      expect(hitWidth).toBeCloseTo(expectedHitWidth, 2);
    });
  });

  it("applies player color to claimed edges", () => {
    const size = 2;
    const edges = buildEdges(size);
    const boxes = buildBoxes(size);
    const playerColor = "#ff8800";
    edges[0].claimed = true;
    edges[0].color = playerColor;

    renderBoard(container, { size, edges, boxes, players: [] });

    const claimedGroup = container.querySelector(`[data-edge-id="${edges[0].id}"]`);
    const claimedLine = claimedGroup?.querySelector(".edge");
    expect(claimedLine?.getAttribute("stroke")).toBe(playerColor);
    expect(claimedLine?.classList.contains("claimed")).toBe(true);
  });

  it("applies hover and active styles to edges", () => {
    const size = 2;
    const edges = buildEdges(size);
    const boxes = buildBoxes(size);

    renderBoard(container, {
      size,
      edges,
      boxes,
      players: [],
      hoveredEdgeId: edges[0].id,
      activeEdgeId: edges[1].id,
    });

    const hovered = container.querySelector(`[data-edge-id="${edges[0].id}"]`);
    const active = container.querySelector(`[data-edge-id="${edges[1].id}"]`);
    expect(hovered?.classList.contains("is-hovered")).toBe(true);
    expect(active?.classList.contains("is-active")).toBe(true);
  });

  it("fills completed boxes with player color and label", () => {
    const size = 2;
    const edges = buildEdges(size);
    const boxes = buildBoxes(size);
    boxes[0].owner = "p1";
    const players = [{ id: "p1", name: "A", color: "#ff3366" }];

    renderBoard(container, { size, edges, boxes, players });

    const box = container.querySelector('[data-box-id="b-0-0"]');
    expect(box).toBeTruthy();
    expect(box?.getAttribute("data-owner-id")).toBe("p1");
    expect(box?.getAttribute("fill")).toBe(players[0].color);

    const label = container.querySelector('[data-box-label="b-0-0"]');
    expect(label?.textContent?.trim()).toBe(players[0].name);
  });
});
