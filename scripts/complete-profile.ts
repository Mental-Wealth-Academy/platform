/**
 * Script to complete user profile
 * 
 * This script will:
 * 1. Get the current user from session
 * 2. Generate 5 assigned avatars based on user ID
 * 3. Randomly select one avatar
 * 4. Update username to "jhinn" and set the selected avatar
 * 
 * Run with: npx tsx scripts/complete-profile.ts
 */

import { getAssignedAvatars } from '../lib/avatars';
import { isDbConfigured, sqlQuery, withTransaction, sqlQueryWithClient } from '../lib/db';
import { ensureForumSchema } from '../lib/ensureForumSchema';
import { v4 as uuidv4 } from 'uuid';

async function completeProfile() {
  try {
    console.log('Starting profile completion...');

    // Check database
    if (!isDbConfigured()) {
      console.error('Database is not configured.');
      process.exit(1);
    }

    await ensureForumSchema();

    // Get user identifier (email or userId)
    const identifier = process.argv[2];
    if (!identifier) {
      console.error('Usage: npx tsx scripts/complete-profile.ts <email|userId>');
      console.error('Example: npx tsx scripts/complete-profile.ts your@email.com');
      console.error('   or: npx tsx scripts/complete-profile.ts <user-id>');
      process.exit(1);
    }

    // Find user by email or ID
    let userRows;
    if (identifier.includes('@')) {
      // Search by email
      userRows = await sqlQuery<Array<{ 
        id: string; 
        username: string; 
        email: string;
        avatar_url: string | null;
      }>>(
        `SELECT id, username, email, avatar_url FROM users WHERE email = :email LIMIT 1`,
        { email: identifier.toLowerCase().trim() }
      );
    } else {
      // Search by user ID
      userRows = await sqlQuery<Array<{ 
        id: string; 
        username: string; 
        email: string;
        avatar_url: string | null;
      }>>(
        `SELECT id, username, email, avatar_url FROM users WHERE id = :userId LIMIT 1`,
        { userId: identifier }
      );
    }

    if (userRows.length === 0) {
      console.error(`User not found with identifier: ${identifier}`);
      process.exit(1);
    }

    const user = userRows[0];
    const userId = user.id;
    console.log(`Found user:`);
    console.log(`  ID: ${userId}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Current username: ${user.username}`);


    // Get 5 assigned avatars for this user (deterministic based on user ID)
    const assignedAvatars = await getAssignedAvatars(userId);
    console.log(`\nAssigned avatars (5 total):`);
    assignedAvatars.forEach((avatar, index) => {
      console.log(`  ${index + 1}. ${avatar.id} - ${avatar.image_url}`);
    });

    // Randomly select one avatar
    const randomIndex = Math.floor(Math.random() * assignedAvatars.length);
    const selectedAvatar = assignedAvatars[randomIndex];
    console.log(`\nSelected avatar: ${selectedAvatar.id}`);
    console.log(`Avatar URL: ${selectedAvatar.image_url}`);

    // Update profile
    const newUsername = 'jhinn';
    
    // Check if username is already taken by another user
    const existingUsername = await sqlQuery<Array<{ id: string }>>(
      `SELECT id FROM users WHERE username = :username AND id != :userId LIMIT 1`,
      { username: newUsername, userId }
    );

    if (existingUsername.length > 0) {
      console.error(`\n❌ Username "${newUsername}" is already taken by another user.`);
      console.error('Please choose a different username or contact support.');
      process.exit(1);
    }

    console.log(`\nUpdating profile...`);
    console.log(`  Username: ${user.username} -> ${newUsername}`);
    console.log(`  Avatar: ${user.avatar_url || 'none'} -> ${selectedAvatar.image_url}`);

    await withTransaction(async (client) => {
      // Update user profile
      await sqlQueryWithClient(
        client,
        `UPDATE users 
         SET username = :username,
             selected_avatar_id = :selectedAvatarId,
             avatar_url = :avatarUrl
         WHERE id = :userId`,
        {
          userId,
          username: newUsername,
          selectedAvatarId: selectedAvatar.id,
          avatarUrl: selectedAvatar.image_url,
        }
      );

      // Store all 5 avatar choices
      for (const avatar of assignedAvatars) {
        await sqlQueryWithClient(
          client,
          `INSERT INTO user_avatars (id, user_id, avatar_id, avatar_url, is_selected)
           VALUES (:id, :userId, :avatarId, :avatarUrl, :isSelected)
           ON CONFLICT (user_id, avatar_id) DO UPDATE SET
             avatar_url = EXCLUDED.avatar_url,
             is_selected = EXCLUDED.is_selected`,
          {
            id: uuidv4(),
            userId,
            avatarId: avatar.id,
            avatarUrl: avatar.image_url,
            isSelected: avatar.id === selectedAvatar.id,
          }
        );
      }
    });

    console.log('\n✅ Profile updated successfully!');
    console.log(`   Username: @${newUsername}`);
    console.log(`   Avatar: ${selectedAvatar.id}`);
    console.log('\nPlease refresh your browser to see the changes.');

  } catch (error: any) {
    console.error('Error completing profile:', error);
    if (error?.code === '23505') {
      console.error('Username "jhinn" may already be taken. Please choose a different username.');
    }
    process.exit(1);
  }
}

// Run the script
completeProfile();

