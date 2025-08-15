/**
 * CampaignWizard component provides a structured modal interface for creating campaigns.
 * Returns an array of Campaign objects with no free text, using only wizard-driven inputs.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import type { Campaign } from '../domain/types';

/**
 * Props for the CampaignWizard component.
 */
export interface CampaignWizardProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal should be closed */
  onClose: () => void;
  /** Callback when campaigns are applied */
  onApply: (campaigns: Campaign[]) => void;
}

/**
 * Available campaign types for selection.
 */
const CAMPAIGN_TYPES = [
  { key: 'cashback', label: 'Extra Cashback' },
  { key: 'points', label: 'Bonus Points' },
  { key: 'flatDiscount', label: 'Flat Discount' },
  { key: 'installmentBoost', label: 'Extra Installments' },
  { key: 'interestFree', label: 'Interest-Free Period' },
] as const;

/**
 * Available categories for campaign targeting.
 */
const CATEGORIES = [
  'general',
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
 * Available brands/merchants for campaign targeting.
 */
const BRANDS = [
  'general',
  'Amazon',
  'MediaMarkt',
  'Migros',
  'Shell',
  'BP',
  'Starbucks',
  'McDonald\'s',
  'Zara',
  'LC Waikiki',
] as const;

/**
 * Campaign wizard state interface.
 */
interface WizardState {
  // Step 1: Types
  selectedTypes: Array<'cashback' | 'points' | 'flatDiscount' | 'installmentBoost' | 'interestFree'>;
  
  // Step 2: Scope
  category: string;
  channel: 'online' | 'offline' | 'any';
  brand: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  minAmount: string;
  
  // Step 3: Values
  extraCashbackPercent: string;
  extraPointRate: string;
  flatDiscount: string;
  maxInstallments: string;
  interestFreeMonths: string;
  capAmount: string;
  monthlyCap: boolean;
  
  // Step 4: Requirements
  requiresEnrollment: boolean;
  enrolled: boolean;
  requiresCode: boolean;
  codeProvided: boolean;
}

/**
 * Initial wizard state.
 */
const INITIAL_STATE: WizardState = {
  selectedTypes: [],
  category: 'general',
  channel: 'any',
  brand: 'general',
  dateRangeStart: '',
  dateRangeEnd: '',
  minAmount: '',
  extraCashbackPercent: '',
  extraPointRate: '',
  flatDiscount: '',
  maxInstallments: '',
  interestFreeMonths: '',
  capAmount: '',
  monthlyCap: false,
  requiresEnrollment: false,
  enrolled: false,
  requiresCode: false,
  codeProvided: false,
};

/**
 * Campaign wizard modal component.
 */
export function CampaignWizard({ visible, onClose, onApply }: CampaignWizardProps): JSX.Element {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  
  /**
   * Updates wizard state with partial updates.
   */
  const updateState = (updates: Partial<WizardState>): void => {
    setState(prev => ({ ...prev, ...updates }));
  };
  
  /**
   * Toggles a campaign type selection.
   */
  const toggleType = (type: typeof CAMPAIGN_TYPES[number]['key']): void => {
    const types = state.selectedTypes.includes(type)
      ? state.selectedTypes.filter(t => t !== type)
      : [...state.selectedTypes, type];
    updateState({ selectedTypes: types });
  };
  
  /**
   * Validates current step and determines if next is allowed.
   */
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return state.selectedTypes.length > 0;
      case 2:
        // Basic validation - at least category selected
        return true;
      case 3:
        // At least one value should be provided for selected types
        return state.selectedTypes.some(type => {
          switch (type) {
            case 'cashback':
              return state.extraCashbackPercent.trim() !== '';
            case 'points':
              return state.extraPointRate.trim() !== '';
            case 'flatDiscount':
              return state.flatDiscount.trim() !== '';
            case 'installmentBoost':
              return state.maxInstallments.trim() !== '';
            case 'interestFree':
              return state.interestFreeMonths.trim() !== '';
            default:
              return false;
          }
        });
      case 4:
        return true; // Requirements are optional
      default:
        return false;
    }
  };
  
  /**
   * Builds Campaign object from current wizard state.
   */
  const buildCampaign = (): Campaign => {
    const campaign: Campaign = {
      name: `Custom Campaign - ${state.selectedTypes.join(', ')}`,
      types: state.selectedTypes,
    };
    
    // Add scope fields
    if (state.category !== 'general') {
      campaign.category = state.category;
    }
    if (state.channel !== 'any') {
      campaign.channel = state.channel;
    }
    if (state.brand !== 'general') {
      campaign.brand = state.brand;
    }
    if (state.dateRangeStart && state.dateRangeEnd) {
      campaign.dateRange = {
        start: state.dateRangeStart,
        end: state.dateRangeEnd,
      };
    }
    if (state.minAmount) {
      const amount = parseFloat(state.minAmount);
      if (!isNaN(amount) && amount > 0) {
        campaign.minAmount = amount;
      }
    }
    
    // Add value fields
    if (state.extraCashbackPercent) {
      const percent = parseFloat(state.extraCashbackPercent) / 100;
      if (!isNaN(percent) && percent > 0) {
        campaign.extraCashbackPercent = percent;
      }
    }
    if (state.extraPointRate) {
      const rate = parseFloat(state.extraPointRate);
      if (!isNaN(rate) && rate > 0) {
        campaign.extraPointRate = rate;
      }
    }
    if (state.flatDiscount) {
      const discount = parseFloat(state.flatDiscount);
      if (!isNaN(discount) && discount > 0) {
        campaign.flatDiscount = discount;
      }
    }
    if (state.maxInstallments) {
      const installments = parseInt(state.maxInstallments, 10);
      if (!isNaN(installments) && installments > 0) {
        campaign.maxInstallments = installments;
      }
    }
    if (state.interestFreeMonths) {
      const months = parseInt(state.interestFreeMonths, 10);
      if (!isNaN(months) && months > 0) {
        campaign.interestFreeMonths = months;
      }
    }
    if (state.capAmount) {
      const cap = parseFloat(state.capAmount);
      if (!isNaN(cap) && cap > 0) {
        campaign.capAmount = cap;
      }
    }
    if (state.monthlyCap) {
      campaign.monthlyCap = true;
    }
    
    // Add requirement fields
    if (state.requiresEnrollment) {
      campaign.requiresEnrollment = true;
      campaign.enrolled = state.enrolled;
    }
    if (state.requiresCode) {
      campaign.requiresCode = true;
      campaign.codeProvided = state.codeProvided;
    }
    
    return campaign;
  };
  
  /**
   * Handles applying the campaign and closing the wizard.
   */
  const handleApply = (): void => {
    try {
      const campaign = buildCampaign();
      onApply([campaign]);
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create campaign. Please check your inputs.');
    }
  };
  
  /**
   * Resets wizard state and closes modal.
   */
  const handleClose = (): void => {
    setState(INITIAL_STATE);
    setCurrentStep(1);
    onClose();
  };
  
  /**
   * Renders step content based on current step.
   */
  const renderStepContent = (): JSX.Element => {
    switch (currentStep) {
      case 1:
        return renderTypesStep();
      case 2:
        return renderScopeStep();
      case 3:
        return renderValuesStep();
      case 4:
        return renderRequirementsStep();
      case 5:
        return renderSummaryStep();
      default:
        return <View />;
    }
  };
  
  /**
   * Renders campaign types selection step.
   */
  const renderTypesStep = (): JSX.Element => (
    <View>
      <Text style={styles.stepTitle}>Select Campaign Types</Text>
      <Text style={styles.stepDescription}>
        Choose the types of benefits this campaign will provide:
      </Text>
      
      {CAMPAIGN_TYPES.map(type => (
        <TouchableOpacity
          key={type.key}
          style={[
            styles.checkboxRow,
            state.selectedTypes.includes(type.key) && styles.checkboxRowSelected,
          ]}
          onPress={() => toggleType(type.key)}
          testID={`campaign-type-${type.key}`}
        >
          <View style={[
            styles.checkbox,
            state.selectedTypes.includes(type.key) && styles.checkboxSelected,
          ]}>
            {state.selectedTypes.includes(type.key) && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
          <Text style={styles.checkboxLabel}>{type.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  
  /**
   * Renders campaign scope configuration step.
   */
  const renderScopeStep = (): JSX.Element => (
    <View>
      <Text style={styles.stepTitle}>Campaign Scope</Text>
      <Text style={styles.stepDescription}>
        Define where and when this campaign applies:
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Category</Text>
        <View style={styles.pickerContainer}>
          {CATEGORIES.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.pickerOption,
                state.category === category && styles.pickerOptionSelected,
              ]}
              onPress={() => updateState({ category })}
            >
              <Text style={[
                styles.pickerOptionText,
                state.category === category && styles.pickerOptionTextSelected,
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Channel</Text>
        <View style={styles.segmentedControl}>
          {(['any', 'online', 'offline'] as const).map(channel => (
            <TouchableOpacity
              key={channel}
              style={[
                styles.segmentedOption,
                state.channel === channel && styles.segmentedOptionSelected,
              ]}
              onPress={() => updateState({ channel })}
            >
              <Text style={[
                styles.segmentedOptionText,
                state.channel === channel && styles.segmentedOptionTextSelected,
              ]}>
                {channel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Brand/Merchant</Text>
        <View style={styles.pickerContainer}>
          {BRANDS.slice(0, 6).map(brand => ( // Show first 6 brands
            <TouchableOpacity
              key={brand}
              style={[
                styles.pickerOption,
                state.brand === brand && styles.pickerOptionSelected,
              ]}
              onPress={() => updateState({ brand })}
            >
              <Text style={[
                styles.pickerOptionText,
                state.brand === brand && styles.pickerOptionTextSelected,
              ]}>
                {brand}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Date Range (Optional)</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            placeholder="Start (YYYY-MM-DD)"
            placeholderTextColor={styles.placeholder.color}
            value={state.dateRangeStart}
            onChangeText={(text) => updateState({ dateRangeStart: text })}
          />
          <Text style={styles.dateSeparator}>to</Text>
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            placeholder="End (YYYY-MM-DD)"
            placeholderTextColor={styles.placeholder.color}
            value={state.dateRangeEnd}
            onChangeText={(text) => updateState({ dateRangeEnd: text })}
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Minimum Amount (₺)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., 500"
          placeholderTextColor={styles.placeholder.color}
          value={state.minAmount}
          onChangeText={(text) => updateState({ minAmount: text })}
          keyboardType="numeric"
        />
      </View>
    </View>
  );
  
  /**
   * Renders campaign values configuration step.
   */
  const renderValuesStep = (): JSX.Element => (
    <View>
      <Text style={styles.stepTitle}>Campaign Values</Text>
      <Text style={styles.stepDescription}>
        Set the benefit amounts for selected campaign types:
      </Text>
      
      {state.selectedTypes.includes('cashback') && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Extra Cashback (%)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., 2.5"
            placeholderTextColor={styles.placeholder.color}
            value={state.extraCashbackPercent}
            onChangeText={(text) => updateState({ extraCashbackPercent: text })}
            keyboardType="numeric"
          />
        </View>
      )}
      
      {state.selectedTypes.includes('points') && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Extra Points per ₺</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., 3.0"
            placeholderTextColor={styles.placeholder.color}
            value={state.extraPointRate}
            onChangeText={(text) => updateState({ extraPointRate: text })}
            keyboardType="numeric"
          />
        </View>
      )}
      
      {state.selectedTypes.includes('flatDiscount') && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Flat Discount (₺)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., 100"
            placeholderTextColor={styles.placeholder.color}
            value={state.flatDiscount}
            onChangeText={(text) => updateState({ flatDiscount: text })}
            keyboardType="numeric"
          />
        </View>
      )}
      
      {state.selectedTypes.includes('installmentBoost') && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Max Installments</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., 12"
            placeholderTextColor={styles.placeholder.color}
            value={state.maxInstallments}
            onChangeText={(text) => updateState({ maxInstallments: text })}
            keyboardType="numeric"
          />
        </View>
      )}
      
      {state.selectedTypes.includes('interestFree') && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Interest-Free Months</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., 6"
            placeholderTextColor={styles.placeholder.color}
            value={state.interestFreeMonths}
            onChangeText={(text) => updateState({ interestFreeMonths: text })}
            keyboardType="numeric"
          />
        </View>
      )}
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Benefit Cap (₺)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., 500"
          placeholderTextColor={styles.placeholder.color}
          value={state.capAmount}
          onChangeText={(text) => updateState({ capAmount: text })}
          keyboardType="numeric"
        />
      </View>
      
      <TouchableOpacity
        style={[
          styles.checkboxRow,
          state.monthlyCap && styles.checkboxRowSelected,
        ]}
        onPress={() => updateState({ monthlyCap: !state.monthlyCap })}
      >
        <View style={[
          styles.checkbox,
          state.monthlyCap && styles.checkboxSelected,
        ]}>
          {state.monthlyCap && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>
        <Text style={styles.checkboxLabel}>Monthly cap reset</Text>
      </TouchableOpacity>
    </View>
  );
  
  /**
   * Renders campaign requirements configuration step.
   */
  const renderRequirementsStep = (): JSX.Element => (
    <View>
      <Text style={styles.stepTitle}>Requirements</Text>
      <Text style={styles.stepDescription}>
        Configure any enrollment or code requirements:
      </Text>
      
      <TouchableOpacity
        style={[
          styles.checkboxRow,
          state.requiresEnrollment && styles.checkboxRowSelected,
        ]}
        onPress={() => updateState({ requiresEnrollment: !state.requiresEnrollment })}
      >
        <View style={[
          styles.checkbox,
          state.requiresEnrollment && styles.checkboxSelected,
        ]}>
          {state.requiresEnrollment && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>
        <Text style={styles.checkboxLabel}>Requires enrollment</Text>
      </TouchableOpacity>
      
      {state.requiresEnrollment && (
        <View style={styles.subOption}>
          <TouchableOpacity
            style={[
              styles.checkboxRow,
              state.enrolled && styles.checkboxRowSelected,
            ]}
            onPress={() => updateState({ enrolled: !state.enrolled })}
          >
            <View style={[
              styles.checkbox,
              state.enrolled && styles.checkboxSelected,
            ]}>
              {state.enrolled && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={styles.checkboxLabel}>Already enrolled</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity
        style={[
          styles.checkboxRow,
          state.requiresCode && styles.checkboxRowSelected,
        ]}
        onPress={() => updateState({ requiresCode: !state.requiresCode })}
      >
        <View style={[
          styles.checkbox,
          state.requiresCode && styles.checkboxSelected,
        ]}>
          {state.requiresCode && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>
        <Text style={styles.checkboxLabel}>Requires promo code</Text>
      </TouchableOpacity>
      
      {state.requiresCode && (
        <View style={styles.subOption}>
          <TouchableOpacity
            style={[
              styles.checkboxRow,
              state.codeProvided && styles.checkboxRowSelected,
            ]}
            onPress={() => updateState({ codeProvided: !state.codeProvided })}
          >
            <View style={[
              styles.checkbox,
              state.codeProvided && styles.checkboxSelected,
            ]}>
              {state.codeProvided && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={styles.checkboxLabel}>Code provided</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
  
  /**
   * Renders campaign summary step.
   */
  const renderSummaryStep = (): JSX.Element => {
    const campaign = buildCampaign();
    
    return (
      <View>
        <Text style={styles.stepTitle}>Campaign Summary</Text>
        <Text style={styles.stepDescription}>
          Review your campaign configuration:
        </Text>
        
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>{campaign.name}</Text>
          
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>Types:</Text>
            <Text style={styles.summarySectionText}>
              {state.selectedTypes.join(', ')}
            </Text>
          </View>
          
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>Scope:</Text>
            <Text style={styles.summarySectionText}>
              {campaign.category || 'general'} • {campaign.channel || 'any'} • {campaign.brand || 'general'}
            </Text>
          </View>
          
          {(campaign.extraCashbackPercent || campaign.extraPointRate || campaign.flatDiscount) && (
            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Benefits:</Text>
              <View>
                {campaign.extraCashbackPercent && (
                  <Text style={styles.summarySectionText}>
                    +{(campaign.extraCashbackPercent * 100).toFixed(1)}% cashback
                  </Text>
                )}
                {campaign.extraPointRate && (
                  <Text style={styles.summarySectionText}>
                    +{campaign.extraPointRate} points per ₺
                  </Text>
                )}
                {campaign.flatDiscount && (
                  <Text style={styles.summarySectionText}>
                    ₺{campaign.flatDiscount} flat discount
                  </Text>
                )}
              </View>
            </View>
          )}
          
          {(campaign.requiresEnrollment || campaign.requiresCode) && (
            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Requirements:</Text>
              <View>
                {campaign.requiresEnrollment && (
                  <Text style={styles.summarySectionText}>
                    Enrollment {campaign.enrolled ? '✓' : '✗'}
                  </Text>
                )}
                {campaign.requiresCode && (
                  <Text style={styles.summarySectionText}>
                    Promo code {campaign.codeProvided ? '✓' : '✗'}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} testID="campaign-wizard-close">
            <Text style={styles.headerButton}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            Campaign Wizard ({currentStep}/5)
          </Text>
          
          <TouchableOpacity 
            onPress={currentStep === 5 ? handleApply : () => setCurrentStep(currentStep + 1)}
            disabled={!canProceed()}
            testID={currentStep === 5 ? "campaign-wizard-apply" : "campaign-wizard-next"}
          >
            <Text style={[
              styles.headerButton,
              styles.primaryButton,
              !canProceed() && styles.disabledButton,
            ]}>
              {currentStep === 5 ? 'Apply' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4, 5].map(step => (
            <View
              key={step}
              style={[
                styles.progressDot,
                step <= currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
        
        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          {renderStepContent()}
        </ScrollView>
        
        {/* Navigation */}
        {currentStep > 1 && (
          <View style={styles.navigation}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(currentStep - 1)}
              testID="campaign-wizard-back"
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
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
    placeholder: isDark ? '#8E8E93' : '#C7C7CC',
  };
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerButton: {
      fontSize: 17,
      color: colors.accent,
      minWidth: 60,
    },
    primaryButton: {
      fontWeight: '600',
    },
    disabledButton: {
      opacity: 0.3,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    progressDotActive: {
      backgroundColor: colors.accent,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
    },
    stepTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    stepDescription: {
      fontSize: 16,
      color: colors.secondaryText,
      marginBottom: 24,
      lineHeight: 22,
    },
    inputGroup: {
      marginBottom: 20,
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
    placeholder: {
      color: colors.placeholder,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 8,
    },
    checkboxRowSelected: {
      backgroundColor: colors.surface,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    checkmark: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    checkboxLabel: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
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
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dateSeparator: {
      fontSize: 16,
      color: colors.secondaryText,
    },
    subOption: {
      marginLeft: 36,
      marginTop: 8,
    },
    summaryContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    summarySection: {
      marginBottom: 12,
    },
    summarySectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.secondaryText,
      marginBottom: 4,
    },
    summarySectionText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 20,
    },
    navigation: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    backButton: {
      alignSelf: 'flex-start',
    },
    backButtonText: {
      fontSize: 17,
      color: colors.accent,
    },
  });
}