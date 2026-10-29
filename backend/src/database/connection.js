require('../config/loadEnv')();

const { Sequelize } = require('sequelize');
const pg = require('pg');

// Sequelize writes legacy TIMESTAMP columns in UTC. Read them in the same zone
// on Windows too, so receipt dates and settlement hold windows do not shift.
pg.types.setTypeParser(1114, value => new Date(`${value}Z`));

try {
  const target = new URL(process.env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || !target.hostname || target.pathname.length < 2) {
    throw new Error('invalid database URL');
  }
} catch {
  throw new Error('DATABASE_URL phải là URL PostgreSQL hợp lệ trong backend/.env.');
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 10000,
    idle: 10000,
  },
});

const connectDB = () => sequelize.authenticate({ logging: false });

module.exports = { sequelize, connectDB };
