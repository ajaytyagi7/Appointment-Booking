import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LucideArrowLeft, LucideSend } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

const API_URL = 'https://backendsalon.pragyacode.com/api/customer-support';
const AUTH_ME_URL = 'https://backendsalon.pragyacode.com/api/customer-app/me';

export default function HelpSupport({ navigation }) {
  const [form, setForm] = useState({
    subject: '',
    description: '',
    fullName: '',
    customerId: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [formStatus, setFormStatus] = useState(null);
  const [formErrorMessage, setFormErrorMessage] = useState('');

  // Fetch customer data on component mount
  useEffect(() => {
    verifyTokenAndFetchData();
  }, []);

  // Verify token and fetch customer name, ID, and email
  const verifyTokenAndFetchData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication token is missing');
      }

      const response = await fetch(AUTH_ME_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Auth fetch failed: ${response.status} - ${response.statusText}`);
      }

      const userDataResult = await response.json();
      console.log('Customer/me Response:', userDataResult);

      if (userDataResult.customer) {
        const fullName = userDataResult.customer.fullName || '';
        const customerId = userDataResult.customer.customerId || '';
        const email = userDataResult.customer.email || '';

        if (!fullName || !customerId || !email) {
          throw new Error('Customer name, ID, or email not found in user data');
        }

        // Validate customerId format (UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(customerId)) {
          throw new Error('Invalid customer ID format');
        }

        // Update form with customer name, ID, and email
        setForm((prev) => ({ ...prev, fullName, customerId, email }));
      } else {
        throw new Error('Invalid user data format');
      }
    } catch (error) {
      console.error('Authentication Error:', error.message);
      Alert.alert('Authentication Error', 'Please log in to BookMyGlow again');
      navigation.navigate('Login');
    } finally {
      setLoading(false);
    }
  };

  // Handle Input Change
  const handleInputChange = (field, value) => {
    setForm({ ...form, [field]: value });
    // Reset form status when user starts typing
    setFormStatus(null);
    setFormErrorMessage('');
  };

  // Submit Support Request
  const submitSupportRequest = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Authentication Error', 'Please log in to BookMyGlow again');
        navigation.navigate('Login');
        return;
      }

      if (!form.subject || !form.description || !form.fullName || !form.customerId || !form.email) {
        Alert.alert('Error', 'Please fill in all fields to proceed with your BookMyGlow support request');
        return;
      }

      setLoading(true);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: form.subject,
          description: form.description,
          fullName: form.fullName,
          customerId: form.customerId,
          email: form.email,
        }),
      });

      if (response.status === 201) {
        setFormStatus('success');
        Alert.alert('Success', 'Your BookMyGlow support request has been submitted successfully');
        // Clear only subject and description, keep fullName, customerId, and email
        setForm((prev) => ({
          ...prev,
          subject: '',
          description: '',
        }));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      const errorMsg = error.message || 'Failed to submit your BookMyGlow support request';
      setFormStatus('error');
      setFormErrorMessage(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#A16EFF" />
      <LinearGradient colors={['#A16EFF', '#dca5f1ff']} style={styles.header}>
        <Text style={styles.headerTitle}>Help and Support</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>BookMyGlow Support</Text>
          <Text style={styles.formSubtitle}>
            Submit your query, and our team will get back to you within 24 hours.
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Subject"
              placeholderTextColor="#999"
              value={form.subject}
              onChangeText={(value) => handleInputChange('subject', value)}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your issue..."
              placeholderTextColor="#999"
              value={form.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
          </View>

          

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={submitSupportRequest}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Send Request</Text>
            )}
          </TouchableOpacity>

          {formStatus === 'error' && (
            <Text style={styles.errorText}>{formErrorMessage}</Text>
          )}
          {formStatus === 'success' && (
            <Text style={styles.successText}>
              Thank you for reaching out to BookMyGlow! We’ll connect with you soon.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 280,
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
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
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
  textArea: {
    height: 150,
    paddingTop: 14,
  },
  readOnlyInput: {
    backgroundColor: '#F1F1F1',
    color: '#444',
    opacity: 0.8,
  },
  submitButton: {
    backgroundColor: '#A16EFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#B794F4',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 10,
  },
  successText: {
    fontSize: 13,
    color: '#50C878',
    textAlign: 'center',
    marginTop: 10,
  },
});