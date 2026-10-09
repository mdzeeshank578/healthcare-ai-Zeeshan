import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { auth, AuthApiError } from '@/lib/auth';
import { getAccessToken, getRefreshToken } from '@/lib/token-storage';

type Toast = { type: 'success' | 'error'; message: string };

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const isSmallDevice = height < 700 || width < 360;

  useEffect(() => {
    let isMounted = true;
    async function checkExistingSession() {
      try {
        const [accessToken, refreshToken] = await Promise.all([
          getAccessToken(),
          getRefreshToken(),
        ]);
        if (accessToken || refreshToken) {
          const profile = await auth.getAshaProfile().catch(async () => {
            const fresh = await auth.refreshSession();
            if (fresh) {
              return auth.getAshaProfile().catch(() => null);
            }
            return null;
          });
          if (profile?.data?.id && isMounted) {
            router.replace('/dashboard');
          }
        }
      } catch {}
    }
    void checkExistingSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isOtpValid = otpRequested && /^\d{6}$/.test(otp);

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const handleGenerateOtp = async () => {
    if (!isEmailValid) {
      showToast('error', 'Enter a valid email address to receive a verification code.');
      return;
    }

    setIsRequestingOtp(true);
    try {
      const response = await auth.requestOtp(email.trim().toLowerCase());
      setOtpRequested(true);
      setOtp('');
      showToast('success', response.message || 'Verification code sent. Please check your email.');
    } catch (error) {
      showToast('error', error instanceof AuthApiError ? error.message : 'We could not send a verification code. Please try again.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setOtpRequested(false);
    setOtp('');
  };

  const handleLogin = async () => {
    if (!isEmailValid || !isOtpValid) {
      showToast('error', 'Request a code, then enter the six-digit code from your email.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await auth.verifyOtp(email.trim().toLowerCase(), otp);
      if (response.data.user.role !== 'ASHA_WORKER') {
        showToast('error', 'This account is not enabled for ASHA Worker access.');
        return;
      }
      await auth.saveTokens(response.data.accessToken, response.data.refreshToken);
      showToast('success', 'Welcome back! You are signed in.');
      setTimeout(() => router.replace('/dashboard'), 700);
    } catch (error) {
      showToast('error', error instanceof AuthApiError ? error.message : 'We could not sign you in. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isSmallDevice && styles.scrollContentSmall,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Back */}
          <View style={styles.logoSection}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
              accessibilityLabel="Back"
            >
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>

            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>
                +
              </Text>
            </View>

            <Text style={styles.logoText}>
              HealthCare AI
            </Text>
          </View>

          {/* Heading */}
          <View style={[styles.headingSection, isSmallDevice && styles.headingSectionSmall]}>
            <Text style={[styles.title, isSmallDevice && { fontSize: 26 }]}>
              Welcome Back
            </Text>

            <Text style={[styles.subtitle, isSmallDevice && { fontSize: 13, marginTop: 4 }]}>
              Login to continue to your Healthcare AI dashboard
            </Text>
          </View>

          {/* Login Card */}
          <View style={[styles.card, isSmallDevice && styles.cardSmall]}>
            {/* Gmail */}
            <Text style={styles.label}>
              Gmail
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your Gmail address"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={handleEmailChange}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.generateOtpButton,
                (!isEmailValid || isRequestingOtp) && styles.generateOtpButtonDisabled,
              ]}
              activeOpacity={0.8}
              onPress={() => void handleGenerateOtp()}
              disabled={!isEmailValid || isRequestingOtp}
            >
              <Text style={styles.generateOtpButtonText}>
                {isRequestingOtp ? 'Sending…' : otpRequested ? 'Resend OTP' : 'Send OTP'}
              </Text>
            </TouchableOpacity>

            {/* One-time password */}
            <Text style={[styles.label, styles.passwordLabel]}>
              OTP
            </Text>

            <TextInput
              style={styles.passwordInput}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              value={otp}
              onChangeText={setOtp}
            />

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (
                  !isEmailValid ||
                  !isOtpValid ||
                  isLoggingIn
                ) && styles.loginButtonDisabled,
              ]}
              activeOpacity={0.8}
              onPress={() => void handleLogin()}
              disabled={!isEmailValid || !isOtpValid || isLoggingIn}
            >
              <Text style={styles.loginButtonText}>
                {isLoggingIn ? 'Signing in…' : 'Login'}
              </Text>

              <Text style={styles.arrow}>
                →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Information */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>
              🩺 ASHA Worker Access
            </Text>

            <Text style={styles.infoText}>
              This application is designed to help ASHA workers
              manage patients and access AI-powered health insights.
            </Text>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            Empowering healthcare. Improving lives.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      {toast ? (
        <View style={[
          styles.toast,
          toast.type === 'success' ? styles.toastSuccess : styles.toastError,
          { bottom: Math.max(24, insets.bottom + 12) },
        ]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 25,
  },

  scrollContentSmall: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },

  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  backArrow: {
    fontSize: 28,
    color: '#16323A',
    marginTop: -2,
  },

  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0B8F87',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  logoIcon: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
  },

  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16323A',
  },

  headingSection: {
    marginTop: 40,
    marginBottom: 24,
  },

  headingSectionSmall: {
    marginTop: 18,
    marginBottom: 16,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#16323A',
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
    marginTop: 8,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,

    elevation: 3,
  },

  cardSmall: {
    padding: 16,
    borderRadius: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16323A',
    marginBottom: 8,
  },

  inputContainer: {
    height: 54,
    borderWidth: 1,
    borderColor: '#DCE5E8',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: '#16323A',
  },

  generateOtpButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#E9F7F5',
  },

  generateOtpButtonDisabled: {
    opacity: 0.5,
  },

  generateOtpButtonText: {
    color: '#0B6F69',
    fontSize: 13,
    fontWeight: '700',
  },

  passwordLabel: {
    marginTop: 20,
  },

  passwordInput: {
    height: 54,
    borderWidth: 1,
    borderColor: '#DCE5E8',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#16323A',
  },

  loginButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#0B8F87',
    marginTop: 24,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#0B8F87',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 7,

    elevation: 3,
  },

  loginButtonDisabled: {
    opacity: 0.5,
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  arrow: {
    color: '#FFFFFF',
    fontSize: 23,
    marginLeft: 12,
  },

  infoBox: {
    backgroundColor: '#E9F7F5',
    borderRadius: 15,
    padding: 16,
    marginTop: 22,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B6F69',
    marginBottom: 6,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#557477',
  },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 22,
  },

  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
  },

  toastSuccess: { backgroundColor: '#166534' },
  toastError: { backgroundColor: '#B91C1C' },
  toastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
