import { Alert } from 'react-native';

/**
 * Utility function to show standardized error alerts throughout the app.
 * Uses React Native's Alert.alert with consistent styling and behavior.
 * 
 * @param title - The title of the error alert
 * @param message - The error message to display to the user
 */
export const showErrorAlert = (title: string, message: string): void => {
  Alert.alert(
    title,
    message,
    [
      {
        text: 'OK',
        style: 'default',
      },
    ],
    {
      cancelable: true,
    }
  );
};

/**
 * Utility function to show a confirmation alert with custom actions.
 * Useful for delete confirmations or other destructive actions.
 * 
 * @param title - The title of the confirmation alert
 * @param message - The confirmation message
 * @param onConfirm - Callback to execute when user confirms
 * @param onCancel - Optional callback to execute when user cancels
 * @param confirmText - Text for the confirm button (defaults to "Confirm")
 * @param cancelText - Text for the cancel button (defaults to "Cancel")
 */
export const showConfirmAlert = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText: string = 'Confirm',
  cancelText: string = 'Cancel'
): void => {
  Alert.alert(
    title,
    message,
    [
      {
        text: cancelText,
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText,
        style: 'destructive',
        onPress: onConfirm,
      },
    ],
    {
      cancelable: true,
    }
  );
};

/**
 * Utility function to show a success alert with positive feedback.
 * 
 * @param title - The title of the success alert
 * @param message - The success message to display
 * @param onOk - Optional callback when user taps OK
 */
export const showSuccessAlert = (
  title: string,
  message: string,
  onOk?: () => void
): void => {
  Alert.alert(
    title,
    message,
    [
      {
        text: 'OK',
        style: 'default',
        onPress: onOk,
      },
    ],
    {
      cancelable: true,
    }
  );
};

/**
 * Utility function to extract a user-friendly error message from various error types.
 * 
 * @param error - The error object (can be Error, string, or unknown)
 * @param fallbackMessage - Message to use if error cannot be parsed
 * @returns A user-friendly error message string
 */
export const getErrorMessage = (
  error: unknown,
  fallbackMessage: string = 'An unexpected error occurred'
): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return fallbackMessage;
};

// Export default for main error alert function
export default showErrorAlert;