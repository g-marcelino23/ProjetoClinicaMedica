const pg = require('pg');
require('dotenv').config();

console.log('Módulo pg carregado:', Object.keys(pg));

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

console.log('Pool criado:', typeof pool, 'connect:', typeof pool.connect);

module.exports = pool;