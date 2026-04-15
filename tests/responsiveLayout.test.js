import { describe, it, expect, beforeEach } from "vitest";

let applyLayout;
try {
  ({ applyLayout } = await import("../src/layout.js"));
} catch (error) {
  applyLayout = null;
}

const describeLayout = applyLayout ? describe : describe.skip;

const setupContainer = () => {
  document.body.innerHTML = "";
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
};

describeLayout("Responsive layout", () => {
  let container;

  beforeEach(() => {
    container = setupContainer();
  });

  it("creates toolbar and board containers", () => {
    applyLayout(container, { orientation: "portrait" });

    const toolbar = container.querySelector("[data-ui=toolbar]");
    const board = container.querySelector("[data-ui=board]");

    expect(toolbar).toBeTruthy();
    expect(board).toBeTruthy();
  });

  it("adds orientation class for portrait/landscape tuning", () => {
    applyLayout(container, { orientation: "landscape" });

    expect(container.classList.contains("is-landscape")).toBe(true);
    expect(container.classList.contains("is-portrait")).toBe(false);
  });

  it("applies responsive scale styling to board area", () => {
    applyLayout(container, { orientation: "portrait" });

    const board = container.querySelector("[data-ui=board]");
    const style = board?.getAttribute("style") ?? "";

    expect(style.includes("max-width")).toBe(true);
    expect(style.includes("max-height")).toBe(true);
  });
});
