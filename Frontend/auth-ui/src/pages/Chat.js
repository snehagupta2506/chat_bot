import React, { useState, useEffect, useRef } from 'react';

const VoiceChat = () => {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const ws = useRef(null);
  const speechRef = useRef(null);
  const bufferRef = useRef('');
  const lastSpokenTextRef = useRef('');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:3001');

    ws.current.onopen = () => console.log('WebSocket connection opened');

    ws.current.onmessage = (event) => {
      const text = event.data;

      if (text === '[DONE]') {
        const finalMessage = bufferRef.current;
        bufferRef.current = '';
        lastSpokenTextRef.current = finalMessage;
        setMessages((prev) => [...prev, { type: 'bot', text: finalMessage }]);
        setStreaming('');
      } else if (text === '[ERROR]') {
        setMessages((prev) => [...prev, { type: 'bot', text: '❌ Error from assistant.' }]);
      } else {
        bufferRef.current += text;
        setStreaming(bufferRef.current);
      }
    };

    ws.current.onerror = (err) => console.error('WebSocket error:', err);
    ws.current.onclose = () => console.log('WebSocket closed');

    return () => {
      ws.current?.close();
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleVoiceInput = () => {
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      bufferRef.current = '';
      setStreaming('');
      setMessages((prev) => [...prev, { type: 'user', text: transcript }]);

      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(transcript);
      } else {
        console.warn('WebSocket not open. Message not sent.');
      }
    };

    recognition.onerror = (err) => {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    };
  };

  const handlePlayPause = (text) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      speechRef.current = utterance;
      setIsSpeaking(true);

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="container text-white bg-dark vh-100 d-flex flex-column justify-content-center align-items-center">
      <h2 className="mb-4">🎙 Voice Chatbot (Streaming)</h2>
      <button onClick={handleVoiceInput} className="btn btn-primary mb-4">
        {isListening ? 'Listening...' : '🎙 Start Talking'}
      </button>

      <div className="w-100 bg-secondary p-3 rounded" style={{ maxWidth: '600px', overflow: 'auto',maxHeight:'600px'}}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-3 text-${msg.type === 'user' ? 'light' : 'info'}`}>
            <strong>{msg.type === 'user' ? 'You' : 'Bot'}:</strong> {msg.text}
            {msg.type === 'bot' && (
              <div className="mt-1">
                <button
                  className="btn btn-sm btn-outline-light"
                  onClick={() => handlePlayPause(msg.text)}
                >
                  {isSpeaking ? '⏸ Pause' : '▶️ Play'}
                </button>
              </div>
            )}
          </div>
        ))}

        {streaming && (
          <div className="text-info">
            <strong>Bot (typing):</strong> {streaming}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceChat;
