/**
 * Card value calculation engine - computes rewards minus costs for purchases.
 * Handles base rewards, campaign bonuses, and transaction costs.
 */

import type { Purchase, Card, Campaign } from '../types';
import { parseISODate } from '../../utils/dates';
import { round2 } from '../../utils/money';

/**
 * Result of value calculation with detailed breakdown.
 */
export interface ValueResult {
  /** Total rewards earned in TRY */
  rewardTL: number;
  /** Total costs incurred in TRY */
  costTL: number;
  /** Net value (rewards - costs) in TRY */
  netValueTL: number;
  /** Explanatory notes for the calculation */
  notes: string[];
}

/**
 * Checks if a campaign is applicable to the given purchase.
 * 
 * @param purchase - The purchase to evaluate
 * @param campaign - The campaign to check
 * @returns True if campaign applies to this purchase
 */
function isCampaignApplicable(purchase: Purchase, campaign: Campaign): boolean {
  // Check date range
  if (campaign.dateRange) {
    const purchaseDate = parseISODate(purchase.date);
    const startDate = parseISODate(campaign.dateRange.start);
    const endDate = parseISODate(campaign.dateRange.end);
    
    if (purchaseDate < startDate || purchaseDate > endDate) {
      return false;
    }
  }
  
  // Check minimum amount
  if (campaign.minAmount && purchase.amount < campaign.minAmount) {
    return false;
  }
  
  // Check channel
  if (campaign.channel && campaign.channel !== "any" && campaign.channel !== purchase.channel) {
    return false;
  }
  
  // Check category
  if (campaign.category && campaign.category !== "general" && campaign.category !== purchase.category) {
    return false;
  }
  
  // Check brand/merchant (treat "general" as always applicable)
  if (campaign.brand && campaign.brand !== "general" && campaign.brand !== purchase.merchant) {
    return false;
  }
  
  // Check enrollment requirements
  if (campaign.requiresEnrollment && !campaign.enrolled) {
    return false;
  }
  
  // Check code requirements
  if (campaign.requiresCode && !campaign.codeProvided) {
    return false;
  }
  
  return true;
}

/**
 * Computes the total value (rewards minus costs) for a purchase with a specific card.
 * Includes base card benefits and applicable campaign bonuses.
 * 
 * @param purchase - The purchase transaction details
 * @param card - The card to evaluate
 * @param campaigns - Optional array of campaigns to consider
 * @returns Detailed breakdown of rewards, costs, and net value
 */
export function computeValueTL(
  purchase: Purchase,
  card: Card,
  campaigns: Campaign[] = []
): ValueResult {
  const notes: string[] = [];
  let totalRewards = 0;
  let totalCosts = 0;
  
  // Base cashback rewards
  const baseCashback = purchase.amount * card.cashbackPercent;
  if (baseCashback > 0) {
    totalRewards += baseCashback;
    notes.push(`₺${round2(baseCashback)} base cashback (${round2(card.cashbackPercent * 100)}%)`);
  }
  
  // Base points rewards
  const basePointsEarned = purchase.amount * card.pointRate;
  const basePointsValue = basePointsEarned * card.pointValue;
  if (basePointsValue > 0) {
    totalRewards += basePointsValue;
    notes.push(`₺${round2(basePointsValue)} base points (${round2(basePointsEarned)} pts @ ₺${round2(card.pointValue)}/pt)`);
  }
  
  // Campaign bonuses
  let totalCampaignBenefit = 0;
  const applicableCampaigns = campaigns.filter(campaign => isCampaignApplicable(purchase, campaign));
  
  for (const campaign of applicableCampaigns) {
    let campaignBenefit = 0;
    
    // Extra cashback
    if (campaign.extraCashbackPercent) {
      const extraCashback = purchase.amount * campaign.extraCashbackPercent;
      campaignBenefit += extraCashback;
      notes.push(`₺${round2(extraCashback)} extra cashback from "${campaign.name}" (+${round2(campaign.extraCashbackPercent * 100)}%)`);
    }
    
    // Extra points
    if (campaign.extraPointRate) {
      const extraPointsEarned = purchase.amount * campaign.extraPointRate;
      const extraPointsValue = extraPointsEarned * card.pointValue;
      campaignBenefit += extraPointsValue;
      notes.push(`₺${round2(extraPointsValue)} extra points from "${campaign.name}" (+${round2(extraPointsEarned)} pts)`);
    }
    
    // Flat discount
    if (campaign.flatDiscount) {
      campaignBenefit += campaign.flatDiscount;
      notes.push(`₺${round2(campaign.flatDiscount)} flat discount from "${campaign.name}"`);
    }
    
    totalCampaignBenefit += campaignBenefit;
  }
  
  // Apply campaign benefit caps
  if (totalCampaignBenefit > 0) {
    let cappedBenefit = totalCampaignBenefit;
    
    // Find the most restrictive cap among applicable campaigns
    let minCap = Infinity;
    for (const campaign of applicableCampaigns) {
      if (campaign.capAmount && campaign.capAmount < minCap) {
        minCap = campaign.capAmount;
      }
    }
    
    if (minCap !== Infinity && totalCampaignBenefit > minCap) {
      cappedBenefit = minCap;
      const cappedAmount = totalCampaignBenefit - minCap;
      notes.push(`Campaign benefit capped by ₺${round2(cappedAmount)} (limit: ₺${round2(minCap)})`);
    }
    
    totalRewards += cappedBenefit;
  }
  
  // Calculate costs
  // POS commission
  const posFee = purchase.amount * (purchase.posFeePercent ?? 0);
  if (posFee > 0) {
    totalCosts += posFee;
    notes.push(`₺${round2(posFee)} POS commission (${round2((purchase.posFeePercent ?? 0) * 100)}%)`);
  }
  
  // Calculate net value
  const netValueTL = round2(totalRewards - totalCosts);
  
  return {
    rewardTL: round2(totalRewards),
    costTL: round2(totalCosts),
    netValueTL,
    notes
  };
}