import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { designTokens } from '../constants/DesignTokens';

interface ProfileAvatarProps {
  size?: number;
  onPress?: () => void;
  style?: any;
  isPremium?: boolean;
  showPremiumRing?: boolean;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

export default function ProfileAvatar({ 
  size = 44, 
  onPress, 
  style, 
  isPremium = false,
  showPremiumRing = true 
}: ProfileAvatarProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        console.log('Profile fetched:', data);
        console.log('Raw Avatar URL:', data?.avatar_url);
        
        // Validate and potentially fix the avatar URL
        if (data?.avatar_url) {
          const validatedUrl = validateAvatarUrl(data.avatar_url);
          console.log('Validated Avatar URL:', validatedUrl);
          
          // If the URL was fixed, update it in the database
          if (validatedUrl !== data.avatar_url) {
            console.log('Fixing broken avatar URL in database...');
            await updateAvatarUrl(validatedUrl);
          }
          
          setProfile({
            ...data,
            avatar_url: validatedUrl
          });
        } else {
          setProfile(data);
        }
        
        setImageError(false); // Reset error state when profile loads
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateAvatarUrl = (url: string): string => {
    // Check for double "avatars/" and fix it
    if (url.includes('/avatars/avatars/')) {
      console.log('Found double avatars path, fixing...');
      return url.replace('/avatars/avatars/', '/avatars/');
    }
    
    // Ensure URL is properly formatted
    if (!url.startsWith('http')) {
      console.log('Avatar URL missing protocol, this might cause issues:', url);
    }
    
    return url;
  };

  const updateAvatarUrl = async (fixedUrl: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: fixedUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) {
        console.error('Error updating fixed avatar URL:', error);
      } else {
        console.log('Successfully updated avatar URL in database');
      }
    } catch (error) {
      console.error('Error updating avatar URL:', error);
    }
  };

  const handleImageError = (error: any) => {
    console.log('Profile image failed to load:', error?.nativeEvent);
    console.log('Failed URL was:', profile?.avatar_url);
    setImageError(true);
  };

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const premiumRingSize = size + 6;
  const premiumRingStyle = {
    width: premiumRingSize,
    height: premiumRingSize,
    borderRadius: premiumRingSize / 2,
  };

  const renderAvatar = () => (
    <View style={[styles.avatarContainer, avatarStyle]}>
      {profile?.avatar_url && !imageError ? (
        <Image 
          source={{ uri: profile.avatar_url }} 
          style={[styles.avatarImage, avatarStyle]}
          onError={handleImageError}
          onLoadStart={() => console.log('Profile image loading from:', profile.avatar_url)}
          onLoad={() => console.log('Profile image loaded successfully!')}
        />
      ) : (
        <View style={[styles.defaultAvatar, avatarStyle]}>
          <Ionicons 
            name="person" 
            size={size * 0.55} 
            color={designTokens.colors.heroGreen} 
          />
        </View>
      )}
    </View>
  );

  if (isPremium && showPremiumRing) {
    return (
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[
            '#FFD700', // Gold
            '#FFA500', // Orange Gold
            '#FF8C00', // Dark Orange
            '#FFD700', // Gold (completing the circle)
          ]}
          style={[styles.premiumRing, premiumRingStyle]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.premiumRingInner, avatarStyle]}>
            {renderAvatar()}
          </View>
        </LinearGradient>
        
        {/* Premium crown badge */}
        <View style={[styles.premiumBadge, { top: -4, right: -4 }]}>
          <LinearGradient
            colors={[designTokens.colors.amber[400], designTokens.colors.amber[600]]}
            style={styles.premiumBadgeGradient}
          >
            <Ionicons name="star" size={12} color={designTokens.colors.pureWhite} />
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, avatarStyle, style]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      {renderAvatar()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  avatarContainer: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  avatarImage: {
    resizeMode: 'cover',
  },
  defaultAvatar: {
    backgroundColor: designTokens.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumRing: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  premiumRingInner: {
    backgroundColor: designTokens.colors.pureWhite,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  premiumBadge: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: designTokens.colors.amber[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  premiumBadgeGradient: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
}); 