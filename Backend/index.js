const express = require('express');
const app = express();
const authRoutes = require('./auth-api/routes/auth');
require('dotenv').config();
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:3002' }));

app.use(express.json());
app.use('/api', authRoutes);

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


