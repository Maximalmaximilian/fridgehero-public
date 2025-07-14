import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useInvitations } from '../contexts/InvitationContext';
import { designTokens } from '../constants/DesignTokens';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface InvitationPopupProps {
  visible: boolean;
  onClose: () => void;
  invitation?: {
    id: string;
    household: { name: string };
    inviter_profile: { full_name: string; username: string };
    message?: string;
    created_at: string;
  };
}

export default function InvitationPopup({ visible, onClose, invitation }: InvitationPopupProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(screenHeight));
  const [processing, setProcessing] = useState(false);
  
  const { theme } = useTheme();
  const { acceptInvitation, declineInvitation } = useInvitations();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: screenHeight * 0.3,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: screenHeight,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleAccept = async () => {
    if (!invitation || processing) return;
    
    setProcessing(true);
    const success = await acceptInvitation(invitation.id);
    if (success) {
      onClose();
    }
    setProcessing(false);
  };

  const handleDecline = async () => {
    if (!invitation || processing) return;
    
    setProcessing(true);
    const success = await declineInvitation(invitation.id);
    if (success) {
      onClose();
    }
    setProcessing(false);
  };

  if (!invitation) return null;

  const inviterName = invitation.inviter_profile.full_name || invitation.inviter_profile.username || 'Someone';
  const timeAgo = Math.floor((new Date().getTime() - new Date(invitation.created_at).getTime()) / (1000 * 60));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouch}
          onPress={onClose}
          activeOpacity={1}
        />
        
        <Animated.View
          style={[
            styles.popupContainer,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
            style={styles.popup}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="home" size={28} color={designTokens.colors.pureWhite} />
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={designTokens.colors.pureWhite} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>New Household Invitation! 🏠</Text>
              <Text style={styles.subtitle}>
                <Text style={styles.inviterName}>{inviterName}</Text> invited you to join
              </Text>
              <Text style={styles.householdName}>"{invitation.household.name}"</Text>
              
              {invitation.message && (
                <View style={styles.messageContainer}>
                  <Text style={styles.messageLabel}>Message:</Text>
                  <Text style={styles.messageText}>"{invitation.message}"</Text>
                </View>
              )}

              <Text style={styles.timeText}>
                {timeAgo < 1 ? 'Just now' : timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={handleDecline}
                disabled={processing}
              >
                <Ionicons name="close" size={20} color={designTokens.colors.pureWhite} />
                <Text style={styles.actionButtonText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAccept}
                disabled={processing}
              >
                <Ionicons name="checkmark" size={20} color={designTokens.colors.heroGreen} />
                <Text style={[styles.actionButtonText, { color: designTokens.colors.heroGreen }]}>
                  Accept
                </Text>
              </TouchableOpacity>
            </View>

            {/* Pulse Animation */}
            <View style={styles.pulseContainer}>
              <View style={[styles.pulse, styles.pulse1]} />
              <View style={[styles.pulse, styles.pulse2]} />
              <View style={[styles.pulse, styles.pulse3]} />
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  popupContainer: {
    width: screenWidth * 0.9,
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  popup: {
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 4,
  },
  inviterName: {
    fontWeight: '600',
  },
  householdName: {
    fontSize: 20,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 16,
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    opacity: 0.8,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  timeText: {
    fontSize: 12,
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  declineButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  acceptButton: {
    backgroundColor: designTokens.colors.pureWhite,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  pulseContainer: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 100,
    height: 100,
  },
  pulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pulse1: {
    transform: [{ scale: 1 }],
  },
  pulse2: {
    transform: [{ scale: 1.5 }],
    opacity: 0.6,
  },
  pulse3: {
    transform: [{ scale: 2 }],
    opacity: 0.3,
  },
}); 