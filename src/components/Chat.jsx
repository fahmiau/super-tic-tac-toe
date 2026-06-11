import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { playMoveSound } from '../utils/sounds';

export default function Chat({ messages, onSendMessage }) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const sent = onSendMessage(inputText);
    if (sent) {
      playMoveSound(); // soft tick on send
      setInputText('');
    }
  };

  return (
    <div className="chat-container glass-panel">
      <div className="chat-header">
        <MessageSquare size={16} className="text-active" />
        <span>Live Room Chat</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-message-bubble system" style={{ alignSelf: 'center', opacity: 0.7 }}>
            No messages yet. Send a greeting!
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`chat-message-bubble ${msg.type}`}
            >
              {msg.text}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input
          type="text"
          className="input-text"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          maxLength={100}
          style={{ padding: '0.6rem 0.85rem', fontSize: '0.9rem' }}
        />
        <button 
          type="submit" 
          className="btn btn-primary btn-icon-only"
          style={{ width: '40px', height: '40px', padding: 0 }}
          disabled={!inputText.trim()}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
