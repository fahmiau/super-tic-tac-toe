import React from 'react';
import MicroBoard from './MicroBoard';

export default function SuperBoard({ 
  board, 
  macroBoard, 
  macroBoardLines,
  activeBoard, 
  currentPlayer, 
  onCellClick,
  overallWinner
}) {
  return (
    <div className="macro-board">
      {board.map((subBoardCells, boardIndex) => {
        // A board is active if:
        // 1. The overall game has no winner
        // 2. This board itself is not yet won or tied (macroBoard[boardIndex] is null)
        // 3. EITHER activeBoard is null (wildcard) OR activeBoard is exactly this board's index
        const isSubBoardFinished = macroBoard[boardIndex] !== null;
        const isBoardActive = !overallWinner && !isSubBoardFinished && 
          (activeBoard === null || activeBoard === boardIndex);

        return (
          <MicroBoard
            key={boardIndex}
            boardIndex={boardIndex}
            cells={subBoardCells}
            isActive={isBoardActive}
            wonBy={macroBoard[boardIndex]}
            winningLine={macroBoardLines[boardIndex]}
            currentPlayer={currentPlayer}
            onCellClick={onCellClick}
          />
        );
      })}
    </div>
  );
}
