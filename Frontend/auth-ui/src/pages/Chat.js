import React, { useState, useRef } from 'react';

const VoiceChat = () => {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  const handleVoiceInput = () => {
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.start();
    setIsListening(true);

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);

      setMessages(prev => [...prev, { type: 'user', text: transcript }]);

      try {
        const res = await fetch('http://localhost:3001/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: transcript }),
        });
        const data = await res.json();
        const botMessage = data.message || 'No response';

        setMessages(prev => [...prev, { type: 'bot', text: botMessage }]);
      } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { type: 'bot', text: 'Error getting response' }]);
      }
    };

    recognition.onerror = (err) => {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    };
  };

  const handleSpeak = (text, index) => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel(); // stop current speech if any
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.onend = () => setSpeakingIndex(null);

    utteranceRef.current = utterance;
    setSpeakingIndex(index);
    synthRef.current.speak(utterance);
  };

  const handlePause = () => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel(); // SpeechSynthesis doesn't support "pause/resume" well; cancel instead
    }
    setSpeakingIndex(null);
  };

  return (
    <div className="container text-white bg-dark vh-100 d-flex flex-column justify-content-center align-items-center">
      <h2 className="mb-4">🎤 Voice Chatbot</h2>
      <button onClick={handleVoiceInput} className="btn btn-primary mb-4">
        {isListening ? 'Listening...' : '🎙 Start Talking'}
      </button>

      <div className="w-100 bg-secondary p-3 rounded" style={{ maxWidth: '600px', overflow: 'auto', maxHeight: '60vh' }}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-2 text-${msg.type === 'user' ? 'light' : 'info'}`}>
            <strong>{msg.type === 'user' ? 'You' : 'Bot'}:</strong> {msg.text}
            {msg.type === 'bot' && (
              <div className="mt-1">
                {speakingIndex === idx ? (
                  <button onClick={handlePause} className="btn btn-sm btn-danger">⏸ Pause</button>
                ) : (
                  <button onClick={() => handleSpeak(msg.text, idx)} className="btn btn-sm btn-success">🔊 Play</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceChat;
