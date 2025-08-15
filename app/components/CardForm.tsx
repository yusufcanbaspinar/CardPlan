import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../../db/repositories/cardsRepo';

// Zod validation schema
const cardFormSchema = z.object({
  name: z.string().min(1, 'Card name is required').max(50, 'Card name too long'),
  total_limit: z
    .number({
      required_error: 'Total limit is required',
      invalid_type_error: 'Total limit must be a number',
    })
    .positive('Total limit must be positive'),
  available_limit: z
    .number({
      required_error: 'Available limit is required', 
      invalid_type_error: 'Available limit must be a number',
    })
    .min(0, 'Available limit cannot be negative'),
  statement_day: z
    .number({
      required_error: 'Statement day is required',
      invalid_type_error: 'Statement day must be a number',
    })
    .int('Statement day must be an integer')
    .min(1, 'Statement day must be between 1-28')
    .max(28, 'Statement day must be between 1-28'),
  due_day: z
    .number({
      required_error: 'Due day is required',
      invalid_type_error: 'Due day must be a number',
    })
    .int('Due day must be an integer')
    .min(1, 'Due day must be between 1-28')
    .max(28, 'Due day must be between 1-28'),
  cashback_percent: z
    .number({
      invalid_type_error: 'Cashback percent must be a number',
    })
    .min(0, 'Cashback percent cannot be negative')
    .max(100, 'Cashback percent cannot exceed 100%')
    .default(0),
  point_rate: z
    .number({
      invalid_type_error: 'Point rate must be a number',
    })
    .min(0, 'Point rate cannot be negative')
    .default(0),
  point_value: z
    .number({
      invalid_type_error: 'Point value must be a number',
    })
    .min(0, 'Point value cannot be negative')
    .default(0),
  installment_support: z.number().int().min(0).max(1).default(1),
}).refine(
  (data) => data.available_limit <= data.total_limit,
  {
    message: 'Available limit cannot exceed total limit',
    path: ['available_limit'],
  }
);

export type CardFormData = z.infer<typeof cardFormSchema>;

// Component props interface
interface CardFormProps {
  visible: boolean;
  onClose: () => void;
  initialValues?: Partial<Card>;
  onSubmit: (values: Omit<Card, 'id'> | Partial<Omit<Card, 'id'>>) => Promise<void>;
}

export default function CardForm({ visible, onClose, initialValues, onSubmit }: CardFormProps) {
  const isEditMode = !!initialValues?.id;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
    setValue,
  } = useForm<CardFormData>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      name: '',
      total_limit: 0,
      available_limit: 0,
      statement_day: 1,
      due_day: 10,
      cashback_percent: 0,
      point_rate: 0,
      point_value: 0,
      installment_support: 1,
    },
    mode: 'onChange',
  });

  // Watch total_limit to update available_limit max validation
  const totalLimit = watch('total_limit');

  // Populate form with initial values when in edit mode
  useEffect(() => {
    if (visible && initialValues) {
      reset({
        name: initialValues.name || '',
        total_limit: initialValues.total_limit || 0,
        available_limit: initialValues.available_limit || 0,
        statement_day: initialValues.statement_day || 1,
        due_day: initialValues.due_day || 10,
        cashback_percent: initialValues.cashback_percent || 0,
        point_rate: initialValues.point_rate || 0,
        point_value: initialValues.point_value || 0,
        installment_support: initialValues.installment_support || 1,
      });
    } else if (visible && !initialValues) {
      // Reset to defaults for new card
      reset({
        name: '',
        total_limit: 0,
        available_limit: 0,
        statement_day: 1,
        due_day: 10,
        cashback_percent: 0,
        point_rate: 0,
        point_value: 0,
        installment_support: 1,
      });
    }
  }, [visible, initialValues, reset]);

  const handleFormSubmit = async (data: CardFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      Alert.alert(
        'Error',
        `Failed to ${isEditMode ? 'update' : 'create'} card. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.headerButton}
              disabled={isSubmitting}
              accessibilityLabel="Cancel card form"
              testID="card-form-cancel"
            >
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Edit Card' : 'Add New Card'}
            </Text>
            
            <TouchableOpacity
              onPress={handleSubmit(handleFormSubmit)}
              style={[
                styles.headerButton,
                styles.saveButton,
                (!isValid || isSubmitting) && styles.saveButtonDisabled,
              ]}
              disabled={!isValid || isSubmitting}
              accessibilityLabel={isEditMode ? 'Save card changes' : 'Create new card'}
              testID="card-form-save"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#0A84FF" />
              ) : (
                <Text style={[
                  styles.saveButtonText,
                  (!isValid || isSubmitting) && styles.saveButtonTextDisabled,
                ]}>
                  {isEditMode ? 'Save' : 'Create'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              
              {/* Card Name */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Card Name *</Text>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.name && styles.inputError]}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="e.g., Visa Gold Card"
                      placeholderTextColor="#999"
                      autoCapitalize="words"
                      testID="card-form-name"
                    />
                  )}
                />
                {errors.name && (
                  <Text style={styles.errorText}>{errors.name.message}</Text>
                )}
              </View>

              {/* Total Limit */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Total Limit * ($)</Text>
                <Controller
                  control={control}
                  name="total_limit"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.total_limit && styles.inputError]}
                      value={value?.toString() || ''}
                      onChangeText={(text) => {
                        const numValue = parseFloat(text) || 0;
                        onChange(numValue);
                        // Auto-update available limit if it exceeds new total
                        const currentAvailable = watch('available_limit');
                        if (currentAvailable > numValue) {
                          setValue('available_limit', numValue);
                        }
                      }}
                      onBlur={onBlur}
                      placeholder="5000"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      testID="card-form-total-limit"
                    />
                  )}
                />
                {errors.total_limit && (
                  <Text style={styles.errorText}>{errors.total_limit.message}</Text>
                )}
              </View>

              {/* Available Limit */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Available Limit * ($)</Text>
                <Controller
                  control={control}
                  name="available_limit"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.available_limit && styles.inputError]}
                      value={value?.toString() || ''}
                      onChangeText={(text) => onChange(parseFloat(text) || 0)}
                      onBlur={onBlur}
                      placeholder={`Max: ${totalLimit || 0}`}
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      testID="card-form-available-limit"
                    />
                  )}
                />
                {errors.available_limit && (
                  <Text style={styles.errorText}>{errors.available_limit.message}</Text>
                )}
              </View>

              {/* Statement Day */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Statement Day * (1-28)</Text>
                <Controller
                  control={control}
                  name="statement_day"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.statement_day && styles.inputError]}
                      value={value?.toString() || ''}
                      onChangeText={(text) => onChange(parseInt(text) || 1)}
                      onBlur={onBlur}
                      placeholder="15"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      testID="card-form-statement-day"
                    />
                  )}
                />
                {errors.statement_day && (
                  <Text style={styles.errorText}>{errors.statement_day.message}</Text>
                )}
              </View>

              {/* Due Day */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Due Day * (1-28)</Text>
                <Controller
                  control={control}
                  name="due_day"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.due_day && styles.inputError]}
                      value={value?.toString() || ''}
                      onChangeText={(text) => onChange(parseInt(text) || 10)}
                      onBlur={onBlur}
                      placeholder="10"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      testID="card-form-due-day"
                    />
                  )}
                />
                {errors.due_day && (
                  <Text style={styles.errorText}>{errors.due_day.message}</Text>
                )}
              </View>

              {/* Cashback Percent */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Cashback Percent (%)</Text>
                <Controller
                  control={control}
                  name="cashback_percent"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.cashback_percent && styles.inputError]}
                      value={value?.toString() || '0'}
                      onChangeText={(text) => onChange(parseFloat(text) || 0)}
                      onBlur={onBlur}
                      placeholder="1.5"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      testID="card-form-cashback"
                    />
                  )}
                />
                {errors.cashback_percent && (
                  <Text style={styles.errorText}>{errors.cashback_percent.message}</Text>
                )}
              </View>

              {/* Point Rate */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Point Rate</Text>
                <Controller
                  control={control}
                  name="point_rate"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.point_rate && styles.inputError]}
                      value={value?.toString() || '0'}
                      onChangeText={(text) => onChange(parseFloat(text) || 0)}
                      onBlur={onBlur}
                      placeholder="1.0"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      testID="card-form-point-rate"
                    />
                  )}
                />
                {errors.point_rate && (
                  <Text style={styles.errorText}>{errors.point_rate.message}</Text>
                )}
              </View>

              {/* Point Value */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Point Value ($)</Text>
                <Controller
                  control={control}
                  name="point_value"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.point_value && styles.inputError]}
                      value={value?.toString() || '0'}
                      onChangeText={(text) => onChange(parseFloat(text) || 0)}
                      onBlur={onBlur}
                      placeholder="0.01"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      testID="card-form-point-value"
                    />
                  )}
                />
                {errors.point_value && (
                  <Text style={styles.errorText}>{errors.point_value.message}</Text>
                )}
              </View>

              {/* Installment Support */}
              <View style={styles.fieldContainer}>
                <View style={styles.switchContainer}>
                  <Text style={styles.label}>Installment Support</Text>
                  <Controller
                    control={control}
                    name="installment_support"
                    render={({ field: { onChange, value } }) => (
                      <Switch
                        value={value === 1}
                        onValueChange={(enabled) => onChange(enabled ? 1 : 0)}
                        trackColor={{ false: '#E5E5E5', true: '#0A84FF' }}
                        thumbColor={value === 1 ? '#FFFFFF' : '#FFFFFF'}
                        testID="card-form-installment-support"
                      />
                    )}
                  />
                </View>
                {errors.installment_support && (
                  <Text style={styles.errorText}>{errors.installment_support.message}</Text>
                )}
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  cancelButton: {
    fontSize: 16,
    color: '#FF3B30',
  },
  saveButton: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonTextDisabled: {
    color: '#999999',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});