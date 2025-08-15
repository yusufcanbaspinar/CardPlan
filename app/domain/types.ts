/**
 * Domain types for CardPlan - Purchase optimization and card scoring system.
 * All types are framework-agnostic and follow camelCase naming conventions.
 */

/**
 * Transaction channel where the purchase occurs.
 */
export type Channel = "online" | "offline";

/**
 * Purchase category - kept as string for flexibility.
 * Concrete enums may be added later for specific business logic.
 */
export type Category = string;

/**
 * Represents a purchase transaction with all relevant details
 * for card optimization and scoring calculations.
 */
export interface Purchase {
  /** Purchase amount in Turkish Lira (TRY) */
  amount: number;
  /** Purchase category (e.g., "groceries", "fuel", "dining") */
  category: Category;
  /** Number of installments requested (1 = no installments) */
  installmentCount: number;
  /** Purchase date in ISO format (yyyy-MM-dd, date-only) */
  date: string;
  /** Channel where purchase is made */
  channel: Channel;
  /** Optional merchant name or identifier */
  merchant?: string;
  /** Optional POS commission percentage (0-1, e.g., 0.02 for 2%) */
  posFeePercent?: number;
  /** Currency code, defaults to "TRY" if not specified */
  currency?: string;
}

/**
 * Credit card information aligned with database schema.
 * All monetary values are in Turkish Lira (TRY).
 */
export interface Card {
  /** Unique card identifier */
  id: number;
  /** Display name of the card */
  name: string;
  /** Total credit limit in TRY */
  totalLimit: number;
  /** Currently available credit limit in TRY */
  availableLimit: number;
  /** Statement closing day (1-28) */
  statementDay: number;
  /** Payment due day (1-28) */
  dueDay: number;
  /** Base cashback percentage (0-1, e.g., 0.01 for 1%) */
  cashbackPercent: number;
  /** Points earned per 1 TRY spent */
  pointRate: number;
  /** Turkish Lira value per point for redemption */
  pointValue: number;
  /** Installment support flag or maximum installments allowed */
  installmentSupport: number | boolean;
  /** Optional computed utilization ratio (0-1) */
  utilization?: number;
}

/**
 * Campaign or promotion information structured from wizard input.
 * Represents bonus benefits available for specific purchases.
 */
export interface Campaign {
  /** Campaign display name */
  name: string;
  /** Types of benefits offered by this campaign */
  types?: Array<"cashback" | "points" | "flatDiscount" | "installmentBoost" | "interestFree">;
  /** Target category or "general" for all categories */
  category?: Category | "general";
  /** Target channel or "any" for both online/offline */
  channel?: Channel | "any";
  /** Target brand/merchant or "general" for all merchants */
  brand?: string | "general";
  /** Campaign validity period with ISO date-only strings */
  dateRange?: { start: string; end: string };
  /** Minimum purchase amount to qualify */
  minAmount?: number;
  /** Maximum amount eligible for benefits */
  capAmount?: number;
  /** Whether the cap resets monthly */
  monthlyCap?: boolean;
  /** Additional cashback percentage on top of base rate (0-1) */
  extraCashbackPercent?: number;
  /** Additional points per TRY on top of base rate */
  extraPointRate?: number;
  /** Fixed discount amount in TRY */
  flatDiscount?: number;
  /** Maximum installments allowed with campaign benefits */
  maxInstallments?: number;
  /** Interest-free installment period in months */
  interestFreeMonths?: number;
  /** Whether campaign requires manual enrollment */
  requiresEnrollment?: boolean;
  /** Whether user is enrolled (if enrollment required) */
  enrolled?: boolean;
  /** Whether campaign requires a promo code */
  requiresCode?: boolean;
  /** Whether user has provided the required code */
  codeProvided?: boolean;
}

/**
 * Detailed breakdown of card scoring components.
 * All score values are normalized to 0-1 range unless specified.
 */
export interface ScoreBreakdown {
  /** Net monetary benefit in TRY after deducting costs */
  netValueTL: number;
  /** Value score based on cashback/points benefit (0-1) */
  valueScore: number;
  /** Cashflow score considering payment timing (0-1) */
  cashflowScore: number;
  /** Risk penalty for high utilization (0-1, higher = worse) */
  riskPenalty: number;
  /** Usability score for ease of use (0-1) */
  usabilityScore: number;
  /** Campaign match score for active promotions (0-1) */
  campaignMatchScore: number;
  /** Optional explanatory notes for scoring decisions */
  notes?: string[];
}

/**
 * Card with computed score and detailed breakdown for a specific purchase.
 * Represents the result of card optimization analysis.
 */
export interface ScoredCard {
  /** The card being scored */
  card: Card;
  /** Final composite score (0-100) */
  totalScore: number;
  /** Detailed breakdown of score components */
  breakdown: ScoreBreakdown;
  /** Human-readable explanation of why this card was scored this way */
  explanation: string;
  /** Projected utilization after this purchase (0-1) */
  resultingUtilization?: number;
  /** Recommended installment count for this card and purchase */
  adjustedInstallments?: number;
}