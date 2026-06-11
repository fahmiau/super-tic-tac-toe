import React from 'react';
import { X, Circle } from 'lucide-react';

export default function MicroBoard({ 
  boardIndex, 
  cells, 
  isActive, 
  wonBy, 
  onCellClick, 
  currentPlayer,
  winningLine
}) {
  
  // Render SVG for X
  const renderX = (className = "cell-icon text-x") => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  // Render SVG for O
  const renderO = (className = "cell-icon text-o") => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className={`micro-board ${isActive ? 'active' : 'inactive'}`}>
      
      {/* 9 Cells of the Micro Board */}
      {cells.map((cellValue, cellIndex) => {
        const isCellOccupied = cellValue !== null;
        const isDisabled = wonBy !== null || !isActive || isCellOccupied;

        // Check if this cell is part of the local winning combination
        const isWinningCell = winningLine && winningLine.includes(cellIndex);

        return (
          <button
            key={cellIndex}
            className={`cell ${isWinningCell ? 'winning-cell' : ''}`}
            onClick={() => onCellClick(boardIndex, cellIndex)}
            disabled={isDisabled}
            aria-label={`Sub-board ${boardIndex + 1}, Cell ${cellIndex + 1}`}
          >
            {cellValue === 'X' && renderX()}
            {cellValue === 'O' && renderO()}
            
            {/* Show a very faint preview on hover for active players */}
            {!cellValue && isActive && wonBy === null && (
              <span className="hover-preview" style={{ opacity: 0 }}>
                {currentPlayer === 'X' ? renderX("cell-icon text-x hover-icon") : renderO("cell-icon text-o hover-icon")}
              </span>
            )}
          </button>
        );
      })}

      {/* Overlays for won or tied boards */}
      {wonBy !== null && (
        <div className={`board-win-overlay win-${wonBy.toLowerCase()}`}>
          {wonBy === 'X' && renderX("board-win-icon text-x")}
          {wonBy === 'O' && renderO("board-win-icon text-o")}
          {wonBy === 'T' && <span className="board-win-text">TIE</span>}
        </div>
      )}
    </div>
  );
}
