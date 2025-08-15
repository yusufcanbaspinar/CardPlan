import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { 
  Card, 
  getAllCards, 
  addCard, 
  updateCard, 
  deleteCard,
  CreateCardInput,
  UpdateCardInput,
} from '../../db/repositories/cardsRepo';
import CardForm from '../components/CardForm';
import LoadingOverlay from '../components/LoadingOverlay';
import { showErrorAlert, showConfirmAlert, showSuccessAlert, getErrorMessage } from '../utils/showErrorAlert';

// Types for component state
interface CardsScreenState {
  cards: Card[];
  isLoading: boolean;
  isRefreshing: boolean;
  isOperationLoading: boolean; // For add/update/delete operations
  error: string | null;
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

// Helper function to calculate limit percentage
const calculateLimitPercentage = (available: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round(((total - available) / total) * 100);
};

export default function CardsScreen() {
  const [state, setState] = useState<CardsScreenState>({
    cards: [],
    isLoading: true,
    isRefreshing: false,
    isOperationLoading: false,
    error: null,
  });

  const [formVisible, setFormVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // Load cards from database
  const loadCards = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setState(prev => ({ ...prev, isRefreshing: true, error: null }));
      } else {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
      }

      console.log('🔄 Loading cards from database...');
      const cards = await getAllCards();
      
      setState(prev => ({
        ...prev,
        cards,
        isLoading: false,
        isRefreshing: false,
        error: null,
      }));

      console.log(`✅ Loaded ${cards.length} cards`);
    } catch (error) {
      console.error('❌ Error loading cards:', error);
      const errorMessage = getErrorMessage(error, 'Failed to load cards');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: errorMessage,
      }));

      if (!isRefresh) {
        showErrorAlert('Error', 'Failed to load cards. Please try again.');
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

  // Handle add card
  const handleAddCard = async (cardData: CreateCardInput) => {
    setState(prev => ({ ...prev, isOperationLoading: true }));
    
    try {
      console.log('➕ Adding new card:', cardData.name);
      await addCard(cardData);
      
      showSuccessAlert('Success', 'Card added successfully!');
      await loadCards(); // Refresh the list
    } catch (error) {
      console.error('❌ Error adding card:', error);
      const errorMessage = getErrorMessage(error, 'Failed to add card');
      showErrorAlert('Error', errorMessage);
      throw error; // Re-throw to let CardForm handle the error display
    } finally {
      setState(prev => ({ ...prev, isOperationLoading: false }));
    }
  };

  // Handle edit card
  const handleEditCard = async (cardData: UpdateCardInput) => {
    if (!editingCard) return;

    setState(prev => ({ ...prev, isOperationLoading: true }));

    try {
      console.log('✏️ Updating card:', editingCard.id);
      await updateCard(editingCard.id, cardData);
      
      showSuccessAlert('Success', 'Card updated successfully!');
      await loadCards(); // Refresh the list
      setEditingCard(null);
    } catch (error) {
      console.error('❌ Error updating card:', error);
      const errorMessage = getErrorMessage(error, 'Failed to update card');
      showErrorAlert('Error', errorMessage);
      throw error; // Re-throw to let CardForm handle the error display
    } finally {
      setState(prev => ({ ...prev, isOperationLoading: false }));
    }
  };

  // Handle delete card with confirmation
  const handleDeleteCard = (card: Card) => {
    showConfirmAlert(
      'Delete Card',
      `Are you sure you want to delete "${card.name}"? This action cannot be undone.`,
      async () => {
        setState(prev => ({ ...prev, isOperationLoading: true }));
        
        try {
          console.log('🗑️ Deleting card:', card.id);
          await deleteCard(card.id);
          
          showSuccessAlert('Success', 'Card deleted successfully!');
          await loadCards(); // Refresh the list
        } catch (error) {
          console.error('❌ Error deleting card:', error);
          const errorMessage = getErrorMessage(error, 'Failed to delete card');
          showErrorAlert('Error', errorMessage);
        } finally {
          setState(prev => ({ ...prev, isOperationLoading: false }));
        }
      },
      undefined,
      'Delete',
      'Cancel'
    );
  };

  // Open add card form
  const openAddForm = () => {
    setEditingCard(null);
    setFormVisible(true);
  };

  // Open edit card form
  const openEditForm = (card: Card) => {
    setEditingCard(card);
    setFormVisible(true);
  };

  // Close form
  const closeForm = () => {
    setFormVisible(false);
    setEditingCard(null);
  };

  // Show action sheet for card options
  const showCardOptions = (card: Card) => {
    Alert.alert(
      card.name,
      'Choose an action',
      [
        {
          text: 'Edit',
          onPress: () => openEditForm(card),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteCard(card),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Render individual card item
  const renderCardItem = ({ item: card }: { item: Card }) => {
    const usagePercentage = calculateLimitPercentage(card.available_limit, card.total_limit);
    
    return (
      <View style={styles.cardItem}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => showCardOptions(card)}
          accessibilityLabel={`Card ${card.name}, ${formatCurrency(card.available_limit)} available of ${formatCurrency(card.total_limit)}`}
          testID={`card-item-${card.id}`}
        >
          {/* Card Icon */}
          <View style={styles.cardIcon}>
            <Ionicons name="card" size={24} color="#0A84FF" />
          </View>

          {/* Card Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{card.name}</Text>
            
            {/* Limit Info */}
            <View style={styles.limitContainer}>
              <Text style={styles.limitText}>
                {formatCurrency(card.available_limit)} / {formatCurrency(card.total_limit)} available
              </Text>
              
              {/* Usage Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${usagePercentage}%`,
                        backgroundColor: usagePercentage > 80 ? '#FF3B30' : '#0A84FF',
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>{usagePercentage}% used</Text>
              </View>
            </View>

            {/* Additional Info */}
            <View style={styles.cardDetails}>
              <Text style={styles.detailText}>
                Statement: {card.statement_day}th • Due: {card.due_day}th
              </Text>
              {card.cashback_percent > 0 && (
                <Text style={styles.detailText}>
                  Cashback: {card.cashback_percent}%
                </Text>
              )}
            </View>
          </View>

          {/* Options Button */}
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => showCardOptions(card)}
            accessibilityLabel="Card options"
            testID={`card-options-${card.id}`}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="card-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyStateTitle}>No Cards Yet</Text>
      <Text style={styles.emptyStateMessage}>
        Add your first credit card to start tracking your spending and limits.
      </Text>
      <TouchableOpacity
        style={styles.addFirstCardButton}
        onPress={openAddForm}
        accessibilityLabel="Add your first card"
        testID="add-first-card-button"
      >
        <Text style={styles.addFirstCardButtonText}>Add Your First Card</Text>
      </TouchableOpacity>
    </View>
  );

  // Render loading state
  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#0A84FF" />
      <Text style={styles.loadingText}>Loading your cards...</Text>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="warning-outline" size={48} color="#FF3B30" />
      <Text style={styles.errorTitle}>Unable to Load Cards</Text>
      <Text style={styles.errorMessage}>{state.error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => loadCards()}
        accessibilityLabel="Retry loading cards"
        testID="retry-load-cards"
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header with Add Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Cards</Text>
        <TouchableOpacity
          style={[
            styles.addButton,
            state.isOperationLoading && styles.addButtonDisabled
          ]}
          onPress={openAddForm}
          disabled={state.isOperationLoading}
          accessibilityLabel="Add new card"
          testID="add-card-button"
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {state.isLoading ? (
        renderLoadingState()
      ) : state.error ? (
        renderErrorState()
      ) : (
        <FlatList
          data={state.cards}
          renderItem={renderCardItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContainer,
            state.cards.length === 0 && styles.listContainerEmpty,
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={state.isRefreshing}
              onRefresh={handleRefresh}
              colors={['#0A84FF']}
              tintColor="#0A84FF"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Card Form Modal */}
      <CardForm
        visible={formVisible}
        onClose={closeForm}
        initialValues={editingCard || undefined}
        onSubmit={editingCard ? handleEditCard : handleAddCard}
      />

      {/* Loading Overlay */}
      <LoadingOverlay 
        visible={(state.isLoading && !state.isRefreshing) || state.isOperationLoading}
        message={
          state.isOperationLoading 
            ? editingCard 
              ? "Updating card..." 
              : "Adding card..."
            : "Loading cards..."
        } 
      />
    </SafeAreaView>
  );
}

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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  addButton: {
    backgroundColor: '#0A84FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#C7C7CC',
    opacity: 0.6,
  },
  listContainer: {
    padding: 16,
  },
  listContainerEmpty: {
    flex: 1,
  },
  cardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardIcon: {
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  limitContainer: {
    marginBottom: 8,
  },
  limitText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  optionsButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
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
    backgroundColor: '#0A84FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstCardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Loading State
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
  // Error State
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