import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Home from './src/components/Home/Home';
import Login from './src/components/auth/Login';
import Register from './src/components/auth/Register';
import AuthHome from './src/components/auth/AuthHome';
import AppointmentDetails from './src/components/booking/AppoinmentDetails';
import Profile from './src/components/auth/Profile';
import Appointment from './src/components/booking/Appointment';
import Service from './src/components/booking/Service';
import Privacy from './src/components/auth/Privacy';
import Terms from './src/components/auth/Terms';
import LiveLocationScreen from './src/components/booking/LiveLocationScreen';

const Stack = createNativeStackNavigator();

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error('Error checking auth token:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Home' : 'AuthHome'}
        screenOptions={{ headerShown: false }}
      >
        {/* Auth Screens */}
        <Stack.Screen name="AuthHome" component={AuthHome} />
        <Stack.Screen
          name="Login"
          options={{ headerLeft: () => null }}
        >
          {(props) => <Login {...props} setIsAuthenticated={setIsAuthenticated} />}
        </Stack.Screen>
        <Stack.Screen name="Register" component={Register} />

        {/* App Screens */}
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="AppointmentDetails" component={AppointmentDetails} />
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="Appointment" component={Appointment} />
        <Stack.Screen name="Service" component={Service} />
        <Stack.Screen name="Privacy" component={Privacy} />
        <Stack.Screen name="Terms" component={Terms} />
        <Stack.Screen name="LiveLocationScreen" component={LiveLocationScreen} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
