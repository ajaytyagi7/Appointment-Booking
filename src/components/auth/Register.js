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
import LinearGradient from 'react-native-linear-gradient';
import { LucideEye, LucideEyeOff } from 'lucide-react-native';

const API_URL = 'http://172.24.57.37:8005/api/customer-app/register';

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
    const trimmedFullName = fullName.trim();
    const trimmedMobileNumber = mobileNumber.trim();
    const trimmedEmail = email.trim();
    const trimmedAddress = address.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

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

      await AsyncStorage.setItem('customerId', response.data.customerId);
      setLoading(false);
      Alert.alert('Success', 'Registration successful!');
      navigation.navigate('Home');
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error || 'Something went wrong. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.topText}>Create New Account</Text>
        <Text style={styles.subText}>Sign up to book your beauty appointments</Text>

        {/* Full Name */}
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Full Name"
          placeholderTextColor="#999"
        />

        {/* Mobile */}
        <TextInput
          style={styles.input}
          value={mobileNumber}
          onChangeText={setMobileNumber}
          placeholder="Mobile Number"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
        />

        {/* Email */}
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#999"
          keyboardType="email-address"
        />

        {/* Gender */}
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

        {/* Address */}
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Address"
          placeholderTextColor="#999"
        />

        {/* Password */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
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
            {showPassword ? (
              <LucideEyeOff size={20} color="#666" />
            ) : (
              <LucideEye size={20} color="#666" />
            )}
          </TouchableOpacity>
        </View>

        {/* Confirm Password */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm Password"
            placeholderTextColor="#999"
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <LucideEyeOff size={20} color="#666" />
            ) : (
              <LucideEye size={20} color="#666" />
            )}
          </TouchableOpacity>
        </View>

        {/* Register Button */}
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

      {/* Bottom Gradient */}
      <LinearGradient colors={['#dca5f1ff', '#A16EFF']} style={styles.bottomBlob} />

      {/* Sign-in Link */}
      <View style={styles.signInWrapper}>
        <Text style={styles.signInText}>Already have an account?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.signInLink}> Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  contentContainer: { padding: 20, paddingBottom: 200 },
  topText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  // 🔹 Updated Input Style (same as Login)
  input: {
    backgroundColor: '#F2F2F2',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
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
  selectedGender: { borderColor: '#A16EFF', backgroundColor: '#ffeaea' },
  genderText: { color: '#333' },
  // 🔹 Updated Password Container to match Login page
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  passwordInput: { flex: 1, height: 50, fontSize: 16, color: '#333' },
  eyeIcon: { padding: 5 },
  buttonWrapper: { marginTop: 10 },
  button: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  bottomBlob: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
  },
  signInWrapper: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: { fontSize: 14, color: '#0e0f0fff', marginBottom: 40 },
  signInLink: { fontSize: 14, color: '#f8f4f4ff', fontWeight: 'bold', marginBottom: 40 },
});

