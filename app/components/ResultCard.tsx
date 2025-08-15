/**
 * ResultCard component displays a single scored card result with detailed breakdown.
 * Shows card name, total score, component scores, and action buttons for saving transactions.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import type { ScoredCard } from '../domain/types';
import { round2 } from '../utils/money';

/**
 * Props for the ResultCard component.
 */
export interface ResultCardProps {
  /** The scored card data to display */
  item: ScoredCard;
  /** Zero-based rank (0 = top recommendation) */
  rank: number;
  /** Callback when user wants to save this transaction */
  onSave: (cardId: number) => void;
}

/**
 * Converts a risk penalty score to human-readable text.
 * 
 * @param penalty - Risk penalty score (0-1, higher = worse)
 * @returns Risk level description
 */
function getRiskLevel(penalty: number): string {
  if (penalty <= 0.2) return 'Low';
  if (penalty <= 0.5) return 'Medium';
  return 'High';
}

/**
 * Converts a campaign match score to human-readable text.
 * 
 * @param score - Campaign match score (0-1)
 * @returns Campaign match description
 */
function getCampaignMatchText(score: number): string {
  if (score === 0) return 'No campaigns';
  if (score < 0.5) return 'Partial match';
  return 'Full match';
}

/**
 * Estimates average payment days from cashflow score.
 * This is a rough approximation since we don't have direct access to the payment plan.
 * 
 * @param cashflowScore - Normalized cashflow score (0-1)
 * @returns Estimated average payment days
 */
function estimatePaymentDays(cashflowScore: number): number {
  // Reverse the normalization (score = min(avgDays, 60) / 60)
  return Math.round(cashflowScore * 60);
}

/**
 * Component that displays a scored card result with breakdown and actions.
 */
export function ResultCard({ item, rank, onSave }: ResultCardProps): JSX.Element {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const styles = createStyles(isDark);
  const isRecommended = rank === 0;
  const avgPaymentDays = estimatePaymentDays(item.breakdown.cashflowScore);
  const riskLevel = getRiskLevel(item.breakdown.riskPenalty);
  const campaignText = getCampaignMatchText(item.breakdown.campaignMatchScore);
  
  const handleSave = (): void => {
    onSave(item.card.id);
  };
  
  return (
    <View 
      style={[styles.container, isRecommended && styles.recommendedContainer]}
      testID={`result-card-${item.card.id}`}
    >
      {/* Header with card name and recommended badge */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.card.name}
          </Text>
          {isRecommended && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
          )}
        </View>
        
        {/* Total score */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>
            {Math.round(item.totalScore)}/100
          </Text>
        </View>
      </View>
      
      {/* Score breakdown */}
      <View style={styles.breakdown}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Net Value:</Text>
          <Text style={styles.breakdownValue}>
            ₺{round2(item.breakdown.netValueTL)}
          </Text>
        </View>
        
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Payment timing:</Text>
          <Text style={styles.breakdownValue}>
            ~{avgPaymentDays} days ({Math.round(item.breakdown.cashflowScore * 100)}%)
          </Text>
        </View>
        
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Risk level:</Text>
          <Text style={[
            styles.breakdownValue,
            riskLevel === 'High' && styles.highRisk,
            riskLevel === 'Medium' && styles.mediumRisk,
            riskLevel === 'Low' && styles.lowRisk,
          ]}>
            {riskLevel}
          </Text>
        </View>
        
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Usability:</Text>
          <Text style={styles.breakdownValue}>
            {item.breakdown.usabilityScore === 1.0 ? 'Perfect' : 'Adjusted'}
          </Text>
        </View>
        
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Campaigns:</Text>
          <Text style={styles.breakdownValue}>
            {campaignText}
          </Text>
        </View>
      </View>
      
      {/* Utilization info */}
      {item.resultingUtilization !== undefined && (
        <View style={styles.utilizationContainer}>
          <Text style={styles.utilizationText}>
            Utilization: {Math.round(item.resultingUtilization * 100)}%
            {item.adjustedInstallments && item.adjustedInstallments > 1 && 
              ` • ${item.adjustedInstallments} installments`
            }
          </Text>
        </View>
      )}
      
      {/* Explanation */}
      <Text style={styles.explanation} numberOfLines={3}>
        {item.explanation}
      </Text>
      
      {/* Action button */}
      <TouchableOpacity 
        style={[styles.saveButton, isRecommended && styles.recommendedButton]}
        onPress={handleSave}
        testID={`save-transaction-${item.card.id}`}
        accessibilityLabel={`Save transaction with ${item.card.name}`}
        accessibilityRole="button"
      >
        <Text style={[styles.saveButtonText, isRecommended && styles.recommendedButtonText]}>
          Save Transaction
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Creates StyleSheet for the component with theme support.
 */
function createStyles(isDark: boolean) {
  const colors = {
    background: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    secondaryText: isDark ? '#8E8E93' : '#6D6D70',
    border: isDark ? '#38383A' : '#C6C6C8',
    accent: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    recommendedBg: isDark ? '#1D3A5F' : '#E3F2FD',
    recommendedBorder: '#007AFF',
    buttonBg: isDark ? '#2C2C2E' : '#F2F2F7',
    buttonText: '#007AFF',
  };
  
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    recommendedContainer: {
      borderColor: colors.recommendedBorder,
      borderWidth: 2,
      backgroundColor: colors.recommendedBg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    titleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
    },
    cardName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    recommendedBadge: {
      backgroundColor: colors.accent,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    recommendedText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    scoreContainer: {
      alignItems: 'flex-end',
    },
    scoreLabel: {
      fontSize: 12,
      color: colors.secondaryText,
      marginBottom: 2,
    },
    scoreValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.accent,
    },
    breakdown: {
      marginBottom: 12,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    breakdownLabel: {
      fontSize: 14,
      color: colors.secondaryText,
      flex: 1,
    },
    breakdownValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      textAlign: 'right',
    },
    lowRisk: {
      color: colors.success,
    },
    mediumRisk: {
      color: colors.warning,
    },
    highRisk: {
      color: colors.danger,
    },
    utilizationContainer: {
      backgroundColor: colors.buttonBg,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 12,
    },
    utilizationText: {
      fontSize: 13,
      color: colors.secondaryText,
      textAlign: 'center',
    },
    explanation: {
      fontSize: 13,
      color: colors.secondaryText,
      lineHeight: 18,
      marginBottom: 16,
    },
    saveButton: {
      backgroundColor: colors.buttonBg,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    recommendedButton: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.buttonText,
    },
    recommendedButtonText: {
      color: '#FFFFFF',
    },
  });
}