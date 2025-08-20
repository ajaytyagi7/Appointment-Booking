import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Alert, Platform } from 'react-native';
import { Home as HomeIcon, Calendar, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// Haversine formula to calculate distance between two points in kilometers
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Reverse geocode using Nominatim
const reverseGeocode = async (latitude, longitude) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'YourAppName/1.0 (contact@example.com)', // replace with your app info
      },
    });
    const data = await response.json();
    const address = data?.address || {};

    const name = [
      address.road || address.street,
      address.suburb || address.neighbourhood,
      address.city || address.town || address.village || address.county,
      address.state || address.region,
      address.country,
    ].filter(Boolean).join(', ');

    return name || data?.display_name || 'Current Location';
  } catch (err) {
    console.warn('Reverse geocode error:', err?.message || err);
    return 'Current Location';
  }
};

export default function Home() {
  const navigation = useNavigation();
  const [activeNav, setActiveNav] = useState('Home');
  const [salons, setSalons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customerName, setCustomerName] = useState('Guest');
  const [location, setLocation] = useState(null); // { name, latitude, longitude }
  const [error, setError] = useState('');

  // Check and request location permissions
  const checkAndRequestPermissions = async () => {
    try {
      const permission = Platform.OS === 'android'
        ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
        : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;

      let result = await check(permission);
      if (result === RESULTS.DENIED) {
        result = await request(permission, {
          title: 'Location Permission',
          message: 'This app needs access to your location to filter nearby salons.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });
      }

      if (result === RESULTS.GRANTED) {
        return true;
      } else if (result === RESULTS.BLOCKED || result === RESULTS.LIMITED) {
        setError('Location permission is blocked. Please enable it in your device settings.');
        Alert.alert(
          'Permission Blocked',
          'Location permission is required to fetch your current location. Please enable it in Settings.',
          [{ text: 'OK' }]
        );
        return false;
      } else {
        setError('Location permission denied. Please grant permission to use your location.');
        Alert.alert(
          'Permission Denied',
          'Please grant location permission to fetch your current location.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (err) {
      console.warn('Permission check/request error:', err?.message || err);
      setError('An error occurred while checking permissions.');
      return false;
    }
  };

  // Fetch current location with retry mechanism
  const fetchCurrentLocation = async (retryCount = 0, maxRetries = 3) => {
    try {
      const hasPermission = await checkAndRequestPermissions();
      if (!hasPermission) {
        setLocation({ name: 'Select Location', latitude: null, longitude: null });
        return;
      }

      Geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const name = await reverseGeocode(latitude, longitude);
          setLocation({ name, latitude, longitude });
          setError('');
        },
        (err) => {
          console.warn('Geolocation error:', err?.message || err, 'Code:', err?.code);
          if (retryCount < maxRetries && err.code !== 1) { // code 1 is permission denied
            setTimeout(() => fetchCurrentLocation(retryCount + 1, maxRetries), 3000);
          } else {
            let errorMessage;
            switch (err.code) {
              case 1:
                errorMessage = 'Location permission denied. Please grant permission in settings.';
                break;
              case 2:
                errorMessage = 'Location unavailable. Ensure GPS or network is enabled.';
                break;
              case 3:
                errorMessage = 'Location request timed out. Please try again.';
                break;
              default:
                errorMessage = 'Failed to get current location.';
            }
            setError(errorMessage);
            setLocation({ name: 'Select Location', latitude: null, longitude: null });
            Alert.alert('Location Error', errorMessage, [{ text: 'OK' }]);
          }
        },
        {
          enableHighAccuracy: false, // Lower accuracy for better compatibility
          timeout: 30000, // Increased timeout for release builds
          maximumAge: 0, // Force fresh location
        }
      );
    } catch (e) {
      console.warn('fetchCurrentLocation error:', e?.message || e);
      setError('An error occurred while fetching your location.');
      setLocation({ name: 'Select Location', latitude: null, longitude: null });
      Alert.alert('Error', 'An error occurred while fetching your location.', [{ text: 'OK' }]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch customer data
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const customerResponse = await fetch('https://backendsalon.pragyacode.com/api/customer-app/me', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            setCustomerName(customerData.customer?.fullName || 'Guest');
          } else {
            if (customerResponse.status === 401) {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('customerId');
              navigation.replace('Login');
              return;
            }
            setCustomerName('Guest');
          }
        } else {
          setCustomerName('Guest');
        }

        // Fetch current location
        await fetchCurrentLocation();

        // Fetch all salons from backend
        const response = await fetch('https://backendsalon.pragyacode.com/api/public/salons');
        const data = await response.json();

        // Filter and process salons if location is available
        if (location && location.latitude && location.longitude) {
          const locationWords = location.name.toLowerCase().split(/[\s,]+/).filter(word => word.length > 0);
          const processedSalons = data
            .map((salon) => {
              const address = (salon.location?.addressLine1 || '') + ' ' + (salon.location?.city || '');
              const addressWords = address.toLowerCase().split(/[\s,]+/).filter(word => word.length > 0);
              const matches = locationWords.some(word => addressWords.includes(word));
              const latitude = salon.location?.latitude;
              const longitude = salon.location?.longitude;
              let distance = 'N/A';
              if (latitude && longitude) {
                distance = getDistance(
                  location.latitude,
                  location.longitude,
                  latitude,
                  longitude
                ).toFixed(1); // Round to 1 decimal place
              }
              return { ...salon, distance, matches };
            })
            .filter((salon) => !salon.matches || salon.distance === 'N/A' || parseFloat(salon.distance) > 50);
          setSalons(processedSalons);
        } else {
          setSalons(data); // Show all salons if location fails
        }
      } catch (error) {
        console.error('Fetch error:', error.message);
        setCustomerName('Guest');
        setSalons([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigation]);

  const navItems = [
    { icon: HomeIcon, label: 'Home', screen: 'Home' },
    { icon: Calendar, label: 'Appointment', screen: 'Appointment' },
    { icon: User, label: 'Profile', screen: 'Profile' },
  ];

  const getImageUrl = (salonImages) => {
    if (!salonImages || salonImages === '') {
      return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80';
    }
    if (salonImages.startsWith('http://') || salonImages.startsWith('https://')) {
      return salonImages;
    }
    return `https://backendsalon.pragyacode.com${salonImages}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {navItems.map(({ icon: Icon, label, screen }) => (
          <TouchableOpacity
            key={label}
            style={styles.navButton}
            onPress={() => {
              setActiveNav(label);
              if (screen === 'Appointment') {
                const appointment = salons.length > 0 ? {
                  service: salons[0].services[0]?.name || "Men's Facial Treatment",
                  price: salons[0].services[0]?.price || 55,
                  date: "2025-07-17",
                  time: "05:55 PM",
                  stylist: salons[0].services[0]?.assignedStaff || "Emma Wilson",
                  image: getImageUrl(salons[0].salonImages)
                } : null;
                if (appointment) navigation.navigate(screen, { appointment });
              } else if (screen !== 'Home') {
                navigation.navigate(screen);
              }
            }}
          >
            <Icon size={20} color={activeNav === label ? '#A16EFF' : '#969292ff'} />
            <Text style={[styles.navText, activeNav === label ? styles.navTextActive : styles.navTextInactive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.welcome}>
        <Text style={styles.headerText}>Home</Text>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Hello, Mr. {customerName}</Text>
        </View>
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>
            {location ? location.name : 'Fetching location...'}
          </Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <ScrollView style={styles.scrollView}>
        <View />
        <View style={styles.specialOffer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80' }}
            style={styles.offerImage}
          />
          <Text style={styles.offerText}>Gentleman's Special</Text>
          <Text style={styles.offerSubText}>20% off all services</Text>
          <TouchableOpacity style={styles.bookButton}>
            <Text style={styles.bookText}>Book Now</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.servicesTitle}>Our Salons</Text>
        <Text style={styles.servicesCount}>{isLoading ? 'Loading...' : `${salons.length} salons available`}</Text>
        <View style={styles.servicesContainer}>
          {isLoading ? (
            <Text style={styles.serviceText}>Loading salons...</Text>
          ) : (
            salons.map((salon, index) => (
              <TouchableOpacity
                style={styles.serviceCard}
                key={index}
                onPress={() => navigation.navigate('Service', { salon })}
              >
                <Image
                  source={{ uri: getImageUrl(salon.salonImages) }}
                  style={styles.serviceImage}
                />
                <View style={styles.cardContent}>
                  <Text style={styles.serviceText}>{salon.salonName}</Text>
                  <Text style={styles.serviceTypeText}>{salon.location?.salonType || 'N/A'}</Text>
                  <Text style={styles.serviceAddress}>
                    {salon.location?.addressLine1 || salon.location?.city || 'No address'}
                  </Text>
                  <Text style={styles.serviceDistance}>
                    Distance: {salon.distance} km
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    marginTop: 25,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navButton: {
    alignItems: 'center',
    padding: 5,
  },
  navText: {
    fontSize: 12,
    textAlign: 'center',
  },
  navTextActive: {
    color: '#A16EFF',
  },
  navTextInactive: {
    color: '#969292ff',
  },
  welcome: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginTop: 10,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E2E2E',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E2E2E',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 15,
    color: '#A16EFF',
    marginRight: 10,
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  arrowIcon: {
    marginLeft: 5,
  },
  scrollView: {
    flex: 1,
    marginBottom: 60,
  },
  specialOffer: {
    marginTop: 20,
    marginHorizontal: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  offerImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  offerText: {
    position: 'absolute',
    top: 10,
    left: 10,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  offerSubText: {
    position: 'absolute',
    top: 40,
    left: 10,
    fontSize: 16,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bookButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#A16EFF',
    padding: 10,
    borderRadius: 10,
  },
  bookText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  servicesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 20,
    color: '#2E2E2E',
  },
  servicesCount: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 20,
    marginBottom: 10,
  },
  servicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginHorizontal: 10,
  },
  serviceCard: {
    width: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  cardContent: {
    padding: 10,
  },
  serviceText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#2E2E2E',
    fontWeight: '700',
  },
  serviceTypeText: {
    fontSize: 14,
    color: '#615f5fff',
    marginBottom: 5,
    fontWeight: '700',
  },
  serviceAddress: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  serviceDistance: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 5,
  },
});