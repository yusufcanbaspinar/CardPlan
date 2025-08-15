/**
 * Cashflow analysis engine - computes installment plans and scoring for payment timing.
 * Evaluates the benefit of deferring cash outlay through installments.
 */

import { nextStatementDate, nextDueDate, addMonths } from '../../utils/dates';
import { round2, clamp01 } from '../../utils/money';

/**
 * Represents a single payment in an installment plan.
 */
export interface PaymentPlan {
  /** Due date in ISO format (yyyy-MM-dd) */
  dueISO: string;
  /** Payment amount in TRY */
  amount: number;
  /** Days from purchase date to due date */
  daysFromPurchase: number;
}

/**
 * Builds an installment payment plan for a purchase.
 * Uses statement and due day cycles to determine payment dates.
 * 
 * @param purchaseISO - Purchase date in yyyy-MM-dd format
 * @param installments - Number of installments (1 = single payment)
 * @param statementDay - Statement closing day (1-28)
 * @param dueDay - Payment due day (1-28)
 * @returns Array of payment plan entries with dates and amounts
 */
export function buildInstallmentPlan(
  purchaseISO: string,
  installments: number,
  statementDay: number,
  dueDay: number
): PaymentPlan[] {
  const plan: PaymentPlan[] = [];
  
  // Single payment case
  if (installments <= 1) {
    const firstDueDate = nextDueDate(purchaseISO, statementDay, dueDay);
    const daysFromPurchase = calculateDaysFromPurchase(purchaseISO, firstDueDate);
    
    plan.push({
      dueISO: firstDueDate,
      amount: 1.0, // Normalized to 1.0 for single payment
      daysFromPurchase
    });
    
    return plan;
  }
  
  // Multiple installments case
  const installmentAmount = round2(1.0 / installments);
  const firstDueDate = nextDueDate(purchaseISO, statementDay, dueDay);
  
  for (let i = 0; i < installments; i++) {
    // Each subsequent payment is one month after the previous
    const dueDate = i === 0 ? firstDueDate : addMonths(firstDueDate, i);
    const daysFromPurchase = calculateDaysFromPurchase(purchaseISO, dueDate);
    
    // Handle rounding for the last installment
    const amount = i === installments - 1 
      ? round2(1.0 - (installmentAmount * (installments - 1)))
      : installmentAmount;
    
    plan.push({
      dueISO: dueDate,
      amount,
      daysFromPurchase
    });
  }
  
  return plan;
}

/**
 * Calculates days between purchase date and payment due date.
 * 
 * @param purchaseISO - Purchase date in yyyy-MM-dd format
 * @param dueISO - Due date in yyyy-MM-dd format
 * @returns Number of days from purchase to due date
 */
function calculateDaysFromPurchase(purchaseISO: string, dueISO: string): number {
  const purchaseDate = new Date(purchaseISO);
  const dueDate = new Date(dueISO);
  const diffMs = dueDate.getTime() - purchaseDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Computes a cashflow score based on the average payment deferral.
 * Higher scores indicate better cashflow (longer payment deferrals).
 * 
 * @param plan - Payment plan with days from purchase for each payment
 * @returns Cashflow score between 0 and 1
 */
export function cashflowScore(plan: Array<{ daysFromPurchase: number }>): number {
  if (plan.length === 0) {
    return 0;
  }
  
  // Calculate weighted average days (considering payment amounts if available)
  let totalDays = 0;
  let totalWeight = 0;
  
  for (const payment of plan) {
    const weight = 'amount' in payment ? (payment as any).amount : 1.0 / plan.length;
    totalDays += payment.daysFromPurchase * weight;
    totalWeight += weight;
  }
  
  const averageDays = totalWeight > 0 ? totalDays / totalWeight : 0;
  
  // Normalize by 60-day cap (0-60 days maps to 0-1 score)
  const normalizedScore = Math.min(averageDays, 60) / 60;
  
  return clamp01(normalizedScore);
}