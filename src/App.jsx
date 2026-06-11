import React, { useState, useEffect, useCallback } from 'react';
import { 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  ArrowLeft, 
  RefreshCw, 
  Activity,
  Wifi,
  Smile
} from 'lucide-react';

// Utilities
import { 
  getInitialState, 
  makeMove, 
  isValidMove 
} from './utils/gameLogic';
import { 
  playMoveSound, 
  playMicroWinSound, 
  playMacroWinSound, 
  playErrorSound, 
  playJoinSound,
  toggleMute,
  getMuteState 
} from './utils/sounds';

// Components
import Menu from './components/Menu';
import SuperBoard from './components/SuperBoard';
import RulesPopup from './components/RulesPopup';
import GameOverlay from './components/GameOverlay';
import Chat from './components/Chat';

// Hooks
import { usePeer } from './hooks/usePeer';

export default function App() {
  // Navigation & UI States
  const [screen, setScreen] = useState('menu'); // 'menu', 'playing'
  const [isOnline, setIsOnline] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(getMuteState());

  // Game Engine State
  const [gameState, setGameState] = useState(getInitialState());

  // Sound triggers on state changes
  const applyMoveState = useCallback((nextState, previousState) => {
    setGameState(nextState);

    // 1. Play standard move tick
    playMoveSound();

    // 2. Check if a sub-board was won
    let subBoardWon = false;
    for (let i = 0; i < 9; i++) {
      if (nextState.macroBoard[i] !== previousState.macroBoard[i]) {
        subBoardWon = true;
        break;
      }
    }

    if (nextState.winner) {
      // 3. Play macro win sound
      playMacroWinSound();
    } else if (subBoardWon) {
      // 4. Play micro win sound
      playMicroWinSound();
    }
  }, []);

  // WebRTC callbacks
  const handleRemoteMove = useCallback((boardIndex, cellIndex) => {
    setGameState(prevState => {
      if (!isValidMove(prevState, boardIndex, cellIndex)) {
        return prevState;
      }
      const nextState = makeMove(prevState, boardIndex, cellIndex);
      // Play sound
      let subBoardWon = false;
      for (let i = 0; i < 9; i++) {
        if (nextState.macroBoard[i] !== prevState.macroBoard[i]) {
          subBoardWon = true;
          break;
        }
      }
      playMoveSound();
      if (nextState.winner) {
        playMacroWinSound();
      } else if (subBoardWon) {
        playMicroWinSound();
      }
      return nextState;
    });
  }, []);

  const handleRemoteRestart = useCallback(() => {
    setGameState(getInitialState());
  }, []);

  const handleRemoteStateSync = useCallback((remoteState) => {
    setGameState(remoteState);
  }, []);

  // Initialize WebRTC Hook
  const {
    connectionStatus,
    roomCode,
    isHost,
    error: peerError,
    chatMessages,
    createRoom,
    joinRoom,
    sendMove,
    sendStateSync,
    sendRestart,
    sendChat,
    leaveRoom
  } = usePeer(handleRemoteMove, handleRemoteRestart, handleRemoteStateSync);

  // Player configurations (for online games)
  const mySymbol = isOnline ? (isHost ? 'X' : 'O') : null;

  // Play join sound when opponent connects
  useEffect(() => {
    if (connectionStatus === 'connected') {
      playJoinSound();
      if (screen === 'menu') {
        setScreen('playing');
        setGameState(getInitialState());
      }
    }
  }, [connectionStatus, screen]);

  // Sync state Host -> Guest when guest connects, or on key events
  useEffect(() => {
    if (isOnline && isHost && connectionStatus === 'connected') {
      sendStateSync(gameState);
    }
  }, [gameState.currentPlayer, isOnline, isHost, connectionStatus, sendStateSync]);

  // Click cell callback
  const handleCellClick = (boardIndex, cellIndex) => {
    // Check local turn in online mode
    if (isOnline) {
      if (connectionStatus !== 'connected') return;
      if (gameState.currentPlayer !== mySymbol) {
        playErrorSound();
        return;
      }
    }

    if (!isValidMove(gameState, boardIndex, cellIndex)) {
      playErrorSound();
      return;
    }

    const nextState = makeMove(gameState, boardIndex, cellIndex);
    applyMoveState(nextState, gameState);

    // If online, broadcast the move
    if (isOnline) {
      sendMove(boardIndex, cellIndex);
    }
  };

  // Game action controls
  const handleRestart = () => {
    playMoveSound();
    const cleanState = getInitialState();
    setGameState(cleanState);
    if (isOnline) {
      sendRestart();
    }
  };

  const handleBackToMenu = () => {
    playMoveSound();
    if (isOnline) {
      leaveRoom();
    }
    setIsOnline(false);
    setScreen('menu');
    setGameState(getInitialState());
  };

  const toggleSound = () => {
    const muted = toggleMute();
    setSoundMuted(muted);
    // play soft click if unmuted
    if (!muted) {
      // Resume Web Audio Context if needed
      const ctx = window.AudioContext || window.webkitAudioContext;
      if (ctx) {
        const tempCtx = new ctx();
        if (tempCtx.state === 'suspended') tempCtx.resume();
      }
      playMoveSound();
    }
  };

  // Start Offline
  const handleStartOfflineGame = () => {
    playMoveSound();
    setIsOnline(false);
    setScreen('playing');
    setGameState(getInitialState());
  };

  // Start Online (Host)
  const handleCreateOnlineGame = (code) => {
    setIsOnline(true);
    createRoom(code);
  };

  // Start Online (Join)
  const handleJoinOnlineGame = (code) => {
    setIsOnline(true);
    joinRoom(code);
  };

  const isMyTurn = isOnline && (gameState.currentPlayer === mySymbol);

  return (
    <div className="app-container">
      {/* Title / Info Bar in Game Screen */}
      {screen === 'playing' && (
        <div className="game-header">
          <div className="game-header-left">
            <button 
              className="btn btn-icon-only" 
              onClick={handleBackToMenu}
              title="Back to Menu"
            >
              <ArrowLeft size={18} />
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="font-display" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                {isOnline ? `Room: ${roomCode}` : 'Local Match'}
              </span>
              {isOnline && (
                <div className={`connection-indicator ${connectionStatus}`}>
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: 'currentColor', 
                    marginRight: '6px'
                  }}></span>
                  {connectionStatus}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-icon-only" 
              onClick={() => setRulesOpen(true)}
              title="View Rules"
            >
              <HelpCircle size={18} />
            </button>
            <button 
              className="btn btn-icon-only" 
              onClick={handleRestart}
              title="Restart Match"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Screen Router */}
      {screen === 'menu' ? (
        <Menu 
          onCreateOnlineGame={handleCreateOnlineGame}
          onJoinOnlineGame={handleJoinOnlineGame}
          onStartOfflineGame={handleStartOfflineGame}
          onShowRules={() => setRulesOpen(true)}
          peerError={peerError}
          isConnecting={isOnline && connectionStatus === 'connecting'}
        />
      ) : (
        <div className="game-layout fade-in">
          
          {/* Top Info HUD */}
          <div className="status-panel glass-panel" style={{ width: '100%', maxWidth: '980px' }}>
            <div className="status-row">
              <div className="player-turn-indicator">
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Turn:</span>
                
                <div className={`player-badge badge-x ${gameState.currentPlayer === 'X' ? 'active' : ''}`}>
                  <span className="text-x">X</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {isOnline ? (isHost ? 'You' : 'Opponent') : 'Player X'}
                  </span>
                </div>

                <div className={`player-badge badge-o ${gameState.currentPlayer === 'O' ? 'active' : ''}`}>
                  <span className="text-o">O</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {isOnline ? (!isHost ? 'You' : 'Opponent') : 'Player O'}
                  </span>
                </div>
              </div>

              {/* Play Constraint Banner */}
              <div style={{ textAlign: 'right' }}>
                {gameState.activeBoard === null ? (
                  <span className="text-active" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                     WILDCARD: Play anywhere!
                  </span>
                ) : (
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Play in sub-board <span className="font-display text-active" style={{ fontWeight: 'bold' }}>#{gameState.activeBoard + 1}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Online Turn Callouts */}
            {isOnline && connectionStatus === 'connected' && (
              <div style={{ 
                borderTop: '1px solid rgba(255,255,255,0.04)', 
                paddingTop: '0.5rem', 
                fontSize: '0.85rem', 
                textAlign: 'center',
                color: isMyTurn ? 'var(--color-active)' : 'var(--text-secondary)',
                fontWeight: isMyTurn ? 'bold' : 'normal'
              }}>
                {isMyTurn ? '▲ YOUR TURN TO MOVE ▲' : '▼ Opponent is thinking... ▼'}
              </div>
            )}
          </div>

          {/* Game Board & Utilities Side panel */}
          <div className="game-main-area">
            
            {/* The main Grid */}
            <div className="board-container-wrapper">
              <SuperBoard 
                board={gameState.board}
                macroBoard={gameState.macroBoard}
                macroBoardLines={gameState.macroBoardLines}
                activeBoard={gameState.activeBoard}
                currentPlayer={gameState.currentPlayer}
                onCellClick={handleCellClick}
                overallWinner={gameState.winner}
              />
            </div>

            {/* Side tools: Logs and chat */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {isOnline && (
                <Chat 
                  messages={chatMessages} 
                  onSendMessage={sendChat} 
                />
              )}

              {/* Move history log */}
              <div className="glass-panel" style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
                <span className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Move Log</span>
                <div className="history-list" style={{ flex: 1 }}>
                  {gameState.history.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                      No moves recorded.
                    </div>
                  ) : (
                    gameState.history.map((hist, idx) => (
                      <div key={idx} className="history-item">
                        <span style={{ opacity: 0.5 }}>#{idx + 1}</span>
                        <span className={`history-badge ${hist.player.toLowerCase()}`}>{hist.player}</span>
                        <span>{hist.description.split(': ')[1]}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Rules Modal */}
      {rulesOpen && (
        <RulesPopup onClose={() => { playMoveSound(); setRulesOpen(false); }} />
      )}

      {/* Game Over Screen Overlay */}
      {gameState.winner && (
        <GameOverlay 
          winner={gameState.winner}
          onRestart={handleRestart}
          onBackToMenu={handleBackToMenu}
          isOnline={isOnline}
          isHost={isHost}
        />
      )}

      {/* Sound Mute Button */}
      <button 
        className="btn btn-icon-only sound-toggle" 
        onClick={toggleSound}
        title={soundMuted ? "Unmute Sound" : "Mute Sound"}
      >
        {soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  );
}
