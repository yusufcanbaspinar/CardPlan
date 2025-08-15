/**
 * Campaign matching and evaluation engine - analyzes wizard-driven campaign eligibility.
 * Computes effective campaign benefits and match scores for purchases.
 */

import type { Purchase, Card, Campaign } from '../types';
import { parseISODate } from '../../utils/dates';
import { clamp01 } from '../../utils/money';

/**
 * Aggregated effective benefits from all applicable campaigns.
 */
export interface EffectiveCampaignBenefits {
  /** Additional cashback percentage (0-1) on top of base rate */
  extraCashbackPercent: number;
  /** Additional points per TRY on top of base rate */
  extraPointRate: number;
  /** Flat discount amount in TRY */
  flatDiscount: number;
  /** Maximum installments boost from campaigns */
  maxInstallmentsBoost?: number;
  /** Interest-free installment period in months */
  interestFreeMonths?: number;
}

/**
 * Campaign requirement satisfaction status.
 */
export interface CampaignRequirements {
  /** Whether enrollment requirements are satisfied across all applicable campaigns */
  enrollmentOk: boolean;
  /** Whether promo code requirements are satisfied across all applicable campaigns */
  codeOk: boolean;
}

/**
 * Result of campaign evaluation with benefits and scoring.
 */
export interface CampaignEvaluationResult {
  /** Aggregated effective benefits from all applicable campaigns */
  effective: EffectiveCampaignBenefits;
  /** Match score (0-1) indicating how well campaigns apply to this purchase */
  matchScore: number;
  /** Whether campaign requirements are satisfied */
  requirementsOk: CampaignRequirements;
  /** Explanatory notes for campaign matching decisions */
  notes: string[];
}

/**
 * Checks if a purchase matches campaign criteria.
 * 
 * @param purchase - The purchase to evaluate
 * @param campaign - The campaign to check
 * @returns Match result with score and details
 */
function evaluateCampaignMatch(purchase: Purchase, campaign: Campaign): {
  matches: boolean;
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let matchCount = 0;
  let totalCriteria = 0;
  
  // Date range check
  if (campaign.dateRange) {
    totalCriteria++;
    const purchaseDate = parseISODate(purchase.date);
    const startDate = parseISODate(campaign.dateRange.start);
    const endDate = parseISODate(campaign.dateRange.end);
    
    if (purchaseDate >= startDate && purchaseDate <= endDate) {
      matchCount++;
      reasons.push('Date range matches');
    } else {
      reasons.push(`Date outside range (${campaign.dateRange.start} to ${campaign.dateRange.end})`);
    }
  }
  
  // Channel check
  if (campaign.channel && campaign.channel !== "any") {
    totalCriteria++;
    if (campaign.channel === purchase.channel) {
      matchCount++;
      reasons.push(`Channel matches (${purchase.channel})`);
    } else {
      reasons.push(`Channel mismatch (need ${campaign.channel}, got ${purchase.channel})`);
    }
  }
  
  // Category check
  if (campaign.category && campaign.category !== "general") {
    totalCriteria++;
    if (campaign.category === purchase.category) {
      matchCount++;
      reasons.push(`Category matches (${purchase.category})`);
    } else {
      reasons.push(`Category mismatch (need ${campaign.category}, got ${purchase.category})`);
    }
  }
  
  // Brand/merchant check
  if (campaign.brand && campaign.brand !== "general") {
    totalCriteria++;
    if (campaign.brand === purchase.merchant) {
      matchCount++;
      reasons.push(`Brand matches (${purchase.merchant})`);
    } else {
      reasons.push(`Brand mismatch (need ${campaign.brand}, got ${purchase.merchant || 'none'})`);
    }
  }
  
  // Minimum amount check
  if (campaign.minAmount) {
    totalCriteria++;
    if (purchase.amount >= campaign.minAmount) {
      matchCount++;
      reasons.push(`Minimum amount satisfied (₺${purchase.amount.toFixed(2)} >= ₺${campaign.minAmount.toFixed(2)})`);
    } else {
      reasons.push(`Below minimum amount (₺${purchase.amount.toFixed(2)} < ₺${campaign.minAmount.toFixed(2)})`);
    }
  }
  
  // Calculate match score
  let score: number;
  if (totalCriteria === 0) {
    // No specific criteria = general campaign, full match
    score = 1.0;
  } else if (matchCount === totalCriteria) {
    // All criteria met = full match
    score = 1.0;
  } else if (matchCount > 0) {
    // Partial match = partial score, minimum 0.3
    score = Math.max(0.3, matchCount / totalCriteria);
  } else {
    // No match
    score = 0;
  }
  
  return {
    matches: score > 0,
    score,
    reasons
  };
}

/**
 * Evaluates all campaigns for a purchase and computes effective benefits and match score.
 * Aggregates benefits from applicable campaigns and checks requirement satisfaction.
 * 
 * @param purchase - The purchase transaction to evaluate
 * @param card - The card being used (for context)
 * @param campaigns - Array of campaigns to evaluate
 * @returns Campaign evaluation result with benefits and scoring
 */
export function evaluateCampaigns(
  purchase: Purchase,
  card: Card,
  campaigns: Campaign[] = []
): CampaignEvaluationResult {
  const notes: string[] = [];
  let totalMatchScore = 0;
  let applicableCampaignCount = 0;
  
  // Initialize effective benefits
  const effective: EffectiveCampaignBenefits = {
    extraCashbackPercent: 0,
    extraPointRate: 0,
    flatDiscount: 0,
    maxInstallmentsBoost: undefined,
    interestFreeMonths: undefined,
  };
  
  // Initialize requirements tracking
  let hasEnrollmentRequirement = false;
  let allEnrollmentsSatisfied = true;
  let hasCodeRequirement = false;
  let allCodesSatisfied = true;
  
  // Evaluate each campaign
  for (const campaign of campaigns) {
    const matchResult = evaluateCampaignMatch(purchase, campaign);
    
    if (matchResult.matches) {
      applicableCampaignCount++;
      totalMatchScore += matchResult.score;
      
      notes.push(`Campaign "${campaign.name}" applies (score: ${(matchResult.score * 100).toFixed(0)}%)`);
      
      // Check and track requirements
      if (campaign.requiresEnrollment) {
        hasEnrollmentRequirement = true;
        if (!campaign.enrolled) {
          allEnrollmentsSatisfied = false;
          notes.push(`Campaign "${campaign.name}" requires enrollment (not enrolled)`);
        }
      }
      
      if (campaign.requiresCode) {
        hasCodeRequirement = true;
        if (!campaign.codeProvided) {
          allCodesSatisfied = false;
          notes.push(`Campaign "${campaign.name}" requires promo code (not provided)`);
        }
      }
      
      // Only apply benefits if requirements are met
      const requirementsMet = 
        (!campaign.requiresEnrollment || campaign.enrolled) &&
        (!campaign.requiresCode || campaign.codeProvided);
      
      if (requirementsMet) {
        // Aggregate benefits
        if (campaign.extraCashbackPercent) {
          effective.extraCashbackPercent += campaign.extraCashbackPercent;
          notes.push(`Added ${(campaign.extraCashbackPercent * 100).toFixed(2)}% extra cashback`);
        }
        
        if (campaign.extraPointRate) {
          effective.extraPointRate += campaign.extraPointRate;
          notes.push(`Added ${campaign.extraPointRate.toFixed(2)} extra points per TRY`);
        }
        
        if (campaign.flatDiscount) {
          // Use maximum flat discount (avoid double-counting)
          if (campaign.flatDiscount > effective.flatDiscount) {
            effective.flatDiscount = campaign.flatDiscount;
            notes.push(`Applied flat discount of ₺${campaign.flatDiscount.toFixed(2)}`);
          }
        }
        
        // Track maximum installment boost
        if (campaign.maxInstallments) {
          effective.maxInstallmentsBoost = Math.max(
            effective.maxInstallmentsBoost || 0,
            campaign.maxInstallments
          );
        }
        
        // Track maximum interest-free period
        if (campaign.interestFreeMonths) {
          effective.interestFreeMonths = Math.max(
            effective.interestFreeMonths || 0,
            campaign.interestFreeMonths
          );
        }
      } else {
        notes.push(`Campaign "${campaign.name}" benefits not applied due to unmet requirements`);
      }
    } else {
      notes.push(`Campaign "${campaign.name}" does not apply: ${matchResult.reasons.join(', ')}`);
    }
  }
  
  // Calculate overall match score
  const matchScore = applicableCampaignCount > 0 
    ? clamp01(totalMatchScore / applicableCampaignCount)
    : 0;
  
  // Determine requirement satisfaction
  const requirementsOk: CampaignRequirements = {
    enrollmentOk: !hasEnrollmentRequirement || allEnrollmentsSatisfied,
    codeOk: !hasCodeRequirement || allCodesSatisfied,
  };
  
  if (applicableCampaignCount === 0) {
    notes.push('No applicable campaigns found');
  } else {
    notes.push(`${applicableCampaignCount} campaign(s) applicable with average match score ${(matchScore * 100).toFixed(0)}%`);
  }
  
  return {
    effective,
    matchScore,
    requirementsOk,
    notes
  };
}