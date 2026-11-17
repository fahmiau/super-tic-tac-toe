// Winning combinations for a standard 3x3 grid
export const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export const GAME_VARIANTS = {
  SUPER: 'super',
  CLASSIC: 'classic',
  MOVING: 'moving'
};

export const GAME_VARIANT_INFO = {
  [GAME_VARIANTS.SUPER]: {
    id: GAME_VARIANTS.SUPER,
    name: 'Super Tic Tac Toe',
    shortName: 'Super',
    subtitle: '9×9 Tactical',
    description: 'Nested 3×3 boards where each move sends your opponent to the matching sub-board.'
  },
  [GAME_VARIANTS.CLASSIC]: {
    id: GAME_VARIANTS.CLASSIC,
    name: 'Classic Tic Tac Toe',
    shortName: 'Classic',
    subtitle: 'Standard 3×3',
    description: 'Traditional 3×3 Tic Tac Toe. First player to line up 3 marks wins.'
  },
  [GAME_VARIANTS.MOVING]: {
    id: GAME_VARIANTS.MOVING,
    name: '3-Piece Shift',
    shortName: '3-Piece',
    subtitle: 'Max 3 · Move Any',
    description: 'Each player has max 3 marks. After placing 3, move any of your marks to an empty cell.'
  }
};

export const MAX_MOVING_PIECES = 3;

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
 * Counts how many pieces a player currently has on a 3x3 board.
 * @param {Array} cells
 * @param {string} player - 'X' or 'O'
 * @returns {number}
 */
export function countPieces(cells, player) {
  let count = 0;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === player) count++;
  }
  return count;
}

/**
 * Normalizes move arguments into a move object for the state's variant.
 */
function normalizeMove(state, moveOrBoardIndex, maybeCellIndex) {
  if (typeof moveOrBoardIndex === 'object' && moveOrBoardIndex !== null) {
    return moveOrBoardIndex;
  }
  const variant = state?.variant || GAME_VARIANTS.SUPER;
  if (variant === GAME_VARIANTS.SUPER) {
    return { boardIndex: moveOrBoardIndex, cellIndex: maybeCellIndex };
  }
  return { cellIndex: moveOrBoardIndex };
}

function isValidCellIndex(idx) {
  return Number.isInteger(idx) && idx >= 0 && idx < 9;
}

/**
 * Initial empty game state for the given variant.
 * @param {string} variant - 'super' | 'classic' | 'moving'
 */
export function getInitialState(variant = GAME_VARIANTS.SUPER) {
  if (variant === GAME_VARIANTS.CLASSIC || variant === GAME_VARIANTS.MOVING) {
    return {
      variant,
      cells: Array(9).fill(null),
      currentPlayer: 'X',
      winner: null,
      winningLine: null,
      lastMove: null,
      history: []
    };
  }

  return {
    variant: GAME_VARIANTS.SUPER,
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
 * Returns all legal moves for the current state.
 */
export function getValidMoves(state) {
  if (!state || state.winner) return [];
  const variant = state.variant || GAME_VARIANTS.SUPER;

  if (variant === GAME_VARIANTS.CLASSIC) {
    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (state.cells[i] === null) {
        moves.push({ cellIndex: i });
      }
    }
    return moves;
  }

  if (variant === GAME_VARIANTS.MOVING) {
    const pieceCount = countPieces(state.cells, state.currentPlayer);
    const moves = [];

    if (pieceCount < MAX_MOVING_PIECES) {
      for (let i = 0; i < 9; i++) {
        if (state.cells[i] === null) {
          moves.push({ fromIndex: null, toIndex: i });
        }
      }
      return moves;
    }

    const myPieces = [];
    const emptyCells = [];
    for (let i = 0; i < 9; i++) {
      if (state.cells[i] === state.currentPlayer) {
        myPieces.push(i);
      } else if (state.cells[i] === null) {
        emptyCells.push(i);
      }
    }

    for (const fromIndex of myPieces) {
      for (const toIndex of emptyCells) {
        moves.push({ fromIndex, toIndex });
      }
    }
    return moves;
  }

  // Super Tic Tac Toe
  const { board, macroBoard, activeBoard } = state;
  const moves = [];

  if (activeBoard !== null && macroBoard[activeBoard] === null) {
    const subBoard = board[activeBoard];
    for (let i = 0; i < 9; i++) {
      if (subBoard[i] === null) {
        moves.push({ boardIndex: activeBoard, cellIndex: i });
      }
    }
  }

  if (moves.length === 0) {
    for (let b = 0; b < 9; b++) {
      if (macroBoard[b] === null) {
        const subBoard = board[b];
        for (let c = 0; c < 9; c++) {
          if (subBoard[c] === null) {
            moves.push({ boardIndex: b, cellIndex: c });
          }
        }
      }
    }
  }

  return moves;
}

/**
 * Checks if a move is valid for the current state and variant.
 */
export function isValidMove(state, moveOrBoardIndex, maybeCellIndex) {
  if (!state || state.winner) return false;

  const variant = state.variant || GAME_VARIANTS.SUPER;
  const move = normalizeMove(state, moveOrBoardIndex, maybeCellIndex);

  if (variant === GAME_VARIANTS.CLASSIC) {
    const cellIndex = move.cellIndex ?? move.toIndex;
    return isValidCellIndex(cellIndex) && state.cells[cellIndex] === null;
  }

  if (variant === GAME_VARIANTS.MOVING) {
    const pieceCount = countPieces(state.cells, state.currentPlayer);
    const toIndex = move.toIndex ?? move.cellIndex;
    const fromIndex = move.fromIndex ?? null;

    if (!isValidCellIndex(toIndex) || state.cells[toIndex] !== null) {
      return false;
    }

    if (pieceCount < MAX_MOVING_PIECES) {
      return fromIndex === null;
    }

    return (
      isValidCellIndex(fromIndex) &&
      fromIndex !== toIndex &&
      state.cells[fromIndex] === state.currentPlayer
    );
  }

  // Super Tic Tac Toe
  const { boardIndex, cellIndex } = move;
  if (!isValidCellIndex(boardIndex) || !isValidCellIndex(cellIndex)) {
    return false;
  }

  const { board, macroBoard, activeBoard } = state;
  if (activeBoard !== null && boardIndex !== activeBoard) return false;
  if (macroBoard[boardIndex] !== null) return false;
  if (board[boardIndex][cellIndex] !== null) return false;

  return true;
}

/**
 * Executes a move and returns the next game state.
 */
export function makeMove(state, moveOrBoardIndex, maybeCellIndex) {
  if (!isValidMove(state, moveOrBoardIndex, maybeCellIndex)) {
    return state;
  }

  const variant = state.variant || GAME_VARIANTS.SUPER;
  const move = normalizeMove(state, moveOrBoardIndex, maybeCellIndex);

  if (variant === GAME_VARIANTS.CLASSIC) {
    const cellIndex = move.cellIndex ?? move.toIndex;
    const { cells, currentPlayer, history } = state;
    const newCells = [...cells];
    newCells[cellIndex] = currentPlayer;

    const win = check3x3Win(newCells);
    let newWinner = null;
    let newWinningLine = null;

    if (win) {
      newWinner = win.winner;
      newWinningLine = win.line;
    } else if (check3x3Tie(newCells)) {
      newWinner = 'T';
    }

    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
    const newHistory = [
      ...history,
      {
        player: currentPlayer,
        cellIndex,
        description: `${currentPlayer}: Played cell ${cellIndex + 1}`
      }
    ];

    return {
      ...state,
      cells: newCells,
      currentPlayer: nextPlayer,
      winner: newWinner,
      winningLine: newWinningLine,
      lastMove: { player: currentPlayer, fromIndex: null, toIndex: cellIndex },
      history: newHistory
    };
  }

  if (variant === GAME_VARIANTS.MOVING) {
    const { cells, currentPlayer, history } = state;
    const fromIndex = move.fromIndex ?? null;
    const toIndex = move.toIndex ?? move.cellIndex;
    const pieceCount = countPieces(cells, currentPlayer);
    const newCells = [...cells];

    let description;
    if (pieceCount < MAX_MOVING_PIECES) {
      newCells[toIndex] = currentPlayer;
      description = `${currentPlayer}: Placed cell ${toIndex + 1} (${pieceCount + 1}/${MAX_MOVING_PIECES})`;
    } else {
      newCells[fromIndex] = null;
      newCells[toIndex] = currentPlayer;
      description = `${currentPlayer}: Moved ${fromIndex + 1} → ${toIndex + 1}`;
    }

    const win = check3x3Win(newCells);
    const newWinner = win ? win.winner : null;
    const newWinningLine = win ? win.line : null;
    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';

    const newHistory = [
      ...history,
      {
        player: currentPlayer,
        fromIndex,
        toIndex,
        description
      }
    ];

    return {
      ...state,
      cells: newCells,
      currentPlayer: nextPlayer,
      winner: newWinner,
      winningLine: newWinningLine,
      lastMove: { player: currentPlayer, fromIndex, toIndex },
      history: newHistory
    };
  }

  // Super Tic Tac Toe
  const { boardIndex, cellIndex } = move;
  const { board, macroBoard, macroBoardLines, currentPlayer, history } = state;

  const newBoard = board.map((subBoard, i) =>
    i === boardIndex ? [...subBoard] : subBoard
  );
  const newMacroBoard = [...macroBoard];
  const newMacroBoardLines = [...macroBoardLines];

  newBoard[boardIndex][cellIndex] = currentPlayer;

  const subBoardWin = check3x3Win(newBoard[boardIndex]);
  if (subBoardWin) {
    newMacroBoard[boardIndex] = currentPlayer;
    newMacroBoardLines[boardIndex] = subBoardWin.line;
  } else if (check3x3Tie(newBoard[boardIndex])) {
    newMacroBoard[boardIndex] = 'T';
  }

  let newWinner = null;
  let newWinningLine = null;

  const macroWin = check3x3Win(newMacroBoard.map(val => (val === 'T' ? null : val)));
  if (macroWin) {
    newWinner = macroWin.winner;
    newWinningLine = macroWin.line;
  } else {
    const allBoardsFinished = newMacroBoard.every(val => val !== null);
    if (allBoardsFinished) {
      newWinner = 'T';
    }
  }

  let nextActiveBoard = cellIndex;
  if (newMacroBoard[nextActiveBoard] !== null) {
    nextActiveBoard = null;
  }
  if (newWinner) {
    nextActiveBoard = null;
  }

  const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
  const newHistory = [
    ...history,
    {
      player: currentPlayer,
      boardIndex,
      cellIndex,
      description: `${currentPlayer}: Played cell ${cellIndex + 1} of sub-board ${boardIndex + 1}`
    }
  ];

  return {
    variant: GAME_VARIANTS.SUPER,
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
