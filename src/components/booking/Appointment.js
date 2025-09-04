import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LucideIcon, Home as HomeIcon, Calendar, User } from 'lucide-react-native';

// Configurable base URL for API
const BASE_URL = 'http://172.24.57.37:8005';

export default function Appointment() {
  const navigation = useNavigation();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [activeNav, setActiveNav] = useState('Appointment');
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [staffImages, setStaffImages] = useState({}); // State to store staff images

  useEffect(() => {
    const fetchAppointments = async () => {
      let storedToken, storedCustomerId, customerInfo;
      try {
        // Retrieve token with retry mechanism
        for (let attempt = 0; attempt < 3; attempt++) {
          storedToken = await AsyncStorage.getItem('userToken');
          if (storedToken) break;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!storedToken) {
          console.error('No token found at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          Alert.alert('Error', 'Please log in to view appointments');
          setIsLoading(false);
          setAppointments([]);
          return;
        }

        setToken(storedToken);

        // Fetch customer details
        const customerResponse = await fetch(`${BASE_URL}/api/customer-app/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });

        if (!customerResponse.ok) {
          const errorText = await customerResponse.text();
          console.error('Error fetching customer data:', errorText, 'Status:', customerResponse.status, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          Alert.alert('Error', `Could not fetch customer data (Status: ${customerResponse.status})`);
          setIsLoading(false);
          setAppointments([]);
          return;
        }

        const customerData = await customerResponse.json();
        console.log('Customer Data Response:', JSON.stringify(customerData, null, 2), 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        storedCustomerId = customerData?.customer?.customerId;

        if (!storedCustomerId) {
          console.error('No customerId found in customer data at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          Alert.alert('Error', 'Customer ID not found');
          setIsLoading(false);
          setAppointments([]);
          return;
        }

        customerInfo = {
          customerName: customerData?.customer?.name || 'N/A',
          email: customerData?.customer?.email || 'N/A',
          mobileNumber: customerData?.customer?.mobileNumber || 'N/A',
          address: customerData?.customer?.address || 'N/A',
        };

        // Fetch appointments
        const url = `${BASE_URL}/api/booking?customerId=${encodeURIComponent(storedCustomerId)}`;
        console.log('Fetching from URL:', url, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error fetching appointments:', errorText || 'No response body', 'Status:', response.status, 'URL:', url, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          Alert.alert('Error', `Could not fetch appointments (Status: ${response.status})`);
          setAppointments([]);
          return;
        }

        const text = await response.text();
        console.log('RAW RESPONSE TEXT:', text, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse JSON:', text, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          Alert.alert('Error', 'Invalid response format from server');
          setAppointments([]);
          return;
        }

        console.log('RAW RESPONSE:', JSON.stringify(data, null, 2), 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

        const appointmentsData = Array.isArray(data) ? data : (data.appointments || data.data || []);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch staff images for all salons involved in appointments
        const salonIds = [...new Set(appointmentsData.map(app => app.salonId))]; // Get unique salon IDs
        const staffImageMap = {};

        for (const salonId of salonIds) {
          try {
            const salonResponse = await fetch(`${BASE_URL}/api/public/salons?salonId=${encodeURIComponent(salonId)}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            });

            if (!salonResponse.ok) {
              console.error(`Error fetching salon data for salonId ${salonId}: Status ${salonResponse.status}, at`, new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
              continue;
            }

            const salonData = await salonResponse.json();
            console.log(`Salon Data for salonId ${salonId}:`, JSON.stringify(salonData, null, 2), 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

            if (salonData && salonData.staff) {
              salonData.staff.forEach(staff => {
                staffImageMap[`${salonId}_${staff.name}`] = staff.image || null;
              });
            }
          } catch (error) {
            console.error(`Error fetching staff images for salonId ${salonId}:`, error.message, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          }
        }

        setStaffImages(staffImageMap);

        const processedAppointments = appointmentsData.map((appointment) => {
          const bookingDate = new Date(appointment.bookingDate);
          bookingDate.setHours(0, 0, 0, 0);
          let status = 'Cancelled';
          if (appointment.status?.toLowerCase() !== 'cancelled') {
            status = bookingDate >= today ? 'Upcoming' : 'Past';
          }
          return {
            ...appointment,
            ...customerInfo,
            status,
          };
        });

        console.log('Processed appointments data:', JSON.stringify(processedAppointments, null, 2), 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

        setAppointments(processedAppointments);
      } catch (error) {
        console.error('Error fetching data:', error.message, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        Alert.alert('Error', 'Failed to fetch data due to a network or server issue');
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const handleCancelAppointment = async (id) => {
    console.log('Attempting to cancel appointment with ID:', id, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    
    if (!token) {
      console.error('No token available for cancellation at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      Alert.alert('Error', 'Authentication token is missing. Please log in again.');
      return;
    }

    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const url = `${BASE_URL}/api/booking/${id}`;
            console.log('Cancel request URL:', url);
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            });

            const text = await response.text();
            console.log('Cancel response text:', text, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

            let result;
            try {
              result = JSON.parse(text);
            } catch (e) {
              console.error('Failed to parse cancel response:', text, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
              Alert.alert('Error', 'Invalid response format from server');
              return;
            }

            console.log('Cancel response:', JSON.stringify(result, null, 2));
            if (response.ok) {
              Alert.alert('Success', 'Appointment cancelled successfully');
              setAppointments((prev) => prev.map((a) => 
                a.id === id ? { ...a, status: 'Cancelled' } : a
              ));
            } else {
              Alert.alert('Error', result.error || result.message || `Could not cancel appointment (Status: ${response.status})`);
            }
          } catch (error) {
            console.error('Cancel error:', error.message, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
            Alert.alert('Error', 'Failed to cancel appointment due to a network or server issue');
          }
        },
      },
    ]);
  };

  const navItems = [
    { icon: HomeIcon, label: 'Home', screen: 'Home' },
    { icon: Calendar, label: 'Appointment', screen: 'Appointment' },
    { icon: User, label: 'Profile', screen: 'Profile' },
  ];

  const filteredAppointments = appointments.filter((appointment) => 
    appointment.status === activeTab
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <Text style={styles.title}>Appointments</Text>
          <Text style={styles.subtitle}>My Appointments</Text>
          <View style={styles.tabs}>
            {['Upcoming', 'Past', 'Cancelled'].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={styles.tabContainer}
              >
                <Text style={[styles.tab, activeTab === tab ? styles.activeTab : null]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.appointmentCard}>
            <Text style={styles.serviceText}>Loading appointments...</Text>
          </View>
        ) : filteredAppointments.length === 0 ? (
          <View style={styles.appointmentCard}>
            <Text style={styles.serviceText}>No {activeTab.toLowerCase()} appointments available</Text>
          </View>
        ) : (
          filteredAppointments.map((appointment, index) => {
            const staffImageKey = `${appointment.salonId}_${appointment.staff}`;
            const staffImage = staffImages[staffImageKey] 
              ? `${BASE_URL}${staffImages[staffImageKey]}` 
              : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80';

            return (
              <View key={index} style={styles.appointmentCard}>
                <Text style={styles.serviceText}>{appointment.services[0]?.name || 'N/A'}</Text>
                <Text style={styles.priceText}>₹{appointment.services[0]?.price || 'N/A'}</Text>
                <View style={styles.dateTimeContainer}>
                  <Text style={styles.dateText}>
                    📅 {new Date(appointment.bookingDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </Text>
                  <Text style={styles.timeText}>⏰ {appointment.time || 'N/A'}</Text>
                </View>
                <View style={styles.stylistContainer}>
                  <Image
                    source={{ uri: staffImage }}
                    style={styles.stylistImage}
                    onError={() => console.error(`Failed to load stylist image for ${appointment.staff} at`, new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))}
                  />
                  <View>
                    <Text style={styles.stylistLabel}>Your Stylist</Text>
                    <Text style={styles.stylistName}>{appointment.staff || 'N/A'}</Text>
                  </View>
                </View>
                {appointment.status === 'Upcoming' && (
                  <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelAppointment(appointment.id)}>
                    <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
                  </TouchableOpacity>
                )}
                <View style={[styles.statusTag, { backgroundColor: 
                  appointment.status === 'Upcoming' ? '#D7B9D5' : 
                  appointment.status === 'Past' ? '#B0C4DE' : '#FFB6C1' 
                }]}>
                  <Text style={styles.upcomingText}>{appointment.status}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      <View style={styles.navBar}>
        {navItems.map(({ icon: Icon, label, screen }) => (
          <TouchableOpacity
            key={label}
            style={styles.navButton}
            onPress={() => {
              setActiveNav(label);
              navigation.navigate(screen);
            }}
          >
            <Icon size={20} color={activeNav === label ? '#A16EFF' : '#969292ff'} />
            <Text style={[styles.navText, activeNav === label ? styles.navTextActive : styles.navTextInactive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    marginTop: 30,
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
  title: {
    fontSize: 20,
    fontWeight: 'semibold',
    color: '#2E2E2E',
  },
  subtitle: {
    fontSize: 15,
    color: '#7F8C8D',
    marginVertical: 5,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 10,
  },
  tabContainer: {
    marginRight: 20,
  },
  tab: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  activeTab: {
    color: '#A16EFF',
    borderBottomWidth: 2,
    borderBottomColor: '#A16EFF',
    paddingBottom: 5,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  serviceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E2E2E',
  },
  priceText: {
    fontSize: 16,
    color: '#A16EFF',
    marginVertical: 5,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  dateText: {
    fontSize: 14,
    color: '#666666',
  },
  timeText: {
    fontSize: 14,
    color: '#666666',
  },
  stylistContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  stylistImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  stylistLabel: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  stylistName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E2E2E',
  },
  cancelButton: {
    backgroundColor: '#A16EFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  upcomingText: {
    color: '#FFFFFF',
    fontSize: 12,
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
});