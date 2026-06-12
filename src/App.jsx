import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { getBestMove } from './utils/ai';

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

  // Solo Mode AI State
  const [isSolo, setIsSolo] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Refs
  const moveLogRef = useRef(null);

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

  // Solo AI Player Turn Handler
  useEffect(() => {
    if (isSolo && gameState.currentPlayer === 'O' && !gameState.winner) {
      if (!isAiThinking) {
        // Set thinking state asynchronously to avoid React cascading render warning
        const timer = setTimeout(() => {
          setIsAiThinking(true);
        }, 0);
        return () => clearTimeout(timer);
      }
      
      const start = Date.now();
      
      // Run AI logic in a brief timeout to let React update the "Computer is thinking" UI
      const timer = setTimeout(() => {
        const aiMove = getBestMove(gameState, aiDifficulty);
        
        if (aiMove) {
          const elapsed = Date.now() - start;
          const remainingDelay = Math.max(700 - elapsed, 0); // Keep thinking natural-looking (at least 700ms)
          
          setTimeout(() => {
            setGameState(prevState => {
              // Verify the board state has not changed since calculation started
              if (
                prevState.currentPlayer !== 'O' || 
                prevState.history.length !== gameState.history.length ||
                prevState.winner
              ) {
                setIsAiThinking(false);
                return prevState;
              }
              
              if (!isValidMove(prevState, aiMove.boardIndex, aiMove.cellIndex)) {
                setIsAiThinking(false);
                return prevState;
              }
              
              const nextState = makeMove(prevState, aiMove.boardIndex, aiMove.cellIndex);
              
              // Play sounds & check winning sub-board
              playMoveSound();
              
              let subBoardWon = false;
              for (let i = 0; i < 9; i++) {
                if (nextState.macroBoard[i] !== prevState.macroBoard[i]) {
                  subBoardWon = true;
                  break;
                }
              }
              
              if (nextState.winner) {
                playMacroWinSound();
              } else if (subBoardWon) {
                playMicroWinSound();
              }
              
              setIsAiThinking(false);
              return nextState;
            });
          }, remainingDelay);
        } else {
          setIsAiThinking(false);
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isSolo, gameState, aiDifficulty, isAiThinking]);

  // Auto-scroll move log to bottom on new moves
  useEffect(() => {
    if (moveLogRef.current) {
      moveLogRef.current.scrollTop = moveLogRef.current.scrollHeight;
    }
  }, [gameState.history]);

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

    // Check turn in Solo mode
    if (isSolo) {
      if (gameState.currentPlayer !== 'X' || isAiThinking) {
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
    setIsAiThinking(false);
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
    setIsSolo(false);
    setIsAiThinking(false);
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
    setIsSolo(false);
    setScreen('playing');
    setGameState(getInitialState());
  };

  // Start Solo VS Computer
  const handleStartSoloGame = (difficulty) => {
    playMoveSound();
    setIsOnline(false);
    setIsSolo(true);
    setAiDifficulty(difficulty);
    setScreen('playing');
    setGameState(getInitialState());
  };

  // Start Online (Host)
  const handleCreateOnlineGame = (code) => {
    setIsOnline(true);
    setIsSolo(false);
    createRoom(code);
  };

  // Start Online (Join)
  const handleJoinOnlineGame = (code) => {
    setIsOnline(true);
    setIsSolo(false);
    joinRoom(code);
  };

  const handleCancelOnlineGame = () => {
    setIsOnline(false);
    setIsSolo(false);
    leaveRoom();
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
              <span className="font-display" style={{ fontSize: '1rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
                {isOnline ? `Room: ${roomCode}` : (isSolo ? `Solo: ${aiDifficulty}` : 'Local Match')}
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
          onStartSoloGame={handleStartSoloGame}
          onShowRules={() => setRulesOpen(true)}
          onCancelOnlineGame={handleCancelOnlineGame}
          peerError={peerError}
          isConnecting={isOnline && connectionStatus === 'connecting'}
        />
      ) : (
        <div className="game-layout fade-in">
          
          {/* Top Info HUD */}
          <div className="status-panel glass-panel">
            <div className="status-row">
              <div className="player-turn-indicator">
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Turn:</span>
                
                <div className={`player-badge badge-x ${gameState.currentPlayer === 'X' ? 'active' : ''}`}>
                  <span className="text-x">X</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {isOnline ? (isHost ? 'You' : 'Opponent') : (isSolo ? 'You' : 'Player X')}
                  </span>
                </div>

                <div className={`player-badge badge-o ${gameState.currentPlayer === 'O' ? 'active' : ''}`}>
                  <span className="text-o">O</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'capitalize' }}>
                    {isOnline ? (!isHost ? 'You' : 'Opponent') : (isSolo ? `AI (${aiDifficulty})` : 'Player O')}
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

            {/* Turn Callouts */}
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

            {isSolo && !gameState.winner && (
              <div style={{ 
                borderTop: '1px solid rgba(255,255,255,0.04)', 
                paddingTop: '0.5rem', 
                fontSize: '0.85rem', 
                textAlign: 'center',
                color: isAiThinking ? 'var(--color-o)' : 'var(--color-active)',
                fontWeight: 'bold'
              }}>
                {isAiThinking ? '▼ Computer is thinking... ▼' : '▲ YOUR TURN TO MOVE ▲'}
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
            <div className="side-tools-container">
              {isOnline && (
                <Chat 
                  messages={chatMessages} 
                  onSendMessage={sendChat} 
                />
              )}

              {/* Move history log */}
              <div className="glass-panel move-log-panel">
                <span className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Move Log</span>
                <div ref={moveLogRef} className="history-list" style={{ flex: 1 }}>
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
