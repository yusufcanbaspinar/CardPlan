import { getDb } from '../client';

// TypeScript interface for Card entity
export interface Card {
  id: number;
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

// Type for creating new cards (without id)
export type CreateCardInput = Omit<Card, 'id'>;

// Type for updating cards (partial fields without id)
export type UpdateCardInput = Partial<Omit<Card, 'id'>>;

/**
 * Get all cards from the database ordered by id DESC
 * @returns Promise<Card[]> Array of all cards
 */
export const getAllCards = async (): Promise<Card[]> => {
  try {
    const database = await getDb();
    const result = await database.getAllAsync('SELECT * FROM cards ORDER BY id DESC');
    
    const cards: Card[] = result.map((row: any) => ({
      id: row.id,
      name: row.name,
      total_limit: row.total_limit,
      available_limit: row.available_limit,
      statement_day: row.statement_day,
      due_day: row.due_day,
      cashback_percent: row.cashback_percent,
      point_rate: row.point_rate,
      point_value: row.point_value,
      installment_support: row.installment_support,
    }));
    
    console.log(`✅ Retrieved ${cards.length} cards from database`);
    return cards;
  } catch (error) {
    console.error('❌ Error getting all cards:', error);
    throw new Error(`Failed to get cards: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Add a new card to the database
 * @param card Card data without id
 * @returns Promise<void>
 */
export const addCard = async (card: CreateCardInput): Promise<void> => {
  try {
    const database = await getDb();
    const result = await database.runAsync(
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
    
    console.log(`✅ Card '${card.name}' added successfully with id: ${result.lastInsertRowId}`);
  } catch (error) {
    console.error('❌ Error adding card:', error);
    throw new Error(`Failed to add card: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Update an existing card by id with partial data
 * @param id Card id to update
 * @param card Partial card data to update
 * @returns Promise<void>
 */
export const updateCard = async (id: number, card: UpdateCardInput): Promise<void> => {
  try {
    // Build dynamic UPDATE query based on provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    // Add fields to update if they are provided
    if (card.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(card.name);
    }
    if (card.total_limit !== undefined) {
      updateFields.push('total_limit = ?');
      updateValues.push(card.total_limit);
    }
    if (card.available_limit !== undefined) {
      updateFields.push('available_limit = ?');
      updateValues.push(card.available_limit);
    }
    if (card.statement_day !== undefined) {
      updateFields.push('statement_day = ?');
      updateValues.push(card.statement_day);
    }
    if (card.due_day !== undefined) {
      updateFields.push('due_day = ?');
      updateValues.push(card.due_day);
    }
    if (card.cashback_percent !== undefined) {
      updateFields.push('cashback_percent = ?');
      updateValues.push(card.cashback_percent);
    }
    if (card.point_rate !== undefined) {
      updateFields.push('point_rate = ?');
      updateValues.push(card.point_rate);
    }
    if (card.point_value !== undefined) {
      updateFields.push('point_value = ?');
      updateValues.push(card.point_value);
    }
    if (card.installment_support !== undefined) {
      updateFields.push('installment_support = ?');
      updateValues.push(card.installment_support);
    }
    
    // Check if there are any fields to update
    if (updateFields.length === 0) {
      console.warn('⚠️ No fields provided to update for card id:', id);
      return;
    }
    
    // Add the id parameter at the end
    updateValues.push(id);
    
    const updateQuery = `UPDATE cards SET ${updateFields.join(', ')} WHERE id = ?`;
    
    const database = await getDb();
    const result = await database.runAsync(updateQuery, updateValues);
    
    if (result.changes === 0) {
      console.warn(`⚠️ No card found with id: ${id}`);
      throw new Error(`Card with id ${id} not found`);
    } else {
      console.log(`✅ Card with id ${id} updated successfully`);
    }
  } catch (error) {
    console.error(`❌ Error updating card with id ${id}:`, error);
    throw new Error(`Failed to update card: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Delete a card by id
 * @param id Card id to delete
 * @returns Promise<void>
 */
export const deleteCard = async (id: number): Promise<void> => {
  try {
    const database = await getDb();
    const result = await database.runAsync('DELETE FROM cards WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      console.warn(`⚠️ No card found with id: ${id}`);
      throw new Error(`Card with id ${id} not found`);
    } else {
      console.log(`✅ Card with id ${id} deleted successfully`);
    }
  } catch (error) {
    console.error(`❌ Error deleting card with id ${id}:`, error);
    throw new Error(`Failed to delete card: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Get a single card by id
 * @param id Card id to retrieve
 * @returns Promise<Card | null> Card object or null if not found
 */
export const getCardById = async (id: number): Promise<Card | null> => {
  try {
    const database = await getDb();
    const result = await database.getFirstAsync('SELECT * FROM cards WHERE id = ?', [id]);
    
    if (!result) {
      console.log(`ℹ️ No card found with id: ${id}`);
      return null;
    }
    
    const card: Card = {
      id: (result as any).id,
      name: (result as any).name,
      total_limit: (result as any).total_limit,
      available_limit: (result as any).available_limit,
      statement_day: (result as any).statement_day,
      due_day: (result as any).due_day,
      cashback_percent: (result as any).cashback_percent,
      point_rate: (result as any).point_rate,
      point_value: (result as any).point_value,
      installment_support: (result as any).installment_support,
    };
    
    console.log(`✅ Retrieved card: ${card.name}`);
    return card;
  } catch (error) {
    console.error(`❌ Error getting card with id ${id}:`, error);
    throw new Error(`Failed to get card: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Export default object with all functions for convenient importing
export default {
  getAllCards,
  addCard,
  updateCard,
  deleteCard,
  getCardById,
};