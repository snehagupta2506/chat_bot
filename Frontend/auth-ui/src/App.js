// App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import VoiceChat from './pages/Chat';
import LogoutButton from './pages/Logout';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const syncLoginState = () => setIsLoggedIn(!!localStorage.getItem('token'));
    window.addEventListener('storage', syncLoginState);
    return () => window.removeEventListener('storage', syncLoginState);
  }, []);

  return (
    <Router>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand" to="/">NextChat</Link>
          <div className="collapse navbar-collapse">
            <ul className="navbar-nav ms-auto align-items-center">
              {isLoggedIn ? (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/voice-chat">Voice Chat</Link>
                  </li>
                  <li className="nav-item">
                    <LogoutButton setIsLoggedIn={setIsLoggedIn} />
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/signup">Signup</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/login">Login</Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/signup" element={<Signup setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/voice-chat" element={<VoiceChat />} />
      </Routes>
    </Router>
  );
};

export default App;
