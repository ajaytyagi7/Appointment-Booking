import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import Home from '@/components/Home/Home';
import Login from '@/components/auth/Login';
import Register from '@/components/auth/Register';
import AuthHome from '@/components/auth/AuthHome';
import AppointmentDetails from '@/components/booking/AppoinmentDetails';
import Profile from '@/components/auth/Profile';
import Appointment from '@/components/booking/Appointment';
import Service from '@/components/booking/Service';
import Privacy from '@/components/auth/Privacy';
import Terms from '@/components/auth/Terms';
import LiveLocationScreen from '@/components/booking/LiveLocationScreen';

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
      <Stack.Navigator initialRouteName={isAuthenticated ? 'Home' : 'AuthHome'}>
        {!isAuthenticated && (
          <>
            <Stack.Screen name="AuthHome" component={AuthHome} options={{ headerShown: false }} />
            <Stack.Screen
              name="Login"
              component={(props) => <Login {...props} setIsAuthenticated={setIsAuthenticated} />}
              options={{ headerShown: false, headerLeft: () => null }}
            />
            <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
          </>
        )}
        {isAuthenticated && (
          <>
            <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
            <Stack.Screen name="AppointmentDetails" component={AppointmentDetails} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" component={Profile} options={{ headerShown: false }} />
            <Stack.Screen name="Appointment" component={Appointment} options={{ headerShown: false }} />
            <Stack.Screen name="Service" component={Service} options={{ headerShown: false }} />
            <Stack.Screen name="Privacy" component={Privacy} options={{ headerShown: false }} />
            <Stack.Screen name="Terms" component={Terms} options={{ headerShown: false }} />
            <Stack.Screen name="LiveLocationScreen" component={LiveLocationScreen} options={{ headerShown: false }} />
          </>
        )}
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
  appbar: {
    backgroundColor: 'green',
  },
  HomeTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: 'green',
  },
  image: {
    width: 250,
    height: 400,
    marginBottom: 40,
    marginTop: 100,
    marginLeft: 20,
    marginRight: 20,
  },
  loginBtn: {
    width: '80%',
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    backgroundColor: 'green',
    color: 'white',
  },
  loginText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
});
