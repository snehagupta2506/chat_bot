const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const JWT_SECRET = process.env.JWT_SECRET;

// Signup
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashed], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email already exists' });
      return res.status(500).json({ message: 'DB Error' });
    }
    res.json({ message: 'User created successfully' });
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'DB Error' });
    if (results.length === 0) return res.status(401).json({ message: 'Invalid email or password' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    // Check if session exists for user
    db.query('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [user.id], (sessErr, sessResults) => {
      if (sessErr) return res.status(500).json({ message: 'DB Error checking session' });

      if (sessResults.length > 0) {
        // Session exists, return it
        return res.json({ token, userId: user.id, session: sessResults[0] });
      } else {
        // No session, create a new one
        db.query('INSERT INTO sessions (user_id, name) VALUES (?, ?)', [user.id, 'New Chat'], (insertErr, insertResults) => {
          if (insertErr) return res.status(500).json({ message: 'DB Error creating session' });

          // Return token, userId, and new session
          return res.json({
            token,
            userId: user.id,
            session: {
              id: insertResults.insertId,
              user_id: user.id,
              name: 'New Chat',
              created_at: new Date()
            }
          });
        });
      }
    });
  });
});


function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Regular chat (non-streaming)
router.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: userMessage },
      ],
      model: 'llama3-70b-8192',
    });

    res.json({ message: completion.choices[0]?.message?.content });
  } catch (error) {
    console.error('Groq error:', error);
    res.status(500).json({ error: 'Failed to fetch Groq response.' });
  }
});

async function getSessionMessages(sessionId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC', [sessionId], (err, results) => {
      if (err) return reject(err);
      resolve(results.map(r => ({ role: r.role, content: r.content })));
    });
  });
}

router.get('/sessions', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.query('SELECT * FROM sessions WHERE user_id = ?', [userId], (err, results) => {
    if (err){ 
    console.error('Database error:', err.message);
    return res.status(500).json({ error: 'DB error' });
    }
    res.json(results);
  });
});

router.post('/sessions',authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { name } = req.body;
  db.query('INSERT INTO sessions (user_id, name) VALUES (?, ?)', [userId, name || 'New Session'], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ sessionId: result.insertId });
  });
});

router.get('/sessions/:id/messages', (req, res) => {
  const sessionId = req.params.id;
  db.query('SELECT role, content FROM messages WHERE session_id = ?', [sessionId], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(results);
  });
});

// Export WebSocket handler
const handleWebSocket = (ws, req) => {
  let currentSessionId = null;
  let userId = null;

  ws.on('message', async (data) => {
    try {
      const payload = JSON.parse(data);
      const { message, sessionId, user } = payload;
      currentSessionId = sessionId;
      userId = user?.id;

      // Await user message insert
      await db.promise().query(
        'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)',
        [sessionId, 'user', message]
      );

      // Get previous session messages
      const previousMessages = await getSessionMessages(sessionId);

      const stream = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          ...previousMessages
        ],
        model: 'llama3-70b-8192',
        stream: true,
      });

      let botResponse = '';

      for await (const chunk of stream) {
        const token = chunk.choices?.[0]?.delta?.content;
        if (token) {
          ws.send(token);
          botResponse += token;
        }
      }

      // Await bot message insert — note role 'assistant' (not 'bot')
      await db.promise().query(
        'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)',
        [sessionId, 'assistant', botResponse]
      );

      ws.send('[DONE]');
    } catch (error) {
      console.error('Groq WebSocket error:', error);
      ws.send('[ERROR]');
    }
  });
};




module.exports = router;
module.exports.handleWebSocket = handleWebSocket;
