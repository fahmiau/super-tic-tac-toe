import React, { useState } from 'react';
import { X, HelpCircle, ArrowRight } from 'lucide-react';
import { GAME_VARIANTS, GAME_VARIANT_INFO } from '../utils/gameLogic';

const TAB_ORDER = [
  GAME_VARIANTS.SUPER,
  GAME_VARIANTS.CLASSIC,
  GAME_VARIANTS.MOVING
];

export default function RulesPopup({ onClose, initialVariant = GAME_VARIANTS.SUPER }) {
  const [activeTab, setActiveTab] = useState(initialVariant);

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

        {/* Variant tabs inside Rules Modal */}
        <div className="rules-tabs" role="tablist" aria-label="Game rules tabs">
          {TAB_ORDER.map((variantId) => {
            const info = GAME_VARIANT_INFO[variantId];
            return (
              <button
                key={variantId}
                type="button"
                role="tab"
                aria-selected={activeTab === variantId}
                className={`rules-tab-btn ${activeTab === variantId ? 'active' : ''}`}
                onClick={() => setActiveTab(variantId)}
              >
                {info.shortName}
              </button>
            );
          })}
        </div>

        {activeTab === GAME_VARIANTS.SUPER && (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
              Super Tic Tac Toe is a strategic, nested version of the classic game with deep tactical depth.
            </p>

            <div className="rules-section">
              <div className="rules-step">
                <div className="rules-num">1</div>
                <div className="rules-text">
                  <strong>The Grid Setup:</strong> The game board is a large 3×3 grid (the <strong>Macro Board</strong>). Each cell contains a smaller 3×3 grid (a <strong>Micro Board</strong>), giving 81 total cells.
                </div>
              </div>

              <div className="rules-step">
                <div className="rules-num">2</div>
                <div className="rules-text">
                  <strong>The Core Rule:</strong> Where you play in a Micro Board determines which Micro Board the opponent <em>must</em> play in next.

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
                  <strong>Winning Sub-Boards:</strong> Getting 3-in-a-row on a Micro Board wins that board, locking it with your symbol.
                </div>
              </div>

              <div className="rules-step">
                <div className="rules-num">4</div>
                <div className="rules-text">
                  <strong>The Wildcard Rule:</strong> If sent to a Micro Board that is already won or tied, you get a <strong>Wildcard</strong> and can play in <strong>any</strong> open Micro Board.
                </div>
              </div>

              <div className="rules-step">
                <div className="rules-num">5</div>
                <div className="rules-text">
                  <strong>Winning the Game:</strong> Win three Micro Boards in a line (row, column, or diagonal) on the Macro Board.
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === GAME_VARIANTS.CLASSIC && (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
              Classic Tic Tac Toe on a single 3×3 grid. Quick, clean, and timeless.
            </p>

            <div className="rules-section">
              <div className="rules-step">
                <div className="rules-num">1</div>
                <div className="rules-text">
                  <strong>Take Turns Placing:</strong> Player <strong>X</strong> goes first, followed by Player <strong>O</strong>. Click any empty cell to place your mark.
                </div>
              </div>

              <div className="rules-step">
                <div className="rules-num">2</div>
                <div className="rules-text">
                  <strong>Win Condition:</strong> Align <strong>3 of your marks</strong> horizontally, vertically, or diagonally to win the match.
                </div>
              </div>

              <div className="rules-step">
                <div className="rules-num">3</div>
                <div className="rules-text">
                  <strong>Draw:</strong> If all 9 cells are filled without either player getting 3-in-a-row, the match ends in a tie.
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === GAME_VARIANTS.MOVING && (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
              A tactical 3×3 twist where each player only gets <strong>3 marks total</strong> — and then shifts them around the board until someone wins!
            </p>

            <div className="rules-section">
              <div className="rules-step">
                <div className="rules-num">1</div>
                <div className="rules-text">
                  <strong>Placement Phase (First 3 Marks):</strong> Take turns placing your marks onto empty cells until you have <strong>3 marks</strong> on the board.
                </div>
              </div>

              <div className="rules-step">
                <div className="rules-num">2</div>
                <div className="rules-text">
                  <strong>Shift Phase (Move Any Mark):</strong> Once all 3 of your marks are on the board, click one of your existing marks to select it, then click <strong>any empty cell</strong> to move it there.

                  <div className="rule-diagram">
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '4px' }}>Select your mark:</div>
                      <div className="mini-board-grid">
                        <div className="mini-grid-cell highlight-p"></div>
                        <div className="mini-grid-cell"></div>
                        <div className="mini-grid-cell"></div>
                        <div className="mini-grid-cell"></div>
                        <div className="mini-grid-cell highlight-p"></div>
                        <div className="mini-grid-cell"></div>
                        <div className="mini-grid-cell"></div>
                        <div className="mini-grid-cell"></div>
                        <div className="mini-grid-cell highlight-p"></div>
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--color-x)', textAlign: 'center', marginTop: '2px' }}>(3/3 marks placed)</div>
                    </div>

                    <ArrowRight className="arrow-indicator" size={18} />

                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '4px' }}>Move to empty cell:</div>
                      <div className="mini-board-grid">
                        <div className="mini-grid-cell"></div>
                        <div className="mini-grid-cell highlight"></div>
                        <div className="mini-grid-cell"></div>
                        <div className="mini-grid-cell"></div>
                        <div className="mini-grid-cell highlight-p"></div>
                        <div className="mini-grid-cell"></div>
                        <div className="mini-grid-cell"></div>
                        <div className="mini-grid-cell"></div>
                        <div className="mini-grid-cell highlight-p"></div>
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--color-active)', textAlign: 'center', marginTop: '2px' }}>(Any empty space)</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rules-step">
                <div className="rules-num">3</div>
                <div className="rules-text">
                  <strong>Play Until Victory:</strong> You can win during placement or after moving a mark. Since pieces keep shifting, there are <strong>no draws</strong> — play continues until someone gets 3-in-a-row!
                </div>
              </div>
            </div>
          </>
        )}

        <button
          className="btn btn-primary"
          onClick={onClose}
          style={{ width: '100%', marginTop: '2rem' }}
        >
          Got it, Let&apos;s Play!
        </button>
      </div>
    </div>
  );
}
