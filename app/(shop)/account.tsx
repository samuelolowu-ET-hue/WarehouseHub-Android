import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '../../src/providers/AuthProvider';
import { supabase } from '../../src/lib/supabase/client';
import { formatDate } from '../../src/lib/format';
import { displayError } from '../../src/lib/errors';
import {
  Button,
  InlineMessage,
  LoadingState,
  TextField,
} from '../../src/components/ui';
import { colors, font, radius, shadow, spacing } from '../../src/theme';

type Profile = {
  id: string;
  email: string;
  fullName: string;
  createdAt: string | null;
};

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const user = session?.user;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullNameInput, setFullNameInput] = useState('');
  const [loading, setLoading] = useState(Boolean(user));
  const [updating, setUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    tone: 'error' | 'success';
    text: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, created_at')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          if (active) {
            // Fallback to auth metadata if user_profiles row isn't synced yet
            const fallback: Profile = {
              id: user.id,
              email: user.email ?? '',
              fullName: (user.user_metadata?.full_name as string) ?? '',
              createdAt: user.created_at ?? null,
            };
            setProfile(fallback);
            setFullNameInput(fallback.fullName);
          }
          return;
        }

        if (active && data) {
          const loaded: Profile = {
            id: data.id,
            email: data.email,
            fullName: data.full_name,
            createdAt: data.created_at,
          };
          setProfile(loaded);
          setFullNameInput(loaded.fullName);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  async function handleUpdateProfile() {
    if (!user) return;
    setStatusMessage(null);

    const trimmed = fullNameInput.trim();
    if (!trimmed) {
      setStatusMessage({ tone: 'error', text: 'Full name cannot be blank.' });
      return;
    }

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: trimmed })
        .eq('id', user.id);

      if (error) {
        setStatusMessage({
          tone: 'error',
          text: displayError(error, 'Could not update profile.'),
        });
        return;
      }

      setProfile((prev) => (prev ? { ...prev, fullName: trimmed } : null));
      setStatusMessage({
        tone: 'success',
        text: 'Profile updated successfully!',
      });
    } catch (err) {
      setStatusMessage({
        tone: 'error',
        text: displayError(err, 'Network error updating profile.'),
      });
    } finally {
      setUpdating(false);
    }
  }

  function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your WarehouseHub account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(shop)/home');
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={styles.navHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to store"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>My Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <LoadingState message="Loading account details…" />
        ) : !session ? (
          /* Guest View */
          <View style={styles.guestContainer}>
            <View style={styles.guestIconCircle}>
              <Ionicons name="person-circle-outline" size={64} color={colors.inkSoft} />
            </View>

            <Text style={styles.guestTitle}>Sign in to WarehouseHub</Text>
            <Text style={styles.guestSubtitle}>
              Access your order history, track deliveries, view saved addresses, and enjoy faster checkout.
            </Text>

            <View style={styles.guestActions}>
              <Button
                label="Sign In"
                onPress={() => router.push('/(auth)/login')}
                variant="primary"
              />
              <Button
                label="Create Account"
                onPress={() => router.push('/(auth)/register')}
                variant="secondary"
              />
            </View>
          </View>
        ) : (
          /* Authenticated User View */
          <>
            {/* User Profile Card */}
            <View style={styles.profileHeaderCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>
                  {profile?.fullName
                    ? profile.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()
                    : 'WH'}
                </Text>
              </View>
              <View style={styles.profileHeaderInfo}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {profile?.fullName || 'WarehouseHub Customer'}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {profile?.email || user?.email}
                </Text>
                {profile?.createdAt ? (
                  <Text style={styles.profileJoined}>
                    Member since {formatDate(profile.createdAt)}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Quick Links Menu */}
            <View style={styles.menuCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View order history"
                onPress={() => router.push('/(shop)/orders')}
                style={styles.menuRow}
              >
                <View style={styles.menuIconCircle}>
                  <Ionicons name="receipt-outline" size={20} color={colors.ink} />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuTitle}>My Orders</Text>
                  <Text style={styles.menuSubtitle}>View past orders and tracking</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.steel} />
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View shopping basket"
                onPress={() => router.push('/(shop)/cart')}
                style={styles.menuRow}
              >
                <View style={styles.menuIconCircle}>
                  <Ionicons name="cart-outline" size={20} color={colors.ink} />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuTitle}>Shopping Basket</Text>
                  <Text style={styles.menuSubtitle}>Manage saved items</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.steel} />
              </Pressable>
            </View>

            {/* Edit Profile Form */}
            <View style={styles.editCard}>
              <Text style={styles.sectionHeading}>Personal Details</Text>

              {statusMessage ? (
                <InlineMessage
                  tone={statusMessage.tone}
                  message={statusMessage.text}
                />
              ) : null}

              <TextField
                label="Full name"
                value={fullNameInput}
                onChangeText={setFullNameInput}
                placeholder="Your full name"
                autoCapitalize="words"
              />

              <TextField
                label="Email address"
                value={profile?.email || user?.email || ''}
                editable={false}
                hint="Contact support to change your account email."
              />

              <Button
                label="Save Changes"
                onPress={handleUpdateProfile}
                loading={updating}
                variant="secondary"
                disabled={fullNameInput.trim() === profile?.fullName}
              />
            </View>

            {/* Sign Out Button */}
            <View style={styles.signOutWrap}>
              <Button
                label="Sign Out"
                onPress={handleSignOut}
                variant="danger"
                icon={<Ionicons name="log-out-outline" size={18} color={colors.danger} />}
              />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneSoft,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: font.title,
    fontWeight: '800',
    color: colors.ink,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  guestContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  guestIconCircle: {
    marginBottom: spacing.lg,
  },
  guestTitle: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  guestSubtitle: {
    fontSize: font.body,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
    maxWidth: 320,
  },
  guestActions: {
    width: '100%',
    gap: spacing.md,
  },
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.stone,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  profileHeaderInfo: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  profileName: {
    fontSize: font.title,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: font.body,
    color: colors.muted,
    marginBottom: 4,
  },
  profileJoined: {
    fontSize: font.caption,
    color: colors.steel,
    fontWeight: '500',
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.stone,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.stoneSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: font.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  menuSubtitle: {
    fontSize: font.caption,
    color: colors.muted,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.stoneSoft,
    marginHorizontal: spacing.lg,
  },
  editCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.stone,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    ...shadow.card,
  },
  sectionHeading: {
    fontSize: font.title,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  signOutWrap: {
    marginTop: spacing.sm,
  },
});
