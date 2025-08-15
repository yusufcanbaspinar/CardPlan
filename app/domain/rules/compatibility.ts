/**
 * Compatibility checking engine - validates hard constraints and computes usability scores.
 * Determines if a card can be used for a purchase and adjusts parameters as needed.
 */

import type { Purchase, Card, Campaign } from '../types';

/**
 * Result of compatibility analysis with constraint checks and adjustments.
 */
export interface CompatibilityResult {
  /** Whether the card is compatible with the purchase */
  compatible: boolean;
  /** Adjusted installment count after applying card constraints */
  adjustedInstallments: number;
  /** Usability score (0-1) based on how well the card matches requirements */
  usabilityScore: number;
  /** Explanatory notes for compatibility decisions */
  notes: string[];
}

/**
 * Checks card compatibility with purchase requirements and validates constraints.
 * Performs hard constraint validation and adjusts parameters for optimal usage.
 * 
 * @param purchase - The purchase transaction to evaluate
 * @param card - The card to check compatibility for
 * @param campaigns - Optional campaigns that might affect compatibility
 * @returns Compatibility result with adjustments and usability score
 */
export function checkCompatibility(
  purchase: Purchase,
  card: Card,
  campaigns: Campaign[] = []
): CompatibilityResult {
  const notes: string[] = [];
  let compatible = true;
  let usabilityScore = 1.0;
  let adjustedInstallments = purchase.installmentCount;
  
  // 1. Hard constraint: Credit limit check
  if (card.availableLimit < purchase.amount) {
    compatible = false;
    notes.push(`Insufficient credit limit: need ₺${purchase.amount.toFixed(2)}, available ₺${card.availableLimit.toFixed(2)}`);
    
    return {
      compatible,
      adjustedInstallments,
      usabilityScore: 0,
      notes
    };
  }
  
  // 2. Installment constraint handling
  const maxAllowedInstallments = getMaxAllowedInstallments(card, campaigns);
  
  if (purchase.installmentCount > maxAllowedInstallments) {
    adjustedInstallments = Math.max(1, maxAllowedInstallments);
    usabilityScore = 0.4; // Penalty for not meeting installment preference
    
    if (maxAllowedInstallments === 0) {
      notes.push('Card does not support installments, using single payment');
    } else {
      notes.push(`Installments reduced from ${purchase.installmentCount} to ${adjustedInstallments} (card limit)`);
    }
  } else if (purchase.installmentCount > 1 && maxAllowedInstallments === 0) {
    // Card doesn't support installments but purchase requested them
    adjustedInstallments = 1;
    usabilityScore = 0.4;
    notes.push('Card does not support installments, using single payment');
  }
  
  // 3. Additional usability considerations
  
  // Check if purchase amount is very close to credit limit (risky but not blocking)
  const utilizationAfterPurchase = (card.totalLimit - (card.availableLimit - purchase.amount)) / card.totalLimit;
  if (utilizationAfterPurchase > 0.9) {
    usabilityScore = Math.min(usabilityScore, 0.6);
    notes.push('Purchase would result in very high utilization (>90%)');
  }
  
  // Check for campaign-specific installment boosts
  const campaignInstallmentBoost = getCampaignInstallmentBoost(campaigns, purchase);
  if (campaignInstallmentBoost > maxAllowedInstallments) {
    notes.push(`Campaign allows up to ${campaignInstallmentBoost} installments`);
    // Don't override card limits, but note the potential
  }
  
  return {
    compatible,
    adjustedInstallments,
    usabilityScore,
    notes
  };
}

/**
 * Determines the maximum allowed installments for a card.
 * Considers both card-level constraints and campaign bonuses.
 * 
 * @param card - The card to check installment support for
 * @param campaigns - Optional campaigns that might boost installment limits
 * @returns Maximum number of installments allowed
 */
function getMaxAllowedInstallments(card: Card, campaigns: Campaign[] = []): number {
  let maxInstallments: number;
  
  // Determine base card installment support
  if (typeof card.installmentSupport === 'number') {
    maxInstallments = card.installmentSupport;
  } else if (card.installmentSupport === true) {
    maxInstallments = 24; // Reasonable default for unlimited support
  } else {
    maxInstallments = 0; // No installment support
  }
  
  // Check for campaign installment boosts
  const campaignBoost = getCampaignInstallmentBoost(campaigns);
  if (campaignBoost > maxInstallments) {
    maxInstallments = campaignBoost;
  }
  
  return maxInstallments;
}

/**
 * Finds the maximum installment boost available from applicable campaigns.
 * 
 * @param campaigns - Array of campaigns to check
 * @param purchase - Optional purchase to validate campaign applicability
 * @returns Maximum installment boost from campaigns
 */
function getCampaignInstallmentBoost(campaigns: Campaign[], purchase?: Purchase): number {
  let maxBoost = 0;
  
  for (const campaign of campaigns) {
    // Simple check - in full implementation, would use campaign matching logic
    if (campaign.maxInstallments && campaign.maxInstallments > maxBoost) {
      maxBoost = campaign.maxInstallments;
    }
  }
  
  return maxBoost;
}