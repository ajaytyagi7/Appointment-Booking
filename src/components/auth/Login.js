import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Image,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

const BASE_URL = 'https://backendsalon.pragyacode.com';

export default function Login() {
  const navigation = useNavigation();
  const route = useRoute();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mobileError, setMobileError] = useState(''); // New state for mobile validation error
  
  // Forgot/reset states
  const [modalVisible, setModalVisible] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  // Mobile OTP states
  const [isMobileOtpSent, setIsMobileOtpSent] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }

      if (route.params?.email && route.params?.password) {
        // No longer needed since email login is removed
      }
    };
    checkAuthStatus();
  }, [route.params, navigation]);

  // Handle mobile input - only digits, max 10, real-time validation
  const handleMobileChange = (text) => {
    // Remove any non-digit characters
    const numericValue = text.replace(/[^0-9]/g, '');
    setMobile(numericValue);

    // Validation feedback
    if (numericValue.length > 0 && numericValue.length < 10) {
      setMobileError('Please enter a valid 10-digit mobile number');
    } else if (numericValue.length > 10) {
      setMobileError('Mobile number cannot exceed 10 digits');
    } else {
      setMobileError('');
    }
  };

  // Mobile OTP login - Send OTP via WhatsApp
  const handleSendMobileOtp = async () => {
    if (!mobile) {
      Alert.alert('Notice', 'Please enter your mobile number');
      return;
    }
    if (mobile.length !== 10) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/customer-app/send-mobile-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });

      // Always try to parse JSON safely
      let data;
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        data = {};
      }

      if (response.ok) {
        setIsMobileOtpSent(true);
        Alert.alert('Success', 'OTP sent via WhatsApp 📱');
      } else {
        // Show user-friendly message instead of raw error
        const errorMsg = data.error || data.message || 'Unable to send OTP. Please try again later.';
        Alert.alert('Notice', errorMsg);
      }
    } catch (error) {
      // Network or unexpected error - show clean message
      Alert.alert('Notice', 'Something went wrong. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mobile OTP login - Verify OTP
  const handleVerifyMobileOtp = async () => {
    if (!otp) {
      Alert.alert('Notice', 'Please enter the OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/customer-app/verify-mobile-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp }),
      });

      let data;
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        data = {};
      }

      if (response.ok) {
        const token = data.token;
        const customerId = String(data.customer?.customerId);

        if (!token || !customerId) {
          Alert.alert('Login Failed', 'Invalid response from server. Please try again.');
          return;
        }

        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('customerId', customerId);
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else {
        // Clean user-friendly error messages
        const errorMsg = data.error || data.message || 'Invalid or expired OTP. Please request a new one.';
        if (errorMsg.toLowerCase().includes('not found') || errorMsg.toLowerCase().includes('user')) {
          Alert.alert('Account Not Found', 'This mobile number is not registered. Please sign up first.');
        } else {
          Alert.alert('Invalid OTP', errorMsg);
        }
      }
    } catch (error) {
      Alert.alert('Notice', 'Failed to verify OTP. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetModalState = () => {
    setForgotPasswordEmail('');
    setForgotPasswordOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setIsOtpSent(false);
    setIsOtpVerified(false);
    setResetToken('');
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      Alert.alert('Notice', 'Please enter your email address');
      return;
    }

    setModalLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/customer-app/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      let data;
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        data = {};
      }

      if (response.ok) {
        setIsOtpSent(true);
        Alert.alert('Success', 'OTP sent to your email');
      } else {
        const errorMsg = data.error || data.message || 'Failed to send OTP';
        if (errorMsg.toLowerCase().includes('not found')) {
          Alert.alert('Email Not Found', 'No account found with this email address.');
        } else {
          Alert.alert('Notice', errorMsg);
        }
      }
    } catch (error) {
      Alert.alert('Notice', 'Something went wrong. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!forgotPasswordOtp) {
      Alert.alert('Notice', 'Please enter the OTP');
      return;
    }

    setModalLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/customer-app/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail, otp: forgotPasswordOtp }),
      });

      let data;
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        data = {};
      }

      if (response.ok) {
        if (!data.resetToken) {
          Alert.alert('Error', 'Invalid response. Please try again.');
          return;
        }
        setResetToken(data.resetToken);
        setIsOtpVerified(true);
        Alert.alert('Success', 'OTP verified successfully');
      } else {
        const errorMsg = data.error || data.message || 'Invalid or expired OTP';
        Alert.alert('Invalid OTP', errorMsg);
      }
    } catch (error) {
      Alert.alert('Notice', 'Failed to verify OTP. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      Alert.alert('Notice', 'Please enter and confirm your new password');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Notice', 'Passwords do not match');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      Alert.alert(
        'Notice',
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
      );
      return;
    }

    if (!resetToken) {
      Alert.alert('Notice', 'Session expired. Please request a new OTP.');
      return;
    }

    setModalLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/customer-app/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotPasswordEmail,
          resetToken,
          newPassword,
          confirmNewPassword,
        }),
      });

      let data;
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        data = {};
      }

      if (response.ok) {
        Alert.alert('Success', 'Password reset successfully');
        setModalVisible(false);
        resetModalState();
      } else {
        const errorMsg = data.error || data.message || 'Failed to reset password';
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      Alert.alert('Notice', 'Failed to reset password. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#A16EFF" />
      <LinearGradient colors={['#A16EFF', '#dca5f1ff']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/salonlogo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.headerSubtitle}>Book Your Appointment</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.loginTitle}>Login</Text>
          <Text style={styles.loginSubtitle}>Login to continue</Text>

          {/* Mobile Login Form - WhatsApp OTP Only */}
          {!isMobileOtpSent ? (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={mobile}
                  onChangeText={handleMobileChange}
                  placeholder="Mobile Number (WhatsApp)"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={10}
                />
                {mobileError ? (
                  <Text style={styles.errorText}>{mobileError}</Text>
                ) : null}
              </View>
              <Text style={{ fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 15 }}>
                OTP will be sent via WhatsApp
              </Text>
              {isLoading ? (
                <ActivityIndicator size="large" color="#A16EFF" style={{ marginTop: 20 }} />
              ) : (
                <TouchableOpacity style={styles.loginButton} onPress={handleSendMobileOtp}>
                  <Text style={styles.buttonText}>Send OTP on WhatsApp</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter OTP"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
              <Text style={{ fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 10 }}>
                Check your WhatsApp for the OTP
              </Text>
              {isLoading ? (
                <ActivityIndicator size="large" color="#A16EFF" style={{ marginTop: 20 }} />
              ) : (
                <TouchableOpacity style={styles.loginButton} onPress={handleVerifyMobileOtp}>
                  <Text style={styles.buttonText}>Verify OTP</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{ marginTop: 10 }}
                onPress={handleSendMobileOtp}
                disabled={isLoading}
              >
                <Text style={styles.forgotText}>Resend OTP on WhatsApp</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={{ marginTop: 15 }} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.signUpText}>
              Don’t have an account?{' '}
              <Text style={{ color: '#A16EFF', fontWeight: 'bold' }}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          resetModalState();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isOtpVerified ? 'Reset Password' : isOtpSent ? 'Enter OTP' : 'Forgot Password'}
            </Text>

            {!isOtpSent && !isOtpVerified && (
              <>
                <Text style={styles.modalSubtitle}>Enter your email to receive an OTP</Text>
                <TextInput
                  style={styles.modalInput}
                  value={forgotPasswordEmail}
                  onChangeText={setForgotPasswordEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.modalButton} onPress={handleForgotPassword} disabled={modalLoading}>
                  {modalLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalButtonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {isOtpSent && !isOtpVerified && (
              <>
                <Text style={styles.modalSubtitle}>Enter the OTP sent to {forgotPasswordEmail}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={forgotPasswordOtp}
                  onChangeText={setForgotPasswordOtp}
                  placeholder="Enter OTP"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.modalButton} onPress={handleVerifyOtp} disabled={modalLoading}>
                  {modalLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalButtonText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { marginTop: 8 }]}
                  onPress={handleForgotPassword}
                  disabled={modalLoading}
                >
                  <Text style={styles.modalCancelText}>Resend OTP</Text>
                </TouchableOpacity>
              </>
            )}

            {isOtpVerified && (
              <>
                <Text style={styles.modalSubtitle}>Enter your new password</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.resetModleInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New Password"
                    placeholderTextColor="#999"
                    secureTextEntry={true}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.resetModleInput}
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#999"
                    secureTextEntry={true}
                  />
                </View>
                <TouchableOpacity style={styles.modalButton} onPress={handleResetPassword} disabled={modalLoading}>
                  {modalLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalButtonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setModalVisible(false);
                resetModalState();
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 350,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 170,
    height: 170,
    backgroundColor: '#fff',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 140,
    height: 140,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    marginTop: -40,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 40,
    paddingBottom: 20,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#F2F2F2',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#A16EFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  forgotText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#F2F2F2',
    padding: 18,
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
    width: '100%',
    marginBottom: 15,
  },
  resetModleInput: {
    backgroundColor: '#F2F2F2',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
    width: '100%',
    marginBottom: 15,
    height: 50,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#A16EFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  modalButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalCancelButton: {
    marginTop: 10,
  },
  modalCancelText: {
    fontSize: 14,
    color: '#A16EFF',
    fontWeight: 'bold',
  },
});