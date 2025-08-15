/**
 * Risk penalty calculation engine - aggregates various risk factors into penalties.
 * Higher penalty values indicate worse risk profiles (0-1 scale).
 */

import type { Purchase, Card } from '../types';
import { nextDueDate, parseISODate, daysBetween } from '../../utils/dates';
import { clamp01, round2 } from '../../utils/money';

/**
 * Parameters for computing risk penalties.
 */
export interface RiskPenaltyParams {
  /** The card being evaluated */
  card: Card;
  /** The purchase transaction */
  purchase: Purchase;
  /** Adjusted installment count after compatibility checks */
  adjustedInstallments: number;
  /** Optional flags for campaign requirements */
  requiredFlags?: {
    /** Whether enrollment requirements are satisfied */
    enrollmentOk?: boolean;
    /** Whether promo code requirements are satisfied */
    codeOk?: boolean;
  };
}

/**
 * Result of risk penalty calculation with detailed breakdown.
 */
export interface RiskPenaltyResult {
  /** Total risk penalty score (0-1, higher = worse) */
  penalty: number;
  /** Explanatory notes for applied penalties */
  notes: string[];
}

/**
 * Computes aggregated risk penalties for a card and purchase combination.
 * Evaluates credit limits, utilization, timing, and requirement compliance.
 * 
 * @param params - Risk evaluation parameters
 * @returns Risk penalty score and explanatory notes
 */
export function computeRiskPenalty(params: RiskPenaltyParams): RiskPenaltyResult {
  const { card, purchase, adjustedInstallments, requiredFlags } = params;
  const notes: string[] = [];
  let totalPenalty = 0;
  
  // 1. Credit limit buffer check
  if (card.availableLimit < purchase.amount) {
    totalPenalty += 0.6;
    notes.push(`Insufficient credit limit (need ₺${round2(purchase.amount)}, available ₺${round2(card.availableLimit)})`);
  }
  
  // 2. Utilization threshold penalties
  const currentUtilization = card.utilization ?? 
    ((card.totalLimit - card.availableLimit) / card.totalLimit);
  const postTransactionUtilization = 
    (card.totalLimit - (card.availableLimit - purchase.amount)) / card.totalLimit;
  
  // Cumulative utilization penalties
  if (postTransactionUtilization > 0.8) {
    totalPenalty += 0.15;
    notes.push(`High utilization risk (${round2(postTransactionUtilization * 100)}% > 80%)`);
  } else if (postTransactionUtilization > 0.5) {
    totalPenalty += 0.10;
    notes.push(`Moderate utilization risk (${round2(postTransactionUtilization * 100)}% > 50%)`);
  } else if (postTransactionUtilization > 0.3) {
    totalPenalty += 0.05;
    notes.push(`Low utilization risk (${round2(postTransactionUtilization * 100)}% > 30%)`);
  }
  
  // 3. Due date proximity penalty
  try {
    const nextDueDateISO = nextDueDate(purchase.date, card.statementDay, card.dueDay);
    const daysUntilDue = daysBetween(purchase.date, nextDueDateISO);
    
    if (daysUntilDue <= 3) {
      totalPenalty += 0.1;
      notes.push(`Purchase close to due date (${daysUntilDue} days until payment)`);
    }
  } catch (error) {
    // Handle potential date calculation errors gracefully
    notes.push('Unable to calculate due date proximity');
  }
  
  // 4. Installment mismatch penalty
  if (adjustedInstallments < purchase.installmentCount) {
    totalPenalty += 0.2;
    notes.push(`Installments reduced from ${purchase.installmentCount} to ${adjustedInstallments}`);
  }
  
  // 5. Campaign requirement penalties
  if (requiredFlags) {
    if (requiredFlags.enrollmentOk === false) {
      totalPenalty += 0.15;
      notes.push('Campaign enrollment requirement not met');
    }
    
    if (requiredFlags.codeOk === false) {
      totalPenalty += 0.15;
      notes.push('Campaign promo code requirement not met');
    }
  }
  
  // Clamp total penalty to [0, 1] range
  const clampedPenalty = clamp01(totalPenalty);
  
  // Add summary note if penalty was capped
  if (totalPenalty > 1) {
    notes.push(`Total penalty capped at 100% (was ${round2(totalPenalty * 100)}%)`);
  }
  
  return {
    penalty: clampedPenalty,
    notes
  };
}