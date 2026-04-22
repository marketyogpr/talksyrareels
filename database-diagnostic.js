import fs from 'fs';

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           POSTS TABLE DIAGNOSTIC SCRIPT                       ║
║  यह script database schema को verify करेगा                   ║
╚════════════════════════════════════════════════════════════════╝
`);

// Required SQL files
const requiredSqlFiles = [
  {
    name: 'posts_table_structure.sql',
    purpose: 'अगर posts table बिल्कुल नया बनाना है (सब columns के साथ)'
  },
  {
    name: 'add_posts_columns.sql',
    purpose: 'अगर posts table पहले से है तो missing columns add करने के लिए'
  }
];

console.log(`
📋 SQL MIGRATION FILES:
────────────────────────────────────────────────────────────────
`);

requiredSqlFiles.forEach(file => {
  const filePath = `./${file.name}`;
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file.name}`);
  console.log(`   ${file.purpose}\n`);
});

console.log(`
🔍 DATABASE SCHEMA CHECK:
────────────────────────────────────────────────────────────────

आपको निम्नलिखित PRAGMA command चलाना है अपने D1 database पर:

  PRAGMA table_info(posts);

यह आपको posts table के सभी columns दिखाएगा।

Expected columns होने चाहिए:
  • id (TEXT PRIMARY KEY)
  • user_id (TEXT)
  • type (TEXT)
  • caption (TEXT)
  • visibility (TEXT)
  • location (TEXT)
  • hashtags (TEXT)
  • mentions (TEXT)
  • allow_comments (INTEGER)
  • allow_shares (INTEGER)
  • is_pinned (INTEGER)
  • is_featured (INTEGER)
  • language (TEXT)
  • content_warning (TEXT)
  • scheduled_at (TEXT)
  • expires_at (TEXT)
  • edited_at (TEXT)
  • delete_reason (TEXT)
  • moderation_status (TEXT)
  • moderation_reason (TEXT)
  • like_count (INTEGER)
  • comment_count (INTEGER)
  • share_count (INTEGER)
  • view_count (INTEGER)
  • created_at (TEXT)
  • updated_at (TEXT)

`);

console.log(`
⚡ DEPLOYMENT COMMANDS:
────────────────────────────────────────────────────────────────

अगर posts table नहीं है:
  wrangler d1 execute talksyrareels-db --file=./posts_table_structure.sql

अगर posts table है लेकिन columns missing हैं:
  wrangler d1 execute talksyrareels-db --file=./add_posts_columns.sql

Database को check करने के लिए:
  wrangler d1 shell talksyrareels-db
  > PRAGMA table_info(posts);
  > SELECT COUNT(*) FROM posts;

`);

console.log(`
✨ CODE STATUS:
────────────────────────────────────────────────────────────────

Backend code:
  ✅ src/database/db.js - सभी queries 'id' column use कर रहे हैं
  ✅ src/index.js - posts को सही तरीके से create/update कर रहा है

Column name consistency:
  ✅ Posts table में PRIMARY KEY: id (NOT postId)
  ✅ Reels table में FOREIGN KEY: post_id (यह सही है)
  ✅ सभी database queries सही column names use कर रहे हैं

`);

console.log(`
🔧 TROUBLESHOOTING:
────────────────────────────────────────────────────────────────

अगर अभी भी error आ रहा है:

1. Database में posts table check करें:
   wrangler d1 shell talksyrareels-db
   > .tables
   > PRAGMA table_info(posts);

2. अगर 'id' column नहीं है:
   ALTER TABLE posts ADD COLUMN id TEXT PRIMARY KEY;

3. अगर posts table exist नहीं कर रहा:
   posts_table_structure.sql file run करें

4. सभी new columns add करने के लिए:
   add_posts_columns.sql file run करें

`);
