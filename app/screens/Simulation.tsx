/**
 * Simulation screen provides a complete card optimization flow.
 * Users can input purchase details, configure campaigns, and see ranked card recommendations.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Alert,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  Switch,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Purchase, Campaign, ScoredCard } from '../domain/types';
import { scoreCards } from '../domain/rules/score';
import { getAllCards, updateCard } from '../../db/repositories/cardsRepo';
import { getDb } from '../../db/client';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { showErrorAlert } from '../utils/showErrorAlert';
import { CampaignWizard } from '../components/CampaignWizard';
import { ResultCard } from '../components/ResultCard';
import { toISODate } from '../utils/dates';

/**
 * Form validation schema using Zod.
 */
const simulationSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Amount must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  installmentCount: z
    .string()
    .refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1;
    }, 'Installment count must be at least 1'),
  date: z.string().min(1, 'Date is required'),
  channel: z.enum(['online', 'offline'], {
    required_error: 'Channel is required',
  }),
  merchant: z.string().optional(),
  posFeePercent: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    }, 'POS fee must be between 0 and 100'),
});

/**
 * Form data type derived from schema.
 */
type SimulationFormData = z.infer<typeof simulationSchema>;

/**
 * Available purchase categories.
 */
const CATEGORIES = [
  'electronics',
  'groceries',
  'fuel',
  'dining',
  'travel',
  'clothing',
  'health',
  'entertainment',
] as const;

/**
 * Interface for simulation state.
 */
interface SimulationState {
  results: ScoredCard[];
  isLoading: boolean;
  isRefreshing: boolean;
  campaignsActive: boolean;
  currentCampaigns: Campaign[];
  wizardVisible: boolean;
}

/**
 * Initial simulation state.
 */
const INITIAL_STATE: SimulationState = {
  results: [],
  isLoading: false,
  isRefreshing: false,
  campaignsActive: false,
  currentCampaigns: [],
  wizardVisible: false,
};

/**
 * Simulation screen component.
 */
export function Simulation(): JSX.Element {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);
  
  const [state, setState] = useState<SimulationState>(INITIAL_STATE);
  
  // Form setup with react-hook-form
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<SimulationFormData>({
    resolver: zodResolver(simulationSchema),
    defaultValues: {
      amount: '',
      category: 'electronics',
      installmentCount: '1',
      date: toISODate(new Date()),
      channel: 'online',
      merchant: '',
      posFeePercent: '',
    },
    mode: 'onChange',
  });
  
  // Watch form values for real-time validation
  const watchedValues = watch();
  
  /**
   * Updates simulation state with partial updates.
   */
  const updateState = useCallback((updates: Partial<SimulationState>): void => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  /**
   * Converts form data to Purchase object.
   */
  const formToPurchase = useCallback((data: SimulationFormData): Purchase => {
    const purchase: Purchase = {
      amount: parseFloat(data.amount),
      category: data.category,
      installmentCount: parseInt(data.installmentCount, 10),
      date: data.date,
      channel: data.channel,
    };
    
    if (data.merchant && data.merchant.trim()) {
      purchase.merchant = data.merchant.trim();
    }
    
    if (data.posFeePercent && data.posFeePercent.trim()) {
      const feePercent = parseFloat(data.posFeePercent);
      if (!isNaN(feePercent)) {
        purchase.posFeePercent = feePercent / 100; // Convert percentage to decimal
      }
    }
    
    return purchase;
  }, []);
  
  /**
   * Fetches cards and computes scores for the given purchase.
   */
  const computeScores = useCallback(async (purchase: Purchase): Promise<ScoredCard[]> => {
    try {
      // Fetch all cards from database
      const cards = await getAllCards();
      
      if (cards.length === 0) {
        Alert.alert('No Cards', 'Please add some cards first to see recommendations.');
        return [];
      }
      
      // Convert DB cards to domain model (camelCase)
      const domainCards = cards.map(card => ({
        id: card.id,
        name: card.name,
        totalLimit: card.total_limit,
        availableLimit: card.available_limit,
        statementDay: card.statement_day,
        dueDay: card.due_day,
        cashbackPercent: card.cashback_percent,
        pointRate: card.point_rate,
        pointValue: card.point_value,
        installmentSupport: card.installment_support,
      }));
      
      // Prepare campaign mapping for rule engine
      const campaignsByCardId: Record<number, Campaign[]> = {};
      if (state.campaignsActive && state.currentCampaigns.length > 0) {
        // For MVP, apply campaigns to all cards
        domainCards.forEach(card => {
          campaignsByCardId[card.id] = state.currentCampaigns;
        });
      }
      
      // Use rule engine to score cards
      const scoredCards = scoreCards(purchase, domainCards, { campaignsByCardId });
      
      return scoredCards;
    } catch (error) {
      console.error('Error computing scores:', error);
      throw error;
    }
  }, [state.campaignsActive, state.currentCampaigns]);
  
  /**
   * Handles form submission and score calculation.
   */
  const onSubmit = useCallback(async (data: SimulationFormData): Promise<void> => {
    updateState({ isLoading: true });
    
    try {
      const purchase = formToPurchase(data);
      const results = await computeScores(purchase);
      updateState({ results, isLoading: false });
    } catch (error) {
      updateState({ isLoading: false });
      showErrorAlert('Calculation failed. Please try again.');
    }
  }, [formToPurchase, computeScores, updateState]);
  
  /**
   * Handles pull-to-refresh on results list.
   */
  const onRefresh = useCallback(async (): Promise<void> => {
    if (!isValid) return;
    
    updateState({ isRefreshing: true });
    
    try {
      const purchase = formToPurchase(watchedValues);
      const results = await computeScores(purchase);
      updateState({ results, isRefreshing: false });
    } catch (error) {
      updateState({ isRefreshing: false });
      showErrorAlert('Refresh failed. Please try again.');
    }
  }, [isValid, formToPurchase, watchedValues, computeScores, updateState]);
  
  /**
   * Handles campaign wizard completion.
   */
  const handleCampaignsApply = useCallback((campaigns: Campaign[]): void => {
    updateState({ 
      currentCampaigns: campaigns,
      wizardVisible: false,
    });
  }, [updateState]);
  
  /**
   * Handles saving a transaction for a specific card.
   */
  const handleSaveTransaction = useCallback(async (cardId: number): Promise<void> => {
    const selectedCard = state.results.find(result => result.card.id === cardId);
    if (!selectedCard) return;
    
    // Show confirmation dialog
    Alert.alert(
      'Save Transaction',
      `Save this transaction with ${selectedCard.card.name}?\n\nAmount: ₺${parseFloat(watchedValues.amount).toFixed(2)}\nInstallments: ${selectedCard.adjustedInstallments || parseInt(watchedValues.installmentCount, 10)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          style: 'default',
          onPress: () => performSaveTransaction(selectedCard),
        },
      ]
    );
  }, [state.results, watchedValues]);
  
  /**
   * Performs the actual transaction save operation.
   */
  const performSaveTransaction = useCallback(async (selectedCard: ScoredCard): Promise<void> => {
    updateState({ isLoading: true });
    
    try {
      const db = await getDb();
      const purchase = formToPurchase(watchedValues);
      
      // Start transaction
      await db.execAsync('BEGIN TRANSACTION');
      
      try {
        // Insert transaction into database
        await db.runAsync(
          `INSERT INTO transactions (
            card_id, amount, category, installment_count, date, channel, merchant, pos_fee_percent
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            selectedCard.card.id,
            purchase.amount,
            purchase.category,
            selectedCard.adjustedInstallments || purchase.installmentCount,
            purchase.date,
            purchase.channel,
            purchase.merchant || null,
            purchase.posFeePercent || null,
          ]
        );
        
        // Update card's available limit
        const newAvailableLimit = Math.max(0, selectedCard.card.availableLimit - purchase.amount);
        await updateCard(selectedCard.card.id, {
          available_limit: newAvailableLimit,
        });
        
        // Commit transaction
        await db.execAsync('COMMIT');
        
        updateState({ isLoading: false });
        
        Alert.alert(
          'Transaction Saved',
          `Transaction saved successfully!\n\n${selectedCard.card.name}\nNew available limit: ₺${newAvailableLimit.toFixed(2)}`,
          [
            { text: 'OK', onPress: () => onRefresh() }, // Refresh results with updated limits
          ]
        );
      } catch (error) {
        await db.execAsync('ROLLBACK');
        throw error;
      }
    } catch (error) {
      updateState({ isLoading: false });
      console.error('Error saving transaction:', error);
      showErrorAlert('Failed to save transaction. Please try again.');
    }
  }, [formToPurchase, watchedValues, updateState, onRefresh]);
  
  /**
   * Renders form input field with error handling.
   */
  const renderFormField = useCallback((
    name: keyof SimulationFormData,
    label: string,
    placeholder: string,
    keyboardType: 'default' | 'numeric' = 'default',
    multiline = false
  ): JSX.Element => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.textInput, errors[name] && styles.textInputError]}
            placeholder={placeholder}
            placeholderTextColor={styles.placeholder.color}
            value={value || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
            testID={`simulation-input-${name}`}
          />
        )}
      />
      {errors[name] && (
        <Text style={styles.errorText}>{errors[name]?.message}</Text>
      )}
    </View>
  ), [control, errors, styles]);
  
  /**
   * Renders category picker.
   */
  const renderCategoryPicker = useCallback((): JSX.Element => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Category</Text>
      <Controller
        control={control}
        name="category"
        render={({ field: { onChange, value } }) => (
          <View style={styles.pickerContainer}>
            {CATEGORIES.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.pickerOption,
                  value === category && styles.pickerOptionSelected,
                ]}
                onPress={() => onChange(category)}
                testID={`category-option-${category}`}
              >
                <Text style={[
                  styles.pickerOptionText,
                  value === category && styles.pickerOptionTextSelected,
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
      {errors.category && (
        <Text style={styles.errorText}>{errors.category.message}</Text>
      )}
    </View>
  ), [control, errors, styles]);
  
  /**
   * Renders channel selector.
   */
  const renderChannelSelector = useCallback((): JSX.Element => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Channel</Text>
      <Controller
        control={control}
        name="channel"
        render={({ field: { onChange, value } }) => (
          <View style={styles.segmentedControl}>
            {(['online', 'offline'] as const).map(channel => (
              <TouchableOpacity
                key={channel}
                style={[
                  styles.segmentedOption,
                  value === channel && styles.segmentedOptionSelected,
                ]}
                onPress={() => onChange(channel)}
                testID={`channel-option-${channel}`}
              >
                <Text style={[
                  styles.segmentedOptionText,
                  value === channel && styles.segmentedOptionTextSelected,
                ]}>
                  {channel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
      {errors.channel && (
        <Text style={styles.errorText}>{errors.channel.message}</Text>
      )}
    </View>
  ), [control, errors, styles]);
  
  /**
   * Renders campaign configuration section.
   */
  const renderCampaignSection = useCallback((): JSX.Element => (
    <View style={styles.campaignSection}>
      <View style={styles.campaignHeader}>
        <Text style={styles.campaignTitle}>Campaigns</Text>
        <Switch
          value={state.campaignsActive}
          onValueChange={(value) => updateState({ campaignsActive: value })}
          testID="campaigns-toggle"
          accessibilityLabel="Toggle campaigns"
        />
      </View>
      
      {state.campaignsActive && (
        <View>
          <TouchableOpacity
            style={styles.wizardButton}
            onPress={() => updateState({ wizardVisible: true })}
            testID="open-campaign-wizard"
            accessibilityLabel="Open campaign wizard"
          >
            <Text style={styles.wizardButtonText}>
              {state.currentCampaigns.length > 0 
                ? `${state.currentCampaigns.length} Campaign(s) Configured`
                : 'Configure Campaigns'
              }
            </Text>
          </TouchableOpacity>
          
          {state.currentCampaigns.length > 0 && (
            <View style={styles.campaignSummary}>
              {state.currentCampaigns.map((campaign, index) => (
                <Text key={index} style={styles.campaignSummaryText}>
                  • {campaign.name}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  ), [state.campaignsActive, state.currentCampaigns, updateState, styles]);
  
  /**
   * Renders empty state for results.
   */
  const renderEmptyState = useCallback((): JSX.Element => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Recommendations</Text>
      <Text style={styles.emptyStateText}>
        {state.results.length === 0 && watchedValues.amount
          ? 'No compatible cards found. Try reducing the amount or installments.'
          : 'Fill out the form above and tap Calculate to see card recommendations.'
        }
      </Text>
    </View>
  ), [state.results.length, watchedValues.amount, styles]);
  
  /**
   * Renders a single result card item.
   */
  const renderResultItem = useCallback(({ item, index }: { item: ScoredCard; index: number }): JSX.Element => (
    <ResultCard
      item={item}
      rank={index}
      onSave={handleSaveTransaction}
    />
  ), [handleSaveTransaction]);
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Purchase Details</Text>
          
          {renderFormField('amount', 'Amount (₺)', 'e.g., 1500', 'numeric')}
          {renderCategoryPicker()}
          {renderFormField('installmentCount', 'Installments', 'e.g., 3', 'numeric')}
          {renderFormField('date', 'Date (YYYY-MM-DD)', toISODate(new Date()))}
          {renderChannelSelector()}
          {renderFormField('merchant', 'Merchant (Optional)', 'e.g., TechStore')}
          {renderFormField('posFeePercent', 'POS Fee % (Optional)', 'e.g., 1.5', 'numeric')}
        </View>
        
        {/* Campaign Section */}
        {renderCampaignSection()}
        
        {/* Calculate Button */}
        <TouchableOpacity
          style={[styles.calculateButton, !isValid && styles.calculateButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || state.isLoading}
          testID="calculate-button"
          accessibilityLabel="Calculate card recommendations"
        >
          <Text style={[styles.calculateButtonText, !isValid && styles.calculateButtonTextDisabled]}>
            Calculate Recommendations
          </Text>
        </TouchableOpacity>
        
        {/* Results Section */}
        {state.results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>
              Recommendations ({state.results.length})
            </Text>
            
            <FlatList
              data={state.results}
              renderItem={renderResultItem}
              keyExtractor={(item) => item.card.id.toString()}
              scrollEnabled={false}
              refreshControl={
                <RefreshControl
                  refreshing={state.isRefreshing}
                  onRefresh={onRefresh}
                  tintColor={styles.refreshControl.tintColor}
                />
              }
              ListEmptyComponent={renderEmptyState}
            />
          </View>
        )}
        
        {state.results.length === 0 && !state.isLoading && (
          renderEmptyState()
        )}
      </ScrollView>
      
      {/* Campaign Wizard Modal */}
      <CampaignWizard
        visible={state.wizardVisible}
        onClose={() => updateState({ wizardVisible: false })}
        onApply={handleCampaignsApply}
      />
      
      {/* Loading Overlay */}
      {state.isLoading && (
        <LoadingOverlay message="Calculating recommendations..." />
      )}
    </SafeAreaView>
  );
}

/**
 * Creates StyleSheet for the component with theme support.
 */
function createStyles(isDark: boolean) {
  const colors = {
    background: isDark ? '#000000' : '#FFFFFF',
    surface: isDark ? '#1C1C1E' : '#F2F2F7',
    text: isDark ? '#FFFFFF' : '#000000',
    secondaryText: isDark ? '#8E8E93' : '#6D6D70',
    border: isDark ? '#38383A' : '#C6C6C8',
    accent: '#007AFF',
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
    placeholder: isDark ? '#8E8E93' : '#C7C7CC',
  };
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 100, // Extra space for keyboard
    },
    formSection: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textInputError: {
      borderColor: colors.danger,
    },
    placeholder: {
      color: colors.placeholder,
    },
    errorText: {
      fontSize: 14,
      color: colors.danger,
      marginTop: 4,
    },
    pickerContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    pickerOption: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    pickerOptionSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    pickerOptionText: {
      fontSize: 14,
      color: colors.text,
    },
    pickerOptionTextSelected: {
      color: '#FFFFFF',
    },
    segmentedControl: {
      flexDirection: 'row',
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    segmentedOption: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    segmentedOptionSelected: {
      backgroundColor: colors.accent,
    },
    segmentedOptionText: {
      fontSize: 16,
      color: colors.text,
    },
    segmentedOptionTextSelected: {
      color: '#FFFFFF',
    },
    campaignSection: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    campaignHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    campaignTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    wizardButton: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      marginBottom: 12,
    },
    wizardButtonText: {
      fontSize: 16,
      color: colors.accent,
      fontWeight: '500',
    },
    campaignSummary: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
    },
    campaignSummaryText: {
      fontSize: 14,
      color: colors.secondaryText,
      marginBottom: 4,
    },
    calculateButton: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 16,
      paddingHorizontal: 24,
      marginHorizontal: 16,
      marginVertical: 16,
      alignItems: 'center',
    },
    calculateButtonDisabled: {
      backgroundColor: colors.border,
    },
    calculateButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    calculateButtonTextDisabled: {
      color: colors.secondaryText,
    },
    resultsSection: {
      marginTop: 16,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      paddingHorizontal: 32,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyStateText: {
      fontSize: 16,
      color: colors.secondaryText,
      textAlign: 'center',
      lineHeight: 22,
    },
    refreshControl: {
      tintColor: colors.accent,
    },
  });
}