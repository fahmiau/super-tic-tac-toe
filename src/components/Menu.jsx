import React, { useState } from 'react';
import { Users, Wifi, Globe, Copy, Check, BookOpen, AlertCircle } from 'lucide-react';
import { playMoveSound, playJoinSound } from '../utils/sounds';

export default function Menu({ 
  onCreateOnlineGame, 
  onJoinOnlineGame, 
  onStartOfflineGame,
  onShowRules,
  onCancelOnlineGame,
  peerError,
  isConnecting
}) {
  const [onlineMode, setOnlineMode] = useState(null); // 'host', 'join', or null
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // Helper to generate a friendly 5-letter alphanumeric code (avoiding confusing chars like O/0, I/1)
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
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
        <h1 className="logo-main">Ultimate</h1>
        <div className="logo-sub">Tic Tac Toe</div>
      </div>

      {onlineMode === null ? (
        <div className="menu-buttons">
          <button 
            className="btn btn-primary"
            onClick={onStartOfflineGame}
          >
            <Users size={20} />
            <span>Play Local Offline</span>
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
            style={{ marginTop: '1rem', border: '1px dashed rgba(255,255,255,0.08)' }}
          >
            <BookOpen size={18} />
            <span>How to Play</span>
          </button>
        </div>
      ) : onlineMode === 'host' ? (
        <div className="online-form">
          <h3 className="font-display" style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--color-o)' }}>
            Hosting Online Match
          </h3>
          
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
          <h3 className="font-display" style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--color-x)' }}>
            Join Online Match
          </h3>

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
