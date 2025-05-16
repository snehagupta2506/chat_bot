const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const authRoutes = require('./auth-api/routes/auth');
const { handleWebSocket } = require('./auth-api/routes/auth');
require('dotenv').config();

const app = express();
app.use(cors({ origin: 'http://localhost:3002' }));
app.use(express.json());
app.use('/api', authRoutes);

// Create HTTP server and WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', handleWebSocket);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
