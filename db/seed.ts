/**
 * Database seeding utility for CardPlan.
 * Populates the database with deterministic test data for development and demo purposes.
 */

import { getDb } from './client';
import type { Campaign } from '../app/domain/types';

/**
 * Interface for card data matching the database schema (snake_case).
 */
interface CardData {
  name: string;
  total_limit: number;
  available_limit: number;
  statement_day: number;
  due_day: number;
  cashback_percent: number;
  point_rate: number;
  point_value: number;
  installment_support: number;
}

/**
 * Interface for campaign data matching the database schema (snake_case).
 */
interface CampaignData {
  card_id: number;
  name: string;
  types: string; // JSON string array
  category?: string;
  channel?: string;
  brand?: string;
  date_range_start?: string;
  date_range_end?: string;
  min_amount?: number;
  cap_amount?: number;
  monthly_cap?: number; // 0 or 1 (boolean as integer)
  extra_cashback_percent?: number;
  extra_point_rate?: number;
  flat_discount?: number;
  max_installments?: number;
  interest_free_months?: number;
  requires_enrollment?: number; // 0 or 1 (boolean as integer)
  enrolled?: number; // 0 or 1 (boolean as integer)
  requires_code?: number; // 0 or 1 (boolean as integer)
  code_provided?: number; // 0 or 1 (boolean as integer)
}

/**
 * Interface for transaction data matching the database schema (snake_case).
 */
interface TransactionData {
  card_id: number;
  amount: number;
  category: string;
  installment_count: number;
  date: string;
  channel: string;
  merchant?: string;
  pos_fee_percent?: number;
}

/**
 * Interface for notification data matching the database schema (snake_case).
 */
interface NotificationData {
  title: string;
  message: string;
  date_iso: string;
  read: number; // 0 or 1 (boolean as integer)
}

/**
 * Creates the campaigns table if it doesn't exist.
 * This table is needed for storing campaign/promotion data.
 */
async function createCampaignsTable(): Promise<void> {
  const db = await getDb();
  
  const createCampaignsSQL = `
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      types TEXT, -- JSON array of campaign types
      category TEXT,
      channel TEXT,
      brand TEXT,
      date_range_start TEXT,
      date_range_end TEXT,
      min_amount REAL,
      cap_amount REAL,
      monthly_cap INTEGER DEFAULT 0,
      extra_cashback_percent REAL,
      extra_point_rate REAL,
      flat_discount REAL,
      max_installments INTEGER,
      interest_free_months INTEGER,
      requires_enrollment INTEGER DEFAULT 0,
      enrolled INTEGER DEFAULT 0,
      requires_code INTEGER DEFAULT 0,
      code_provided INTEGER DEFAULT 0,
      FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
  `;
  
  await db.execAsync(createCampaignsSQL);
  console.log('✅ Campaigns table created or already exists');
}

/**
 * Creates the notifications table if it doesn't exist.
 * This table is needed for storing local app notifications.
 */
async function createNotificationsTable(): Promise<void> {
  const db = await getDb();
  
  const createNotificationsSQL = `
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      date_iso TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `;
  
  await db.execAsync(createNotificationsSQL);
  console.log('✅ Notifications table created or already exists');
}

/**
 * Adds merchant and pos_fee_percent columns to transactions table if they don't exist.
 */
async function updateTransactionsTable(): Promise<void> {
  const db = await getDb();
  
  try {
    // Add merchant column if it doesn't exist
    await db.execAsync('ALTER TABLE transactions ADD COLUMN merchant TEXT');
    console.log('✅ Added merchant column to transactions table');
  } catch (error) {
    // Column probably already exists, which is fine
    console.log('ℹ️ Merchant column already exists in transactions table');
  }
  
  try {
    // Add pos_fee_percent column if it doesn't exist
    await db.execAsync('ALTER TABLE transactions ADD COLUMN pos_fee_percent REAL');
    console.log('✅ Added pos_fee_percent column to transactions table');
  } catch (error) {
    // Column probably already exists, which is fine
    console.log('ℹ️ POS fee percent column already exists in transactions table');
  }
}

/**
 * Clears all existing seed data from the database.
 * Useful for clean re-seeding during development.
 */
async function clearExistingData(): Promise<void> {
  const db = await getDb();
  
  await db.execAsync('DELETE FROM notifications');
  await db.execAsync('DELETE FROM transactions');
  await db.execAsync('DELETE FROM campaigns');
  await db.execAsync('DELETE FROM cards');
  
  console.log('🧹 Cleared existing data from all tables');
}

/**
 * Seeds notifications with realistic sample data.
 */
async function seedNotifications(): Promise<number> {
  const db = await getDb();
  
  const notifications: NotificationData[] = [
    {
      title: 'Campaign Ending Soon',
      message: 'Your "Electronics Cashback Boost" campaign for AlphaBank Platinum ends in 3 days. Make sure to use it before it expires!',
      date_iso: '2024-08-12',
      read: 0, // Unread
    },
    {
      title: 'Low Credit Limit Warning',
      message: 'Your BetaCard Gold has only ₺2,000 credit limit remaining. Consider making a payment to increase available credit.',
      date_iso: '2024-08-11',
      read: 0, // Unread
    },
    {
      title: 'New Campaign Available',
      message: 'A new "Travel Flat Discount" campaign has been added to your GammaBank Installment+ card. Get ₺200 off on travel purchases!',
      date_iso: '2024-08-10',
      read: 1, // Read
    },
    {
      title: 'Statement Due Reminder',
      message: 'Your AlphaBank Platinum statement is due in 2 days. Amount due: ₺3,450. Don\'t forget to make your payment on time.',
      date_iso: '2024-08-09',
      read: 1, // Read
    },
  ];
  
  let notificationCount = 0;
  const now = new Date().toISOString();
  
  for (const notification of notifications) {
    await db.runAsync(
      `INSERT INTO notifications (
        title, message, date_iso, read, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        notification.title,
        notification.message,
        notification.date_iso,
        notification.read,
        now,
      ]
    );
    notificationCount++;
  }
  
  return notificationCount;
}

/**
 * Seeds the database with test cards, campaigns, and transactions.
 * All data is deterministic for consistent testing.
 */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 Starting database seeding...');
  
  const db = await getDb();
  
  try {
    // Create missing tables and columns
    await createCampaignsTable();
    await createNotificationsTable();
    await updateTransactionsTable();
    
    // Clear existing data for clean slate
    await clearExistingData();
    
    // Start transaction for atomic seeding
    await db.execAsync('BEGIN TRANSACTION');
    
    // 1. Insert test cards
    const cards: CardData[] = [
      {
        name: 'AlphaBank Platinum',
        total_limit: 50000,
        available_limit: 45000,
        statement_day: 15,
        due_day: 5,
        cashback_percent: 0.025, // 2.5% cashback
        point_rate: 1.0,
        point_value: 0.01,
        installment_support: 12, // Up to 12 installments
      },
      {
        name: 'BetaCard Gold',
        total_limit: 30000,
        available_limit: 28000,
        statement_day: 28,
        due_day: 15,
        cashback_percent: 0.01, // 1% cashback
        point_rate: 2.5, // 2.5 points per TRY
        point_value: 0.008, // 0.8 kuruş per point
        installment_support: 6, // Up to 6 installments
      },
      {
        name: 'GammaBank Installment+',
        total_limit: 75000,
        available_limit: 70000,
        statement_day: 10,
        due_day: 25,
        cashback_percent: 0.005, // 0.5% cashback
        point_rate: 0, // No points program
        point_value: 0,
        installment_support: 24, // Up to 24 installments
      },
    ];
    
    let cardCount = 0;
    for (const card of cards) {
      await db.runAsync(
        `INSERT INTO cards (
          name, total_limit, available_limit, statement_day, due_day,
          cashback_percent, point_rate, point_value, installment_support
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          card.name,
          card.total_limit,
          card.available_limit,
          card.statement_day,
          card.due_day,
          card.cashback_percent,
          card.point_rate,
          card.point_value,
          card.installment_support,
        ]
      );
      cardCount++;
    }
    
    // 2. Insert test campaigns
    const campaigns: CampaignData[] = [
      {
        card_id: 1, // AlphaBank Platinum
        name: 'Electronics Cashback Boost',
        types: JSON.stringify(['cashback']),
        category: 'electronics',
        channel: 'any',
        brand: 'general',
        date_range_start: '2024-01-01',
        date_range_end: '2024-12-31',
        min_amount: 1000,
        cap_amount: 500,
        monthly_cap: 1,
        extra_cashback_percent: 0.03, // Extra 3% cashback
        requires_enrollment: 1,
        enrolled: 1,
        requires_code: 0,
        code_provided: 0,
      },
      {
        card_id: 2, // BetaCard Gold
        name: 'Grocery Points 3X',
        types: JSON.stringify(['points']),
        category: 'grocery',
        channel: 'any',
        brand: 'general',
        date_range_start: '2024-06-01',
        date_range_end: '2024-08-31',
        min_amount: 200,
        cap_amount: 300,
        monthly_cap: 1,
        extra_point_rate: 5.0, // Extra 5 points per TRY
        requires_enrollment: 0,
        enrolled: 0,
        requires_code: 1,
        code_provided: 1,
      },
      {
        card_id: 3, // GammaBank Installment+
        name: 'Travel Flat Discount',
        types: JSON.stringify(['flatDiscount']),
        category: 'travel',
        channel: 'online',
        brand: 'general',
        date_range_start: '2024-03-01',
        date_range_end: '2024-09-30',
        min_amount: 2000,
        flat_discount: 200,
        requires_enrollment: 0,
        enrolled: 0,
        requires_code: 0,
        code_provided: 0,
      },
      {
        card_id: 1, // AlphaBank Platinum
        name: 'Dining Installment Boost',
        types: JSON.stringify(['installmentBoost', 'interestFree']),
        category: 'restaurant',
        channel: 'any',
        brand: 'general',
        date_range_start: '2024-01-01',
        date_range_end: '2024-12-31',
        min_amount: 500,
        max_installments: 18,
        interest_free_months: 6,
        requires_enrollment: 1,
        enrolled: 0, // Not enrolled - for testing requirement failures
        requires_code: 0,
        code_provided: 0,
      },
      {
        card_id: 2, // BetaCard Gold - Expired campaign for testing
        name: 'Summer Sale Cashback',
        types: JSON.stringify(['cashback']),
        category: 'general',
        channel: 'any',
        brand: 'general',
        date_range_start: '2023-06-01',
        date_range_end: '2023-08-31', // Expired
        min_amount: 100,
        cap_amount: 150,
        monthly_cap: 0,
        extra_cashback_percent: 0.02, // Extra 2% cashback
        requires_enrollment: 0,
        enrolled: 0,
        requires_code: 0,
        code_provided: 0,
      },
    ];
    
    let campaignCount = 0;
    for (const campaign of campaigns) {
      await db.runAsync(
        `INSERT INTO campaigns (
          card_id, name, types, category, channel, brand,
          date_range_start, date_range_end, min_amount, cap_amount, monthly_cap,
          extra_cashback_percent, extra_point_rate, flat_discount,
          max_installments, interest_free_months,
          requires_enrollment, enrolled, requires_code, code_provided
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          campaign.card_id,
          campaign.name,
          campaign.types,
          campaign.category,
          campaign.channel,
          campaign.brand,
          campaign.date_range_start,
          campaign.date_range_end,
          campaign.min_amount,
          campaign.cap_amount,
          campaign.monthly_cap,
          campaign.extra_cashback_percent,
          campaign.extra_point_rate,
          campaign.flat_discount,
          campaign.max_installments,
          campaign.interest_free_months,
          campaign.requires_enrollment,
          campaign.enrolled,
          campaign.requires_code,
          campaign.code_provided,
        ]
      );
      campaignCount++;
    }
    
    // 3. Insert test transactions
    const transactions: TransactionData[] = [
      {
        card_id: 1, // AlphaBank Platinum
        amount: 1500,
        category: 'electronics',
        installment_count: 3,
        date: '2024-08-10', // 5 days before statement day (15th) - test proximity
        channel: 'online',
        merchant: 'TechStore',
        pos_fee_percent: 0,
      },
      {
        card_id: 2, // BetaCard Gold
        amount: 350,
        category: 'grocery',
        installment_count: 1,
        date: '2024-08-05',
        channel: 'offline',
        merchant: 'SuperMarket Plus',
        pos_fee_percent: 0.015, // 1.5% POS fee
      },
      {
        card_id: 3, // GammaBank Installment+
        amount: 2500,
        category: 'travel',
        installment_count: 6,
        date: '2024-08-01',
        channel: 'online',
        merchant: 'FlyAway Travel',
      },
      {
        card_id: 1, // AlphaBank Platinum
        amount: 800,
        category: 'restaurant',
        installment_count: 2,
        date: '2024-07-28',
        channel: 'offline',
        merchant: 'Gourmet Restaurant',
      },
      {
        card_id: 2, // BetaCard Gold
        amount: 1200,
        category: 'fuel',
        installment_count: 1,
        date: '2024-08-12',
        channel: 'offline',
        merchant: 'Shell Station',
        pos_fee_percent: 0.02, // 2% POS fee
      },
    ];
    
    let transactionCount = 0;
    for (const transaction of transactions) {
      await db.runAsync(
        `INSERT INTO transactions (
          card_id, amount, category, installment_count, date, channel, merchant, pos_fee_percent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transaction.card_id,
          transaction.amount,
          transaction.category,
          transaction.installment_count,
          transaction.date,
          transaction.channel,
          transaction.merchant,
          transaction.pos_fee_percent,
        ]
      );
      transactionCount++;
    }
    
    // 4. Insert test notifications
    const notificationCount = await seedNotifications();
    
    // Commit the transaction
    await db.execAsync('COMMIT');
    
    console.log('🎉 Database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - ${cardCount} cards inserted`);
    console.log(`   - ${campaignCount} campaigns inserted`);
    console.log(`   - ${transactionCount} transactions inserted`);
    console.log(`   - ${notificationCount} notifications inserted`);
    
  } catch (error) {
    // Rollback on error
    await db.execAsync('ROLLBACK');
    console.error('❌ Database seeding failed:', error);
    throw new Error(`Seeding failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}