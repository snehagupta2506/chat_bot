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
    res.json({ token });
  });
});

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

// Export WebSocket handler
const handleWebSocket = ws => {
  console.log("New WebSocket connection");
  ws.on('message', async (data) => {
    console.log("Received message:", data.toString());
    const message = data.toString();

    try {
      const stream = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.'},
          { role: 'user', content: message },
        ],
        model: 'llama3-70b-8192',
        stream: true,
      });

      for await (const chunk of stream) {
        const token = chunk.choices?.[0]?.delta?.content;
        if (token) {
          ws.send(token);
        }
      }

      ws.send('[DONE]');
    } catch (error) {
      console.error('Groq WebSocket error:', error);
      ws.send('[ERROR]');
    }
  });
};

module.exports = router;
module.exports.handleWebSocket = handleWebSocket;
