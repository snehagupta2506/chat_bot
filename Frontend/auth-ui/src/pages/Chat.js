import React, { useState, useEffect, useRef } from "react";

const VoiceChat = () => {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const ws = useRef(null);
  const speechRef = useRef(null);
  const bufferRef = useRef("");
  const lastSpokenTextRef = useRef("");
  const [textInput, setTextInput] = useState("");

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;

    const text = textInput.trim();
    setMessages((prev) => [...prev, { type: "user", text }]);
    setTextInput("");
    bufferRef.current = "";
    setStreaming("");

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          message: text,
          sessionId: currentSessionId,
          user: { id: userId },
        })
      );
    } else {
      console.warn("WebSocket not open. Message not sent.");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:3001/api/sessions", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setSessions(data);
        if (data.length > 0) {
          setCurrentSessionId(data[0].id);
          loadMessages(data[0].id);
        }
      })
      .catch((err) => {
        console.error("Error fetching sessions:", err);
      });
  }, []);

  const loadMessages = async (sessionId) => {
    const res = await fetch(
      `http://localhost:3001/api/sessions/${sessionId}/messages`
    );
    const data = await res.json();
    setMessages(data.map((msg) => ({ type: msg.role, text: msg.content })));
  };

  const startNewSession = async () => {
    const res = await fetch("http://localhost:3001/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: "New Chat " + (sessions.length + 1) }),
    });
    const data = await res.json();
    setCurrentSessionId(data.sessionId);
    setMessages([]);
    setSessions([
      ...sessions,
      { id: data.sessionId, name: "New Chat " + (sessions.length + 1) },
    ]);
  };

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:3001");

    ws.current.onopen = () => console.log("WebSocket connection opened");

    ws.current.onmessage = (event) => {
      const text = event.data;

      if (text === "[DONE]") {
        const finalMessage = bufferRef.current;
        bufferRef.current = "";
        lastSpokenTextRef.current = finalMessage;
        setMessages((prev) => [...prev, { type: "bot", text: finalMessage }]);
        setStreaming("");
      } else if (text === "[ERROR]") {
        setMessages((prev) => [
          ...prev,
          { type: "bot", text: "❌ Error from assistant." },
        ]);
      } else {
        bufferRef.current += text;
        setStreaming(bufferRef.current);
      }
    };

    ws.current.onerror = (err) => console.error("WebSocket error:", err);
    ws.current.onclose = () => console.log("WebSocket closed");

    return () => {
      ws.current?.close();
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleVoiceInput = () => {
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      bufferRef.current = "";
      setStreaming("");
      setMessages((prev) => [...prev, { type: "user", text: transcript }]);

      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({
            message: transcript,
            sessionId: currentSessionId,
            user: { id: userId }, // if needed by backend
          })
        );
      } else {
        console.warn("WebSocket not open. Message not sent.");
      }
    };

    recognition.onerror = (err) => {
      console.error("Speech recognition error:", err);
      setIsListening(false);
    };
  };

  const handlePlayPause = (text) => {
    if (!("speechSynthesis" in window)) return;
  
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
  
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]; // Split by sentence
    let index = 0;
    setIsSpeaking(true);
  
    const speakNext = () => {
      if (index >= sentences.length) {
        setIsSpeaking(false);
        return;
      }
  
      const utterance = new SpeechSynthesisUtterance(sentences[index].trim());
      utterance.lang = "en-US";
  
      utterance.onend = () => {
        index += 1;
        speakNext(); // Speak the next sentence
      };
  
      window.speechSynthesis.speak(utterance);
    };
  
    speakNext();
  };
  
  return (
    <div className="d-flex">
      <div className="sidebar bg-dark p-3 w-25">
        <h5 className="text-white">Sessions</h5>
        <button
          className="btn btn-sm btn-success mb-3"
          onClick={startNewSession}
          style={{ cursor: "pointer" }}
        >
          + New Chat
        </button>
        <ul className="list-unstyled">
          {sessions.map((s) => (
            <li
              style={{ cursor: "pointer" }}
              key={s.id}
              className={`text-white mb-2 ${
                s.id === currentSessionId ? "fw-bold" : ""
              }`}
              onClick={() => {
                setCurrentSessionId(s.id);
                loadMessages(s.id);
              }}
            >
              {s.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="text-white bg-dark vh-100 d-flex flex-column justify-content-center align-items-center w-75">
        <h2 className="mb-4">🎙 Voice Chatbot (Streaming)</h2>
        <div className="d-flex" style={{ marginBottom: "20px" }}>
          <div className="input-group" style={{ marginRight: "10px" }}>
            <input
              type="text"
              className="form-control bg-secondary text-white border-0"
              placeholder="Ask anything..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTextSubmit();
              }}
            />
            <button className="btn btn-success" onClick={handleTextSubmit}>
              Send
            </button>
          </div>

          <button onClick={handleVoiceInput} className="btn btn-primary">
            {isListening ? "Listening..." : "🎙 Start Talking"}
          </button>
        </div>

        <div
          className="w-100 p-3 rounded"
          style={{
            maxWidth: "750px",
            overflow: "auto",
            maxHeight: "600px",
            backgroundColor: "#1f1d1d",
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-3 text-${msg.type === "user" ? "light" : "info"}`}
            >
              <strong>{msg.type === "user" ? "You" : "Bot"}:</strong> {msg.text}
              {msg.type === "bot" && (
                <div className="mt-1">
                  <button
                    className="btn btn-sm btn-outline-light"
                    onClick={() => handlePlayPause(msg.text)}
                  >
                    {isSpeaking ? "⏸ Pause" : "▶️ Play"}
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
    </div>
  );
};

export default VoiceChat;
