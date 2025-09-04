import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Alert, Platform } from 'react-native';
import { Home as HomeIcon, Calendar, User, ChevronDown, Bell } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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

// Fetch appointments from backend
const fetchAppointments = async (customerId, token) => {
  try {
    const response = await fetch('http://172.24.57.37:8005/api/booking', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const appointments = await response.json();
    return Array.isArray(appointments) ? appointments : [];
  } catch (error) {
    console.warn('Fetch appointments error:', error?.message || error);
    return [];
  }
};

// Generate notifications based on appointments
const generateNotifications = (appointments) => {
  const notifications = [];
  const now = new Date();
  const today = new Date(now.toISOString().split('T')[0]); // Get today's date in YYYY-MM-DD format

  appointments.forEach((appointment) => {
    if (appointment.status === 'Cancelled') {
      return; // Skip cancelled appointments
    }

    // Confirmation notification (only for future bookings)
    const appointmentDate = new Date(appointment.bookingDate);
    if (appointmentDate >= today) {
      notifications.push({
        id: `confirmation-${appointment.id}`,
        message: `Appointment confirmed at ${appointment.salonName} for ${appointment.services.map(s => s.name).join(', ')} on ${appointment.bookingDate} at ${appointment.time}.`,
        time: appointment.bookingDate,
      });
    }

    // Reminder notification (1 hour before)
    const appointmentDateTime = new Date(`${appointment.bookingDate}T${appointment.time}`);
    const oneHourBefore = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000);
    if (now >= oneHourBefore && now < appointmentDateTime) {
      notifications.push({
        id: `reminder-${appointment.id}`,
        message: `Reminder: Your appointment at ${appointment.salonName} for ${appointment.services.map(s => s.name).join(', ')} is in 1 hour at ${appointment.time} on ${appointment.bookingDate}.`,
        time: appointment.bookingDate,
      });
    }
  });

  return notifications;
};

// Check and request location permissions
const checkAndRequestPermissions = async () => {
  try {
    const permission = Platform.OS === 'android'
      ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
      : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;

    let result = await check(permission);
    if (result === RESULTS.DENIED) {
      result = await request(permission);
    }

    if (result === RESULTS.GRANTED) {
      return true;
    } else if (result === RESULTS.BLOCKED) {
      Alert.alert(
        'Permission Blocked',
        'Location permission is required to fetch your current location. Please enable it in Settings.',
        [{ text: 'OK' }]
      );
      return false;
    } else if (result === RESULTS.DENIED) {
      Alert.alert(
        'Permission Denied',
        'Please grant location permission to fetch your current location.',
        [{ text: 'OK' }]
      );
      return false;
    } else {
      Alert.alert(
        'Limited Access',
        'Limited location access detected. Please grant full permission.',
        [{ text: 'OK' }]
      );
      return false;
    }
  } catch (err) {
    console.warn('Permission check/request error:', err?.message || err);
    Alert.alert('Error', 'An error occurred while checking permissions.', [{ text: 'OK' }]);
    return false;
  }
};

// Fetch current location with retry mechanism
const fetchCurrentLocation = async (retryCount = 0, maxRetries = 3) => {
  try {
    const hasPermission = await checkAndRequestPermissions();
    if (!hasPermission) {
      return { name: 'Select Location', latitude: null, longitude: null };
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          if (!latitude || !longitude) {
            throw new Error('Invalid coordinates received');
          }
          const name = await reverseGeocode(latitude, longitude);
          resolve({ name, latitude, longitude });
        },
        (err) => {
          console.warn('Geolocation error:', err?.message || err, 'Code:', err?.code);
          if (retryCount < maxRetries && err.code !== 1) { // code 1 is permission denied
            setTimeout(() => fetchCurrentLocation(retryCount + 1, maxRetries).then(resolve).catch(reject), 2000);
          } else {
            let errorMessage;
            switch (err.code) {
              case 1:
                errorMessage = 'Location permission denied. Please grant permission in settings.';
                break;
              case 2:
                errorMessage = 'Location unavailable. Ensure GPS and network are enabled.';
                break;
              case 3:
                errorMessage = 'Location request timed out. Please try again.';
                break;
              default:
                errorMessage = 'Unable to fetch location. Please try again later.';
            }
            Alert.alert('Location Error', errorMessage, [{ text: 'OK' }]);
            resolve({ name: 'Select Location', latitude: null, longitude: null });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 1000,
        }
      );
    });
  } catch (e) {
    console.warn('fetchCurrentLocation error:', e?.message || e);
    Alert.alert('Error', 'An error occurred while fetching your location.', [{ text: 'OK' }]);
    return { name: 'Select Location', latitude: null, longitude: null };
  }
};

export default function Home() {
  const navigation = useNavigation();
  const route = useRoute();
  const [activeNav, setActiveNav] = useState('Home');
  const [salons, setSalons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customerName, setCustomerName] = useState('Guest');
  const [location, setLocation] = useState(null); // { name, latitude, longitude }
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch customer data
        const token = await AsyncStorage.getItem('userToken');
        let customerId = null;
        if (token) {
          const customerResponse = await fetch('http://172.24.57.37:8005/api/customer-app/me', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            setCustomerName(customerData.customer?.fullName || 'Guest');
            customerId = customerData.customer?.customerId;
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

        // Check for selected location from navigation params
        const selectedLocation = route.params?.selectedLocation;
        let currentLocation;
        if (selectedLocation && selectedLocation.name && selectedLocation.latitude && selectedLocation.longitude) {
          currentLocation = {
            name: selectedLocation.name,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          };
          setLocation(currentLocation);
          setError('');
        } else {
          // Fetch current location if no selected location is provided
          currentLocation = await fetchCurrentLocation();
          setLocation(currentLocation);
        }

        // Fetch appointments and generate notifications
        if (token && customerId) {
          const appointments = await fetchAppointments(customerId, token);
          const generatedNotifications = generateNotifications(appointments);
          setNotifications(generatedNotifications);
        } else {
          setNotifications([]);
        }

        // Fetch all salons from backend
        const response = await fetch('http://172.24.57.37:8005/api/public/salons');
        const data = await response.json();

        // Filter and sort salons by distance
        if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
          const locationWords = currentLocation.name.toLowerCase().split(/[\s,]+/).filter(word => word.length > 0);
          const matchedSalons = data
            .map((salon) => {
              const address = (salon.location?.addressLine1 || '') + ' ' + (salon.location?.city || '');
              const addressWords = address.toLowerCase().split(/[\s,]+/).filter(word => word.length > 0);
              const matches = locationWords.some(word => addressWords.includes(word));
              const latitude = salon.location?.latitude;
              const longitude = salon.location?.longitude;
              let distance = 'N/A';
              if (latitude && longitude && matches) {
                distance = getDistance(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  latitude,
                  longitude
                ).toFixed(1); // Round to 1 decimal place
              }
              return { ...salon, distance, matches };
            })
            .filter((salon) => salon.matches) // Keep only matching salons
            .sort((a, b) => {
              if (a.distance === 'N/A' && b.distance === 'N/A') return 0;
              if (a.distance === 'N/A') return 1;
              if (b.distance === 'N/A') return -1;
              return parseFloat(a.distance) - parseFloat(b.distance); // Sort by distance (ascending)
            });
          setSalons(matchedSalons);
        } else {
          setSalons([]); // No location → no salons
        }
      } catch (error) {
        console.error('Fetch error:', error.message);
        setError('An error occurred while fetching data.');
        setCustomerName('Guest');
        setSalons([]);
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Poll for new appointments every 60 seconds to update notifications
    const intervalId = setInterval(() => {
      AsyncStorage.getItem('userToken').then((token) => {
        if (token) {
          AsyncStorage.getItem('customerId').then((customerId) => {
            if (customerId) {
              fetchAppointments(customerId, token).then((appointments) => {
                const generatedNotifications = generateNotifications(appointments);
                setNotifications(generatedNotifications);
              });
            }
          });
        }
      });
    }, 60 * 1000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [navigation, route.params?.selectedLocation]);

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
    return `http://172.24.57.37:8005${salonImages}`;
  };

  const handleNotificationPress = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <View style={styles.container}>
      <View style={styles.welcome}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Hi, {customerName}</Text>
          <TouchableOpacity style={styles.notificationContainer} onPress={handleNotificationPress}>
            <Bell size={20} color="#A16EFF" />
            {notifications.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{notifications.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>
            {location ? location.name : 'Fetching location...'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('LiveLocationScreen', { initialLocation: location })}>
            <ChevronDown size={20} color="#A16EFF" style={styles.arrowIcon} />
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <ScrollView style={styles.scrollView}>
        <View />
        <View style={styles.specialOffer}>
          <Image
            source={require("../../assets/Banner.png")}
            style={styles.offerImage}
          />
        </View>
        <Text style={styles.servicesTitle}>Our Salons</Text>
        <Text style={styles.servicesCount}>{isLoading ? 'Loading...' : `${salons.length} salons available`}</Text>
        <View style={styles.servicesContainer}>
          {isLoading ? (
            <Text style={styles.serviceText}>Loading salons...</Text>
          ) : (
            salons.map((salon, index) => (
              <View style={styles.serviceCard} key={index}>
                <Image
                  source={{ uri: getImageUrl(salon.salonImages) }}
                  style={styles.serviceImage}
                  resizeMode="cover"
                />
                <View style={styles.cardContent}>
                  <Text style={styles.serviceText}>{salon.salonName}</Text>
                  <Text style={styles.serviceTypeText}>{salon.location?.salonType || 'N/A'}</Text>
                  <Text style={styles.serviceAddress}>
                    {salon.location?.addressLine1 || salon.location?.city || 'No address'}
                  </Text>
                  <Text style={styles.serviceDistance}>
                    {salon.distance !== 'N/A' ? `${salon.distance} km` : 'Distance N/A'}
                  </Text>
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => navigation.navigate('Service', { salon })}
                  >
                    <Text style={styles.bookText}>Book Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <View style={styles.navBar}>
        {navItems.map(({ icon: Icon, label, screen }) => (
          <TouchableOpacity
            key={label}
            style={styles.navButton}
            onPress={() => {
              setActiveNav(label);
              setShowNotifications(false); // Hide notifications when navigating
              if (screen === 'Home') {
                return;
              }
              if (screen === 'Appointment') {
                const appointment = salons.length > 0 ? {
                  service: salons[0].services[0]?.name || "Men's Facial Treatment",
                  price: salons[0].services[0]?.price || 55,
                  date: "2025-07-17",
                  time: "05:55 PM",
                  stylist: salons[0].services[0]?.assignedStaff || "Emma Wilson",
                  image: getImageUrl(salons[0].salonImages)
                } : {};
                navigation.navigate(screen, { appointment });
              } else {
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
      {showNotifications && (
        <View style={styles.notificationOverlay}>
          <TouchableOpacity
            style={styles.overlayBackground}
            activeOpacity={1}
            onPress={() => setShowNotifications(false)}
          />
          <View style={styles.notificationDropdown}>
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <View key={notification.id} style={styles.notificationItem}>
                  <Text style={styles.notificationText}>{notification.message}</Text>
                  <Text style={styles.notificationTime}>{notification.time}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noNotificationText}>No new notifications</Text>
            )}
          </View>
        </View>
      )}
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
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'semibold',
    color: '#2E2E2E',
  },
  notificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -10,
    right: -10,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  notificationDropdown: {
    marginTop: 80, // Position below the status bar and notification icon
    marginRight: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    width: 300,
  },
  notificationItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  notificationText: {
    fontSize: 14,
    color: '#2E2E2E',
  },
  notificationTime: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  noNotificationText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    paddingVertical: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 13,
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
    height: 230,
    resizeMode: 'cover',
    padding: 20,
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
    fontSize: 16,
    fontWeight: 'semibold',
    marginLeft: 20,
    color: '#2E2E2E',
    marginTop: 10,
  },
  servicesCount: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 20,
    marginBottom: 10,
  },
  servicesContainer: {
    marginHorizontal: 10,
  },
  serviceCard: {
    width: '100%',
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
    height: 200,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  cardContent: {
    padding: 10,
  },
  serviceText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#2E2E2E',
    fontWeight: '700',
  },
  serviceTypeText: {
    fontSize: 12,
    color: '#615f5fff',
    marginBottom: 5,
    fontWeight: '700',
  },
  serviceAddress: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  serviceDistance: {
    fontSize: 12,
    color: '#7F8C8D',
    position: 'absolute',
    right: 10,
    top: 10,
  },
});