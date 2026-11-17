import { GAME_VARIANTS, MAX_MOVING_PIECES, countPieces } from './gameLogic.js';

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

// ============================================================================
// SUPER TIC TAC TOE (MCTS)
// ============================================================================

/**
 * Deep copies the essential super game state for fast simulations.
 */
function copySuperState(state) {
  return {
    board: state.board.map(subBoard => [...subBoard]),
    macroBoard: [...state.macroBoard],
    activeBoard: state.activeBoard,
    currentPlayer: state.currentPlayer,
    winner: state.winner
  };
}

/**
 * Gets all valid moves for the current super state.
 */
function getValidSuperMoves(state) {
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
 * A lightweight makeMove for fast super simulations.
 */
function makeSuperMoveLight(state, boardIndex, cellIndex) {
  const { board, macroBoard, currentPlayer } = state;

  const newBoard = board.map((subBoard, i) =>
    i === boardIndex ? [...subBoard] : subBoard
  );
  const newMacroBoard = [...macroBoard];

  newBoard[boardIndex][cellIndex] = currentPlayer;

  const subBoardWin = check3x3WinLight(newBoard[boardIndex]);
  if (subBoardWin) {
    newMacroBoard[boardIndex] = currentPlayer;
  } else if (check3x3TieLight(newBoard[boardIndex])) {
    newMacroBoard[boardIndex] = 'T';
  }

  let newWinner = null;
  const macroWin = check3x3WinLight(newMacroBoard.map(val => (val === 'T' ? null : val)));
  if (macroWin) {
    newWinner = macroWin;
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
    this.untriedMoves = getValidSuperMoves(state);
  }

  isFullyExpanded() {
    return this.untriedMoves.length === 0;
  }

  isTerminal() {
    return this.state.winner !== null;
  }
}

function runMCTS(rootState, iterations) {
  const root = new MCTSNode(copySuperState(rootState));

  for (let i = 0; i < iterations; i++) {
    let node = root;

    while (node.isFullyExpanded() && !node.isTerminal()) {
      node = selectBestChild(node);
    }

    if (!node.isTerminal() && node.untriedMoves.length > 0) {
      node = expandNode(node);
    }

    const winner = simulatePlayout(node);
    backpropagate(node, winner);
  }

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
  const C = 1.414;

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

  const nextState = makeSuperMoveLight(node.state, move.boardIndex, move.cellIndex);
  const child = new MCTSNode(nextState, node, move);
  node.children.push(child);
  return child;
}

function simulatePlayout(node) {
  let tempState = copySuperState(node.state);

  while (tempState.winner === null) {
    const moves = getValidSuperMoves(tempState);
    if (moves.length === 0) break;
    const move = moves[Math.floor(Math.random() * moves.length)];
    tempState = makeSuperMoveLight(tempState, move.boardIndex, move.cellIndex);
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

function findImmediateSuperWin(state) {
  const moves = getValidSuperMoves(state);
  for (const move of moves) {
    const nextState = makeSuperMoveLight(state, move.boardIndex, move.cellIndex);
    if (nextState.winner === state.currentPlayer) {
      return move;
    }
  }
  return null;
}

function getSuperBestMove(state, difficulty) {
  const immediateWin = findImmediateSuperWin(state);
  if (immediateWin) {
    return immediateWin;
  }

  const moves = getValidSuperMoves(state);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    if (Math.random() < 0.25) {
      return moves[Math.floor(Math.random() * moves.length)];
    }
    return runMCTS(state, 80);
  } else if (difficulty === 'medium') {
    return runMCTS(state, 600);
  } else {
    return runMCTS(state, 3000);
  }
}

// ============================================================================
// CLASSIC 3x3 TIC TAC TOE (MINIMAX)
// ============================================================================

function getClassicValidMoves(cells) {
  const moves = [];
  for (let i = 0; i < 9; i++) {
    if (cells[i] === null) moves.push(i);
  }
  return moves;
}

function findImmediate3x3Win(cells, player) {
  for (let i = 0; i < 9; i++) {
    if (cells[i] === null) {
      cells[i] = player;
      const win = check3x3WinLight(cells);
      cells[i] = null;
      if (win === player) return i;
    }
  }
  return null;
}

function evaluateClassicHeuristic(cells, aiPlayer, oppPlayer) {
  let score = 0;
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    let aiCount = 0;
    let oppCount = 0;
    if (cells[a] === aiPlayer) aiCount++;
    else if (cells[a] === oppPlayer) oppCount++;
    if (cells[b] === aiPlayer) aiCount++;
    else if (cells[b] === oppPlayer) oppCount++;
    if (cells[c] === aiPlayer) aiCount++;
    else if (cells[c] === oppPlayer) oppCount++;

    if (aiCount > 0 && oppCount === 0) {
      score += aiCount === 2 ? 12 : 3;
    } else if (oppCount > 0 && aiCount === 0) {
      score -= oppCount === 2 ? 12 : 3;
    }
  }
  if (cells[4] === aiPlayer) score += 4;
  else if (cells[4] === oppPlayer) score -= 4;
  return score;
}

function classicMinimax(cells, turnPlayer, aiPlayer, oppPlayer, depth, maxDepth, alpha, beta) {
  const winner = check3x3WinLight(cells);
  if (winner === aiPlayer) return 100 - depth;
  if (winner === oppPlayer) return depth - 100;
  if (check3x3TieLight(cells)) return 0;
  if (maxDepth !== null && depth >= maxDepth) {
    return evaluateClassicHeuristic(cells, aiPlayer, oppPlayer);
  }

  const isMax = turnPlayer === aiPlayer;
  let best = isMax ? -Infinity : Infinity;

  for (let i = 0; i < 9; i++) {
    if (cells[i] !== null) continue;
    cells[i] = turnPlayer;
    const score = classicMinimax(
      cells,
      turnPlayer === 'X' ? 'O' : 'X',
      aiPlayer,
      oppPlayer,
      depth + 1,
      maxDepth,
      alpha,
      beta
    );
    cells[i] = null;

    if (isMax) {
      if (score > best) best = score;
      if (best > alpha) alpha = best;
    } else {
      if (score < best) best = score;
      if (best < beta) beta = best;
    }
    if (beta <= alpha) break;
  }

  return best;
}

function getClassicBestMove(state, difficulty) {
  const cells = [...state.cells];
  const aiPlayer = state.currentPlayer;
  const oppPlayer = aiPlayer === 'X' ? 'O' : 'X';
  const moves = getClassicValidMoves(cells);
  if (moves.length === 0) return null;

  const immediateWin = findImmediate3x3Win(cells, aiPlayer);

  if (difficulty === 'easy') {
    if (immediateWin !== null && Math.random() < 0.5) {
      return { cellIndex: immediateWin };
    }
    const immediateBlock = findImmediate3x3Win(cells, oppPlayer);
    if (immediateBlock !== null && Math.random() < 0.3) {
      return { cellIndex: immediateBlock };
    }
    const rand = moves[Math.floor(Math.random() * moves.length)];
    return { cellIndex: rand };
  }

  if (immediateWin !== null) {
    return { cellIndex: immediateWin };
  }

  if (difficulty === 'medium') {
    const immediateBlock = findImmediate3x3Win(cells, oppPlayer);
    if (immediateBlock !== null && Math.random() < 0.85) {
      return { cellIndex: immediateBlock };
    }
    // Depth-2 lookahead so it plays smartly without being unbeatable against forks
    const scored = moves.map(idx => {
      cells[idx] = aiPlayer;
      const score = classicMinimax(cells, oppPlayer, aiPlayer, oppPlayer, 1, 2, -Infinity, Infinity);
      cells[idx] = null;
      return { idx, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const bestScore = scored[0].score;
    const topChoices = scored.filter(m => m.score >= bestScore - 3);
    const chosen = topChoices[Math.floor(Math.random() * topChoices.length)];
    return { cellIndex: chosen.idx };
  }

  // Hard: full optimal minimax, randomly picking among tied optimal moves for variety
  let bestScore = -Infinity;
  let bestMoves = [];
  for (const idx of moves) {
    cells[idx] = aiPlayer;
    const score = classicMinimax(cells, oppPlayer, aiPlayer, oppPlayer, 1, null, -Infinity, Infinity);
    cells[idx] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [idx];
    } else if (score === bestScore) {
      bestMoves.push(idx);
    }
  }
  const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  return { cellIndex: chosen };
}

// ============================================================================
// 3-PIECE SHIFT TIC TAC TOE (ALPHA-BETA + ANTI-REPETITION)
// ============================================================================

function getMovingValidMoves(cells, player) {
  const pieceCount = countPieces(cells, player);
  const moves = [];

  if (pieceCount < MAX_MOVING_PIECES) {
    for (let i = 0; i < 9; i++) {
      if (cells[i] === null) {
        moves.push({ fromIndex: null, toIndex: i });
      }
    }
    return moves;
  }

  const myPieces = [];
  const emptyCells = [];
  for (let i = 0; i < 9; i++) {
    if (cells[i] === player) myPieces.push(i);
    else if (cells[i] === null) emptyCells.push(i);
  }

  for (const fromIndex of myPieces) {
    for (const toIndex of emptyCells) {
      moves.push({ fromIndex, toIndex });
    }
  }
  return moves;
}

function applyMovingMoveInPlace(cells, move, player) {
  if (move.fromIndex !== null) {
    cells[move.fromIndex] = null;
  }
  cells[move.toIndex] = player;
}

function undoMovingMoveInPlace(cells, move, player) {
  cells[move.toIndex] = null;
  if (move.fromIndex !== null) {
    cells[move.fromIndex] = player;
  }
}

function findImmediateMovingWin(cells, player) {
  const moves = getMovingValidMoves(cells, player);
  for (const move of moves) {
    applyMovingMoveInPlace(cells, move, player);
    const win = check3x3WinLight(cells);
    undoMovingMoveInPlace(cells, move, player);
    if (win === player) return move;
  }
  return null;
}

function evaluateMovingBoard(cells, turnPlayer, aiPlayer, oppPlayer) {
  let score = 0;

  for (const [a, b, c] of WINNING_COMBINATIONS) {
    let aiCount = 0;
    let oppCount = 0;
    if (cells[a] === aiPlayer) aiCount++;
    else if (cells[a] === oppPlayer) oppCount++;
    if (cells[b] === aiPlayer) aiCount++;
    else if (cells[b] === oppPlayer) oppCount++;
    if (cells[c] === aiPlayer) aiCount++;
    else if (cells[c] === oppPlayer) oppCount++;

    if (aiCount === 2 && oppCount === 0) {
      // In 3-piece shift, having 2-in-a-row with 1 empty on your turn is an immediate win
      score += turnPlayer === aiPlayer ? 220 : 45;
    } else if (oppCount === 2 && aiCount === 0) {
      score -= turnPlayer === oppPlayer ? 220 : 45;
    } else if (aiCount === 1 && oppCount === 0) {
      score += 6;
    } else if (oppCount === 1 && aiCount === 0) {
      score -= 6;
    }
  }

  // Center and corner positional bias
  if (cells[4] === aiPlayer) score += 14;
  else if (cells[4] === oppPlayer) score -= 14;

  const corners = [0, 2, 6, 8];
  for (const c of corners) {
    if (cells[c] === aiPlayer) score += 5;
    else if (cells[c] === oppPlayer) score -= 5;
  }

  return score;
}

function orderMovingMoves(cells, moves, player) {
  // Prioritize immediate winning moves and center moves for strong alpha-beta cutoffs
  const scored = moves.map(move => {
    applyMovingMoveInPlace(cells, move, player);
    const isWin = check3x3WinLight(cells) === player;
    undoMovingMoveInPlace(cells, move, player);
    let priority = 0;
    if (isWin) priority += 1000;
    if (move.toIndex === 4) priority += 20;
    else if (move.toIndex === 0 || move.toIndex === 2 || move.toIndex === 6 || move.toIndex === 8) {
      priority += 8;
    }
    return { move, priority };
  });
  scored.sort((a, b) => b.priority - a.priority);
  return scored.map(item => item.move);
}

function movingAlphaBeta(cells, turnPlayer, aiPlayer, oppPlayer, depth, maxDepth, alpha, beta, nodeBudget) {
  nodeBudget.count++;

  const winner = check3x3WinLight(cells);
  if (winner === aiPlayer) return 1000 - depth;
  if (winner === oppPlayer) return depth - 1000;

  if (depth >= maxDepth || nodeBudget.count >= nodeBudget.limit) {
    return evaluateMovingBoard(cells, turnPlayer, aiPlayer, oppPlayer);
  }

  const moves = orderMovingMoves(cells, getMovingValidMoves(cells, turnPlayer), turnPlayer);
  const nextPlayer = turnPlayer === 'X' ? 'O' : 'X';
  const isMax = turnPlayer === aiPlayer;
  let best = isMax ? -Infinity : Infinity;

  for (const move of moves) {
    applyMovingMoveInPlace(cells, move, turnPlayer);
    const score = movingAlphaBeta(
      cells,
      nextPlayer,
      aiPlayer,
      oppPlayer,
      depth + 1,
      maxDepth,
      alpha,
      beta,
      nodeBudget
    );
    undoMovingMoveInPlace(cells, move, turnPlayer);

    if (isMax) {
      if (score > best) best = score;
      if (best > alpha) alpha = best;
    } else {
      if (score < best) best = score;
      if (best < beta) beta = best;
    }
    if (beta <= alpha) break;
  }

  return best;
}

function getRecentBoardKeys(history) {
  const keys = new Set();
  if (!Array.isArray(history) || history.length === 0) return keys;

  const tempCells = Array(9).fill(null);
  const startIdx = Math.max(0, history.length - 10);

  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    if (entry.fromIndex !== null && entry.fromIndex !== undefined) {
      tempCells[entry.fromIndex] = null;
    }
    tempCells[entry.toIndex] = entry.player;

    if (i >= startIdx) {
      const nextTurn = entry.player === 'X' ? 'O' : 'X';
      keys.add(`${tempCells.map(c => c || '_').join('')}|${nextTurn}`);
    }
  }
  return keys;
}

function getMovingBestMove(state, difficulty) {
  const cells = [...state.cells];
  const aiPlayer = state.currentPlayer;
  const oppPlayer = aiPlayer === 'X' ? 'O' : 'X';
  const moves = getMovingValidMoves(cells, aiPlayer);
  if (moves.length === 0) return null;

  const immediateWin = findImmediateMovingWin(cells, aiPlayer);

  if (difficulty === 'easy') {
    if (immediateWin && Math.random() < 0.5) {
      return immediateWin;
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (immediateWin) {
    return immediateWin;
  }

  const maxDepth = difficulty === 'hard' ? 6 : 3;
  const recentKeys = getRecentBoardKeys(state.history);
  const orderedMoves = orderMovingMoves(cells, moves, aiPlayer);
  const nodeBudget = { count: 0, limit: 35000 };

  const evaluated = orderedMoves.map(move => {
    applyMovingMoveInPlace(cells, move, aiPlayer);
    const rawScore = movingAlphaBeta(
      cells,
      oppPlayer,
      aiPlayer,
      oppPlayer,
      1,
      maxDepth,
      -Infinity,
      Infinity,
      nodeBudget
    );
    const key = `${cells.map(c => c || '_').join('')}|${oppPlayer}`;
    undoMovingMoveInPlace(cells, move, aiPlayer);

    // Discourage repeating recent board states unless it is a forced win/avoid-loss
    const isForcedResult = Math.abs(rawScore) >= 500;
    const repeatPenalty = !isForcedResult && recentKeys.has(key) ? 35 : 0;

    return {
      move,
      rawScore,
      selectionScore: rawScore - repeatPenalty
    };
  });

  evaluated.sort((a, b) => b.selectionScore - a.selectionScore);

  if (difficulty === 'medium') {
    const safeChoices = evaluated.filter(item => item.rawScore > -500);
    const pool = safeChoices.length > 0 ? safeChoices : evaluated;
    const topScore = pool[0].selectionScore;
    const nearBest = pool.filter(item => item.selectionScore >= topScore - 15);
    return nearBest[Math.floor(Math.random() * nearBest.length)].move;
  }

  // Hard: pick randomly among top moves tied within tiny margin
  const bestScore = evaluated[0].selectionScore;
  const tiedBest = evaluated.filter(item => item.selectionScore >= bestScore - 2);
  return tiedBest[Math.floor(Math.random() * tiedBest.length)].move;
}

// ============================================================================
// ENTRY POINT
// ============================================================================

/**
 * Entry point for getting the AI's move across all game variants.
 * @param {Object} state - Current game state
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @returns {Object|null} - Variant-appropriate move object
 */
export function getBestMove(state, difficulty = 'medium') {
  const variant = state?.variant || GAME_VARIANTS.SUPER;

  if (variant === GAME_VARIANTS.CLASSIC) {
    return getClassicBestMove(state, difficulty);
  }

  if (variant === GAME_VARIANTS.MOVING) {
    return getMovingBestMove(state, difficulty);
  }

  return getSuperBestMove(state, difficulty);
}
