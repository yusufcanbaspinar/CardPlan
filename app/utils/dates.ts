/**
 * Pure date utility functions for CardPlan.
 * All functions work with ISO date-only strings (yyyy-MM-dd) and are side-effect free.
 * Bank cycle days are clamped to 1-28 range to avoid invalid dates.
 */

/**
 * Converts a JavaScript Date object to ISO date-only string format.
 * Uses local time zone and strips time component.
 * 
 * @param d - The Date object to convert
 * @returns ISO date string in yyyy-MM-dd format
 */
export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses an ISO date-only string into a JavaScript Date object.
 * Assumes local time zone with time set to midnight.
 * 
 * @param iso - ISO date string in yyyy-MM-dd format
 * @returns Date object representing the parsed date
 */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Calculates the absolute difference in days between two ISO dates.
 * 
 * @param aISO - First date in yyyy-MM-dd format
 * @param bISO - Second date in yyyy-MM-dd format
 * @returns Absolute number of days between the dates
 */
export function daysBetween(aISO: string, bISO: string): number {
  const dateA = parseISODate(aISO);
  const dateB = parseISODate(bISO);
  const diffMs = Math.abs(dateB.getTime() - dateA.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Finds the next occurrence of a specific day of the month.
 * If the target day hasn't occurred this month, returns that day this month.
 * Otherwise, returns that day next month.
 * Day is clamped to 1-28 range for bank cycle compatibility.
 * 
 * @param baseISO - Base date in yyyy-MM-dd format
 * @param day - Target day of month (1-28, will be clamped)
 * @returns ISO date string of the next occurrence
 */
export function nextDayOfMonth(baseISO: string, day: number): string {
  // Clamp day to valid bank cycle range
  const clampedDay = Math.max(1, Math.min(28, Math.floor(day)));
  
  const baseDate = parseISODate(baseISO);
  const currentDay = baseDate.getDate();
  
  // If target day hasn't occurred this month, use this month
  if (currentDay <= clampedDay) {
    const thisMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), clampedDay);
    return toISODate(thisMonth);
  }
  
  // Otherwise, use next month
  const nextMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, clampedDay);
  return toISODate(nextMonth);
}

/**
 * Adds a specified number of months to an ISO date.
 * Clamps the day to ensure valid dates (max 28 for bank compatibility).
 * 
 * @param iso - Source date in yyyy-MM-dd format
 * @param months - Number of months to add (can be negative)
 * @returns ISO date string after adding months
 */
export function addMonths(iso: string, months: number): string {
  const date = parseISODate(iso);
  const currentDay = Math.min(28, date.getDate()); // Clamp to safe day range
  
  const result = new Date(date.getFullYear(), date.getMonth() + months, currentDay);
  return toISODate(result);
}

/**
 * Calculates the next statement closing date for a purchase.
 * Uses the statement day to determine when the current billing cycle closes.
 * 
 * @param purchaseISO - Purchase date in yyyy-MM-dd format
 * @param statementDay - Statement closing day (1-28)
 * @returns ISO date string of the next statement closing date
 */
export function nextStatementDate(purchaseISO: string, statementDay: number): string {
  return nextDayOfMonth(purchaseISO, statementDay);
}

/**
 * Calculates the payment due date for a purchase.
 * Due date is the first occurrence of the due day after the statement closes.
 * 
 * @param purchaseISO - Purchase date in yyyy-MM-dd format
 * @param statementDay - Statement closing day (1-28)
 * @param dueDay - Payment due day (1-28)
 * @returns ISO date string of the payment due date
 */
export function nextDueDate(purchaseISO: string, statementDay: number, dueDay: number): string {
  const statementDate = nextStatementDate(purchaseISO, statementDay);
  
  // Due date is the next occurrence of dueDay after statement closes
  const statementDateObj = parseISODate(statementDate);
  const dayAfterStatement = toISODate(new Date(statementDateObj.getTime() + 24 * 60 * 60 * 1000));
  
  return nextDayOfMonth(dayAfterStatement, dueDay);
}