export const applyLayout = (container, options = {}) => {
  if (!container) return null;
  const { orientation = "portrait" } = options;
  container.classList.toggle("is-portrait", orientation === "portrait");
  container.classList.toggle("is-landscape", orientation === "landscape");

  container.innerHTML = "";

  const toolbar = document.createElement("div");
  toolbar.setAttribute("data-ui", "toolbar");

  const board = document.createElement("div");
  board.setAttribute("data-ui", "board");
  board.style.maxWidth = "100%";
  board.style.maxHeight = "100%";

  container.append(toolbar, board);
  return { toolbar, board };
};
