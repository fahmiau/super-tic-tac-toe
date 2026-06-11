import React from 'react';
import { X, HelpCircle, ArrowRight, Star } from 'lucide-react';

export default function RulesPopup({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-panel" 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose} aria-label="Close rules">
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <HelpCircle size={28} className="text-active" />
          <h2 style={{ fontSize: '1.75rem', textTransform: 'uppercase' }}>How to Play</h2>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
          Super Tic Tac Toe is a strategic, nested version of the classic game. It takes five minutes to learn, but has deep tactical depth.
        </p>

        <div className="rules-section">
          
          <div className="rules-step">
            <div className="rules-num">1</div>
            <div className="rules-text">
              <strong>The Grid Setup:</strong> The game board is a large 3x3 grid (the <strong>Macro Board</strong>). Each cell in this large grid contains a small 3x3 grid (a <strong>Micro Board</strong>), resulting in 81 total playable cells.
            </div>
          </div>

          <div className="rules-step">
            <div className="rules-num">2</div>
            <div className="rules-text">
              <strong>The Core Rule:</strong> Where you play in a Micro Board determines which Micro Board the opponent *must* play in next.
              
              <div className="rule-diagram">
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '4px' }}>You play here:</div>
                  <div className="mini-board-grid">
                    <div className="mini-grid-cell"></div>
                    <div className="mini-grid-cell"></div>
                    <div className="mini-grid-cell highlight-p"></div>
                    
                    <div className="mini-grid-cell"></div>
                    <div className="mini-grid-cell"></div>
                    <div className="mini-grid-cell"></div>
                    
                    <div className="mini-grid-cell"></div>
                    <div className="mini-grid-cell"></div>
                    <div className="mini-grid-cell"></div>
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-x)', textAlign: 'center', marginTop: '2px' }}>(Top-Right cell)</div>
                </div>
                
                <ArrowRight className="arrow-indicator" size={18} />

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '4px' }}>Opponent must play:</div>
                  <div className="mini-board-grid">
                    <div className="mini-grid-cell"></div>
                    <div className="mini-grid-cell"></div>
                    <div className="mini-grid-cell highlight"></div>
                    
                    <div className="mini-grid-cell"></div>
                    <div className="mini-grid-cell"></div>
                    <div className="mini-grid-cell"></div>
                    
                    <div className="mini-grid-cell"></div>
                    <div className="mini-grid-cell"></div>
                    <div className="mini-grid-cell"></div>
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-active)', textAlign: 'center', marginTop: '2px' }}>(Top-Right board)</div>
                </div>
              </div>

            </div>
          </div>

          <div className="rules-step">
            <div className="rules-num">3</div>
            <div className="rules-text">
              <strong>Winning Sub-Boards:</strong> By getting 3-in-a-row on a Micro Board, you win that board. It gets locked and marked with your symbol.
            </div>
          </div>

          <div className="rules-step">
            <div className="rules-num">4</div>
            <div className="rules-text">
              <strong>The Wildcard Rule:</strong> If you are sent to a Micro Board that is already won or tied/full, you get a <strong>Wildcard</strong>! You can place your move in <strong>any</strong> other active Micro Board on the map.
            </div>
          </div>

          <div className="rules-step">
            <div className="rules-num">5</div>
            <div className="rules-text">
              <strong>Winning the Game:</strong> To win the overall match, you must win three Micro Boards in a line (row, column, or diagonal) on the large Macro Board.
            </div>
          </div>

        </div>

        <button 
          className="btn btn-primary" 
          onClick={onClose}
          style={{ width: '100%', marginTop: '2rem' }}
        >
          Got it, Let's Play!
        </button>
      </div>
    </div>
  );
}
