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
import { Eye, EyeOff } from 'lucide-react-native';

const BASE_URL = 'http://172.24.57.37:8005';

export default function Login() {
  const navigation = useNavigation();
  const route = useRoute();
  const [activeTab, setActiveTab] = useState('email'); // 'email' or 'mobile'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
        setEmail(route.params.email);
        setPassword(route.params.password);
      }
    };
    checkAuthStatus();
  }, [route.params, navigation]);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/customer-app/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        const token = data.token;
        const customerId = String(data.customer?.customerId);

        if (!token || !customerId) {
          throw new Error('Missing token or customerId in response');
        }

        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('customerId', customerId);
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mobile OTP login - Send OTP
  const handleSendMobileOtp = async () => {
    if (!mobile) {
      Alert.alert('Error', 'Please enter your mobile number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/customer-app/send-mobile-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });

      const data = await response.json();
      if (response.ok) {
        setIsMobileOtpSent(true);
        Alert.alert('Success', 'OTP sent to your mobile number');
      } else {
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mobile OTP login - Verify OTP
  const handleVerifyMobileOtp = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/customer-app/verify-mobile-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp }),
      });

      const data = await response.json();
      if (response.ok) {
        const token = data.token;
        const customerId = String(data.customer?.customerId);

        if (!token || !customerId) {
          throw new Error('Missing token or customerId in response');
        }

        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('customerId', customerId);
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else {
        throw new Error(data.error || 'Invalid or expired OTP');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to verify OTP. Please try again.');
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
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setModalLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/customer-app/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();
      if (response.ok) {
        setIsOtpSent(true);
        Alert.alert('Success', 'OTP sent to your email');
      } else {
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!forgotPasswordOtp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setModalLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/customer-app/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail, otp: forgotPasswordOtp }),
      });

      const data = await response.json();
      if (response.ok) {
        if (!data.resetToken) {
          throw new Error('Missing reset token from server');
        }
        setResetToken(data.resetToken);
        setIsOtpVerified(true);
        Alert.alert('Success', 'OTP verified successfully');
      } else {
        throw new Error(data.error || 'Invalid or expired OTP');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      Alert.alert('Error', 'Please enter and confirm your new password');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
      );
      return;
    }

    if (!resetToken) {
      Alert.alert('Error', 'Reset token not found. Please verify OTP again.');
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

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Password reset successfully');
        setModalVisible(false);
        resetModalState();
      } else {
        throw new Error(data.error || 'Failed to reset password');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#A16EFF" />
      <LinearGradient colors={['#A16EFF', '#dca5f1ff']} style={styles.header}>
        <Image
          source={require("../../assets/salonlogo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Welcome to BookMyGlow</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.loginTitle}>Login</Text>
          <Text style={styles.loginSubtitle}>Login to continue</Text>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'email' && styles.activeTab]}
              onPress={() => setActiveTab('email')}
            >
              <Text style={[styles.tabText, activeTab === 'email' && styles.activeTabText]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'mobile' && styles.activeTab]}
              onPress={() => setActiveTab('mobile')}
            >
              <Text style={[styles.tabText, activeTab === 'mobile' && styles.activeTabText]}>Mobile</Text>
            </TouchableOpacity>
          </View>

          {/* Email Login Form */}
          {activeTab === 'email' && (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputContainer}>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff color="#666" size={20} /> : <Eye color="#666" size={20} />}
                  </TouchableOpacity>
                </View>
              </View>
              {isLoading ? (
                <ActivityIndicator size="large" color="#A16EFF" style={{ marginTop: 20 }} />
              ) : (
                <TouchableOpacity style={styles.loginButton} onPress={handleEmailLogin}>
                  <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={{ marginTop: 10 }} onPress={() => setModalVisible(true)}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Mobile Login Form */}
          {activeTab === 'mobile' && (
            <>
              {!isMobileOtpSent ? (
                <>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={mobile}
                      onChangeText={setMobile}
                      placeholder="Mobile Number"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                    />
                  </View>
                  {isLoading ? (
                    <ActivityIndicator size="large" color="#A16EFF" style={{ marginTop: 20 }} />
                  ) : (
                    <TouchableOpacity style={styles.loginButton} onPress={handleSendMobileOtp}>
                      <Text style={styles.buttonText}>Send OTP</Text>
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
                    <Text style={styles.forgotText}>Resend OTP</Text>
                  </TouchableOpacity>
                </>
              )}
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
  logo: {
    width: 120,
    height: 120,
    marginBottom: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
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
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  activeTab: {
    borderBottomColor: '#A16EFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#A16EFF',
    fontWeight: 'bold',
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
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
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