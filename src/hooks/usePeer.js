import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';

const PEER_PREFIX = 'sttt-';

export function usePeer(onMoveReceived, onRestartReceived, onStateSyncReceived) {
  const [peer, setPeer] = useState(null);
  const [conn, setConn] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  
  const connRef = useRef(null);
  const peerRef = useRef(null);

  // Clean up WebRTC connection on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (connRef.current) {
      connRef.current.close();
      connRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setConn(null);
    setPeer(null);
    setConnectionStatus('disconnected');
    setRoomCode('');
    setIsHost(false);
    setError('');
    setChatMessages([]);
  };

  // Setup connection event listeners
  const setupConnection = useCallback((connection) => {
    connRef.current = connection;
    setConn(connection);
    setConnectionStatus('connecting');

    connection.on('open', () => {
      setConnectionStatus('connected');
      setError('');
      // Add a system chat message that connection is established
      setChatMessages(prev => [...prev, { 
        type: 'system', 
        text: isHost ? 'Guest connected! You are Player X (Cyan)' : 'Connected to host! You are Player O (Pink)' 
      }]);
    });

    connection.on('data', (data) => {
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'MOVE':
          if (onMoveReceived) {
            onMoveReceived(data.boardIndex, data.cellIndex);
          }
          break;
        case 'RESTART':
          if (onRestartReceived) {
            onRestartReceived();
          }
          setChatMessages(prev => [...prev, { type: 'system', text: 'Opponent restarted the game.' }]);
          break;
        case 'SYNC_STATE':
          if (onStateSyncReceived) {
            onStateSyncReceived(data.state);
          }
          break;
        case 'CHAT':
          setChatMessages(prev => [...prev, { type: 'them', text: data.text }]);
          break;
        default:
          console.warn('Unknown message type received:', data.type);
      }
    });

    connection.on('close', () => {
      setConnectionStatus('disconnected');
      setChatMessages(prev => [...prev, { type: 'system', text: 'Opponent disconnected.' }]);
      connRef.current = null;
      setConn(null);
    });

    connection.on('error', (err) => {
      console.error('Connection error:', err);
      setError('Connection error occurred.');
    });
  }, [isHost, onMoveReceived, onRestartReceived, onStateSyncReceived]);

  // Create a room (Host)
  const createRoom = useCallback((code) => {
    cleanup();
    setIsHost(true);
    setRoomCode(code);
    setConnectionStatus('connecting');

    const peerId = `${PEER_PREFIX}${code.toLowerCase()}`;
    // Initialize PeerJS client with standard public signaling cloud
    const newPeer = new Peer(peerId, {
      debug: 1 // Only log errors
    });

    peerRef.current = newPeer;
    setPeer(newPeer);

    newPeer.on('open', (id) => {
      // Host is successfully registered and waiting for connection
      setConnectionStatus('connecting');
      setError('');
    });

    newPeer.on('connection', (connection) => {
      // Guest connected to our peer
      setupConnection(connection);
    });

    newPeer.on('error', (err) => {
      console.error('Peer error:', err.type, err);
      if (err.type === 'unavailable-id') {
        setError('Room code is already active. Please try another one.');
      } else {
        setError(`Failed to create room: ${err.message}`);
      }
      setConnectionStatus('disconnected');
    });
  }, [setupConnection]);

  // Join a room (Guest)
  const joinRoom = useCallback((code) => {
    cleanup();
    setIsHost(false);
    setRoomCode(code);
    setConnectionStatus('connecting');

    // Create peer with a random client ID
    const newPeer = new Peer({
      debug: 1
    });

    peerRef.current = newPeer;
    setPeer(newPeer);

    newPeer.on('open', (id) => {
      // Once our peer is open, initiate connection to host
      const hostPeerId = `${PEER_PREFIX}${code.toLowerCase()}`;
      const connection = newPeer.connect(hostPeerId, {
        reliable: true
      });
      setupConnection(connection);
    });

    newPeer.on('error', (err) => {
      console.error('Peer error:', err.type, err);
      if (err.type === 'peer-not-found') {
        setError('Room not found. Check the code and make sure the host is waiting.');
      } else {
        setError(`Connection failed: ${err.message}`);
      }
      setConnectionStatus('disconnected');
    });
  }, [setupConnection]);

  // Send an in-game move
  const sendMove = useCallback((boardIndex, cellIndex) => {
    if (connRef.current && connectionStatus === 'connected') {
      connRef.current.send({
        type: 'MOVE',
        boardIndex,
        cellIndex
      });
    }
  }, [connectionStatus]);

  // Synchronize state (typically Host -> Guest on connection or turn)
  const sendStateSync = useCallback((state) => {
    if (connRef.current && connectionStatus === 'connected') {
      connRef.current.send({
        type: 'SYNC_STATE',
        state
      });
    }
  }, [connectionStatus]);

  // Request a game restart
  const sendRestart = useCallback(() => {
    if (connRef.current && connectionStatus === 'connected') {
      connRef.current.send({
        type: 'RESTART'
      });
      setChatMessages(prev => [...prev, { type: 'system', text: 'You restarted the game.' }]);
    }
  }, [connectionStatus]);

  // Send a chat message
  const sendChat = useCallback((text) => {
    if (connRef.current && connectionStatus === 'connected' && text.trim()) {
      connRef.current.send({
        type: 'CHAT',
        text
      });
      setChatMessages(prev => [...prev, { type: 'me', text }]);
      return true;
    }
    return false;
  }, [connectionStatus]);

  // Manually leave the room
  const leaveRoom = useCallback(() => {
    cleanup();
  }, []);

  return {
    connectionStatus,
    roomCode,
    isHost,
    error,
    chatMessages,
    createRoom,
    joinRoom,
    sendMove,
    sendStateSync,
    sendRestart,
    sendChat,
    leaveRoom
  };
}
