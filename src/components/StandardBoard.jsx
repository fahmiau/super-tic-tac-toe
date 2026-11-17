import React from 'react';
import { GAME_VARIANTS, MAX_MOVING_PIECES, countPieces } from '../utils/gameLogic';

export default function StandardBoard({
  variant,
  cells,
  currentPlayer,
  winner,
  winningLine,
  selectedCell,
  lastMove,
  isTurnPlayable = true,
  onCellClick
}) {
  const isMovingMode = variant === GAME_VARIANTS.MOVING;
  const pieceCount = isMovingMode ? countPieces(cells, currentPlayer) : 0;
  const isMovementPhase = isMovingMode && pieceCount >= MAX_MOVING_PIECES;

  const renderX = (className = 'cell-icon text-x') => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const renderO = (className = 'cell-icon text-o') => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className="standard-board-wrapper">
      <div className={`standard-board ${!winner && isTurnPlayable ? 'active' : ''}`}>
        {cells.map((cellValue, cellIndex) => {
          const isOccupied = cellValue !== null;
          const isOwnPiece = cellValue === currentPlayer;
          const isSelected = isMovementPhase && selectedCell === cellIndex;
          const isWinningCell = Boolean(winningLine && winningLine.includes(cellIndex));
          const isLastMoveTo = lastMove && lastMove.toIndex === cellIndex && isOccupied;
          const isLastMoveFrom =
            isMovingMode &&
            lastMove &&
            lastMove.fromIndex === cellIndex &&
            !isOccupied;

          // Determine clickability and disabled state
          let isDisabled = Boolean(winner) || !isTurnPlayable;
          if (!isDisabled) {
            if (!isMovingMode || !isMovementPhase) {
              // Classic or Moving placement phase: only empty cells are playable
              isDisabled = isOccupied;
            } else {
              // Moving shift phase: own pieces can be selected, empty cells are clickable
              isDisabled = isOccupied && !isOwnPiece;
            }
          }

          const showHoverPreview =
            !winner &&
            isTurnPlayable &&
            !isOccupied &&
            (!isMovementPhase || selectedCell !== null);

          const isSelectablePiece =
            !winner && isTurnPlayable && isMovementPhase && isOwnPiece;

          const isValidDestination =
            !winner &&
            isTurnPlayable &&
            isMovementPhase &&
            selectedCell !== null &&
            !isOccupied;

          const cellClasses = [
            'cell',
            'standard-cell',
            isWinningCell ? 'winning-cell' : '',
            isSelected ? `selected-piece selected-${currentPlayer.toLowerCase()}` : '',
            isSelectablePiece && !isSelected ? 'selectable-piece' : '',
            isValidDestination ? 'valid-destination' : '',
            isLastMoveTo ? 'last-move-to' : '',
            isLastMoveFrom ? 'last-move-from' : ''
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={cellIndex}
              type="button"
              className={cellClasses}
              onClick={() => onCellClick(cellIndex)}
              disabled={isDisabled}
              aria-label={`Cell ${cellIndex + 1}${cellValue ? `, ${cellValue}` : ''}`}
            >
              {cellValue === 'X' && renderX('cell-icon text-x')}
              {cellValue === 'O' && renderO('cell-icon text-o')}

              {isLastMoveFrom && (
                <span className="last-move-origin-marker" aria-hidden="true" />
              )}

              {showHoverPreview && (
                <span className="hover-preview">
                  {currentPlayer === 'X'
                    ? renderX('cell-icon text-x hover-icon')
                    : renderO('cell-icon text-o hover-icon')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
