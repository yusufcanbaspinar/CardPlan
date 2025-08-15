/**
 * Development script to initialize and seed the database.
 * Run this script to populate the database with test data for development and demo purposes.
 * 
 * Usage:
 * 1. Temporarily import and call this in App.tsx during development, OR
 * 2. Create a custom Expo entry point to run this script
 * 
 * Note: This script should NOT be included in production builds.
 */

import { initializeDatabase } from '../db/schema';
import { seedDatabase } from '../db/seed';

/**
 * Main function to initialize database schema and populate with seed data.
 * Handles the complete setup process with proper error handling and logging.
 */
export async function runSeed(): Promise<void> {
  console.log('🚀 Starting database setup and seeding process...');
  console.log('⚠️ This will clear existing data and repopulate with test data');
  
  try {
    // Step 1: Initialize database schema (create tables)
    console.log('\n📋 Step 1: Initializing database schema...');
    const initResult = await initializeDatabase();
    
    if (!initResult.success) {
      throw new Error(`Database initialization failed: ${initResult.errors.join(', ')}`);
    }
    
    console.log(`✅ Database schema initialized successfully`);
    console.log(`   Tables created: ${initResult.tablesCreated.join(', ')}`);
    
    // Step 2: Seed database with test data
    console.log('\n🌱 Step 2: Seeding database with test data...');
    await seedDatabase();
    
    console.log('\n🎉 Database setup and seeding completed successfully!');
    console.log('💡 Your app now has realistic test data for development and demo purposes.');
    console.log('\n📊 Available test data:');
    console.log('   • 3 Credit cards with different reward structures');
    console.log('   • 5 Campaigns with various benefits and restrictions');
    console.log('   • 5 Sample transactions across different categories');
    console.log('\n🔄 Run this script again anytime to reset to fresh test data.');
    
  } catch (error) {
    console.error('\n❌ Database setup and seeding failed:', error);
    console.error('💡 Check the error details above and try again.');
    
    // Re-throw the error so calling code can handle it appropriately
    throw error;
  }
}

/**
 * Self-executing wrapper for direct script execution.
 * Only runs if this file is executed directly (not imported).
 * 
 * In a React Native/Expo context, you typically won't execute TypeScript files directly,
 * but this provides a pattern for potential future CLI tools or test runners.
 */
if (typeof require !== 'undefined' && require.main === module) {
  runSeed()
    .then(() => {
      console.log('✅ Seeding script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding script failed:', error);
      process.exit(1);
    });
}

// Export for use in other parts of the application
export default runSeed;