import { useState } from 'react';
import { Users, Wifi, Globe, Copy, Check, BookOpen, AlertCircle, Cpu } from 'lucide-react';
import { playMoveSound, playJoinSound } from '../utils/sounds';
import { GAME_VARIANTS, GAME_VARIANT_INFO } from '../utils/gameLogic';

const VARIANT_ORDER = [
  GAME_VARIANTS.SUPER,
  GAME_VARIANTS.CLASSIC,
  GAME_VARIANTS.MOVING
];

function VariantIcon({ variant }) {
  if (variant === GAME_VARIANTS.SUPER) {
    return (
      <svg className="variant-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
        <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="18" cy="18" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (variant === GAME_VARIANTS.CLASSIC) {
    return (
      <svg className="variant-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M9 4v16M15 4v16M4 9h16M4 15h16" opacity="0.55" />
        <path d="M5.2 5.2l2.6 2.6M7.8 5.2L5.2 7.8" />
        <circle cx="12" cy="12" r="1.7" />
        <path d="M16.2 16.2l2.6 2.6M18.8 16.2l-2.6 2.6" />
      </svg>
    );
  }

  // 3-Piece Shift icon
  return (
    <svg className="variant-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="7" r="2.1" />
      <circle cx="6.5" cy="17" r="2.1" opacity="0.45" strokeDasharray="2 2" />
      <path d="M6.5 14V10.2" />
      <path d="M14 6.5h6M17 3.5l3 3-3 3" />
      <path d="M14.5 14.5l4 4M18.5 14.5l-4 4" />
    </svg>
  );
}

export default function Menu({
  selectedVariant,
  onSelectVariant,
  onCreateOnlineGame,
  onJoinOnlineGame,
  onStartOfflineGame,
  onStartSoloGame,
  onShowRules,
  onCancelOnlineGame,
  peerError,
  isConnecting
}) {
  const [onlineMode, setOnlineMode] = useState(null); // 'host', 'join', or null
  const [showSoloDifficulty, setShowSoloDifficulty] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const variantMeta = GAME_VARIANT_INFO[selectedVariant] || GAME_VARIANT_INFO[GAME_VARIANTS.SUPER];

  const getLogoTitle = () => {
    if (selectedVariant === GAME_VARIANTS.CLASSIC) return 'Classic';
    if (selectedVariant === GAME_VARIANTS.MOVING) return '3-Piece';
    return 'Super';
  };

  // Helper to generate a friendly 5-letter alphanumeric code (avoiding confusing chars like O/0, I/1)
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSelectVariant = (variant) => {
    if (variant !== selectedVariant) {
      playMoveSound();
      onSelectVariant(variant);
    }
  };

  const handleStartHost = () => {
    playMoveSound();
    const code = generateRandomCode();
    setGeneratedCode(code);
    setOnlineMode('host');
    onCreateOnlineGame(code);
  };

  const handleStartJoin = () => {
    playMoveSound();
    setOnlineMode('join');
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    playJoinSound();
    onJoinOnlineGame(joinCodeInput.trim().toUpperCase());
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    playMoveSound();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackToOptions = () => {
    playMoveSound();
    setOnlineMode(null);
    setGeneratedCode('');
    setJoinCodeInput('');
    if (onCancelOnlineGame) {
      onCancelOnlineGame();
    }
  };

  return (
    <div className="menu-card glass-panel fade-in">
      <div className="logo-container">
        <h1 className="logo-main">{getLogoTitle()}</h1>
        <div className="logo-sub">Tic Tac Toe</div>
      </div>

      {showSoloDifficulty ? (
        <div className="online-form" style={{ textAlign: 'center' }}>
          <div className="variant-pill">{variantMeta.name}</div>
          <h3 className="font-display" style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--accent-purple)', textShadow: '0 0 8px rgba(139, 92, 246, 0.4)', textTransform: 'uppercase' }}>
            Select Difficulty
          </h3>

          <div className="menu-buttons" style={{ marginTop: '0.5rem' }}>
            <button
              className="btn btn-success"
              onClick={() => { playMoveSound(); onStartSoloGame('easy'); }}
            >
              <span>Easy AI</span>
            </button>

            <button
              className="btn btn-warning"
              onClick={() => { playMoveSound(); onStartSoloGame('medium'); }}
            >
              <span>Medium AI</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => { playMoveSound(); onStartSoloGame('hard'); }}
            >
              <span>Hard AI</span>
            </button>

            <button
              className="btn"
              onClick={() => { playMoveSound(); setShowSoloDifficulty(false); }}
              style={{ marginTop: '0.75rem', border: '1px dashed rgba(255,255,255,0.08)' }}
            >
              Back
            </button>
          </div>
        </div>
      ) : onlineMode === null ? (
        <>
          <div className="variant-selector-wrapper">
            <span className="form-label" style={{ display: 'block', marginBottom: '0.6rem', textAlign: 'left' }}>
              Choose Game Type
            </span>
            <div className="variant-selector-grid" role="tablist" aria-label="Tic Tac Toe variants">
              {VARIANT_ORDER.map((variantId) => {
                const info = GAME_VARIANT_INFO[variantId];
                const isSelected = selectedVariant === variantId;
                return (
                  <button
                    key={variantId}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`variant-card variant-${variantId} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectVariant(variantId)}
                  >
                    <VariantIcon variant={variantId} />
                    <span className="variant-card-title">{info.shortName}</span>
                    <span className="variant-card-sub">{info.subtitle}</span>
                  </button>
                );
              })}
            </div>
            <p className="variant-description">{variantMeta.description}</p>
          </div>

          <div className="menu-buttons">
            <button
              className="btn btn-primary"
              onClick={onStartOfflineGame}
            >
              <Users size={20} />
              <span>Play Local Offline</span>
            </button>

            <button
              className="btn btn-purple"
              onClick={() => { playMoveSound(); setShowSoloDifficulty(true); }}
            >
              <Cpu size={20} />
              <span>Play VS Computer</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleStartHost}
            >
              <Wifi size={20} />
              <span>Host Online Game</span>
            </button>

            <button
              className="btn"
              onClick={handleStartJoin}
            >
              <Globe size={20} />
              <span>Join Online Game</span>
            </button>

            <button
              className="btn"
              onClick={onShowRules}
              style={{ marginTop: '0.5rem', border: '1px dashed rgba(255,255,255,0.08)' }}
            >
              <BookOpen size={18} />
              <span>How to Play</span>
            </button>
          </div>
        </>
      ) : onlineMode === 'host' ? (
        <div className="online-form">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 className="font-display" style={{ fontSize: '1.15rem', color: 'var(--color-o)' }}>
              Hosting Online Match
            </h3>
            <span className="variant-pill">{variantMeta.shortName}</span>
          </div>

          <div className="form-group">
            <span className="form-label">Share this room code:</span>
            <div className="room-code-display">
              <span className="room-code-text">{generatedCode}</span>
              <button
                className="btn btn-icon-only"
                onClick={handleCopyCode}
                style={{ padding: '0.5rem', position: 'relative' }}
                title="Copy Room Code"
              >
                {copied ? <Check size={18} className="text-active" /> : <Copy size={18} />}
                {copied && <span className="tooltip-copied">Copied!</span>}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div className="connection-indicator connecting">
              <span className="dot-pulse" style={{ marginRight: '6px' }}></span>
              Waiting for Guest to Connect...
            </div>

            {peerError && (
              <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--color-o)', fontSize: '0.85rem', marginTop: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={16} />
                <span>{peerError}</span>
              </div>
            )}
          </div>

          <button
            className="btn"
            onClick={handleBackToOptions}
            style={{ marginTop: '1rem', width: '100%' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <form className="online-form" onSubmit={handleJoinSubmit}>
          <h3 className="font-display" style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: 'var(--color-x)' }}>
            Join Online Match
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '-0.5rem' }}>
            Game mode syncs automatically with the host&apos;s selection.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="room-code">Enter Room Code:</label>
            <div className="form-input-container">
              <input
                id="room-code"
                type="text"
                className="input-text"
                placeholder="e.g. A9B2X"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                disabled={isConnecting}
                maxLength={8}
                autoFocus
              />
            </div>
          </div>

          {peerError && (
            <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--color-o)', fontSize: '0.85rem', alignItems: 'center' }}>
              <AlertCircle size={16} />
              <span>{peerError}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn"
              onClick={handleBackToOptions}
              disabled={isConnecting}
              style={{ flex: 1 }}
            >
              Back
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isConnecting || !joinCodeInput.trim()}
              style={{ flex: 2 }}
            >
              {isConnecting ? 'Connecting...' : 'Join Game'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
