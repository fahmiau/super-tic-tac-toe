const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

/**
 * Checks a 3x3 board for a winner. Returns winner ('X' or 'O') or null.
 */
function check3x3WinLight(cells) {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a];
    }
  }
  return null;
}

/**
 * Checks if a 3x3 board is full.
 */
function check3x3TieLight(cells) {
  return cells.every(cell => cell !== null);
}

/**
 * Deep copies the essential game state for fast simulations.
 */
function copyState(state) {
  return {
    board: state.board.map(subBoard => [...subBoard]),
    macroBoard: [...state.macroBoard],
    activeBoard: state.activeBoard,
    currentPlayer: state.currentPlayer,
    winner: state.winner
  };
}

/**
 * Gets all valid moves for the current state.
 */
function getValidMoves(state) {
  const { board, macroBoard, activeBoard, winner } = state;
  if (winner) return [];

  const moves = [];
  
  // If activeBoard is restricted and that board is still open
  if (activeBoard !== null && macroBoard[activeBoard] === null) {
    const subBoard = board[activeBoard];
    for (let i = 0; i < 9; i++) {
      if (subBoard[i] === null) {
        moves.push({ boardIndex: activeBoard, cellIndex: i });
      }
    }
  }
  
  // Wildcard: If activeBoard is null OR the target activeBoard is already won/tied
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
 * A lightweight makeMove for fast simulations.
 */
function makeMoveLight(state, boardIndex, cellIndex) {
  const { board, macroBoard, currentPlayer } = state;
  
  // Clone board sub-arrays selectively
  const newBoard = board.map((subBoard, i) => 
    i === boardIndex ? [...subBoard] : subBoard
  );
  const newMacroBoard = [...macroBoard];

  // 1. Place the token
  newBoard[boardIndex][cellIndex] = currentPlayer;

  // 2. Check if this sub-board is won
  const subBoardWin = check3x3WinLight(newBoard[boardIndex]);
  if (subBoardWin) {
    newMacroBoard[boardIndex] = currentPlayer;
  } else if (check3x3TieLight(newBoard[boardIndex])) {
    newMacroBoard[boardIndex] = 'T'; // Tied
  }

  // 3. Check if the overall game is won on the macro board
  let newWinner = null;
  const macroWin = check3x3WinLight(newMacroBoard.map(val => (val === 'T' ? null : val)));
  if (macroWin) {
    newWinner = macroWin;
  } else {
    // Check for macro tie
    const allBoardsFinished = newMacroBoard.every(val => val !== null);
    if (allBoardsFinished) {
      newWinner = 'T';
    }
  }

  // 4. Determine next active board index
  let nextActiveBoard = cellIndex;
  if (newMacroBoard[nextActiveBoard] !== null) {
    nextActiveBoard = null;
  }

  if (newWinner) {
    nextActiveBoard = null;
  }

  // 5. Toggle player
  const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';

  return {
    board: newBoard,
    macroBoard: newMacroBoard,
    activeBoard: nextActiveBoard,
    currentPlayer: nextPlayer,
    winner: newWinner
  };
}

class MCTSNode {
  constructor(state, parent = null, move = null) {
    this.state = state;
    this.parent = parent;
    this.move = move;
    this.children = [];
    this.wins = 0;
    this.visits = 0;
    this.untriedMoves = getValidMoves(state);
  }

  isFullyExpanded() {
    return this.untriedMoves.length === 0;
  }

  isTerminal() {
    return this.state.winner !== null;
  }
}

/**
 * Runs the Monte Carlo Tree Search algorithm.
 */
function runMCTS(rootState, iterations) {
  const root = new MCTSNode(copyState(rootState));
  
  for (let i = 0; i < iterations; i++) {
    let node = root;
    
    // 1. SELECT
    while (node.isFullyExpanded() && !node.isTerminal()) {
      node = selectBestChild(node);
    }
    
    // 2. EXPAND
    if (!node.isTerminal() && node.untriedMoves.length > 0) {
      node = expandNode(node);
    }
    
    // 3. SIMULATE
    const winner = simulatePlayout(node);
    
    // 4. BACKPROPAGATE
    backpropagate(node, winner);
  }
  
  // Choose the child with the most visits (most robust move)
  let bestChild = null;
  let maxVisits = -1;
  for (const child of root.children) {
    if (child.visits > maxVisits) {
      maxVisits = child.visits;
      bestChild = child;
    }
  }
  
  return bestChild ? bestChild.move : null;
}

function selectBestChild(node) {
  let bestChild = null;
  let bestScore = -Infinity;
  const parentVisits = node.visits;
  const C = 1.414; // Exploration parameter
  
  for (const child of node.children) {
    const exploitation = child.wins / child.visits;
    const exploration = C * Math.sqrt(Math.log(parentVisits) / child.visits);
    const score = exploitation + exploration;
    if (score > bestScore) {
      bestScore = score;
      bestChild = child;
    }
  }
  return bestChild;
}

function expandNode(node) {
  const moveIdx = Math.floor(Math.random() * node.untriedMoves.length);
  const move = node.untriedMoves.splice(moveIdx, 1)[0];
  
  const nextState = makeMoveLight(node.state, move.boardIndex, move.cellIndex);
  const child = new MCTSNode(nextState, node, move);
  node.children.push(child);
  return child;
}

function simulatePlayout(node) {
  let tempState = copyState(node.state);
  
  while (tempState.winner === null) {
    const moves = getValidMoves(tempState);
    if (moves.length === 0) break;
    const move = moves[Math.floor(Math.random() * moves.length)];
    tempState = makeMoveLight(tempState, move.boardIndex, move.cellIndex);
  }
  return tempState.winner;
}

function backpropagate(node, winner) {
  let curr = node;
  while (curr !== null) {
    curr.visits += 1;
    if (winner === 'T') {
      curr.wins += 0.5;
    } else if (curr.parent && winner === curr.parent.state.currentPlayer) {
      curr.wins += 1;
    }
    curr = curr.parent;
  }
}

/**
 * Checks if there's an immediate winning move.
 */
function findImmediateWin(state) {
  const moves = getValidMoves(state);
  for (const move of moves) {
    const nextState = makeMoveLight(state, move.boardIndex, move.cellIndex);
    if (nextState.winner === state.currentPlayer) {
      return move;
    }
  }
  return null;
}

/**
 * Entry point for getting the AI's move.
 * @param {Object} state - Current game state
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @returns {Object} - { boardIndex, cellIndex }
 */
export function getBestMove(state, difficulty = 'medium') {
  // Always take an immediate win if available
  const immediateWin = findImmediateWin(state);
  if (immediateWin) {
    return immediateWin;
  }

  const moves = getValidMoves(state);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    // Easy mode: 25% chance of pure random move, 75% chance of very light MCTS (80 runs)
    if (Math.random() < 0.25) {
      return moves[Math.floor(Math.random() * moves.length)];
    }
    return runMCTS(state, 80);
  } else if (difficulty === 'medium') {
    // Medium mode: MCTS with 600 iterations
    return runMCTS(state, 600);
  } else {
    // Hard mode: MCTS with 3000 iterations
    return runMCTS(state, 3000);
  }
}
