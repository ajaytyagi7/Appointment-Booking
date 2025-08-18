import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LucideIcon, Home as HomeIcon, Calendar, User, ChevronDown } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import haversine from 'haversine-distance';

export default function Home() {
  const navigation = useNavigation();
  const [activeNav, setActiveNav] = useState('Home');
  const [salons, setSalons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customerName, setCustomerName] = useState('Guest');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const customerResponse = await fetch('http://192.168.200.37:8005/api/customer-app/me', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            console.log('Customer Data:', customerData, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
            setCustomerName(customerData.customer?.fullName || 'Guest');
          } else {
            console.warn('Customer fetch failed:', customerResponse.status, customerResponse.statusText, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
            if (customerResponse.status === 401) {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('customerId');
              navigation.replace('Login');
              return;
            }
            setCustomerName('Guest');
          }
        } else {
          console.warn('No auth token available at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          setCustomerName('Guest');
        }

        const response = await fetch('http://192.168.200.37:8005/api/public/salons');
        const data = await response.json();
        setSalons(data);

        Geolocation.requestAuthorization();
        Geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.warn('Location fetch error:', error.message);
            setUserLocation(null);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } catch (error) {
        console.error('Fetch error:', error.message, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        setCustomerName('Guest');
      } finally {
        setIsLoading(false);
      }
    };

    // Handle selected location from LiveLocationScreen
    const { selectedLocation: initialSelectedLocation } = navigation.getState().routes.find(r => r.name === 'Home')?.params || {};
    if (initialSelectedLocation) {
      setSelectedLocation(initialSelectedLocation);
    }

    fetchData();
  }, [navigation]);

  const filteredSalons = (selectedLocation || userLocation)
    ? salons
        .map(salon => ({
          ...salon,
          distance: haversine(
            selectedLocation ? { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude } : userLocation,
            {
              latitude: salon.location?.latitude || 0,
              longitude: salon.location?.longitude || 0,
            }
          ),
        }))
        .filter(salon => salon.distance <= 20000) // Filter salons within 20 km
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)
    : salons; // Show all salons if no location is available

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
    return `http://192.168.200.37:8005${salonImages}`;
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
          <TouchableOpacity onPress={() => navigation.navigate('LiveLocationScreen')}>
            <ChevronDown size={20} color="#A16EFF" style={styles.arrowIcon} />
          </TouchableOpacity>
        </View>
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
        <Text style={styles.servicesCount}>{isLoading ? 'Loading...' : `${filteredSalons.length} salons available`}</Text>
        <View style={styles.servicesContainer}>
          {isLoading ? (
            <Text style={styles.serviceText}>Loading salons...</Text>
          ) : (
            filteredSalons.map((salon, index) => (
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
                    {(selectedLocation || userLocation) && salon.distance ? ` (${(salon.distance / 1000).toFixed(1)} km)` : ''}
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
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E2E2E',
  },
  arrowIcon: {
    marginLeft: 10,
  },
  scrollView: {
    flex: 1,
    marginBottom: 60,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  locationText: {
    fontSize: 16,
    color: '#333333',
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
});