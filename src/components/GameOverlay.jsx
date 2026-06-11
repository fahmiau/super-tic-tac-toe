import React from 'react';
import { RefreshCw, Home, Award } from 'lucide-react';

export default function GameOverlay({ winner, onRestart, onBackToMenu, isOnline, isHost }) {
  
  const renderX = () => (
    <svg className="board-win-icon text-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '80px', height: '80px', strokeWidth: 2 }}>
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const renderO = () => (
    <svg className="board-win-icon text-o" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '80px', height: '80px', strokeWidth: 2 }}>
      <circle cx="12" cy="12" r="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const getWinnerText = () => {
    if (winner === 'T') return 'Match Draw!';
    if (isOnline) {
      const isWinnerMe = (winner === 'X' && isHost) || (winner === 'O' && !isHost);
      return isWinnerMe ? 'Victory is Yours!' : 'Opponent Wins!';
    }
    return `Player ${winner} Wins!`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel game-over-overlay" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
        <Award size={36} className="text-active" />
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
            {winner === 'X' && renderX()}
            {winner === 'O' && renderO()}
            {winner === 'T' && (
              <span className="font-display" style={{ fontSize: '4.5rem', fontWeight: 900, color: 'var(--text-secondary)' }}>
                TIE
              </span>
            )}
          </div>
          <h2 className="winner-announce-title" style={{
            color: winner === 'X' ? 'var(--color-x)' : winner === 'O' ? 'var(--color-o)' : 'var(--text-primary)',
            textShadow: winner === 'X' ? '0 0 15px var(--color-x-glow)' : winner === 'O' ? '0 0 15px var(--color-o-glow)' : 'none'
          }}>
            {getWinnerText()}
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={onRestart}>
            <RefreshCw size={18} />
            <span>Play Again</span>
          </button>
          
          <button className="btn" onClick={onBackToMenu} style={{ background: 'transparent' }}>
            <Home size={18} />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
