import { GameMode } from "./contracts/game.js";

const modeSelect = document.querySelector("#mode-select");
const playerIndicator = document.querySelector("#player-indicator");
const passPrompt = document.querySelector("#pass-prompt");
const endTurnButton = document.querySelector("#end-turn");

const state = {
  mode: GameMode.TwoPlayer,
  currentPlayer: 1,
};

const modeLabels = {
  [GameMode.TwoPlayer]: "Two Player (Pass-and-Play)",
  [GameMode.VsAI]: "Vs AI",
};

function updateUI() {
  const currentLabel = `Player ${state.currentPlayer}'s turn`;
  playerIndicator.textContent = currentLabel;

  if (state.mode === GameMode.TwoPlayer) {
    passPrompt.textContent = `Pass the device to Player ${state.currentPlayer}.`;
    passPrompt.hidden = false;
    endTurnButton.disabled = false;
  } else {
    passPrompt.textContent = `Playing against AI (${modeLabels[GameMode.VsAI]}).`;
    passPrompt.hidden = false;
    endTurnButton.disabled = true;
  }
}

function setMode(nextMode) {
  state.mode = nextMode;
  state.currentPlayer = 1;
  updateUI();
}

function toggleTurn() {
  if (state.mode !== GameMode.TwoPlayer) return;
  state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
  updateUI();
}

modeSelect.value = state.mode;
modeSelect.addEventListener("change", (event) => {
  const selectedMode = event.target.value;
  if (selectedMode === GameMode.VsAI || selectedMode === GameMode.TwoPlayer) {
    setMode(selectedMode);
  }
});

endTurnButton.addEventListener("click", toggleTurn);

updateUI();
