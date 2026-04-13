let boardState = null;
let scores = { player1: 0, player2: 0 };

const boardSizeSelect = document.getElementById("board-size");
const boardSizeLabel = document.getElementById("board-size-label");
const scorePlayer1 = document.getElementById("score-player-1");
const scorePlayer2 = document.getElementById("score-player-2");
const boardSummary = document.getElementById("board-summary");

function updateSizeLabel(size) {
  boardSizeLabel.textContent = `Current board size: ${size} x ${size}`;
}

function resetScores() {
  scores = { player1: 0, player2: 0 };
  scorePlayer1.textContent = "0";
  scorePlayer2.textContent = "0";
}

function renderBoardSummary(state) {
  if (!state) {
    boardSummary.textContent = "";
    return;
  }

  const edgesCount = Object.keys(state.edges).length;
  const boxesCount = Object.keys(state.boxes).length;
  boardSummary.textContent = `Dots: ${state.dots.length} | Edges: ${edgesCount} | Boxes: ${boxesCount}`;
}

function initializeBoard(size) {
  boardState = createBoard(size);
  resetScores();
  updateSizeLabel(size);
  renderBoardSummary(boardState);
}

boardSizeSelect.addEventListener("change", (event) => {
  const nextSize = Number(event.target.value);
  initializeBoard(nextSize);
});

const initialSize = Number(boardSizeSelect.value || 6);
initializeBoard(initialSize);
