/**
 * Repository for managing notifications in the SQLite database.
 * Handles CRUD operations for local app notifications.
 */

import { getDb } from './client';

/**
 * TypeScript interface for Notification entity (database schema with snake_case).
 */
export interface Notification {
  /** Unique notification identifier */
  id: number;
  /** Notification title */
  title: string;
  /** Detailed notification message */
  message: string;
  /** Date when notification was created (ISO format yyyy-MM-dd) */
  date_iso: string;
  /** Whether the notification has been read (0 = false, 1 = true) */
  read: number;
  /** Timestamp when notification was created */
  created_at: string;
}

/**
 * Type for creating new notifications (without id and timestamps).
 */
export type NotificationInput = Omit<Notification, 'id' | 'created_at'>;

/**
 * Type for updating notifications (partial fields without id).
 */
export type UpdateNotificationInput = Partial<Omit<Notification, 'id'>>;

/**
 * Formatted notification for UI display with boolean read status.
 */
export interface FormattedNotification {
  id: number;
  title: string;
  message: string;
  dateISO: string;
  read: boolean;
  createdAt: string;
}

/**
 * Get all notifications from the database ordered by creation date (newest first).
 * 
 * @returns Promise<FormattedNotification[]> Array of all notifications
 */
export async function getAllNotifications(): Promise<FormattedNotification[]> {
  try {
    const database = await getDb();
    const result = await database.getAllAsync(
      'SELECT * FROM notifications ORDER BY created_at DESC'
    );
    
    const notifications: FormattedNotification[] = result.map((row: any) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      dateISO: row.date_iso,
      read: row.read === 1,
      createdAt: row.created_at,
    }));
    
    console.log(`✅ Retrieved ${notifications.length} notifications from database`);
    return notifications;
  } catch (error) {
    console.error('❌ Error getting all notifications:', error);
    throw new Error(`Failed to get notifications: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get unread notifications count.
 * 
 * @returns Promise<number> Number of unread notifications
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const database = await getDb();
    const result = await database.getFirstAsync(
      'SELECT COUNT(*) as count FROM notifications WHERE read = 0'
    );
    
    const count = (result as any)?.count || 0;
    console.log(`✅ Found ${count} unread notifications`);
    return count;
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    throw new Error(`Failed to get unread count: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Add a new notification to the database.
 * 
 * @param notification - Notification data without id and timestamps
 * @returns Promise<number> The ID of the inserted notification
 */
export async function addNotification(notification: NotificationInput): Promise<number> {
  try {
    const database = await getDb();
    const now = new Date().toISOString();
    
    const result = await database.runAsync(
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
    
    const insertedId = result.lastInsertRowId;
    console.log(`✅ Notification '${notification.title}' added successfully with id: ${insertedId}`);
    return insertedId;
  } catch (error) {
    console.error('❌ Error adding notification:', error);
    throw new Error(`Failed to add notification: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Mark a notification as read by id.
 * 
 * @param id - Notification id to mark as read
 * @returns Promise<void>
 */
export async function markAsRead(id: number): Promise<void> {
  try {
    const database = await getDb();
    const result = await database.runAsync(
      'UPDATE notifications SET read = 1 WHERE id = ?',
      [id]
    );
    
    if (result.changes === 0) {
      console.warn(`⚠️ No notification found with id: ${id}`);
      throw new Error(`Notification with id ${id} not found`);
    } else {
      console.log(`✅ Notification with id ${id} marked as read`);
    }
  } catch (error) {
    console.error(`❌ Error marking notification as read (id: ${id}):`, error);
    throw new Error(`Failed to mark notification as read: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Mark all notifications as read.
 * 
 * @returns Promise<number> Number of notifications marked as read
 */
export async function markAllAsRead(): Promise<number> {
  try {
    const database = await getDb();
    const result = await database.runAsync(
      'UPDATE notifications SET read = 1 WHERE read = 0'
    );
    
    console.log(`✅ Marked ${result.changes} notifications as read`);
    return result.changes || 0;
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    throw new Error(`Failed to mark all notifications as read: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete a notification by id.
 * 
 * @param id - Notification id to delete
 * @returns Promise<void>
 */
export async function deleteNotification(id: number): Promise<void> {
  try {
    const database = await getDb();
    const result = await database.runAsync(
      'DELETE FROM notifications WHERE id = ?',
      [id]
    );
    
    if (result.changes === 0) {
      console.warn(`⚠️ No notification found with id: ${id}`);
      throw new Error(`Notification with id ${id} not found`);
    } else {
      console.log(`✅ Notification with id ${id} deleted successfully`);
    }
  } catch (error) {
    console.error(`❌ Error deleting notification (id: ${id}):`, error);
    throw new Error(`Failed to delete notification: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete all read notifications.
 * 
 * @returns Promise<number> Number of notifications deleted
 */
export async function deleteAllRead(): Promise<number> {
  try {
    const database = await getDb();
    const result = await database.runAsync(
      'DELETE FROM notifications WHERE read = 1'
    );
    
    console.log(`✅ Deleted ${result.changes} read notifications`);
    return result.changes || 0;
  } catch (error) {
    console.error('❌ Error deleting read notifications:', error);
    throw new Error(`Failed to delete read notifications: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get a single notification by id.
 * 
 * @param id - Notification id to retrieve
 * @returns Promise<FormattedNotification | null> Notification object or null if not found
 */
export async function getNotificationById(id: number): Promise<FormattedNotification | null> {
  try {
    const database = await getDb();
    const result = await database.getFirstAsync(
      'SELECT * FROM notifications WHERE id = ?',
      [id]
    );
    
    if (!result) {
      console.log(`ℹ️ No notification found with id: ${id}`);
      return null;
    }
    
    const notification: FormattedNotification = {
      id: (result as any).id,
      title: (result as any).title,
      message: (result as any).message,
      dateISO: (result as any).date_iso,
      read: (result as any).read === 1,
      createdAt: (result as any).created_at,
    };
    
    console.log(`✅ Retrieved notification: ${notification.title}`);
    return notification;
  } catch (error) {
    console.error(`❌ Error getting notification with id ${id}:`, error);
    throw new Error(`Failed to get notification: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update an existing notification by id with partial data.
 * 
 * @param id - Notification id to update
 * @param notification - Partial notification data to update
 * @returns Promise<void>
 */
export async function updateNotification(id: number, notification: UpdateNotificationInput): Promise<void> {
  try {
    // Build dynamic UPDATE query based on provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    // Add fields to update if they are provided
    if (notification.title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(notification.title);
    }
    if (notification.message !== undefined) {
      updateFields.push('message = ?');
      updateValues.push(notification.message);
    }
    if (notification.date_iso !== undefined) {
      updateFields.push('date_iso = ?');
      updateValues.push(notification.date_iso);
    }
    if (notification.read !== undefined) {
      updateFields.push('read = ?');
      updateValues.push(notification.read);
    }
    
    // Check if there are any fields to update
    if (updateFields.length === 0) {
      console.warn('⚠️ No fields provided to update for notification id:', id);
      return;
    }
    
    // Add the id parameter at the end
    updateValues.push(id);
    
    const updateQuery = `UPDATE notifications SET ${updateFields.join(', ')} WHERE id = ?`;
    
    const database = await getDb();
    const result = await database.runAsync(updateQuery, updateValues);
    
    if (result.changes === 0) {
      console.warn(`⚠️ No notification found with id: ${id}`);
      throw new Error(`Notification with id ${id} not found`);
    } else {
      console.log(`✅ Notification with id ${id} updated successfully`);
    }
  } catch (error) {
    console.error(`❌ Error updating notification with id ${id}:`, error);
    throw new Error(`Failed to update notification: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Export default object with all functions for convenient importing
export default {
  getAllNotifications,
  getUnreadCount,
  addNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  getNotificationById,
  updateNotification,
};