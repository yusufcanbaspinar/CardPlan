import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Platform, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { initializeDatabase } from './db/schema';

export type RootStackParamList = {
  Dashboard: undefined;
  Cards: undefined;
  Simulation: undefined;
  Notifications: undefined;
  AddCard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type DashboardScreenProps = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;
type CardsScreenProps = NativeStackScreenProps<RootStackParamList, 'Cards'>;
type SimulationScreenProps = NativeStackScreenProps<RootStackParamList, 'Simulation'>;
type NotificationsScreenProps = NativeStackScreenProps<RootStackParamList, 'Notifications'>;
type AddCardScreenProps = NativeStackScreenProps<RootStackParamList, 'AddCard'>;

interface BottomNavigationProps {
  navigation: any;
  currentScreen: keyof RootStackParamList;
}

function BottomNavigation({ navigation, currentScreen }: BottomNavigationProps) {
  const navItems = [
    { key: 'Dashboard' as const, title: 'Dashboard', icon: 'home' as const },
    { key: 'Cards' as const, title: 'Cards', icon: 'card' as const },
    { key: 'Simulation' as const, title: 'Simulation', icon: 'calculator' as const },
    { key: 'Notifications' as const, title: 'Notifications', icon: 'notifications' as const },
  ];

  return (
    <View style={styles.bottomNavigation}>
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.navItem,
            currentScreen === item.key && styles.navItemActive
          ]}
          onPress={() => navigation.navigate(item.key)}
          testID={`bottom-nav-${item.key.toLowerCase()}`}
        >
          <Ionicons
            name={item.icon}
            size={20}
            color={currentScreen === item.key ? '#0A84FF' : '#8E8E93'}
          />
          <Text style={[
            styles.navText,
            currentScreen === item.key && styles.navTextActive
          ]}>
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function DashboardScreen({ navigation }: DashboardScreenProps) {
  return (
    <SafeAreaView style={styles.screenWithFooter} edges={['bottom']}>
      <View style={styles.screenContent}>
        <Text style={styles.screenText}>Dashboard</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => navigation.navigate('Cards')}
            accessibilityLabel="Navigate to My Cards"
            testID="dashboard-cards-button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="card" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>My Cards</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => navigation.navigate('Simulation')}
            accessibilityLabel="Navigate to Quick Simulation"
            testID="dashboard-simulation-button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="calculator" size={20} color="#0A84FF" style={styles.buttonIcon} />
            <Text style={styles.secondaryButtonText}>Quick Simulation</Text>
          </TouchableOpacity>
        </View>
      </View>
      <BottomNavigation navigation={navigation} currentScreen="Dashboard" />
    </SafeAreaView>
  );
}

function CardsScreen({ navigation }: CardsScreenProps) {
  const cardItems = [
    { id: 1, name: 'Visa **** 1234', balance: '$2,450.00' },
    { id: 2, name: 'MasterCard **** 5678', balance: '$1,200.00' },
    { id: 3, name: 'American Express **** 9012', balance: '$890.00' },
  ];

  const handleCardPress = (cardName: string) => {
    Alert.alert('Card Selected', `You tapped on ${cardName}`);
  };

  return (
    <SafeAreaView style={styles.screenWithFooter} edges={['bottom']}>
      <ScrollView style={styles.scrollContent}>
        <View style={styles.cardsContainer}>
          <Text style={styles.screenText}>My Cards</Text>
          {cardItems.map((card) => (
            <TouchableOpacity 
              key={card.id}
              style={styles.cardItem}
              onPress={() => handleCardPress(card.name)}
              accessibilityLabel={`Card ${card.name} with balance ${card.balance}`}
              testID={`card-item-${card.id}`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.cardContent}>
                <Ionicons name="card" size={24} color="#0A84FF" />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{card.name}</Text>
                  <Text style={styles.cardBalance}>{card.balance}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <BottomNavigation navigation={navigation} currentScreen="Cards" />
    </SafeAreaView>
  );
}

function SimulationScreen({ navigation }: SimulationScreenProps) {
  return (
    <SafeAreaView style={styles.screenWithFooter} edges={['bottom']}>
      <View style={styles.screenContent}>
        <Text style={styles.screenText}>Simulation</Text>
        <View style={styles.simulationContent}>
          <Text style={styles.placeholderText}>Credit card simulation tools would go here</Text>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => navigation.navigate('Dashboard')}
            accessibilityLabel="Go back to Dashboard"
            testID="simulation-dashboard-button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="home" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
      <BottomNavigation navigation={navigation} currentScreen="Simulation" />
    </SafeAreaView>
  );
}

function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  return (
    <SafeAreaView style={styles.screenWithFooter} edges={['bottom']}>
      <ScrollView style={styles.scrollContent}>
        <View style={styles.notificationsContainer}>
          <Text style={styles.screenText}>Notifications</Text>
          <View style={styles.notificationsList}>
            <View style={styles.notificationItem}>
              <Ionicons name="notifications" size={20} color="#0A84FF" />
              <Text style={styles.notificationText}>Welcome to KartPlan!</Text>
            </View>
            <View style={styles.notificationItem}>
              <Ionicons name="card" size={20} color="#FF9500" />
              <Text style={styles.notificationText}>Your card payment is due tomorrow</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => navigation.popToTop()}
            accessibilityLabel="Back to Dashboard"
            testID="notifications-dashboard-button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="home" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNavigation navigation={navigation} currentScreen="Notifications" />
    </SafeAreaView>
  );
}

function AddCardScreen({ navigation }: AddCardScreenProps) {
  return (
    <SafeAreaView style={styles.screenContainer} edges={['top', 'bottom']}>
      <View style={styles.modalContent}>
        <Text style={styles.screenText}>Add New Card</Text>
        <Text style={styles.placeholderText}>Card creation form would go here</Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => navigation.goBack()}
            accessibilityLabel="Cancel adding card"
            testID="addcard-cancel-button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => {
              Alert.alert('Card Added', 'New card would be added here', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            }}
            accessibilityLabel="Save new card"
            testID="addcard-save-button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.buttonText}>Save Card</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        console.log('🔄 Initializing database...');
        const result = await initializeDatabase();
        
        if (result.success) {
          setIsDbReady(true);
          console.log('✅ App database initialization successful');
        } else {
          const errorMessage = result.errors.join(', ');
          setDbError(errorMessage);
          console.error('❌ App database initialization failed:', errorMessage);
        }
      } catch (error) {
        const errorMessage = `Database setup failed: ${error}`;
        setDbError(errorMessage);
        console.error('❌ Critical database error:', error);
      }
    };

    setupDatabase();
  }, []);

  // Show loading screen while database is being initialized
  if (!isDbReady && !dbError) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={styles.loadingText}>Setting up database...</Text>
        </SafeAreaView>
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  // Show error screen if database initialization failed
  if (dbError) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.errorContainer}>
          <Ionicons name="warning" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Database Error</Text>
          <Text style={styles.errorMessage}>{dbError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setDbError(null);
              setIsDbReady(false);
              // This will trigger useEffect again
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </SafeAreaView>
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  // Database is ready, show the main app
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Dashboard"
          screenOptions={{
            headerShown: true,
            headerTitleAlign: 'center',
            headerStyle: {
              backgroundColor: '#0A84FF',
              ...(Platform.OS === 'android' && { elevation: 0 }),
              ...(Platform.OS === 'ios' && { shadowOpacity: 0 }),
            },
            headerTintColor: 'white',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            statusBarStyle: 'light',
            statusBarBackgroundColor: '#0A84FF',
          }}
        >
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen}
            options={({ navigation }) => ({
              title: 'KartPlan',
              headerLeft: () => null,
              headerRight: () => (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => navigation.navigate('Notifications')}
                  testID="dashboard-notifications-button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="notifications" size={24} color="white" />
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen 
            name="Cards" 
            component={CardsScreen}
            options={({ navigation }) => ({
              title: 'My Cards',
              gestureEnabled: true,
              headerRight: () => (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => navigation.navigate('AddCard')}
                  testID="cards-add-button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen 
            name="Simulation" 
            component={SimulationScreen}
            options={({ navigation }) => ({
              title: 'Simulation',
              gestureEnabled: true,
              headerLeft: () => (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => {
                    if (navigation.canGoBack()) {
                      navigation.goBack();
                    } else {
                      navigation.navigate('Dashboard');
                    }
                  }}
                  testID="simulation-back-button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons 
                    name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
                    size={24} 
                    color="white" 
                  />
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen}
            options={{ title: 'Notifications', gestureEnabled: true }}
          />
          <Stack.Screen 
            name="AddCard" 
            component={AddCardScreen}
            options={{
              title: 'Add Card',
              presentation: 'modal',
              gestureEnabled: true,
            }}
          />
        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenWithFooter: {
    flex: 1,
    backgroundColor: '#fff',
  },
  screenContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    padding: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    paddingTop: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    // Active state handled by color changes in icon and text
  },
  navText: {
    fontSize: 10,
    marginTop: 4,
    color: '#8E8E93',
  },
  navTextActive: {
    color: '#0A84FF',
    fontWeight: '600',
  },
  // New button styles
  primaryButton: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0A84FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
  },
  secondaryButtonText: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Screen content styles
  scrollContent: {
    flex: 1,
  },
  cardsContainer: {
    padding: 20,
  },
  cardItem: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  cardBalance: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  simulationContent: {
    alignItems: 'center',
    width: '100%',
  },
  notificationsContainer: {
    padding: 20,
  },
  notificationsList: {
    marginBottom: 30,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  notificationText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    flex: 1,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    width: '100%',
  },
  // Database initialization loading/error styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
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
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});