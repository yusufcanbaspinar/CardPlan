import * as SQLite from 'expo-sqlite';

// Define TypeScript interface for our database
export interface DatabaseClient extends SQLite.SQLiteDatabase {
  // Add custom methods here in the future if needed
}

class DatabaseManager {
  private static instance: DatabaseClient | null = null;
  private static readonly DB_NAME = 'kartplan.db';

  /**
   * Get the singleton database instance (async)
   * @returns {Promise<DatabaseClient>} The SQLite database instance
   */
  public static async getDatabase(): Promise<DatabaseClient> {
    if (!DatabaseManager.instance) {
      try {
        // Open the database connection (async in new API)
        DatabaseManager.instance = await SQLite.openDatabaseAsync(DatabaseManager.DB_NAME) as DatabaseClient;
        
        // Log successful connection
        console.log(`✅ SQLite database '${DatabaseManager.DB_NAME}' opened successfully`);
        console.log(`📍 Database initialized with async API`);
      } catch (error) {
        console.error('❌ Failed to open SQLite database:', error);
        throw new Error(`Failed to initialize database: ${error}`);
      }
    }

    return DatabaseManager.instance;
  }

  /**
   * Close the database connection (for cleanup purposes)
   */
  public static async closeDatabase(): Promise<void> {
    if (DatabaseManager.instance) {
      try {
        await DatabaseManager.instance.closeAsync();
        DatabaseManager.instance = null;
        console.log(`✅ Database '${DatabaseManager.DB_NAME}' closed successfully`);
      } catch (error) {
        console.error('❌ Error closing database:', error);
      }
    }
  }

  /**
   * Check if database is connected
   * @returns {boolean} True if database is connected
   */
  public static isConnected(): boolean {
    return DatabaseManager.instance !== null;
  }
}

// We'll initialize the database lazily
let dbInstance: DatabaseClient | null = null;

/**
 * Get the database instance (creates if doesn't exist)
 * @returns {Promise<DatabaseClient>} The SQLite database instance
 */
export const getDb = async (): Promise<DatabaseClient> => {
  if (!dbInstance) {
    dbInstance = await DatabaseManager.getDatabase();
  }
  return dbInstance;
};

// Export the database manager for advanced usage
export default DatabaseManager;

// Export types for use throughout the app
export type { SQLiteDatabase } from 'expo-sqlite';