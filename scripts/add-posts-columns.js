import fs from 'fs';

// Cloudflare D1 database connection
// You'll need to replace these with your actual values
const DATABASE_ID = process.env.DATABASE_ID || 'your-database-id';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'your-api-token';
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'your-account-id';

async function runMigration() {
  console.log('Starting database migration to add new posts columns...');

  try {
    // For Cloudflare D1, you would typically use wrangler or the Cloudflare API
    // Since we're in a development environment, let's create the SQL file
    // that can be executed via wrangler

    const sql = `
-- Add new columns to posts table for enhanced social media features
ALTER TABLE posts ADD COLUMN location TEXT;
ALTER TABLE posts ADD COLUMN hashtags TEXT;
ALTER TABLE posts ADD COLUMN mentions TEXT;
ALTER TABLE posts ADD COLUMN allow_comments INTEGER DEFAULT 1;
ALTER TABLE posts ADD COLUMN allow_shares INTEGER DEFAULT 1;
ALTER TABLE posts ADD COLUMN is_pinned INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN is_featured INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN language TEXT;
ALTER TABLE posts ADD COLUMN content_warning TEXT;
ALTER TABLE posts ADD COLUMN scheduled_at TEXT;
ALTER TABLE posts ADD COLUMN expires_at TEXT;
ALTER TABLE posts ADD COLUMN edited_at TEXT;
ALTER TABLE posts ADD COLUMN delete_reason TEXT;
ALTER TABLE posts ADD COLUMN moderation_status TEXT DEFAULT 'pending';
ALTER TABLE posts ADD COLUMN moderation_reason TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_is_featured ON posts(is_featured);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON posts(expires_at);
CREATE INDEX IF NOT EXISTS idx_posts_moderation_status ON posts(moderation_status);
    `;

    // Write the SQL to a file for execution
    fs.writeFileSync('./add_posts_columns.sql', sql.trim());

    console.log('✅ Migration SQL file created: add_posts_columns.sql');
    console.log('📋 To apply this migration, run:');
    console.log('   wrangler d1 execute talksyrareels-db --file=./add_posts_columns.sql');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();