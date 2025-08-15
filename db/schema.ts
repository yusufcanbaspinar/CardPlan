import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from './client';

// TypeScript interfaces for better type safety
export interface TableCreationResult {
  success: boolean;
  tableName: string;
  error?: string;
}

export interface DatabaseInitializationResult {
  success: boolean;
  tablesCreated: string[];
  errors: string[];
}

// SQL statements for table creation
const CREATE_CARDS_TABLE = `
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    total_limit REAL NOT NULL,
    available_limit REAL NOT NULL,
    statement_day INTEGER NOT NULL,
    due_day INTEGER NOT NULL,
    cashback_percent REAL DEFAULT 0,
    point_rate REAL DEFAULT 0,
    point_value REAL DEFAULT 0,
    installment_support INTEGER DEFAULT 1
  )
`;

const CREATE_TRANSACTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    installment_count INTEGER DEFAULT 1,
    date TEXT NOT NULL,
    channel TEXT NOT NULL,
    FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE CASCADE
  )
`;

/**
 * Create a single table with error handling and logging
 * @param db SQLite database instance
 * @param tableName Name of the table being created
 * @param createStatement SQL CREATE TABLE statement
 * @returns Promise<TableCreationResult>
 */
const createTable = async (
  db: SQLiteDatabase,
  tableName: string,
  createStatement: string
): Promise<TableCreationResult> => {
  try {
    await db.execAsync(createStatement);
    console.log(`✅ Table '${tableName}' created successfully or already exists`);
    return {
      success: true,
      tableName,
    };
  } catch (error) {
    console.error(`❌ Failed to create table '${tableName}':`, error);
    return {
      success: false,
      tableName,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Initialize the database by creating all required tables
 * @returns Promise<DatabaseInitializationResult>
 */
export const initializeDatabase = async (): Promise<DatabaseInitializationResult> => {
  console.log('🚀 Starting database initialization...');
  
  const tablesCreated: string[] = [];
  const errors: string[] = [];

  try {
    const database = await getDb();

    // Create cards table
    const cardsResult = await createTable(database, 'cards', CREATE_CARDS_TABLE);
    if (cardsResult.success) {
      tablesCreated.push(cardsResult.tableName);
    } else if (cardsResult.error) {
      errors.push(`Cards table: ${cardsResult.error}`);
    }

    // Create transactions table
    const transactionsResult = await createTable(database, 'transactions', CREATE_TRANSACTIONS_TABLE);
    if (transactionsResult.success) {
      tablesCreated.push(transactionsResult.tableName);
    } else if (transactionsResult.error) {
      errors.push(`Transactions table: ${transactionsResult.error}`);
    }

    const success = errors.length === 0;
    
    if (success) {
      console.log('🎉 Database initialization completed successfully!');
      console.log(`📊 Tables initialized: ${tablesCreated.join(', ')}`);
    } else {
      console.error('⚠️ Database initialization completed with errors:');
      errors.forEach(error => console.error(`   - ${error}`));
    }

    return {
      success,
      tablesCreated,
      errors,
    };

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Database initialization failed: ${errorMessage}`);
    
    return {
      success: false,
      tablesCreated,
      errors,
    };
  }
};

/**
 * Check if all required tables exist in the database
 * @returns Promise<boolean>
 */
export const verifyDatabaseSchema = async (): Promise<boolean> => {
  try {
    const database = await getDb();
    const result = await database.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('cards', 'transactions')"
    );
    
    const tableCount = result.length;
    const hasAllTables = tableCount === 2;
    
    console.log(`📋 Found ${tableCount}/2 required tables in database`);
    
    if (hasAllTables) {
      console.log('✅ Database schema verification passed');
    } else {
      console.warn('⚠️ Database schema verification failed - missing tables');
    }
    
    return hasAllTables;
  } catch (error) {
    console.error('❌ Error verifying database schema:', error);
    return false;
  }
};

// Export table creation SQL for reference
export const TABLE_SCHEMAS = {
  CARDS: CREATE_CARDS_TABLE,
  TRANSACTIONS: CREATE_TRANSACTIONS_TABLE,
} as const;