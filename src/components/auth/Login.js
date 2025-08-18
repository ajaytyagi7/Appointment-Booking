import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LucideEye, LucideEyeOff } from 'lucide-react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';

// ✅ Your local backend URL
const BASE_URL = 'http://192.168.200.37:8005';

export default function Login() {
  const navigation = useNavigation();
  const route = useRoute();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (route.params?.email && route.params?.password) {
      setEmail(route.params.email);
      setPassword(route.params.password);
    }

    // ✅ Configure Google Sign-in
    GoogleSignin.configure({
      webClientId: '142777567412-l2e1g6o6314m68i1uistk1qvpa0no1ip.apps.googleusercontent.com',
    });
  }, [route.params]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/customer-app/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        const token = data.token;
        const customerId = String(data.customerId);

        if (!token || !customerId) {
          throw new Error('Missing token or customerId in response');
        }

        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('customerId', customerId);

        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Google Sign-in Handler
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      const user = userCredential.user;

      // Optional: Store in AsyncStorage
      await AsyncStorage.setItem('userToken', idToken);
      await AsyncStorage.setItem('customerId', user.uid);

      // Navigate to Home
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Cancelled', 'Google sign-in was cancelled');
      } else {
        Alert.alert('Google Login Error', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Image
        source={{ uri: 'https://cdn-icons-png.flaticon.com/512/6681/6681204.png' }}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.topText}>Login</Text>
      <Text style={styles.subText}>Sign in to book your beauty appointments</Text>
      <View style={styles.form}>
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
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A16EFF" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
              <Text style={styles.buttonText}>Sign in with Google</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>Don't have an account? Create one</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 20,
    marginTop: 30,
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 20,
  },
  topText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  form: {
    marginTop: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    color: '#333',
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  loginButton: {
    backgroundColor: '#A16EFF',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  googleButton: {
    backgroundColor: '#DB4437',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#A16EFF',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#333',
    marginTop: 10,
  },
});
