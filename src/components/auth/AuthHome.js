import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView } from 'react-native';

export default function AuthHome({ navigation }) {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80' }}
          style={styles.image}
        />
        <View style={styles.content}>
          <Text style={styles.title}>Beauty Salon</Text>
          <Text style={styles.subtitle}>Book your next beauty appointment with ease</Text>
          <TouchableOpacity style={styles.signInButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createAccountButton} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.buttonTextCreate}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.guestButton} 
            onPress={() => navigation.navigate('Login', { 
              email: 'demo@bookmyglow.com', 
              password: 'Demo@1234',
              isGuest: true 
            })}
          >
            <Text style={styles.guestText}>Continue as guest</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 500,
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  signInButton: {
    backgroundColor: '#A16EFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    marginBottom: 10,
    width: '80%',
    alignItems: 'center',
  },
  createAccountButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    marginBottom: 10,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A16EFF',
    height: 50,
  },
  guestButton: {
    paddingVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextCreate: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestText: {
    color: '#A16EFF',
    fontSize: 14,
  },
});