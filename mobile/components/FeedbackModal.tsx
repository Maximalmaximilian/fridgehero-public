import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Keyboard,
  Image,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { designTokens } from '../constants/DesignTokens';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  initialType?: FeedbackType;
}

export type FeedbackType = 'general' | 'bug' | 'feature' | 'help';

interface FeedbackCategory {
  id: FeedbackType;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: [string, string];
}

const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  {
    id: 'general',
    title: 'General Feedback',
    subtitle: 'Share your thoughts and suggestions',
    icon: 'chatbubble',
    color: designTokens.colors.heroGreen,
    gradient: [designTokens.colors.heroGreen, '#4ADE80'],
  },
  {
    id: 'bug',
    title: 'Report a Bug',
    subtitle: 'Something not working as expected?',
    icon: 'bug',
    color: designTokens.colors.expiredRed,
    gradient: [designTokens.colors.expiredRed, '#F87171'],
  },
  {
    id: 'feature',
    title: 'Request Feature',
    subtitle: 'Ideas for new features or improvements',
    icon: 'bulb',
    color: designTokens.colors.alertAmber,
    gradient: [designTokens.colors.alertAmber, '#FBBF24'],
  },
  {
    id: 'help',
    title: 'Get Help',
    subtitle: 'Need assistance or have questions?',
    icon: 'help-circle',
    color: '#3B82F6',
    gradient: ['#3B82F6', '#60A5FA'],
  },
];

export default function FeedbackModal({ visible, onClose, initialType }: FeedbackModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(initialType || null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  const selectedCategory = FEEDBACK_CATEGORIES.find(cat => cat.id === selectedType);

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedType(initialType || null);
      setTitle('');
      setDescription('');
      setEmail(user?.email || '');
      setPriority('medium');
      setAttachments([]);
      setShowSuccess(false);
      onClose();
    }
  };

  const handleTypeSelect = (type: FeedbackType) => {
    setSelectedType(type);
    // Scroll to form after selection
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 300, animated: true });
    }, 100);
  };

  const pickImage = async () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            launchCamera();
          } else if (buttonIndex === 2) {
            launchImageLibrary();
          }
        }
      );
    } else {
      Alert.alert(
        'Add Attachment',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: launchCamera },
          { text: 'Choose from Library', onPress: launchImageLibrary },
        ]
      );
    }
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachments(prev => [...prev, result.assets[0].uri]);
    }
  };

  const launchImageLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library permission is required to choose images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachments(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachment = async (uri: string): Promise<string | null> => {
    try {
      const fileName = `feedback-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const { data, error } = await supabase.storage
        .from('feedback-attachments')
        .upload(fileName, {
          uri,
          type: 'image/jpeg',
          name: fileName,
        } as any);

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      return data.path;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const submitFeedback = async () => {
    if (!selectedType || !title.trim() || !description.trim()) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    Keyboard.dismiss();

    try {
      // Upload attachments if any
      const uploadedAttachments: string[] = [];
      for (const attachment of attachments) {
        const uploadedPath = await uploadAttachment(attachment);
        if (uploadedPath) {
          uploadedAttachments.push(uploadedPath);
        }
      }

      // Create feedback record
      const feedbackData = {
        user_id: user?.id,
        type: selectedType,
        title: title.trim(),
        description: description.trim(),
        email: email.trim(),
        priority,
        attachments: uploadedAttachments,
        device_info: {
          platform: Platform.OS,
          version: Platform.Version,
        },
        status: 'open',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('feedback')
        .insert([feedbackData]);

      if (error) {
        throw error;
      }

      setShowSuccess(true);
      
      // Auto-close after showing success
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert(
        'Submission Failed',
        'Unable to submit your feedback. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCategorySelection = () => (
    <View style={styles.categorySection}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
        What would you like to share?
      </Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Choose the type of feedback you'd like to provide
      </Text>
      
      <View style={styles.categoriesContainer}>
        {FEEDBACK_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }
            ]}
            onPress={() => handleTypeSelect(category.id)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={category.gradient}
              style={styles.categoryIconContainer}
            >
              <Ionicons name={category.icon} size={24} color={designTokens.colors.pureWhite} />
            </LinearGradient>
            <View style={styles.categoryContent}>
              <Text style={[styles.categoryTitle, { color: theme.textPrimary }]}>
                {category.title}
              </Text>
              <Text style={[styles.categorySubtitle, { color: theme.textSecondary }]}>
                {category.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFeedbackForm = () => (
    <View style={styles.formSection}>
      {/* Header */}
      <View style={styles.formHeader}>
        <TouchableOpacity 
          onPress={() => setSelectedType(null)}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.formHeaderContent}>
          <View style={[styles.formHeaderIcon, { backgroundColor: selectedCategory?.color }]}>
            <Ionicons 
              name={selectedCategory?.icon || 'chatbubble'} 
              size={20} 
              color={designTokens.colors.pureWhite} 
            />
          </View>
          <View>
            <Text style={[styles.formHeaderTitle, { color: theme.textPrimary }]}>
              {selectedCategory?.title}
            </Text>
            <Text style={[styles.formHeaderSubtitle, { color: theme.textSecondary }]}>
              {selectedCategory?.subtitle}
            </Text>
          </View>
        </View>
      </View>

      {/* Form Fields */}
      <View style={styles.formFields}>
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>
            Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: theme.bgSecondary, 
              borderColor: theme.borderPrimary,
              color: theme.textPrimary 
            }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Brief summary of your feedback"
            placeholderTextColor={theme.textTertiary}
            maxLength={100}
          />
          <Text style={[styles.characterCount, { color: theme.textTertiary }]}>
            {title.length}/100
          </Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.textArea, { 
              backgroundColor: theme.bgSecondary, 
              borderColor: theme.borderPrimary,
              color: theme.textPrimary 
            }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Please provide details about your feedback..."
            placeholderTextColor={theme.textTertiary}
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
          <Text style={[styles.characterCount, { color: theme.textTertiary }]}>
            {description.length}/1000
          </Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>
            Contact Email
          </Text>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: theme.bgSecondary, 
              borderColor: theme.borderPrimary,
              color: theme.textPrimary 
            }]}
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            placeholderTextColor={theme.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {selectedType === 'bug' && (
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>
              Priority
            </Text>
            <View style={styles.priorityContainer}>
              {(['low', 'medium', 'high'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.priorityOption,
                    { borderColor: theme.borderPrimary },
                    priority === level && { 
                      backgroundColor: selectedCategory?.color,
                      borderColor: selectedCategory?.color 
                    }
                  ]}
                  onPress={() => setPriority(level)}
                >
                  <Text style={[
                    styles.priorityText,
                    { color: theme.textPrimary },
                    priority === level && { color: designTokens.colors.pureWhite }
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Attachments */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>
            Attachments (Optional)
          </Text>
          <TouchableOpacity
            style={[styles.attachmentButton, { 
              backgroundColor: theme.bgSecondary, 
              borderColor: theme.borderPrimary 
            }]}
            onPress={pickImage}
          >
            <Ionicons name="camera" size={20} color={theme.textSecondary} />
            <Text style={[styles.attachmentButtonText, { color: theme.textSecondary }]}>
              Add Screenshot or Photo
            </Text>
          </TouchableOpacity>
          
          {attachments.length > 0 && (
            <ScrollView 
              horizontal 
              style={styles.attachmentsPreview}
              showsHorizontalScrollIndicator={false}
            >
              {attachments.map((uri, index) => (
                <View key={index} style={styles.attachmentItem}>
                  <Image source={{ uri }} style={styles.attachmentImage} />
                  <TouchableOpacity
                    style={styles.removeAttachment}
                    onPress={() => removeAttachment(index)}
                  >
                    <Ionicons name="close-circle" size={20} color={designTokens.colors.expiredRed} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );

  const renderSuccessView = () => (
    <View style={styles.successContainer}>
      <View style={[styles.successIcon, { backgroundColor: designTokens.colors.heroGreen }]}>
        <Ionicons name="checkmark" size={40} color={designTokens.colors.pureWhite} />
      </View>
      <Text style={[styles.successTitle, { color: theme.textPrimary }]}>
        Thank You!
      </Text>
      <Text style={[styles.successMessage, { color: theme.textSecondary }]}>
        Your feedback has been submitted successfully. We appreciate you taking the time to help us improve FridgeHero.
      </Text>
      <Text style={[styles.successNote, { color: theme.textTertiary }]}>
        We'll get back to you if we need more information.
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.borderPrimary }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            Feedback
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {showSuccess ? renderSuccessView() : (
            selectedType ? renderFeedbackForm() : renderCategorySelection()
          )}
        </ScrollView>

        {/* Submit Button */}
        {selectedType && !showSuccess && (
          <View style={[styles.footer, { borderTopColor: theme.borderPrimary }]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: selectedCategory?.color },
                isSubmitting && styles.submitButtonDisabled
              ]}
              onPress={submitFeedback}
              disabled={isSubmitting || !title.trim() || !description.trim()}
            >
              {isSubmitting ? (
                <Text style={styles.submitButtonText}>Submitting...</Text>
              ) : (
                <>
                  <Ionicons name="send" size={20} color={designTokens.colors.pureWhite} />
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  categorySection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    lineHeight: 24,
    marginBottom: 32,
  },
  categoriesContainer: {
    gap: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  formSection: {
    flex: 1,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  formHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  formHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  formHeaderSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  formFields: {
    padding: 20,
    gap: 24,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  required: {
    color: designTokens.colors.expiredRed,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter',
    minHeight: 48,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    fontFamily: 'Inter',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    gap: 8,
  },
  attachmentButtonText: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  attachmentsPreview: {
    marginTop: 12,
  },
  attachmentItem: {
    position: 'relative',
    marginRight: 12,
  },
  attachmentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeAttachment: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: designTokens.colors.pureWhite,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    fontFamily: 'Inter',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  successNote: {
    fontSize: 14,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
}); 