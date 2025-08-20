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
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { LucideEye, LucideEyeOff } from 'lucide-react-native';

const API_URL = 'https://backendsalon.pragyacode.com/api/customer-app/register';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigation = useNavigation();

  const handleRegister = async () => {
    // Trim inputs to prevent spaces being considered valid
    const trimmedFullName = fullName.trim();
    const trimmedMobileNumber = mobileNumber.trim();
    const trimmedEmail = email.trim();
    const trimmedAddress = address.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    // Validate all fields are non-empty
    if (
      !trimmedFullName ||
      !trimmedMobileNumber ||
      !trimmedEmail ||
      !gender ||
      !trimmedAddress ||
      !trimmedPassword ||
      !trimmedConfirmPassword
    ) {
      Alert.alert('Error', 'Please fill in all fields correctly.');
      return;
    }

    // Validate password match
    if (trimmedPassword !== trimmedConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(API_URL, {
        fullName: trimmedFullName,
        mobileNumber: trimmedMobileNumber,
        email: trimmedEmail,
        gender,
        address: trimmedAddress,
        password: trimmedPassword,
        confirmPassword: trimmedConfirmPassword,
      });

      console.log('Register response:', response.data);

      // Store the customerId in AsyncStorage
      await AsyncStorage.setItem('customerId', response.data.customerId);

      setLoading(false);
      Alert.alert('Success', 'Registration successful!');
      navigation.navigate('Home');
    } catch (error) {
      setLoading(false);
      const errorMessage = error.response?.data?.error || 'Something went wrong. Please try again.';
      console.log('Register error:', error.response?.data || error.message);
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.topText}>Create Account</Text>
        <Text style={styles.subText}>Sign up to book your beauty appointments</Text>
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor="#666"
              autoCapitalize="words"
            />
          </View>
          {/* Mobile */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              value={mobileNumber}
              onChangeText={setMobileNumber}
              placeholder="Enter your mobile number"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
            />
          </View>
          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {/* Gender */}
          <View style={styles.inputContainer}>
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
          </View>
          {/* Address */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your address"
              placeholderTextColor="#666"
              autoCapitalize="sentences"
            />
          </View>
          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                placeholderTextColor="#666"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <LucideEyeOff color="#666" size={20} /> : <LucideEye color="#666" size={20} />}
              </TouchableOpacity>
            </View>
          </View>
          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                placeholderTextColor="#666"
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <LucideEyeOff color="#666" size={20} /> : <LucideEye color="#666" size={20} />}
              </TouchableOpacity>
            </View>
          </View>
          {/* Register Button */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#A16EFF" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.createButton} onPress={handleRegister}>
              <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>
          )}
          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', padding: 20, marginTop: 30 },
  scrollView: { flex: 1 },
  contentContainer: { flexGrow: 1, justifyContent: 'center' },
  topText: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
  subText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  form: { marginTop: 20 },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 14, color: '#666', marginBottom: 5 },
  input: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, fontSize: 16, color: '#333' },
  genderContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  genderButton: { flex: 1, backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, marginHorizontal: 5, alignItems: 'center' },
  selectedGender: { backgroundColor: '#E0E0E0' },
  genderText: { fontSize: 16, color: '#333' },
  passwordContainer: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, paddingRight: 50 },
  eyeIcon: { position: 'absolute', right: 15, top: '50%', transform: [{ translateY: -10 }] },
  createButton: { backgroundColor: '#A16EFF', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  loginLink: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#A16EFF', fontSize: 14, textAlign: 'center' },
  loadingContainer: { marginTop: 20, alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#333', marginTop: 10 },
});
