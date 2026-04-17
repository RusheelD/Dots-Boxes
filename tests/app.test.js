import { describe, it, expect, beforeEach, vi } from "vitest";

const setupDom = () => {
  document.body.innerHTML = `
    <div>
      <select id="theme-select"></select>
      <select id="size-select">
        <option value="4">4 x 4</option>
        <option value="5">5 x 5</option>
        <option value="6">6 x 6</option>
        <option value="7">7 x 7</option>
      </select>
      <button id="reset-button" type="button">Reset</button>
      <div id="scoreboard"></div>
      <span id="current-player"></span>
      <div id="board"></div>
      <div id="endgame-modal" hidden>
        <h2 id="endgame-title"></h2>
        <p id="endgame-summary"></p>
        <div id="endgame-scores"></div>
        <button id="play-again-button" type="button">Play again</button>
      </div>
    </div>
  `;
};

const loadApp = async () => {
  setupDom();
  vi.resetModules();
  await import("../app.js");
};

const claimAllEdges = () => {
  let unclaimed = document.querySelector(".edge:not(.claimed)");
  let safety = 0;

  while (unclaimed && safety < 300) {
    const hitTarget = unclaimed.nextSibling;
    if (!hitTarget) {
      throw new Error("Expected edge hit target for unclaimed edge");
    }
    hitTarget.dispatchEvent(new Event("pointerup", { bubbles: true }));
    unclaimed = document.querySelector(".edge:not(.claimed)");
    safety += 1;
  }
};

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("App UI theming", () => {
  it("populates theme dropdown and applies default theme", async () => {
    await loadApp();

    const themeSelect = document.getElementById("theme-select");
    expect(themeSelect?.children.length).toBe(5);
    expect(document.body.dataset.theme).toBe("classic");
    expect(localStorage.getItem("dots-theme")).toBe("classic");
  });

  it("applies stored theme and updates on selection change", async () => {
    localStorage.setItem("dots-theme", "neon");
    await loadApp();

    const themeSelect = document.getElementById("theme-select");
    expect(themeSelect?.value).toBe("neon");
    expect(document.body.dataset.theme).toBe("neon");

    themeSelect.value = "pastel";
    themeSelect.dispatchEvent(new Event("change", { bubbles: true }));

    expect(document.body.dataset.theme).toBe("pastel");
    expect(localStorage.getItem("dots-theme")).toBe("pastel");
  });
});

describe("Endgame modal", () => {
  it("shows summary on game completion and resets on play again", async () => {
    await loadApp();

    const sizeSelect = document.getElementById("size-select");
    sizeSelect.value = "4";
    sizeSelect.dispatchEvent(new Event("change", { bubbles: true }));

    claimAllEdges();

    const modal = document.getElementById("endgame-modal");
    const title = document.getElementById("endgame-title");
    const scores = document.getElementById("endgame-scores");

    expect(modal?.hidden).toBe(false);
    expect(modal?.classList.contains("is-visible")).toBe(true);
    expect(title?.textContent?.trim()).toBeTruthy();
    expect(scores?.children.length).toBe(2);

    const playAgainButton = document.getElementById("play-again-button");
    playAgainButton.click();

    expect(modal?.hidden).toBe(true);

    const scoreValues = Array.from(document.querySelectorAll(".score-card span:last-child")).map(
      (node) => node.textContent?.trim()
    );
    expect(scoreValues).toEqual(["0", "0"]);
  });
});
