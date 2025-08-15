/**
 * Pure numeric utility functions for CardPlan.
 * All functions are side-effect free and handle edge cases gracefully.
 * Used for scoring calculations and monetary formatting.
 */

/**
 * Rounds a number to 2 decimal places using standard rounding rules.
 * 
 * @param n - The number to round
 * @returns Number rounded to 2 decimal places
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Clamps a number to the range [0, 1].
 * 
 * @param n - The number to clamp
 * @returns Number clamped between 0 and 1 inclusive
 */
export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Normalizes a value between min and max to the range [0, 1].
 * Returns 0.5 if max equals min to avoid division by zero.
 * Result is clamped to [0, 1] range.
 * 
 * @param value - The value to normalize
 * @param min - Minimum value in the range
 * @param max - Maximum value in the range
 * @returns Normalized value between 0 and 1
 */
export function minMaxNormalize(value: number, min: number, max: number): number {
  if (max === min) {
    return 0.5;
  }
  
  const normalized = (value - min) / (max - min);
  return clamp01(normalized);
}

/**
 * Performs safe division with fallback for edge cases.
 * Returns fallback value when divisor is 0, NaN, or infinite.
 * 
 * @param a - Dividend
 * @param b - Divisor
 * @param fallback - Value to return when division is not safe (default: 0)
 * @returns Result of a/b or fallback if division is unsafe
 */
export function safeDivide(a: number, b: number, fallback = 0): number {
  if (b === 0 || !Number.isFinite(b)) {
    return fallback;
  }
  
  const result = a / b;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * Formats a number as Turkish Lira currency with proper localization.
 * Uses Intl.NumberFormat if available, otherwise falls back to basic formatting.
 * 
 * @param n - The number to format as currency
 * @returns Formatted currency string (e.g., "₺1,234.56")
 */
export function formatCurrencyTRY(n: number): string {
  // Try to use Intl.NumberFormat for proper localization
  if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
    try {
      return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    } catch (error) {
      // Fall through to basic formatting if Intl fails
    }
  }
  
  // Basic fallback formatting
  const rounded = round2(Math.abs(n));
  const sign = n < 0 ? '-' : '';
  
  // Add thousands separators
  const parts = rounded.toString().split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decimalPart = parts[1] || '00';
  
  return `${sign}₺${integerPart}.${decimalPart.padEnd(2, '0')}`;
}