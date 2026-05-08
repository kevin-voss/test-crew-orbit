/** @typedef {'X' | 'O' | null} Mark */

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * @param {Mark[]} board
 * @returns {'X' | 'O' | null}
 */
function getWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    const x = board[a];
    if (x && x === board[b] && x === board[c]) {
      return x;
    }
  }
  return null;
}

/**
 * @param {Mark[]} board
 * @returns {boolean}
 */
function isBoardFull(board) {
  return board.every((cell) => cell !== null);
}

function createInitialState() {
  return {
    /** @type {Mark[]} */
    board: Array(9).fill(null),
    /** @type {'X' | 'O'} */
    currentPlayer: "X",
    winner: /** @type {'X' | 'O' | null} */ (null),
    draw: false,
  };
}

function initApp() {
  const statusEl = document.getElementById("status");
  const boardEl = document.getElementById("board");
  const resetBtn = document.getElementById("reset-btn");
  const cells = boardEl ? boardEl.querySelectorAll(".cell") : [];

  if (!statusEl || !boardEl || !resetBtn || cells.length !== 9) {
    return;
  }

  let state = createInitialState();

  function cellLabel(index, mark) {
    const n = index + 1;
    if (!mark) {
      return `Cell ${n} empty`;
    }
    return `Cell ${n}, ${mark}`;
  }

  function render() {
    state.board.forEach((mark, i) => {
      const cell = cells[i];
      cell.textContent = mark ?? "";
      cell.disabled = Boolean(state.winner || state.draw || mark);
      cell.classList.remove("mark-x", "mark-o");
      if (mark === "X") {
        cell.classList.add("mark-x");
      } else if (mark === "O") {
        cell.classList.add("mark-o");
      }
      cell.setAttribute("aria-label", cellLabel(i, mark));
    });

    statusEl.classList.remove("winner", "draw");
    if (state.winner) {
      statusEl.textContent = `${state.winner} wins!`;
      statusEl.classList.add("winner");
      cells.forEach((c) => {
        c.disabled = true;
      });
    } else if (state.draw) {
      statusEl.textContent = "It's a draw.";
      statusEl.classList.add("draw");
    } else {
      statusEl.textContent = `Current player: ${state.currentPlayer}`;
    }
  }

  function onCellClick(index) {
    if (state.winner || state.draw || state.board[index]) {
      return;
    }
    const next = [...state.board];
    next[index] = state.currentPlayer;
    const w = getWinner(next);
    const full = isBoardFull(next);
    state = {
      board: next,
      currentPlayer: state.currentPlayer === "X" ? "O" : "X",
      winner: w,
      draw: !w && full,
    };
    render();
  }

  boardEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".cell");
    if (!btn || !boardEl.contains(btn)) return;
    const idx = Number(btn.getAttribute("data-index"));
    if (Number.isInteger(idx) && idx >= 0 && idx < 9) {
      onCellClick(idx);
    }
  });

  resetBtn.addEventListener("click", () => {
    state = createInitialState();
    render();
  });

  render();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}
