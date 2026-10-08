import { loadEnvFile } from "node:process";
try { loadEnvFile(); } catch (e) {}

import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  await client.connect();
  console.log("Connected to db");

  const queries = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT,
      email TEXT UNIQUE,
      dob DATE,
      total_coins INTEGER DEFAULT 0,
      device_info JSONB,
      browser_info JSONB,
      profile_details JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_liked_reels (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      reel_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (user_id, reel_id)
    );

    CREATE TABLE IF NOT EXISTS user_saved_reels (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      reel_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (user_id, reel_id)
    );

    CREATE TABLE IF NOT EXISTS user_watch_history (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      reel_id TEXT,
      watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_reels_watched_count (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_redeem_data (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      item_id TEXT,
      item_type TEXT,
      cost INTEGER,
      redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_favorite_creators (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      creator_id TEXT,
      PRIMARY KEY (user_id, creator_id)
    );

    CREATE TABLE IF NOT EXISTS user_followed_accounts (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      account_id TEXT,
      PRIMARY KEY (user_id, account_id)
    );

    CREATE TABLE IF NOT EXISTS user_courses (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT,
      course_type TEXT, -- 'skills' or 'speaking'
      enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (user_id, course_id, course_type)
    );

    CREATE TABLE IF NOT EXISTS user_course_lectures (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT,
      lecture_id TEXT,
      course_type TEXT, -- 'skills' or 'speaking'
      completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (user_id, course_id, lecture_id, course_type)
    );
  `;

  try {
    await client.query(queries);
    console.log("Tables created successfully");
  } catch (err) {
    console.error("Error executing query", err);
  } finally {
    await client.end();
  }
}

initDb();
