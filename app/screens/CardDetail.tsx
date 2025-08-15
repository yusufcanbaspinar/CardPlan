/**
 * CardDetail screen displays comprehensive information about a single credit card.
 * Shows card details, utilization, active campaigns, and recent transactions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { Card } from '../../db/repositories/cardsRepo';
import { getCardById } from '../../db/repositories/cardsRepo';
import { getDb } from '../../db/client';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { showErrorAlert } from '../utils/showErrorAlert';
import { round2, formatCurrencyTRY } from '../utils/money';

/**
 * Navigation parameters for CardDetail screen.
 */
type CardDetailParams = {
  CardDetail: {
    cardId: number;
  };
};

/**
 * Route prop type for CardDetail screen.
 */
type CardDetailRouteProp = RouteProp<CardDetailParams, 'CardDetail'>;

/**
 * Navigation prop type for CardDetail screen.
 */
type CardDetailNavigationProp = StackNavigationProp<any>;

/**
 * Interface for campaign data from database.
 */
interface Campaign {
  id: number;
  name: string;
  types: string; // JSON string
  category?: string;
  channel?: string;
  date_range_start?: string;
  date_range_end?: string;
  extra_cashback_percent?: number;
  extra_point_rate?: number;
  flat_discount?: number;
  max_installments?: number;
}

/**
 * Interface for transaction data from database.
 */
interface Transaction {
  id: number;
  amount: number;
  category: string;
  installment_count: number;
  date: string;
  channel: string;
  merchant?: string;
}

/**
 * Interface for card detail state.
 */
interface CardDetailState {
  card: Card | null;
  campaigns: Campaign[];
  transactions: Transaction[];
  isLoading: boolean;
  isRefreshing: boolean;
}

/**
 * Initial card detail state.
 */
const INITIAL_STATE: CardDetailState = {
  card: null,
  campaigns: [],
  transactions: [],
  isLoading: true,
  isRefreshing: false,
};

/**
 * Formats a date string for Turkish locale display.
 * 
 * @param dateISO - ISO date string (yyyy-MM-dd)
 * @returns Formatted date string
 */
function formatDate(dateISO: string): string {
  try {
    const date = new Date(dateISO);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (error) {
    return dateISO;
  }
}

/**
 * Formats campaign types from JSON string.
 * 
 * @param typesJson - JSON string of campaign types
 * @returns Formatted types string
 */
function formatCampaignTypes(typesJson: string): string {
  try {
    const types = JSON.parse(typesJson);
    const typeMap: Record<string, string> = {
      cashback: 'Cashback',
      points: 'Puan',
      flatDiscount: 'İndirim',
      installmentBoost: 'Taksit',
      interestFree: 'Faizsiz',
    };
    
    return types.map((type: string) => typeMap[type] || type).join(', ');
  } catch (error) {
    return typesJson;
  }
}

/**
 * CardDetail screen component.
 */
export function CardDetail(): JSX.Element {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);
  
  const route = useRoute<CardDetailRouteProp>();
  const navigation = useNavigation<CardDetailNavigationProp>();
  const { cardId } = route.params;
  
  const [state, setState] = useState<CardDetailState>(INITIAL_STATE);
  
  /**
   * Updates card detail state with partial updates.
   */
  const updateState = useCallback((updates: Partial<CardDetailState>): void => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  /**
   * Loads card data from the database.
   */
  const loadCardData = useCallback(async (): Promise<void> => {
    try {
      const card = await getCardById(cardId);
      
      if (!card) {
        Alert.alert('Hata', 'Kart bulunamadı.', [
          { text: 'Tamam', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      
      updateState({ card });
    } catch (error) {
      console.error('Error loading card:', error);
      showErrorAlert('Kart bilgileri yüklenirken hata oluştu.');
      updateState({ isLoading: false, isRefreshing: false });
    }
  }, [cardId, navigation, updateState]);
  
  /**
   * Loads campaigns for the card from the database.
   */
  const loadCampaigns = useCallback(async (): Promise<void> => {
    try {
      const db = await getDb();
      const result = await db.getAllAsync(
        'SELECT * FROM campaigns WHERE card_id = ? ORDER BY id DESC',
        [cardId]
      );
      
      const campaigns: Campaign[] = result.map((row: any) => ({
        id: row.id,
        name: row.name,
        types: row.types,
        category: row.category,
        channel: row.channel,
        date_range_start: row.date_range_start,
        date_range_end: row.date_range_end,
        extra_cashback_percent: row.extra_cashback_percent,
        extra_point_rate: row.extra_point_rate,
        flat_discount: row.flat_discount,
        max_installments: row.max_installments,
      }));
      
      updateState({ campaigns });
    } catch (error) {
      console.error('Error loading campaigns:', error);
      showErrorAlert('Kampanya bilgileri yüklenirken hata oluştu.');
    }
  }, [cardId, updateState]);
  
  /**
   * Loads recent transactions for the card from the database.
   */
  const loadTransactions = useCallback(async (): Promise<void> => {
    try {
      const db = await getDb();
      const result = await db.getAllAsync(
        'SELECT * FROM transactions WHERE card_id = ? ORDER BY date DESC LIMIT 10',
        [cardId]
      );
      
      const transactions: Transaction[] = result.map((row: any) => ({
        id: row.id,
        amount: row.amount,
        category: row.category,
        installment_count: row.installment_count,
        date: row.date,
        channel: row.channel,
        merchant: row.merchant,
      }));
      
      updateState({ transactions });
    } catch (error) {
      console.error('Error loading transactions:', error);
      showErrorAlert('İşlem geçmişi yüklenirken hata oluştu.');
    }
  }, [cardId, updateState]);
  
  /**
   * Loads all data for the card.
   */
  const loadAllData = useCallback(async (): Promise<void> => {
    updateState({ isLoading: true });
    
    try {
      await Promise.all([
        loadCardData(),
        loadCampaigns(),
        loadTransactions(),
      ]);
    } finally {
      updateState({ isLoading: false, isRefreshing: false });
    }
  }, [loadCardData, loadCampaigns, loadTransactions, updateState]);
  
  /**
   * Initial load effect.
   */
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);
  
  /**
   * Handles pull-to-refresh.
   */
  const onRefresh = useCallback(async (): Promise<void> => {
    updateState({ isRefreshing: true });
    await loadAllData();
  }, [updateState, loadAllData]);
  
  /**
   * Handles simulate purchase button press.
   */
  const handleSimulatePurchase = useCallback((): void => {
    // Navigate to Simulation screen with this card preselected
    navigation.navigate('Simulation', { preselectedCardId: cardId });
  }, [navigation, cardId]);
  
  /**
   * Calculates and formats utilization percentage.
   */
  const getUtilization = useCallback((): { percentage: number; color: string } => {
    if (!state.card) return { percentage: 0, color: '#34C759' };
    
    const utilization = (state.card.total_limit - state.card.available_limit) / state.card.total_limit;
    const percentage = Math.round(utilization * 100);
    
    let color = '#34C759'; // Green for low utilization
    if (percentage > 80) color = '#FF3B30'; // Red for high utilization
    else if (percentage > 50) color = '#FF9500'; // Orange for medium utilization
    
    return { percentage, color };
  }, [state.card]);
  
  /**
   * Renders card information section.
   */
  const renderCardInfo = useCallback((): JSX.Element | null => {
    if (!state.card) return null;
    
    const { percentage: utilizationPercentage, color: utilizationColor } = getUtilization();
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kart Bilgileri</Text>
        
        <View style={styles.cardInfoContainer}>
          <Text style={styles.cardName}>{state.card.name}</Text>
          
          <View style={styles.limitSection}>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Toplam Limit:</Text>
              <Text style={styles.limitValue}>
                {formatCurrencyTRY(state.card.total_limit)}
              </Text>
            </View>
            
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Kullanılabilir:</Text>
              <Text style={styles.limitValue}>
                {formatCurrencyTRY(state.card.available_limit)}
              </Text>
            </View>
            
            <View style={styles.utilizationContainer}>
              <View style={styles.utilizationHeader}>
                <Text style={styles.utilizationLabel}>Kullanım Oranı</Text>
                <Text style={[styles.utilizationPercentage, { color: utilizationColor }]}>
                  %{utilizationPercentage}
                </Text>
              </View>
              
              <View style={styles.utilizationBarContainer}>
                <View 
                  style={[
                    styles.utilizationBar,
                    { 
                      width: `${utilizationPercentage}%`,
                      backgroundColor: utilizationColor,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
          
          <View style={styles.rewardsSection}>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardLabel}>Cashback:</Text>
              <Text style={styles.rewardValue}>
                %{round2(state.card.cashback_percent * 100)}
              </Text>
            </View>
            
            <View style={styles.rewardRow}>
              <Text style={styles.rewardLabel}>Puan Oranı:</Text>
              <Text style={styles.rewardValue}>
                {state.card.point_rate} puan/₺
              </Text>
            </View>
            
            <View style={styles.rewardRow}>
              <Text style={styles.rewardLabel}>Puan Değeri:</Text>
              <Text style={styles.rewardValue}>
                {formatCurrencyTRY(state.card.point_value)}/puan
              </Text>
            </View>
            
            <View style={styles.rewardRow}>
              <Text style={styles.rewardLabel}>Taksit Desteği:</Text>
              <Text style={styles.rewardValue}>
                {typeof state.card.installment_support === 'number' 
                  ? `${state.card.installment_support} aya kadar`
                  : state.card.installment_support ? 'Var' : 'Yok'
                }
              </Text>
            </View>
          </View>
          
          <View style={styles.dateSection}>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Ekstre Günü:</Text>
              <Text style={styles.dateValue}>{state.card.statement_day}</Text>
            </View>
            
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Son Ödeme Günü:</Text>
              <Text style={styles.dateValue}>{state.card.due_day}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }, [state.card, getUtilization, styles]);
  
  /**
   * Renders campaigns section.
   */
  const renderCampaigns = useCallback((): JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Aktif Kampanyalar</Text>
      
      {state.campaigns.length > 0 ? (
        <View style={styles.campaignsContainer}>
          {state.campaigns.map((campaign) => (
            <View key={campaign.id} style={styles.campaignItem}>
              <Text style={styles.campaignName}>{campaign.name}</Text>
              <Text style={styles.campaignType}>
                {formatCampaignTypes(campaign.types)}
              </Text>
              
              {campaign.date_range_start && campaign.date_range_end && (
                <Text style={styles.campaignDate}>
                  {formatDate(campaign.date_range_start)} - {formatDate(campaign.date_range_end)}
                </Text>
              )}
              
              {campaign.category && (
                <Text style={styles.campaignDetail}>
                  Kategori: {campaign.category}
                </Text>
              )}
              
              {campaign.channel && (
                <Text style={styles.campaignDetail}>
                  Kanal: {campaign.channel}
                </Text>
              )}
              
              {campaign.extra_cashback_percent && (
                <Text style={styles.campaignBenefit}>
                  +%{round2(campaign.extra_cashback_percent * 100)} ek cashback
                </Text>
              )}
              
              {campaign.extra_point_rate && (
                <Text style={styles.campaignBenefit}>
                  +{campaign.extra_point_rate} ek puan/₺
                </Text>
              )}
              
              {campaign.flat_discount && (
                <Text style={styles.campaignBenefit}>
                  {formatCurrencyTRY(campaign.flat_discount)} sabit indirim
                </Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Aktif kampanya bulunmuyor</Text>
        </View>
      )}
    </View>
  ), [state.campaigns, styles]);
  
  /**
   * Renders transactions section.
   */
  const renderTransactions = useCallback((): JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Son İşlemler</Text>
      
      {state.transactions.length > 0 ? (
        <View style={styles.transactionsContainer}>
          {state.transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionAmount}>
                  {formatCurrencyTRY(transaction.amount)}
                </Text>
                <Text style={styles.transactionDate}>
                  {formatDate(transaction.date)}
                </Text>
              </View>
              
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionCategory}>
                  {transaction.category}
                </Text>
                <Text style={styles.transactionChannel}>
                  {transaction.channel}
                </Text>
              </View>
              
              {transaction.merchant && (
                <Text style={styles.transactionMerchant}>
                  {transaction.merchant}
                </Text>
              )}
              
              {transaction.installment_count > 1 && (
                <Text style={styles.transactionInstallments}>
                  {transaction.installment_count} taksit
                </Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Henüz işlem bulunmuyor</Text>
        </View>
      )}
    </View>
  ), [state.transactions, styles]);
  
  if (state.isLoading && !state.card) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingOverlay message="Kart bilgileri yükleniyor..." />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={state.isRefreshing}
            onRefresh={onRefresh}
            tintColor={styles.refreshControl.tintColor}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderCardInfo()}
        {renderCampaigns()}
        {renderTransactions()}
      </ScrollView>
      
      {/* Simulate Purchase Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.simulateButton}
          onPress={handleSimulatePurchase}
          testID="simulate-purchase-button"
          accessibilityLabel="Bu kartla alışveriş simülasyonu yap"
          accessibilityRole="button"
        >
          <Text style={styles.simulateButtonText}>
            Alışveriş Simülasyonu Yap
          </Text>
        </TouchableOpacity>
      </View>
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
    warning: '#FF9500',
    danger: '#FF3B30',
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
      paddingBottom: 100, // Space for footer button
    },
    section: {
      margin: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    cardInfoContainer: {
      gap: 16,
    },
    cardName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    limitSection: {
      gap: 12,
    },
    limitRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    limitLabel: {
      fontSize: 16,
      color: colors.secondaryText,
    },
    limitValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    utilizationContainer: {
      marginTop: 8,
    },
    utilizationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    utilizationLabel: {
      fontSize: 14,
      color: colors.secondaryText,
    },
    utilizationPercentage: {
      fontSize: 14,
      fontWeight: '600',
    },
    utilizationBarContainer: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    utilizationBar: {
      height: '100%',
      borderRadius: 4,
    },
    rewardsSection: {
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    rewardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rewardLabel: {
      fontSize: 14,
      color: colors.secondaryText,
    },
    rewardValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    dateSection: {
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    dateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dateLabel: {
      fontSize: 14,
      color: colors.secondaryText,
    },
    dateValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    campaignsContainer: {
      gap: 12,
    },
    campaignItem: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    campaignName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    campaignType: {
      fontSize: 14,
      color: colors.accent,
      marginBottom: 8,
    },
    campaignDate: {
      fontSize: 12,
      color: colors.secondaryText,
      marginBottom: 4,
    },
    campaignDetail: {
      fontSize: 12,
      color: colors.secondaryText,
      marginBottom: 2,
    },
    campaignBenefit: {
      fontSize: 14,
      color: colors.success,
      fontWeight: '500',
      marginTop: 4,
    },
    transactionsContainer: {
      gap: 12,
    },
    transactionItem: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    transactionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    transactionDate: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    transactionDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    transactionCategory: {
      fontSize: 14,
      color: colors.text,
      textTransform: 'capitalize',
    },
    transactionChannel: {
      fontSize: 12,
      color: colors.secondaryText,
      textTransform: 'capitalize',
    },
    transactionMerchant: {
      fontSize: 12,
      color: colors.secondaryText,
      marginBottom: 2,
    },
    transactionInstallments: {
      fontSize: 12,
      color: colors.accent,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: 'center',
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 16,
    },
    simulateButton: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    simulateButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    refreshControl: {
      tintColor: colors.accent,
    },
  });
}