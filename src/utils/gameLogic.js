// Winning combinations for a standard 3x3 grid
export const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

/**
 * Checks a 3x3 board for a winner.
 * @param {Array} cells - Flat array of 9 elements (X, O, or null)
 * @returns {Object|null} - { winner, line } if won, else null
 */
export function check3x3Win(cells) {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return { winner: cells[a], line: combo };
    }
  }
  return null;
}

/**
 * Checks if a 3x3 board is completely full (tied)
 * @param {Array} cells - Flat array of 9 elements
 * @returns {boolean}
 */
export function check3x3Tie(cells) {
  return cells.every(cell => cell !== null);
}

/**
 * Checks if a move is valid.
 * @param {Object} state - Current game state
 * @param {number} boardIndex - Index of macro board (0-8)
 * @param {number} cellIndex - Index of micro board cell (0-8)
 * @returns {boolean}
 */
export function isValidMove(state, boardIndex, cellIndex) {
  const { board, macroBoard, activeBoard, winner } = state;

  // 1. If the overall game is already won, no moves are allowed
  if (winner) return false;

  // 2. If boardIndex is not the activeBoard (when activeBoard is restricted)
  if (activeBoard !== null && boardIndex !== activeBoard) return false;

  // 3. The target sub-board must not already be won or tied
  if (macroBoard[boardIndex] !== null) return false;

  // 4. The target cell must be empty
  if (board[boardIndex][cellIndex] !== null) return false;

  return true;
}

/**
 * Initial empty game state.
 */
export function getInitialState() {
  return {
    // 9 sub-boards, each with 9 cells
    board: Array(9).fill(null).map(() => Array(9).fill(null)),
    // Status of each of the 9 sub-boards: null (active), 'X' (won), 'O' (won), 'T' (tied)
    macroBoard: Array(9).fill(null),
    // Status of sub-board winning lines (helps with visual connection)
    macroBoardLines: Array(9).fill(null),
    // Which board the active player MUST play in (null = anywhere)
    activeBoard: null,
    // Current player: 'X' or 'O'
    currentPlayer: 'X',
    // Overall winner: 'X', 'O', 'T' (tie), or null
    winner: null,
    // Winning line of the macro board (null or array of 3 indices)
    winningLine: null,
    // History log of moves made
    history: []
  };
}

/**
 * Executes a move and returns the next game state.
 * @param {Object} state - Current game state
 * @param {number} boardIndex - Index of macro board (0-8)
 * @param {number} cellIndex - Index of micro board cell (0-8)
 * @returns {Object} - New game state
 */
export function makeMove(state, boardIndex, cellIndex) {
  if (!isValidMove(state, boardIndex, cellIndex)) {
    return state;
  }

  const { board, macroBoard, macroBoardLines, currentPlayer, history } = state;

  // Clone nested arrays to maintain immutability
  const newBoard = board.map((subBoard, i) => 
    i === boardIndex ? [...subBoard] : subBoard
  );
  const newMacroBoard = [...macroBoard];
  const newMacroBoardLines = [...macroBoardLines];

  // 1. Place the token
  newBoard[boardIndex][cellIndex] = currentPlayer;

  // 2. Check if this sub-board is won
  const subBoardWin = check3x3Win(newBoard[boardIndex]);
  if (subBoardWin) {
    newMacroBoard[boardIndex] = currentPlayer;
    newMacroBoardLines[boardIndex] = subBoardWin.line;
  } else if (check3x3Tie(newBoard[boardIndex])) {
    newMacroBoard[boardIndex] = 'T'; // Tied
  }

  // 3. Check if the overall game is won on the macro board
  let newWinner = null;
  let newWinningLine = null;
  
  const macroWin = check3x3Win(newMacroBoard.map(val => (val === 'T' ? null : val)));
  if (macroWin) {
    newWinner = macroWin.winner;
    newWinningLine = macroWin.line;
  } else {
    // If no winner, check for macro tie
    // A macro board is tied if all 9 boards are won or tied, and there is no winner
    const allBoardsFinished = newMacroBoard.every(val => val !== null);
    if (allBoardsFinished) {
      newWinner = 'T';
    }
  }

  // 4. Determine next active board index
  // The cell index of the move determines the sub-board destination
  let nextActiveBoard = cellIndex;
  
  // If the target sub-board is already won or tied, the next player gets a wildcard (can play anywhere)
  if (newMacroBoard[nextActiveBoard] !== null) {
    nextActiveBoard = null;
  }

  // If the overall game has ended, no active board
  if (newWinner) {
    nextActiveBoard = null;
  }

  // 5. Toggle player
  const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';

  // 6. Record history
  const moveName = `Board ${boardIndex + 1}, Cell ${cellIndex + 1}`;
  const newHistory = [...history, {
    player: currentPlayer,
    boardIndex,
    cellIndex,
    description: `${currentPlayer}: Played cell ${cellIndex + 1} of sub-board ${boardIndex + 1}`
  }];

  return {
    board: newBoard,
    macroBoard: newMacroBoard,
    macroBoardLines: newMacroBoardLines,
    activeBoard: nextActiveBoard,
    currentPlayer: nextPlayer,
    winner: newWinner,
    winningLine: newWinningLine,
    history: newHistory
  };
}
