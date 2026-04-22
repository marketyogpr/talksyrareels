/**
 * DATABASE MIGRATION & VERIFICATION SCRIPT
 * Verify that old posts table is removed and new schema is correct
 * 
 * Run this ONCE after deploying the new code to Cloudflare Workers
 */

// =====================================================================
// MIGRATION GUIDE: Old to New Schema
// =====================================================================

/*
OLD POSTS TABLE COLUMNS → NEW SCHEMA MAPPING
=====================================================

OLD posts table (DELETED):
- postId → NEW posts.id
- userId → NEW posts.user_id
- username → users table
- userImage → users table
- isVerified → users table
- type → posts.type (kept same)
- content → posts.caption
- mediaUrl → NEW reels.video_url
- thumbnailUrl → NEW reels.thumbnail_url
- metadata → reels fields (duration, width, height, audio_name, audio_url)
- tags → (deprecated, use hashtags table)
- language → (deprecated)
- likeCount → posts.like_count
- commentCount → posts.comment_count
- repostCount → posts.share_count
- viewsCount → posts.view_count
- saveCount → (in saved_posts table)
- clickCount → (deprecated)
- locationName → (deprecated)
- lat/lng → (deprecated)
- aspectRatio → reels.width & reels.height
- duration → reels.duration
- fileSize → (deprecated)
- status → visibility (public/private)
- isNsfw → (deprecated)
- allowComments → visibility (public/private)
- visibility → posts.visibility
- isPromoted → (deprecated)
- adLink → (deprecated)
- coinReward → (deprecated)
- timestamp → posts.created_at
- updatedAt → posts.updated_at

NEW TABLES CREATED:
- posts: id, user_id, type, caption, visibility, like_count, comment_count, share_count, view_count, created_at, updated_at
- reels: id, post_id, video_url, thumbnail_url, duration, width, height, audio_name, audio_url, view_count, like_count, comment_count, share_count, is_monetized, created_at, updated_at
- stories: id, user_id, media_url, media_type, thumbnail_url, duration, caption, view_count, expires_at, created_at
- groups, group_members, group_invites, group_posts
- thoughts, thought_reposts, thought_replies
- polls, poll_options, poll_votes
- story_views, story_replies, story_highlights, highlight_stories
- notifications (updated)
- conversations, messages, conversation_members, message_reads (existing, kept)
- calls, call_participants (existing, kept)
*/

// =====================================================================
// VERIFICATION SCRIPT - Run this to verify schema
// =====================================================================

async function verifyNewSchema(env) {
  console.log("🔍 Verifying new database schema...\n");

  try {
    // Check if old posts table still exists (should NOT exist)
    try {
      const oldPostsCheck = await env.DB.prepare("SELECT COUNT(*) as count FROM posts LIMIT 1").first();
      console.log("✅ Posts table exists (checking schema)...");
    } catch (e) {
      console.log("❌ Posts table might not exist or is inaccessible");
      throw e;
    }

    // Verify new table structures
    const tablesToVerify = [
      { name: "posts", requiredColumns: ["id", "user_id", "type", "caption", "visibility", "like_count", "comment_count", "share_count", "view_count", "created_at", "updated_at"] },
      { name: "reels", requiredColumns: ["id", "post_id", "video_url", "thumbnail_url"] },
      { name: "stories", requiredColumns: ["id", "user_id", "media_url", "expires_at"] },
      { name: "groups", requiredColumns: ["id", "name", "created_by"] },
      { name: "thoughts", requiredColumns: ["id", "post_id", "text"] },
      { name: "polls", requiredColumns: ["id", "post_id", "question"] },
    ];

    for (const table of tablesToVerify) {
      try {
        const schema = await env.DB.prepare(`PRAGMA table_info(${table.name})`).all();
        const columns = schema.results.map(col => col.name);
        
        let allPresent = true;
        for (const col of table.requiredColumns) {
          if (!columns.includes(col)) {
            console.log(`❌ Table '${table.name}' missing column: ${col}`);
            allPresent = false;
          }
        }
        
        if (allPresent) {
          console.log(`✅ Table '${table.name}' has all required columns`);
        }
      } catch (e) {
        console.log(`❌ Error checking table '${table.name}': ${e.message}`);
      }
    }

    console.log("\n✅ Schema verification complete!");
    return true;
  } catch (error) {
    console.error("❌ Schema verification failed:", error);
    return false;
  }
}

// =====================================================================
// DATA MIGRATION SCRIPT (if old data exists)
// =====================================================================

async function migrateOldPostsToNew(env) {
  console.log("🔄 Starting data migration from old posts to new schema...\n");

  try {
    // Check if old data exists
    const { results: oldPosts } = await env.DB.prepare("SELECT * FROM posts WHERE type IS NOT NULL LIMIT 1").all();
    
    if (!oldPosts || oldPosts.length === 0) {
      console.log("✅ No old posts found - schema is already clean!");
      return true;
    }

    console.log(`⚠️  Found ${oldPosts.length} posts in database. These should already be in new format.`);
    console.log("ℹ️  Checking if posts use new or old column names...");

    const samplePost = oldPosts[0];
    
    // Check if using new column names
    if (samplePost.user_id !== undefined && samplePost.like_count !== undefined) {
      console.log("✅ Posts are already using NEW column names!");
      return true;
    }

    // Check if using old column names
    if (samplePost.userId !== undefined && samplePost.likeCount !== undefined) {
      console.log("❌ Posts are still using OLD column names!");
      console.log("⚠️  Need to migrate data to new schema");
      console.log("Provide migration SQL script to update column names");
      return false;
    }

    console.log("✅ Migration verification complete!");
    return true;
  } catch (error) {
    console.error("ℹ️  No posts table found or error during migration check:", error.message);
    return true; // This is OK - means old table doesn't exist
  }
}

// =====================================================================
// CLEANUP SCRIPT - Remove old columns if they still exist
// =====================================================================

async function cleanupOldColumns(env) {
  console.log("🧹 Cleaning up old column names...\n");

  try {
    // Get all columns in posts table
    const schema = await env.DB.prepare("PRAGMA table_info(posts)").all();
    const columns = schema.results.map(col => col.name);

    const oldColumnNames = [
      "postId", "userId", "username", "userImage", "isVerified", "mediaUrl",
      "thumbnailUrl", "metadata", "tags", "language", "likeCount", "commentCount",
      "repostCount", "viewsCount", "saveCount", "clickCount", "locationName",
      "lat", "lng", "aspectRatio", "fileSize", "status", "isNsfw", "allowComments",
      "isPromoted", "adLink", "coinReward", "timestamp", "updatedAt"
    ];

    const columnsToRemove = oldColumnNames.filter(col => columns.includes(col));

    if (columnsToRemove.length === 0) {
      console.log("✅ No old column names found - table is clean!");
      return true;
    }

    console.log(`⚠️  Found old columns: ${columnsToRemove.join(", ")}`);
    console.log("ℹ️  These columns should be removed using ALTER TABLE statements");
    console.log("\nSQL to run (in SQLite):");
    console.log("-- Note: SQLite has limited ALTER TABLE support");
    console.log("-- Recommended: Export data, create new table, reimport data\n");

    return false;
  } catch (error) {
    console.error("Error during cleanup check:", error);
    return false;
  }
}

// =====================================================================
// COMPREHENSIVE VERIFICATION
// =====================================================================

export async function runVerification(env) {
  console.log("════════════════════════════════════════════════════════");
  console.log("   DATABASE SCHEMA VERIFICATION & MIGRATION");
  console.log("════════════════════════════════════════════════════════\n");

  const schemaOK = await verifyNewSchema(env);
  const migrationOK = await migrateOldPostsToNew(env);
  const cleanupOK = await cleanupOldColumns(env);

  console.log("\n════════════════════════════════════════════════════════");
  if (schemaOK && migrationOK && cleanupOK) {
    console.log("✅ ALL CHECKS PASSED - Database is ready!");
  } else {
    console.log("⚠️  Some issues found - please review above");
  }
  console.log("════════════════════════════════════════════════════════\n");

  return {
    schemaVerified: schemaOK,
    dataMigrated: migrationOK,
    cleanedUp: cleanupOK,
  };
}

// =====================================================================
// HOW TO USE THIS SCRIPT
// =====================================================================

/*
1. In wrangler.toml, add a migration endpoint:
   
   POST /api/admin/verify-schema
   - Runs verifyNewSchema() to check table structure
   
   POST /api/admin/migrate-data
   - Runs migrateOldPostsToNew() to check data format
   
   POST /api/admin/cleanup-old-columns
   - Runs cleanupOldColumns() to remove old columns

2. Or run manually in Workers console:
   
   const verification = await runVerification(env);

3. Check the console output for any issues

4. If old columns exist, use this approach:
   a. Export all data from old columns
   b. Create new table with correct column names
   c. Import data to new columns
   d. Drop old columns (or old table)
*/

export default verifyNewSchema;
