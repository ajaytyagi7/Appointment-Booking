import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { LucideEye, LucideEyeOff } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = 'https://backendsalon.pragyacode.com/api/customer-app/register';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [matrimonialStatus, setMatrimonialStatus] = useState('Single');
  const [dob, setDob] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigation = useNavigation();
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState('');
  const [strengthColor, setStrengthColor] = useState('#999');

  const checkPasswordStrength = (pass) => {
    if (!pass) {
      setPasswordStrength('');
      setStrengthColor('#999');
      return;
    }
    let strength = 0;
    if (pass.length >= 8) strength += 1;
    if (/[A-Z]/.test(pass)) strength += 1;
    if (/[a-z]/.test(pass)) strength += 1;
    if (/[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;

    if (strength === 1 || strength === 2) {
      setPasswordStrength('Weak');
      setStrengthColor('#ff4d4d');
    } else if (strength === 3) {
      setPasswordStrength('Medium');
      setStrengthColor('#ffa500');
    } else if (strength === 4) {
      setPasswordStrength('Strong');
      setStrengthColor('#32cd32');
    } else if (strength === 5) {
      setPasswordStrength('Very Strong');
      setStrengthColor('#228b22');
    } else {
      setPasswordStrength('');
      setStrengthColor('#999');
    }
  };

  const formatDisplayDate = (date) => {
    if (!date) return 'Select Date of Birth';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateForBackend = (date) => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const handleFullNameChange = (text) => {
    const filtered = text.replace(/[^a-zA-Z\s]/g, '');
    setFullName(filtered);
  };

  const handleMobileChange = (text) => {
    const numeric = text.replace(/[^0-9]/g, '').slice(0, 10);
    setMobileNumber(numeric);
  };

  const handlePincodeChange = (text) => {
    const numeric = text.replace(/[^0-9]/g, '').slice(0, 6);
    setPincode(numeric);
  };

  const handleAddressChange = (text) => {
    setAddress(text);
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    checkPasswordStrength(text);
  };

  // Email validation function
  const isValidEmail = (emailText) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailText.trim());
  };

  // Real-time email validation
  const handleEmailChange = (text) => {
    setEmail(text);
    // Clear error immediately if field becomes empty or valid
    if (!text.trim()) {
      setErrors(prev => ({ ...prev, email: '' }));
    } else if (isValidEmail(text)) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const trimmedFullName = fullName.trim();
    const trimmedMobile = mobileNumber.trim();
    const trimmedEmail = email.trim();
    const trimmedAddress = address.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();
    const trimmedPincode = pincode.trim();

    if (!trimmedFullName) newErrors.fullName = 'Full Name is required';
    else if (trimmedFullName.length < 3) newErrors.fullName = 'Full Name must be at least 3 characters';

    if (!trimmedMobile) newErrors.mobile = 'Mobile Number is required';
    else if (trimmedMobile.length !== 10) newErrors.mobile = 'Mobile Number must be exactly 10 digits';

    if (!trimmedEmail) newErrors.email = 'Email is required';
    else if (!isValidEmail(trimmedEmail)) newErrors.email = 'Invalid email format';

    if (!dob) newErrors.dob = 'Date of Birth is required';

    if (!trimmedPincode) newErrors.pincode = 'Pincode is required';
    else if (trimmedPincode.length !== 6) newErrors.pincode = 'Pincode must be 6 digits';

    if (!trimmedAddress) newErrors.address = 'Address is required';
    else if (trimmedAddress.length < 10) newErrors.address = 'Address must be at least 10 characters';

    if (!trimmedPassword) newErrors.password = 'Password is required';
    else if (trimmedPassword.length < 8) newErrors.password = 'Password must be at least 8 characters';

    if (trimmedPassword !== trimmedConfirm) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      Alert.alert('Notice', 'Please Fill according to validation ');
      return;
    }
    setLoading(true);
    try {
      const formattedDob = formatDateForBackend(dob);
      const response = await axios.post(API_URL, {
        fullName: fullName.trim(),
        mobileNumber: mobileNumber,
        email: email.trim().toLowerCase(),
        gender,
        address: address.trim(),
        password: password.trim(),
        confirmPassword: confirmPassword.trim(),
        matrimonialStatus,
        dob: formattedDob,
        pincode: pincode,
      });

      await AsyncStorage.setItem('customerId', response.data.customerId.toString());
      setLoading(false);
      Alert.alert('Success', 'Registration successful!');
      navigation.navigate('Login');
    } catch (error) {
      setLoading(false);
      let errorMessage = 'Something went wrong. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      const lowerMsg = errorMessage.toLowerCase();
      if (
        lowerMsg.includes('already') ||
        lowerMsg.includes('exist') ||
        lowerMsg.includes('registered') ||
        lowerMsg.includes('duplicate') ||
        lowerMsg.includes('taken')
      ) {
        Alert.alert('Already Registered', 'This mobile number or email is already registered.');
      } else {
        Alert.alert('Notice', errorMessage);
      }
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || dob;
    setShowDatePicker(Platform.OS === 'ios');
    if (currentDate) {
      setDob(currentDate);
      setErrors(prev => ({ ...prev, dob: '' }));
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#dca5f1ff', '#A16EFF']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/salonlogo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.headerTitle}>BookMyGlow</Text>
          <Text style={styles.headerSubtitle}>Book Your Appointment</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.topText}>Create New Account</Text>
        <Text style={styles.subText}>Sign up to book your beauty appointments</Text>

        {/* Full Name */}
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={[styles.input, errors.fullName && styles.inputError]}
          value={fullName}
          onChangeText={handleFullNameChange}
          placeholder="Enter your full name"
          placeholderTextColor="#999"
        />
        {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

        {/* Mobile Number */}
        <Text style={styles.label}>Mobile Number</Text>
        <TextInput
          style={[styles.input, errors.mobile && styles.inputError]}
          value={mobileNumber}
          onChangeText={handleMobileChange}
          placeholder="Enter 10-digit mobile number"
          placeholderTextColor="#999"
          keyboardType="numeric"
          maxLength={10}
        />
        {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}

        {/* Email */}
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={email}
          onChangeText={handleEmailChange}
          placeholder="Enter your email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        {/* Gender */}
        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderContainer}>
          <TouchableOpacity
            style={[styles.genderButton, gender === 'Male' && styles.selectedGender]}
            onPress={() => setGender('Male')}
          >
            <Text style={styles.genderText}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderButton, gender === 'Female' && styles.selectedGender]}
            onPress={() => setGender('Female')}
          >
            <Text style={styles.genderText}>Female</Text>
          </TouchableOpacity>
        </View>

        {/* Date of Birth */}
        <Text style={styles.label}>Date of Birth</Text>
        <TouchableOpacity
          style={[styles.datePickerButton, errors.dob && styles.inputError]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={dob ? styles.dateTextSelected : styles.dateTextPlaceholder}>
            {formatDisplayDate(dob)}
          </Text>
        </TouchableOpacity>
        {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}

        {showDatePicker && (
          <DateTimePicker
            value={dob || new Date()}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Matrimonial Status - Only Single & Married */}
        <Text style={styles.label}>Matrimonial Status</Text>
        <View style={styles.statusContainer}>
          <TouchableOpacity
            style={[styles.statusButton, matrimonialStatus === 'Single' && styles.selectedStatus]}
            onPress={() => setMatrimonialStatus('Single')}
          >
            <Text style={styles.statusText}>Single</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusButton, matrimonialStatus === 'Married' && styles.selectedStatus]}
            onPress={() => setMatrimonialStatus('Married')}
          >
            <Text style={styles.statusText}>Married</Text>
          </TouchableOpacity>
        </View>

        {/* Pincode */}
        <Text style={styles.label}>Pincode</Text>
        <TextInput
          style={[styles.input, errors.pincode && styles.inputError]}
          value={pincode}
          onChangeText={handlePincodeChange}
          placeholder="Enter 6-digit pincode"
          placeholderTextColor="#999"
          keyboardType="numeric"
          maxLength={6}
        />
        {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}

        {/* Address */}
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, errors.address && styles.inputError]}
          value={address}
          onChangeText={handleAddressChange}
          placeholder="Enter your full address"
          placeholderTextColor="#999"
          multiline
        />
        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={handlePasswordChange}
            placeholder="Minimum 8 characters"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? <LucideEyeOff size={20} color="#666" /> : <LucideEye size={20} color="#666" />}
          </TouchableOpacity>
        </View>
        <View style={styles.strengthContainer}>
          {passwordStrength ? (
            <Text style={[styles.strengthText, { color: strengthColor }]}>
              Password Strength: {passwordStrength}
            </Text>
          ) : (
            <Text style={styles.strengthHint}>Use uppercase, lowercase, number & symbol for strong password</Text>
          )}
        </View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        {/* Confirm Password */}
        <Text style={styles.label}>Confirm Password</Text>
        <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            placeholderTextColor="#999"
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            {showConfirmPassword ? <LucideEyeOff size={20} color="#666" /> : <LucideEye size={20} color="#666" />}
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

        {loading ? (
          <ActivityIndicator size="large" color="#A16EFF" style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity onPress={handleRegister} style={styles.buttonWrapper}>
            <LinearGradient colors={['#dca5f1ff', '#A16EFF']} style={styles.button}>
              <Text style={styles.buttonText}>Sign Up</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 20,
  },
  headerContent: { alignItems: 'center' },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: { width: 60, height: 60 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  headerSubtitle: { fontSize: 16, color: '#fff', opacity: 0.8 },
  contentContainer: { padding: 20, paddingBottom: 200, marginTop: -20 },
  topText: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#333', textAlign: 'center', marginTop: 20 },
  subText: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F2F2F2',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  inputError: {
    borderColor: 'red',
    borderWidth: 1,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
  datePickerButton: {
    backgroundColor: '#F2F2F2',
    padding: 14,
    borderRadius: 10,
    marginBottom: 5,
  },
  dateTextPlaceholder: {
    color: '#999',
    fontSize: 16,
  },
  dateTextSelected: {
    color: '#333',
    fontSize: 16,
  },
  genderContainer: { flexDirection: 'row', marginBottom: 15 },
  genderButton: {
    flex: 1,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  selectedGender: { borderColor: '#A16EFF', backgroundColor: '#f0e6ff' },
  genderText: { color: '#333' },
  statusContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  statusButton: {
    width: '48%',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: '1%',
    marginBottom: 5,
    alignItems: 'center',
  },
  selectedStatus: { borderColor: '#A16EFF', backgroundColor: '#f0e6ff' },
  statusText: { color: '#333', fontSize: 14 },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 10,
    marginBottom: 5,
    paddingHorizontal: 10,
  },
  passwordInput: { flex: 1, height: 50, fontSize: 16, color: '#333' },
  eyeIcon: { padding: 5 },
  strengthContainer: {
    marginBottom: 10,
    marginLeft: 5,
  },
  strengthText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  strengthHint: {
    fontSize: 12,
    color: '#666',
  },
  buttonWrapper: { marginTop: 20 },
  button: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});