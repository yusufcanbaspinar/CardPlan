/**
 * Card scoring orchestration engine - integrates all rule components to rank cards.
 * Produces final scored and sorted card recommendations for purchases.
 */

import type { Purchase, Card, Campaign, ScoredCard, ScoreBreakdown } from '../types';
import { computeValueTL } from './value';
import { buildInstallmentPlan, cashflowScore } from './cashflow';
import { computeRiskPenalty } from './riskPenalty';
import { checkCompatibility } from './compatibility';
import { evaluateCampaigns } from './campaignMatch';
import { round2, minMaxNormalize, clamp01 } from '../../utils/money';

/**
 * Configurable weights for different scoring components.
 * All weights should sum to 1.0 for balanced scoring.
 */
export interface ScoreWeights {
  /** Weight for monetary value component (0-1) */
  value: number;
  /** Weight for cashflow timing component (0-1) */
  cashflow: number;
  /** Weight for risk penalty component (0-1) */
  risk: number;
  /** Weight for usability component (0-1) */
  usability: number;
  /** Weight for campaign matching component (0-1) */
  campaign: number;
}

/**
 * Default scoring weights optimized for general purchase optimization.
 * Emphasizes value while balancing other factors.
 */
export const DEFAULT_WEIGHTS: ScoreWeights = {
  value: 0.45,     // Monetary benefit is most important
  cashflow: 0.25,  // Payment timing is significant
  risk: 0.20,      // Risk management is important
  usability: 0.05, // Ease of use matters less
  campaign: 0.05,  // Campaign bonuses are nice-to-have
};

/**
 * Options for card scoring configuration.
 */
export interface ScoringOptions {
  /** Campaign associations by card ID */
  campaignsByCardId?: Record<number, Campaign[]>;
  /** Custom scoring weights (merged with defaults) */
  weights?: Partial<ScoreWeights>;
}

/**
 * Intermediate scoring data for a single card.
 */
interface CardScoreData {
  card: Card;
  netValueTL: number;
  valueScore: number;
  cashflowScore: number;
  riskPenalty: number;
  usabilityScore: number;
  campaignMatchScore: number;
  notes: string[];
  adjustedInstallments: number;
  resultingUtilization: number;
}

/**
 * Scores and ranks all cards for a given purchase, filtering out incompatible cards.
 * Integrates all scoring components and applies configurable weights.
 * 
 * @param purchase - The purchase transaction to optimize
 * @param cards - Array of cards to evaluate
 * @param options - Optional configuration for campaigns and weights
 * @returns Array of scored cards sorted by total score (descending)
 */
export function scoreCards(
  purchase: Purchase,
  cards: Card[],
  options: ScoringOptions = {}
): ScoredCard[] {
  const { campaignsByCardId = {}, weights: customWeights = {} } = options;
  const weights: ScoreWeights = { ...DEFAULT_WEIGHTS, ...customWeights };
  
  // Phase 1: Evaluate each card and collect raw scores
  const cardScoreData: CardScoreData[] = [];
  
  for (const card of cards) {
    const campaigns = campaignsByCardId[card.id] ?? [];
    
    // Check compatibility first - skip incompatible cards
    const compatibility = checkCompatibility(purchase, card, campaigns);
    if (!compatibility.compatible) {
      continue; // Filter out incompatible cards
    }
    
    // Evaluate campaigns
    const campaignEval = evaluateCampaigns(purchase, card, campaigns);
    
    // Compute value with campaign benefits
    const valueResult = computeValueTL(purchase, card, campaigns);
    
    // Build installment plan and compute cashflow score
    const installmentPlan = buildInstallmentPlan(
      purchase.date,
      compatibility.adjustedInstallments,
      card.statementDay,
      card.dueDay
    );
    const cashflow = cashflowScore(installmentPlan);
    
    // Compute risk penalties
    const riskResult = computeRiskPenalty({
      card,
      purchase,
      adjustedInstallments: compatibility.adjustedInstallments,
      requiredFlags: campaignEval.requirementsOk,
    });
    
    // Calculate resulting utilization
    const resultingUtilization = 
      (card.totalLimit - (card.availableLimit - purchase.amount)) / card.totalLimit;
    
    // Aggregate all notes
    const allNotes = [
      ...compatibility.notes,
      ...campaignEval.notes,
      ...valueResult.notes,
      ...riskResult.notes,
    ];
    
    cardScoreData.push({
      card,
      netValueTL: valueResult.netValueTL,
      valueScore: 0, // Will be normalized in Phase 2
      cashflowScore: cashflow,
      riskPenalty: riskResult.penalty,
      usabilityScore: compatibility.usabilityScore,
      campaignMatchScore: campaignEval.matchScore,
      notes: allNotes,
      adjustedInstallments: compatibility.adjustedInstallments,
      resultingUtilization,
    });
  }
  
  // Early return if no compatible cards
  if (cardScoreData.length === 0) {
    return [];
  }
  
  // Phase 2: Normalize value scores
  const netValues = cardScoreData.map(data => data.netValueTL);
  const minValue = Math.min(...netValues);
  const maxValue = Math.max(...netValues);
  
  for (const data of cardScoreData) {
    data.valueScore = minMaxNormalize(data.netValueTL, minValue, maxValue);
  }
  
  // Phase 3: Compute total scores and create ScoredCard objects
  const scoredCards: ScoredCard[] = cardScoreData.map(data => {
    const totalScore = round2(100 * (
      weights.value * data.valueScore +
      weights.cashflow * data.cashflowScore +
      weights.risk * (1 - data.riskPenalty) + // Invert penalty for scoring
      weights.usability * data.usabilityScore +
      weights.campaign * data.campaignMatchScore
    ));
    
    const breakdown: ScoreBreakdown = {
      netValueTL: data.netValueTL,
      valueScore: clamp01(data.valueScore),
      cashflowScore: clamp01(data.cashflowScore),
      riskPenalty: clamp01(data.riskPenalty),
      usabilityScore: clamp01(data.usabilityScore),
      campaignMatchScore: clamp01(data.campaignMatchScore),
      notes: data.notes,
    };
    
    const explanation = buildExplanation(data, purchase);
    
    return {
      card: data.card,
      totalScore: Math.max(0, Math.min(100, totalScore)), // Clamp to [0, 100]
      breakdown,
      explanation,
      resultingUtilization: round2(data.resultingUtilization),
      adjustedInstallments: data.adjustedInstallments,
    };
  });
  
  // Phase 4: Sort by total score with tie-breakers
  scoredCards.sort((a, b) => {
    // Primary: Total score (descending)
    const scoreDiff = b.totalScore - a.totalScore;
    if (Math.abs(scoreDiff) > 1e-6) {
      return scoreDiff;
    }
    
    // Tie-breaker 1: Higher value score
    const valueDiff = b.breakdown.valueScore - a.breakdown.valueScore;
    if (Math.abs(valueDiff) > 1e-6) {
      return valueDiff;
    }
    
    // Tie-breaker 2: Higher cashflow score
    const cashflowDiff = b.breakdown.cashflowScore - a.breakdown.cashflowScore;
    if (Math.abs(cashflowDiff) > 1e-6) {
      return cashflowDiff;
    }
    
    // Tie-breaker 3: Lower risk penalty
    const riskDiff = a.breakdown.riskPenalty - b.breakdown.riskPenalty;
    if (Math.abs(riskDiff) > 1e-6) {
      return riskDiff;
    }
    
    // Tie-breaker 4: Lower resulting utilization
    const utilizationDiff = (a.resultingUtilization ?? 0) - (b.resultingUtilization ?? 0);
    if (Math.abs(utilizationDiff) > 1e-6) {
      return utilizationDiff;
    }
    
    // Tie-breaker 5: Lexicographic by card name
    return a.card.name.localeCompare(b.card.name);
  });
  
  return scoredCards;
}

/**
 * Builds a human-readable explanation for why a card received its score.
 * 
 * @param data - Card scoring data
 * @param purchase - Original purchase details
 * @returns Concise explanation string
 */
function buildExplanation(data: CardScoreData, purchase: Purchase): string {
  const avgDays = Math.round(
    data.adjustedInstallments <= 1 ? 30 : // Estimate for single payment
    30 + (data.adjustedInstallments - 1) * 15 // Rough average for installments
  );
  
  const currentUtilization = data.card.utilization ?? 
    ((data.card.totalLimit - data.card.availableLimit) / data.card.totalLimit);
  
  const utilizationChange = data.resultingUtilization > currentUtilization + 0.01 ? 
    ` (${round2(currentUtilization * 100)}%→${round2(data.resultingUtilization * 100)}%)` : '';
  
  const installmentNote = data.adjustedInstallments > 1 ? 
    `${data.adjustedInstallments} installments` : 'single payment';
  
  const campaignNote = data.campaignMatchScore > 0.5 ? 'with campaign benefits' : 'no campaigns';
  
  // Select most important notes (max 2)
  const importantNotes = data.notes
    .filter(note => 
      note.includes('campaign') || 
      note.includes('cashback') || 
      note.includes('discount') ||
      note.includes('penalty')
    )
    .slice(0, 2);
  
  const notesText = importantNotes.length > 0 ? ` (${importantNotes.join('; ')})` : '';
  
  return `₺${round2(data.netValueTL)} net benefit; payment in ~${avgDays} days; ` +
         `utilization${utilizationChange}; ${installmentNote}; ${campaignNote}${notesText}`;
}