import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';

// Utilities
import {
  GAME_VARIANTS,
  GAME_VARIANT_INFO,
  MAX_MOVING_PIECES,
  countPieces,
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
import StandardBoard from './components/StandardBoard';
import RulesPopup from './components/RulesPopup';
import GameOverlay from './components/GameOverlay';
import Chat from './components/Chat';

// Hooks
import { usePeer } from './hooks/usePeer';

function playSoundForTransition(nextState, previousState) {
  playMoveSound();

  if (
    nextState.variant === GAME_VARIANTS.SUPER &&
    nextState.macroBoard &&
    previousState?.macroBoard
  ) {
    let subBoardWon = false;
    for (let i = 0; i < 9; i++) {
      if (nextState.macroBoard[i] !== previousState.macroBoard[i]) {
        subBoardWon = true;
        break;
      }
    }

    if (nextState.winner) {
      playMacroWinSound();
    } else if (subBoardWon) {
      playMicroWinSound();
    }
    return;
  }

  if (nextState.winner) {
    playMacroWinSound();
  }
}

export default function App() {
  // Navigation & UI States
  const [screen, setScreen] = useState('menu'); // 'menu', 'playing'
  const [selectedVariant, setSelectedVariant] = useState(GAME_VARIANTS.SUPER);
  const [isOnline, setIsOnline] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(getMuteState());

  // Game Engine State
  const [gameState, setGameState] = useState(() => getInitialState(GAME_VARIANTS.SUPER));
  const [selectedCell, setSelectedCell] = useState(null);
  const [moveHint, setMoveHint] = useState('');

  // Solo Mode AI State
  const [isSolo, setIsSolo] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Refs
  const moveLogRef = useRef(null);

  const applyMoveState = useCallback((nextState, previousState) => {
    setGameState(nextState);
    setSelectedCell(null);
    setMoveHint('');
    playSoundForTransition(nextState, previousState);
  }, []);

  // WebRTC callbacks
  const handleRemoteMove = useCallback((move) => {
    setGameState(prevState => {
      if (!isValidMove(prevState, move)) {
        return prevState;
      }
      const nextState = makeMove(prevState, move);
      playSoundForTransition(nextState, prevState);
      return nextState;
    });
    setSelectedCell(null);
    setMoveHint('');
  }, []);

  const handleRemoteRestart = useCallback((remoteVariant) => {
    setGameState(prev => getInitialState(remoteVariant || prev.variant || GAME_VARIANTS.SUPER));
    setSelectedCell(null);
    setMoveHint('');
  }, []);

  const handleRemoteStateSync = useCallback((remoteState) => {
    if (!remoteState || typeof remoteState !== 'object') return;
    setGameState(remoteState);
    if (remoteState.variant) {
      setSelectedVariant(remoteState.variant);
    }
    setSelectedCell(null);
    setMoveHint('');
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
  const activeVariant = gameState.variant || GAME_VARIANTS.SUPER;
  const variantInfo = GAME_VARIANT_INFO[activeVariant] || GAME_VARIANT_INFO[GAME_VARIANTS.SUPER];

  // Auto-clear temporary hint banner
  useEffect(() => {
    if (!moveHint) return;
    const timer = setTimeout(() => setMoveHint(''), 2200);
    return () => clearTimeout(timer);
  }, [moveHint]);

  // Play join sound when opponent connects
  useEffect(() => {
    if (connectionStatus === 'connected') {
      playJoinSound();
      if (screen === 'menu') {
        setScreen('playing');
        if (isHost) {
          setGameState(prev =>
            prev.variant === selectedVariant ? prev : getInitialState(selectedVariant)
          );
        }
      }
    }
  }, [connectionStatus, screen, isHost, selectedVariant]);

  // Sync state Host -> Guest when guest connects, or on key events
  useEffect(() => {
    if (isOnline && isHost && connectionStatus === 'connected') {
      sendStateSync(gameState);
    }
  }, [gameState, isOnline, isHost, connectionStatus, sendStateSync]);

  // Solo AI Player Turn Handler
  useEffect(() => {
    if (!isSolo || gameState.currentPlayer !== 'O' || gameState.winner) {
      return;
    }

    let cancelled = false;
    let innerTimer = null;

    const thinkingTimer = setTimeout(() => {
      if (cancelled) return;
      setIsAiThinking(true);

      const start = Date.now();
      const aiMove = getBestMove(gameState, aiDifficulty);

      if (!aiMove || cancelled) {
        setIsAiThinking(false);
        return;
      }

      const targetDelay = gameState.variant === GAME_VARIANTS.SUPER ? 700 : 450;
      const elapsed = Date.now() - start;
      const remainingDelay = Math.max(targetDelay - elapsed, 0);

      innerTimer = setTimeout(() => {
        if (cancelled) return;

        setGameState(prevState => {
          if (
            prevState.currentPlayer !== 'O' ||
            prevState.variant !== gameState.variant ||
            prevState.history.length !== gameState.history.length ||
            prevState.winner
          ) {
            return prevState;
          }

          if (!isValidMove(prevState, aiMove)) {
            return prevState;
          }

          const nextState = makeMove(prevState, aiMove);
          playSoundForTransition(nextState, prevState);
          return nextState;
        });

        setSelectedCell(null);
        setMoveHint('');
        setIsAiThinking(false);
      }, remainingDelay);
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(thinkingTimer);
      if (innerTimer) clearTimeout(innerTimer);
    };
  }, [isSolo, gameState, aiDifficulty]);

  // Auto-scroll move log to bottom on new moves
  useEffect(() => {
    if (moveLogRef.current) {
      moveLogRef.current.scrollTop = moveLogRef.current.scrollHeight;
    }
  }, [gameState.history]);

  const checkTurnAllowed = () => {
    if (gameState.winner) return false;

    if (isOnline) {
      if (connectionStatus !== 'connected') return false;
      if (gameState.currentPlayer !== mySymbol) {
        playErrorSound();
        return false;
      }
    }

    if (isSolo) {
      if (gameState.currentPlayer !== 'X' || isAiThinking) {
        playErrorSound();
        return false;
      }
    }

    return true;
  };

  const commitMove = (move) => {
    if (!isValidMove(gameState, move)) {
      playErrorSound();
      return;
    }

    const nextState = makeMove(gameState, move);
    applyMoveState(nextState, gameState);

    if (isOnline) {
      sendMove(move);
    }
  };

  // Super Tic Tac Toe click handler
  const handleSuperCellClick = (boardIndex, cellIndex) => {
    if (!checkTurnAllowed()) return;
    commitMove({ boardIndex, cellIndex });
  };

  // Classic & 3-Piece Shift click handler
  const handleStandardCellClick = (cellIndex) => {
    if (!checkTurnAllowed()) return;

    if (activeVariant === GAME_VARIANTS.CLASSIC) {
      commitMove({ cellIndex });
      return;
    }

    // 3-Piece Shift mode
    const pieceCount = countPieces(gameState.cells, gameState.currentPlayer);
    if (pieceCount < MAX_MOVING_PIECES) {
      commitMove({ fromIndex: null, toIndex: cellIndex });
      return;
    }

    const clickedValue = gameState.cells[cellIndex];
    if (clickedValue === gameState.currentPlayer) {
      playMoveSound();
      setMoveHint('');
      setSelectedCell(prev => (prev === cellIndex ? null : cellIndex));
    } else if (clickedValue === null) {
      if (selectedCell !== null) {
        commitMove({ fromIndex: selectedCell, toIndex: cellIndex });
      } else {
        playErrorSound();
        setMoveHint('Select one of your 3 marks to move first!');
      }
    } else {
      playErrorSound();
    }
  };

  // Game action controls
  const handleRestart = () => {
    playMoveSound();
    const variantToReset = gameState.variant || selectedVariant;
    const cleanState = getInitialState(variantToReset);
    setGameState(cleanState);
    setSelectedCell(null);
    setMoveHint('');
    setIsAiThinking(false);
    if (isOnline) {
      sendRestart(variantToReset);
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
    setSelectedCell(null);
    setMoveHint('');
    setScreen('menu');
    setGameState(getInitialState(selectedVariant));
  };

  const toggleSound = () => {
    const muted = toggleMute();
    setSoundMuted(muted);
    if (!muted) {
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
    setSelectedCell(null);
    setMoveHint('');
    setScreen('playing');
    setGameState(getInitialState(selectedVariant));
  };

  // Start Solo VS Computer
  const handleStartSoloGame = (difficulty) => {
    playMoveSound();
    setIsOnline(false);
    setIsSolo(true);
    setAiDifficulty(difficulty);
    setSelectedCell(null);
    setMoveHint('');
    setScreen('playing');
    setGameState(getInitialState(selectedVariant));
  };

  // Start Online (Host)
  const handleCreateOnlineGame = (code) => {
    setIsOnline(true);
    setIsSolo(false);
    setSelectedCell(null);
    setMoveHint('');
    setGameState(getInitialState(selectedVariant));
    createRoom(code);
  };

  // Start Online (Join)
  const handleJoinOnlineGame = (code) => {
    setIsOnline(true);
    setIsSolo(false);
    setSelectedCell(null);
    setMoveHint('');
    joinRoom(code);
  };

  const handleCancelOnlineGame = () => {
    setIsOnline(false);
    setIsSolo(false);
    setSelectedCell(null);
    setMoveHint('');
    leaveRoom();
  };

  const isMyTurn = isOnline && gameState.currentPlayer === mySymbol;
  const isTurnPlayable =
    !gameState.winner &&
    (!isOnline || (connectionStatus === 'connected' && isMyTurn)) &&
    (!isSolo || (gameState.currentPlayer === 'X' && !isAiThinking));

  const xPieceCount =
    activeVariant === GAME_VARIANTS.MOVING ? countPieces(gameState.cells, 'X') : 0;
  const oPieceCount =
    activeVariant === GAME_VARIANTS.MOVING ? countPieces(gameState.cells, 'O') : 0;
  const currentPieceCount = gameState.currentPlayer === 'X' ? xPieceCount : oPieceCount;

  const renderStatusBanner = () => {
    if (activeVariant === GAME_VARIANTS.SUPER) {
      if (gameState.activeBoard === null) {
        return (
          <span className="text-active" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            WILDCARD: Play anywhere!
          </span>
        );
      }
      return (
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Play in sub-board{' '}
          <span className="font-display text-active" style={{ fontWeight: 'bold' }}>
            #{gameState.activeBoard + 1}
          </span>
        </span>
      );
    }

    if (activeVariant === GAME_VARIANTS.CLASSIC) {
      return (
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Classic 3×3 · <span className="text-active" style={{ fontWeight: 600 }}>3 in a row wins</span>
        </span>
      );
    }

    // 3-Piece Shift
    if (gameState.winner) {
      return (
        <span className="text-active" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
          Match Complete!
        </span>
      );
    }

    if (currentPieceCount < MAX_MOVING_PIECES) {
      return (
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Place mark{' '}
          <span className="font-display text-active" style={{ fontWeight: 'bold' }}>
            ({currentPieceCount}/{MAX_MOVING_PIECES} used)
          </span>
        </span>
      );
    }

    if (selectedCell !== null) {
      return (
        <span className="text-active" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
          Move #{selectedCell + 1} → Pick any empty cell
        </span>
      );
    }

    return (
      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        Shift Phase:{' '}
        <span className="text-active" style={{ fontWeight: 600 }}>
          Select 1 of your marks
        </span>
      </span>
    );
  };

  const renderPiecePips = (count, symbolClass) => (
    <span className="piece-pips" aria-label={`${count} of ${MAX_MOVING_PIECES} marks placed`}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={`piece-pip ${i < count ? `filled ${symbolClass}` : ''}`}
        />
      ))}
    </span>
  );

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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="font-display" style={{ fontSize: '1rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
                  {isOnline ? `Room: ${roomCode}` : (isSolo ? `Solo: ${aiDifficulty}` : 'Local Match')}
                </span>
                <span className="variant-pill">{variantInfo.shortName}</span>
              </div>
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
          selectedVariant={selectedVariant}
          onSelectVariant={setSelectedVariant}
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
                  {activeVariant === GAME_VARIANTS.MOVING && renderPiecePips(xPieceCount, 'x')}
                </div>

                <div className={`player-badge badge-o ${gameState.currentPlayer === 'O' ? 'active' : ''}`}>
                  <span className="text-o">O</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'capitalize' }}>
                    {isOnline ? (!isHost ? 'You' : 'Opponent') : (isSolo ? `AI (${aiDifficulty})` : 'Player O')}
                  </span>
                  {activeVariant === GAME_VARIANTS.MOVING && renderPiecePips(oPieceCount, 'o')}
                </div>
              </div>

              {/* Play Constraint Banner */}
              <div style={{ textAlign: 'right' }}>
                {renderStatusBanner()}
              </div>
            </div>

            {moveHint && (
              <div className="move-hint-banner">
                {moveHint}
              </div>
            )}

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
              {activeVariant === GAME_VARIANTS.SUPER ? (
                <SuperBoard
                  board={gameState.board}
                  macroBoard={gameState.macroBoard}
                  macroBoardLines={gameState.macroBoardLines}
                  activeBoard={gameState.activeBoard}
                  currentPlayer={gameState.currentPlayer}
                  onCellClick={handleSuperCellClick}
                  overallWinner={gameState.winner}
                />
              ) : (
                <StandardBoard
                  variant={activeVariant}
                  cells={gameState.cells}
                  currentPlayer={gameState.currentPlayer}
                  winner={gameState.winner}
                  winningLine={gameState.winningLine}
                  selectedCell={selectedCell}
                  lastMove={gameState.lastMove}
                  isTurnPlayable={isTurnPlayable}
                  onCellClick={handleStandardCellClick}
                />
              )}
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
        <RulesPopup
          initialVariant={screen === 'playing' ? activeVariant : selectedVariant}
          onClose={() => { playMoveSound(); setRulesOpen(false); }}
        />
      )}

      {/* Game Over Screen Overlay */}
      {gameState.winner && (
        <GameOverlay
          winner={gameState.winner}
          onRestart={handleRestart}
          onBackToMenu={handleBackToMenu}
          isOnline={isOnline}
          isHost={isHost}
          isSolo={isSolo}
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
