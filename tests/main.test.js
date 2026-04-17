import { describe, it, expect, beforeEach, vi } from "vitest";

const renderBoardMock = vi.fn((container, options) => {
  if (!container) return null;
  container.innerHTML = "";
  (options?.edges ?? []).forEach((edge) => {
    const edgeNode = container.ownerDocument.createElement("div");
    edgeNode.setAttribute("data-edge-id", edge.id);
    container.appendChild(edgeNode);
  });
  return container;
});

vi.mock("../src/boardRenderer.js", () => ({
  renderBoard: (...args) => renderBoardMock(...args),
}));

const buildBoard = () => ({
  size: 6,
  edges: {
    "e-h-r0c0": {
      id: "e-h-r0c0",
      fromDotId: "d-r0c0",
      orientation: "h",
      claimedBy: null,
      adjacentBoxIds: [],
    },
    "e-h-r0c1": {
      id: "e-h-r0c1",
      fromDotId: "d-r0c1",
      orientation: "h",
      claimedBy: null,
      adjacentBoxIds: [],
    },
  },
  boxes: {},
});

const setupDom = () => {
  document.body.innerHTML = `
    <div id="game"></div>
    <select id="board-size">
      <option value="6" selected>6</option>
      <option value="7">7</option>
    </select>
    <span id="board-size-label"></span>
    <div id="board"></div>
    <div id="scoreboard"></div>
    <div id="current-player"></div>
    <div id="game-status"></div>
    <button id="reset-game"></button>
  `;
};

const dispatchPointer = (element, type, pointerId) => {
  const event = new Event(type, { bubbles: true });
  event.pointerId = pointerId;
  element.dispatchEvent(event);
};

describe("main UI interactions", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    setupDom();
    const board = buildBoard();
    window.createBoard = vi.fn(() => board);
    window.applyMove = vi.fn(() => ({
      scores: { "player-1": 0, "player-2": 0 },
      currentPlayerId: "player-1",
      isGameOver: false,
      winnerId: null,
    }));
    window.getGameOutcome = vi.fn(() => ({ isTie: false, winnerId: null }));
    await import("../main.js");
  });

  it("does not claim edge if pointerup occurs on a different edge", () => {
    const edges = document.querySelectorAll("[data-edge-id]");
    expect(edges.length).toBeGreaterThan(1);

    dispatchPointer(edges[0], "pointerdown", 1);
    dispatchPointer(edges[1], "pointerup", 1);

    expect(window.applyMove).not.toHaveBeenCalled();
  });

  it("claims edge when pointerup occurs on the active edge", () => {
    const edges = document.querySelectorAll("[data-edge-id]");
    expect(edges.length).toBeGreaterThan(0);

    dispatchPointer(edges[0], "pointerdown", 2);
    dispatchPointer(edges[0], "pointerup", 2);

    expect(window.applyMove).toHaveBeenCalledTimes(1);
    expect(window.applyMove.mock.calls[0][1]).toBe(edges[0].getAttribute("data-edge-id"));
  });
});
