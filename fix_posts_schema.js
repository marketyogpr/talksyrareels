/**
 * DATABASE FIX SCRIPT - Correct posts table schema
 * Run this to fix the posts table column name issue
 */

export default {
  async fetch(request, env) {
    try {
      console.log("🔧 Starting posts table schema fix...");

      // Check current schema
      const currentSchema = await env.DB.prepare("PRAGMA table_info(posts)").all();
      console.log("Current posts table schema:", currentSchema.results);

      // Check if 'postId' column exists (wrong)
      const hasPostIdColumn = currentSchema.results.some(col => col.name === 'postId');
      const hasIdColumn = currentSchema.results.some(col => col.name === 'id');

      if (hasPostIdColumn && !hasIdColumn) {
        console.log("❌ Found incorrect 'postId' column, fixing...");

        // Backup existing data
        await env.DB.prepare("CREATE TABLE posts_backup AS SELECT * FROM posts").run();
        console.log("✅ Data backed up");

        // Drop incorrect table
        await env.DB.prepare("DROP TABLE posts").run();
        console.log("✅ Old table dropped");

        // Create correct table
        await env.DB.prepare(`
          CREATE TABLE posts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            caption TEXT,
            visibility TEXT DEFAULT 'public',
            like_count INTEGER DEFAULT 0,
            comment_count INTEGER DEFAULT 0,
            share_count INTEGER DEFAULT 0,
            view_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
        console.log("✅ New table created");

        // Create indexes
        await env.DB.prepare("CREATE INDEX idx_posts_user ON posts(user_id)").run();
        await env.DB.prepare("CREATE INDEX idx_posts_type ON posts(type)").run();
        await env.DB.prepare("CREATE INDEX idx_posts_visibility ON posts(visibility)").run();
        await env.DB.prepare("CREATE INDEX idx_posts_created ON posts(created_at)").run();
        console.log("✅ Indexes created");

        // Migrate data if backup exists
        try {
          const backupCheck = await env.DB.prepare("SELECT COUNT(*) as count FROM posts_backup").first();
          if (backupCheck.count > 0) {
            await env.DB.prepare(`
              INSERT INTO posts (id, user_id, type, caption, visibility, like_count, comment_count, share_count, view_count, created_at, updated_at)
              SELECT postId, user_id, type, caption, visibility, like_count, comment_count, share_count, view_count, created_at, updated_at
              FROM posts_backup
              WHERE postId IS NOT NULL
            `).run();
            console.log("✅ Data migrated from backup");
          }
        } catch (e) {
          console.log("ℹ️ No backup data to migrate or migration failed:", e.message);
        }

        // Clean up backup
        try {
          await env.DB.prepare("DROP TABLE posts_backup").run();
          console.log("✅ Backup table cleaned up");
        } catch (e) {
          console.log("ℹ️ Backup table cleanup failed (might not exist):", e.message);
        }

      } else if (hasIdColumn) {
        console.log("✅ Posts table already has correct 'id' column");
      } else {
        console.log("❌ Posts table not found or has unknown schema");
        // Create the table if it doesn't exist
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            caption TEXT,
            visibility TEXT DEFAULT 'public',
            like_count INTEGER DEFAULT 0,
            comment_count INTEGER DEFAULT 0,
            share_count INTEGER DEFAULT 0,
            view_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
        console.log("✅ Posts table created");
      }

      // Verify final schema
      const finalSchema = await env.DB.prepare("PRAGMA table_info(posts)").all();
      console.log("Final posts table schema:", finalSchema.results);

      // Test query
      const testQuery = await env.DB.prepare("SELECT COUNT(*) as count FROM posts").first();
      console.log("Posts table test query successful, count:", testQuery.count);

      return new Response(JSON.stringify({
        success: true,
        message: "Posts table schema fixed successfully",
        schema: finalSchema.results,
        recordCount: testQuery.count
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error("❌ Schema fix failed:", error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};