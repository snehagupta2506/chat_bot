const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,           // ✅ Make sure this is set
    password: process.env.DB_PASSWORD,   // ✅ Replace with actual password
    database: process.env.DB_NAME   
});

module.exports = db;
