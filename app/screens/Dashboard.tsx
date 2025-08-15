import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Card, getAllCards } from '../../db/repositories/cardsRepo';
import LoadingOverlay from '../components/LoadingOverlay';
import { showErrorAlert, getErrorMessage } from '../utils/showErrorAlert';

// Navigation type (adjust based on your navigation setup)
interface NavigationProp {
  navigate: (screen: string, params?: any) => void;
}

// Types for component state
interface DashboardState {
  cards: Card[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

// Type for upcoming payment item
interface UpcomingPayment {
  id: string;
  cardName: string;
  type: 'statement' | 'due';
  daysLeft: number;
  date: Date;
  amount?: number; // Placeholder for future implementation
}

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function to calculate utilization percentage
const calculateUtilization = (available: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round(((total - available) / total) * 100);
};

// Helper function to get days until a specific day of month
const getDaysUntilDay = (targetDay: number): number => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  let targetDate = new Date(currentYear, currentMonth, targetDay);
  
  // If the target day has already passed this month, move to next month
  if (targetDay < currentDay) {
    targetDate = new Date(currentYear, currentMonth + 1, targetDay);
  }
  
  const timeDiff = targetDate.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// Helper function to calculate upcoming payments
const calculateUpcomingPayments = (cards: Card[]): UpcomingPayment[] => {
  const payments: UpcomingPayment[] = [];
  
  cards.forEach(card => {
    const statementDays = getDaysUntilDay(card.statement_day);
    const dueDays = getDaysUntilDay(card.due_day);
    
    payments.push({
      id: `${card.id}-statement`,
      cardName: card.name,
      type: 'statement',
      daysLeft: statementDays,
      date: new Date(Date.now() + statementDays * 24 * 60 * 60 * 1000),
    });
    
    payments.push({
      id: `${card.id}-due`,
      cardName: card.name,
      type: 'due',
      daysLeft: dueDays,
      date: new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000),
    });
  });
  
  // Sort by days left and return top 3
  return payments
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);
};

// Helper function to find card with nearest important date
const findHighlightedCard = (cards: Card[]): Card | null => {
  if (cards.length === 0) return null;
  
  let nearestCard = cards[0];
  let nearestDays = Math.min(
    getDaysUntilDay(cards[0].statement_day),
    getDaysUntilDay(cards[0].due_day)
  );
  
  cards.forEach(card => {
    const statementDays = getDaysUntilDay(card.statement_day);
    const dueDays = getDaysUntilDay(card.due_day);
    const cardNearestDays = Math.min(statementDays, dueDays);
    
    if (cardNearestDays < nearestDays) {
      nearestDays = cardNearestDays;
      nearestCard = card;
    }
  });
  
  return nearestCard;
};

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  const [state, setState] = useState<DashboardState>({
    cards: [],
    isLoading: true,
    isRefreshing: false,
    error: null,
  });

  // Load cards from database
  const loadCards = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setState(prev => ({ ...prev, isRefreshing: true, error: null }));
      } else {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
      }

      console.log('🔄 Loading cards for dashboard...');
      const cards = await getAllCards();
      
      setState(prev => ({
        ...prev,
        cards,
        isLoading: false,
        isRefreshing: false,
        error: null,
      }));

      console.log(`✅ Dashboard loaded ${cards.length} cards`);
    } catch (error) {
      console.error('❌ Error loading cards for dashboard:', error);
      const errorMessage = getErrorMessage(error, 'Failed to load dashboard data');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: errorMessage,
      }));

      if (!isRefresh) {
        showErrorAlert('Error', 'Failed to load dashboard data. Please try again.');
      }
    }
  }, []);

  // Load cards on component mount
  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    loadCards(true);
  }, [loadCards]);

  // Navigate to Cards screen
  const navigateToCards = (selectedCardId?: number) => {
    navigation.navigate('Cards', { selectedCardId });
  };

  // Handle card tap
  const handleCardTap = (card: Card) => {
    console.log(`🎯 Card tapped: ${card.name}`);
    navigateToCards(card.id);
  };

  // Render individual card summary
  const renderCardSummary = ({ item: card }: { item: Card }) => {
    const utilization = calculateUtilization(card.available_limit, card.total_limit);
    const highlightedCard = findHighlightedCard(state.cards);
    const isHighlighted = highlightedCard?.id === card.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.cardSummary,
          isHighlighted && styles.cardSummaryHighlighted,
        ]}
        onPress={() => handleCardTap(card)}
        accessibilityLabel={`${card.name}, ${formatCurrency(card.available_limit)} available of ${formatCurrency(card.total_limit)}, ${utilization}% used`}
        testID={`dashboard-card-${card.id}`}
      >
        {isHighlighted && (
          <View style={styles.highlightBadge}>
            <Ionicons name="time" size={12} color="#FF9500" />
            <Text style={styles.highlightText}>Upcoming</Text>
          </View>
        )}
        
        <View style={styles.cardSummaryHeader}>
          <Ionicons name="card" size={20} color="#0A84FF" />
          <Text style={styles.cardSummaryName} numberOfLines={1}>
            {card.name}
          </Text>
        </View>
        
        <View style={styles.cardSummaryLimits}>
          <Text style={styles.limitAmount}>
            {formatCurrency(card.available_limit)}
          </Text>
          <Text style={styles.limitTotal}>
            of {formatCurrency(card.total_limit)}
          </Text>
        </View>
        
        {/* Utilization Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill,
                {
                  width: `${utilization}%`,
                  backgroundColor: utilization > 80 ? '#FF3B30' : '#0A84FF',
                }
              ]}
            />
          </View>
          <Text style={styles.progressText}>{utilization}% used</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render upcoming payment item
  const renderUpcomingPayment = (payment: UpcomingPayment) => {
    const isUrgent = payment.daysLeft <= 3;
    const isDue = payment.type === 'due';
    
    return (
      <View 
        key={payment.id}
        style={[
          styles.paymentItem,
          isUrgent && styles.paymentItemUrgent,
        ]}
      >
        <View style={styles.paymentIcon}>
          <Ionicons 
            name={isDue ? "card" : "document-text"} 
            size={20} 
            color={isUrgent ? "#FF3B30" : "#0A84FF"} 
          />
        </View>
        
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentCardName} numberOfLines={1}>
            {payment.cardName}
          </Text>
          <Text style={[
            styles.paymentType,
            isUrgent && styles.paymentTypeUrgent,
          ]}>
            {isDue ? 'Payment' : 'Statement'} due in {payment.daysLeft} day{payment.daysLeft !== 1 ? 's' : ''}
          </Text>
        </View>
        
        <View style={styles.paymentAmount}>
          <Text style={styles.paymentAmountText}>
            {payment.amount ? formatCurrency(payment.amount) : 'TBD'}
          </Text>
        </View>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="card-outline" size={80} color="#C7C7CC" />
      <Text style={styles.emptyStateTitle}>Welcome to KartPlan!</Text>
      <Text style={styles.emptyStateMessage}>
        Add your first credit card to start tracking your spending, limits, and payment dates.
      </Text>
      <TouchableOpacity
        style={styles.addFirstCardButton}
        onPress={() => navigateToCards()}
        accessibilityLabel="Add your first card"
        testID="dashboard-add-first-card"
      >
        <Ionicons name="add" size={20} color="#FFFFFF" style={styles.addButtonIcon} />
        <Text style={styles.addFirstCardButtonText}>Add Your First Card</Text>
      </TouchableOpacity>
    </View>
  );

  // Render loading state
  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#0A84FF" />
      <Text style={styles.loadingText}>Loading your dashboard...</Text>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="warning-outline" size={64} color="#FF3B30" />
      <Text style={styles.errorTitle}>Unable to Load Dashboard</Text>
      <Text style={styles.errorMessage}>{state.error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => loadCards()}
        accessibilityLabel="Retry loading dashboard"
        testID="dashboard-retry"
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Calculate upcoming payments
  const upcomingPayments = calculateUpcomingPayments(state.cards);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {state.cards.length > 0 
              ? `${state.cards.length} card${state.cards.length !== 1 ? 's' : ''} • ${formatCurrency(state.cards.reduce((sum, card) => sum + card.available_limit, 0))} available`
              : 'Your financial overview'
            }
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigateToCards()}
          accessibilityLabel="Manage cards"
          testID="dashboard-manage-cards"
        >
          <Ionicons name="settings-outline" size={24} color="#0A84FF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {state.isLoading ? (
        renderLoadingState()
      ) : state.error ? (
        renderErrorState()
      ) : state.cards.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={state.isRefreshing}
              onRefresh={handleRefresh}
              colors={['#0A84FF']}
              tintColor="#0A84FF"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Cards Summary Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Cards</Text>
              <TouchableOpacity
                onPress={() => navigateToCards()}
                accessibilityLabel="View all cards"
                testID="dashboard-view-all-cards"
              >
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={state.cards}
              renderItem={renderCardSummary}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsList}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          </View>

          {/* Upcoming Payments Section */}
          {upcomingPayments.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Payments</Text>
                <Text style={styles.sectionSubtitle}>Next 3 dates</Text>
              </View>
              
              <View style={styles.paymentsContainer}>
                {upcomingPayments.map((payment) => 
                  renderUpcomingPayment(payment)
                )}
              </View>
            </View>
          )}

          {/* Quick Actions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => navigateToCards()}
                accessibilityLabel="Add new card"
                testID="dashboard-quick-add-card"
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name="add" size={24} color="#0A84FF" />
                </View>
                <Text style={styles.quickActionText}>Add Card</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => navigation.navigate('Simulation')}
                accessibilityLabel="Run simulation"
                testID="dashboard-quick-simulation"
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name="calculator" size={24} color="#0A84FF" />
                </View>
                <Text style={styles.quickActionText}>Simulation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
      
      {/* Loading Overlay */}
      <LoadingOverlay 
        visible={state.isLoading && !state.isRefreshing}
        message="Loading dashboard..." 
      />
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const cardWidth = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  
  // Section Styles
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  sectionLink: {
    fontSize: 16,
    color: '#0A84FF',
    fontWeight: '500',
  },
  
  // Cards Summary Styles
  cardsList: {
    paddingHorizontal: 16,
  },
  cardSummary: {
    width: cardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  cardSummaryHighlighted: {
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  highlightBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  highlightText: {
    fontSize: 10,
    color: '#FF9500',
    fontWeight: '600',
    marginLeft: 2,
  },
  cardSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSummaryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
    flex: 1,
  },
  cardSummaryLimits: {
    marginBottom: 12,
  },
  limitAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0A84FF',
  },
  limitTotal: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  
  // Upcoming Payments Styles
  paymentsContainer: {
    paddingHorizontal: 16,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentItemUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  paymentIcon: {
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  paymentType: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  paymentTypeUrgent: {
    color: '#FF3B30',
    fontWeight: '500',
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  paymentAmountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A84FF',
  },
  
  // Quick Actions Styles
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  
  // Empty State Styles
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  addFirstCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A84FF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  addButtonIcon: {
    marginRight: 8,
  },
  addFirstCardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Loading State Styles
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  
  // Error State Styles
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});