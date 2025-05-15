const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,           // ✅ Make sure this is set
    password: process.env.DB_PASSWORD,   // ✅ Replace with actual password
    database: process.env.DB_NAME   
});

connection.connect((err) => {
  if (err) throw err;
  console.log('MySQL Connected');
});

module.exports = connection;
