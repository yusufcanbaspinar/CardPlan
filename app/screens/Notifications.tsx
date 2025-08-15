/**
 * Notifications screen displays a chronological list of app notifications.
 * Supports marking as read, deleting, and pull-to-refresh functionality.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import type { FormattedNotification } from '../../db/notificationsRepo';
import { 
  getAllNotifications, 
  markAsRead, 
  deleteNotification,
  markAllAsRead,
} from '../../db/notificationsRepo';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { showErrorAlert } from '../utils/showErrorAlert';

/**
 * Interface for notifications screen state.
 */
interface NotificationsState {
  notifications: FormattedNotification[];
  isLoading: boolean;
  isRefreshing: boolean;
}

/**
 * Initial notifications state.
 */
const INITIAL_STATE: NotificationsState = {
  notifications: [],
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
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Bugün';
    } else if (diffDays === 1) {
      return 'Dün';
    } else if (diffDays < 7) {
      return `${diffDays} gün önce`;
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  } catch (error) {
    return dateISO;
  }
}

/**
 * Notifications screen component.
 */
export function Notifications(): JSX.Element {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);
  
  const [state, setState] = useState<NotificationsState>(INITIAL_STATE);
  
  /**
   * Updates notifications state with partial updates.
   */
  const updateState = useCallback((updates: Partial<NotificationsState>): void => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  /**
   * Loads notifications from the database.
   */
  const loadNotifications = useCallback(async (): Promise<void> => {
    try {
      const notifications = await getAllNotifications();
      updateState({ notifications, isLoading: false, isRefreshing: false });
    } catch (error) {
      console.error('Error loading notifications:', error);
      updateState({ isLoading: false, isRefreshing: false });
      showErrorAlert('Failed to load notifications. Please try again.');
    }
  }, [updateState]);
  
  /**
   * Initial load effect.
   */
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);
  
  /**
   * Handles pull-to-refresh.
   */
  const onRefresh = useCallback(async (): Promise<void> => {
    updateState({ isRefreshing: true });
    await loadNotifications();
  }, [updateState, loadNotifications]);
  
  /**
   * Handles marking a notification as read.
   */
  const handleMarkAsRead = useCallback(async (notification: FormattedNotification): Promise<void> => {
    if (notification.read) return;
    
    try {
      await markAsRead(notification.id);
      
      // Update local state
      const updatedNotifications = state.notifications.map(n =>
        n.id === notification.id ? { ...n, read: true } : n
      );
      updateState({ notifications: updatedNotifications });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showErrorAlert('Failed to mark notification as read.');
    }
  }, [state.notifications, updateState]);
  
  /**
   * Handles deleting a notification.
   */
  const handleDelete = useCallback(async (notificationId: number): Promise<void> => {
    try {
      await deleteNotification(notificationId);
      
      // Update local state
      const updatedNotifications = state.notifications.filter(n => n.id !== notificationId);
      updateState({ notifications: updatedNotifications });
    } catch (error) {
      console.error('Error deleting notification:', error);
      showErrorAlert('Failed to delete notification.');
    }
  }, [state.notifications, updateState]);
  
  /**
   * Shows confirmation dialog for deleting a notification.
   */
  const confirmDelete = useCallback((notification: FormattedNotification): void => {
    Alert.alert(
      'Bildirimi Sil',
      'Bu bildirimi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => handleDelete(notification.id),
        },
      ]
    );
  }, [handleDelete]);
  
  /**
   * Handles marking all notifications as read.
   */
  const handleMarkAllAsRead = useCallback(async (): Promise<void> => {
    const unreadCount = state.notifications.filter(n => !n.read).length;
    if (unreadCount === 0) {
      Alert.alert('Bilgi', 'Tüm bildirimler zaten okunmuş.');
      return;
    }
    
    Alert.alert(
      'Tümünü Okundu İşaretle',
      `${unreadCount} bildirimi okunmuş olarak işaretlemek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Okundu İşaretle', 
          style: 'default',
          onPress: async () => {
            try {
              await markAllAsRead();
              
              // Update local state
              const updatedNotifications = state.notifications.map(n => ({ ...n, read: true }));
              updateState({ notifications: updatedNotifications });
            } catch (error) {
              console.error('Error marking all as read:', error);
              showErrorAlert('Failed to mark all notifications as read.');
            }
          },
        },
      ]
    );
  }, [state.notifications, updateState]);
  
  /**
   * Renders the swipe actions for a notification.
   */
  const renderRightActions = useCallback((
    notification: FormattedNotification,
    progress: Animated.AnimatedAddition,
    dragX: Animated.AnimatedAddition
  ): JSX.Element => {
    const trans = dragX.interpolate({
      inputRange: [-200, -100, 0],
      outputRange: [0, 50, 100],
      extrapolate: 'clamp',
    });
    
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    
    return (
      <View style={styles.swipeActions}>
        {!notification.read && (
          <Animated.View style={[styles.swipeAction, { transform: [{ translateX: trans }, { scale }] }]}>
            <TouchableOpacity
              style={[styles.swipeButton, styles.markReadButton]}
              onPress={() => handleMarkAsRead(notification)}
              testID={`mark-read-${notification.id}`}
            >
              <Text style={styles.swipeButtonText}>Okundu</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        
        <Animated.View style={[styles.swipeAction, { transform: [{ translateX: trans }, { scale }] }]}>
          <TouchableOpacity
            style={[styles.swipeButton, styles.deleteButton]}
            onPress={() => confirmDelete(notification)}
            testID={`delete-${notification.id}`}
          >
            <Text style={styles.swipeButtonText}>Sil</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }, [handleMarkAsRead, confirmDelete, styles]);
  
  /**
   * Renders a single notification item.
   */
  const renderNotificationItem = useCallback(({ item }: { item: FormattedNotification }): JSX.Element => (
    <Swipeable
      renderRightActions={(progress, dragX) => renderRightActions(item, progress, dragX)}
      rightThreshold={40}
    >
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotificationItem,
        ]}
        onPress={() => handleMarkAsRead(item)}
        testID={`notification-${item.id}`}
        accessibilityLabel={`${item.title}. ${item.message}. ${formatDate(item.dateISO)}. ${item.read ? 'Okundu' : 'Okunmadı'}`}
        accessibilityRole="button"
      >
        <View style={styles.notificationHeader}>
          <Text
            style={[
              styles.notificationTitle,
              !item.read && styles.unreadNotificationTitle,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <View style={styles.notificationMeta}>
            <Text style={styles.notificationDate}>
              {formatDate(item.dateISO)}
            </Text>
            {!item.read && <View style={styles.unreadBadge} />}
          </View>
        </View>
        
        <Text
          style={styles.notificationMessage}
          numberOfLines={3}
        >
          {item.message}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  ), [handleMarkAsRead, renderRightActions, styles]);
  
  /**
   * Renders empty state when no notifications.
   */
  const renderEmptyState = useCallback((): JSX.Element => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>Bildirim Yok</Text>
      <Text style={styles.emptyStateText}>
        Henüz herhangi bir bildiriminiz bulunmuyor. Kampanya güncellemeleri ve önemli hatırlatmalar burada görünecek.
      </Text>
    </View>
  ), [styles]);
  
  /**
   * Renders the header with mark all as read button.
   */
  const renderHeader = useCallback((): JSX.Element | null => {
    const unreadCount = state.notifications.filter(n => !n.read).length;
    
    if (state.notifications.length === 0) return null;
    
    return (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Bildirimler ({state.notifications.length})
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
            testID="mark-all-read"
            accessibilityLabel={`${unreadCount} okunmamış bildirimi okundu işaretle`}
          >
            <Text style={styles.markAllButtonText}>
              Tümünü Okundu İşaretle ({unreadCount})
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [state.notifications, handleMarkAllAsRead, styles]);
  
  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={state.notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={state.isRefreshing}
            onRefresh={onRefresh}
            tintColor={styles.refreshControl.tintColor}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={state.notifications.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
      />
      
      {state.isLoading && (
        <LoadingOverlay message="Bildirimler yükleniyor..." />
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
    unreadBg: isDark ? '#1D3A5F' : '#E3F2FD',
    unreadBorder: '#007AFF',
  };
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    markAllButton: {
      alignSelf: 'flex-start',
    },
    markAllButtonText: {
      fontSize: 16,
      color: colors.accent,
      fontWeight: '500',
    },
    notificationItem: {
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    unreadNotificationItem: {
      backgroundColor: colors.unreadBg,
      borderLeftWidth: 4,
      borderLeftColor: colors.unreadBorder,
    },
    notificationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      marginRight: 12,
      lineHeight: 20,
    },
    unreadNotificationTitle: {
      fontWeight: 'bold',
    },
    notificationMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    notificationDate: {
      fontSize: 12,
      color: colors.secondaryText,
      marginRight: 8,
    },
    unreadBadge: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    notificationMessage: {
      fontSize: 14,
      color: colors.secondaryText,
      lineHeight: 18,
    },
    swipeActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: 16,
    },
    swipeAction: {
      marginLeft: 8,
    },
    swipeButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      minWidth: 70,
      alignItems: 'center',
    },
    markReadButton: {
      backgroundColor: colors.success,
    },
    deleteButton: {
      backgroundColor: colors.danger,
    },
    swipeButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      paddingHorizontal: 32,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
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