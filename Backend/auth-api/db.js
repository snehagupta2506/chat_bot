const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',           // ✅ Make sure this is set
    password: 'password',   // ✅ Replace with actual password
    database: 'myapp_db'   
});

connection.connect((err) => {
  if (err) throw err;
  console.log('MySQL Connected');
});

module.exports = connection;
