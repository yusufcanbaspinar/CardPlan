import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';

// Props interface for LoadingOverlay component
interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

/**
 * Reusable loading overlay component that displays a full-screen loading indicator
 * with an optional message over a semi-transparent background.
 * 
 * @param visible - Controls whether the overlay is shown
 * @param message - Optional loading message (defaults to "Loading...")
 */
export default function LoadingOverlay({ 
  visible, 
  message = "Loading..." 
}: LoadingOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View 
        style={styles.overlay}
        accessibilityLabel="Loading"
        accessibilityRole="progressbar"
      >
        <View style={styles.container}>
          <ActivityIndicator 
            size="large" 
            color="#0A84FF" 
            style={styles.spinner}
          />
          <Text style={styles.message}>
            {message}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    fontWeight: '500',
  },
});