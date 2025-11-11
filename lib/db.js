// lib/db.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";

let dbPromise;

async function initDb() {
  const db = await open({
    filename: "./audit.sqlite", // stored in project root
    driver: sqlite3.Database,
  });
  
  await db.exec("PRAGMA foreign_keys = ON");
  // lookup table for secret questions
  await db.exec(`
    CREATE TABLE IF NOT EXISTS secret_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT UNIQUE NOT NULL
    )
  `);

  // Insert default questions (ignore if they already exist)
  await db.exec(`
    INSERT OR IGNORE INTO secret_questions (question) VALUES
      ('What is your first pet''s name?'),
      ('What is your first school name?'),
      ('In which city were you born?')
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      password TEXT,
      secret_question_id INTEGER,
      secret_answer TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(secret_question_id) REFERENCES secret_questions(id)
    )
  `);
  
  {/*-- Environments table to store DB connection details of the given user --*/}
  await db.exec(`
    CREATE TABLE IF NOT EXISTS environments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,          -- FK to users.id
      name TEXT,                         -- user-friendly name (e.g., "Staging A")
      db_type TEXT NOT NULL,             -- mysql | postgres
      host TEXT NOT NULL,
      port TEXT NOT NULL,
      db_name TEXT NOT NULL,
      user TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, name),            -- environment name unique *per user*
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);


  await db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,          -- FK to users.id
      db_type TEXT,              -- mysql | postgres | sqlite etc
      env TEXT,                  -- production | staging | development
      db_name TEXT,              -- name of the database
      table_name TEXT,
      operation_type TEXT,       -- INSERT | UPDATE | DELETE
      executed_sql TEXT,
      pk_values TEXT,            -- NEW: JSON of primary key values
      before_data TEXT,         -- JSON snapshot of row(s) before change
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)
  `);
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_executed_at ON audit_log(executed_at DESC)
  `);


  return db;
}

// Singleton pattern (initialize once)
if (!dbPromise) {
  dbPromise = initDb();
}

export default dbPromise;
