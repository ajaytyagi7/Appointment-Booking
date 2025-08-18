import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LucideIcon, Calendar as CalendarIcon, Clock, User as UserIcon } from 'lucide-react-native';
import Swiper from 'react-native-swiper';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID } from '@env';

export default function AppointmentDetails() {
  const { service, salon } = useRoute().params || {
    service: {
      name: "Men's Haircut",
      price: 350,
      id: "service1",
      description: "Men's regular haircut",
      category: "Hair",
      duration: "30",
      createdAt: new Date().toISOString(),
      createdBy: "admin"
    },
    salon: {
      salonName: "Ajay",
      salonId: "a0658aa0-3d18-4d49-b326-b8ffea38aebe",
      location: { addressLine1: "456 Elm St", city: "Lucknow", state: "Uttar Pradesh", pincode: "226001", country: "India" }
    }
  };
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [bookedStaff, setBookedStaff] = useState({}); // Track booked staff per slot
  const [isLoading, setIsLoading] = useState(false);
  const [customerData, setCustomerData] = useState({
    customerId: null,
    customerName: 'Guest',
    email: '',
    mobileNumber: '',
    address: ''
  });
  const [imageLoading, setImageLoading] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const timeSlots = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  const defaultImage = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80';
  const BASE_URL = 'http://192.168.200.37:8005';
  const RAZORPAY_KEY = RAZORPAY_KEY_ID;

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          console.warn('No auth token available at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          navigation.navigate('Login');
          return;
        }
        setIsLoading(true);
        const customerResponse = await fetch(`${BASE_URL}/api/customer-app/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (customerResponse.ok) {
          const responseData = await customerResponse.json();
          console.log('Customer Data:', responseData, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          if (responseData.customer) {
            setCustomerData({
              customerId: responseData.customer.customerId || null,
              customerName: responseData.customer.fullName || 'Guest',
              email: responseData.customer.email || '',
              mobileNumber: responseData.customer.mobileNumber || '',
              address: responseData.customer.address || ''
            });
          } else {
            console.warn('No customer data found at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
            setCustomerData(prev => ({ ...prev, customerName: 'Guest' }));
          }
        } else if (customerResponse.status === 401) {
          console.warn('Unauthorized: Invalid or expired token at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          navigation.navigate('Login');
        } else {
          console.warn('Customer fetch failed:', customerResponse.status, customerResponse.statusText, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          setCustomerData(prev => ({ ...prev, customerName: 'Guest' }));
        }
      } catch (error) {
        console.error('Error fetching customer data:', error.message, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        setCustomerData(prev => ({ ...prev, customerName: 'Guest' }));
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomerData();
  }, [navigation]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setIsLoading(true);
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(
          `${BASE_URL}/api/booking/check-slot?salonId=${salon.salonId}&bookingDate=${selectedDate}&time=${timeSlots[0]}&serviceCategory=${encodeURIComponent(service.category)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Staff API response:', JSON.stringify(result, null, 2), 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

        // Extract staff from availableStaff in the response
        const formattedStaff = result.availableStaff && Array.isArray(result.availableStaff)
          ? result.availableStaff.map(staffName => ({
              name: staffName,
              image: defaultImage, // Backend does not provide staff images
              role: service.category // Use service category as role since backend doesn't return specific role
            }))
          : [];

        console.log('Formatted staff:', formattedStaff, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        setStaffList(formattedStaff);
        setImageLoading(formattedStaff.reduce((acc, staff) => ({ ...acc, [staff.name]: true }), {}));
      } catch (error) {
        console.error('Error fetching staff:', error.message, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        setStaffList([]);
        setImageLoading({});
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaff();
  }, [salon.salonId, service.category, selectedDate]);

  const fetchBookedSlotsAndStaff = async () => {
    if (!selectedDate) return;
    console.log('Selected Date:', selectedDate, 'Salon ID:', salon.salonId, 'Service Category:', service.category, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const bookedSlots = [];
      const bookedStaffBySlot = {};

      for (const time of timeSlots) {
        const url = `${BASE_URL}/api/booking/check-slot?salonId=${salon.salonId}&bookingDate=${selectedDate}&time=${time}&serviceCategory=${encodeURIComponent(service.category)}`;
        console.log('Checking:', url, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Slot check result:', result, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

        if (!result.isAvailable) {
          bookedSlots.push(time);
        }

        // Populate bookedStaffBySlot with staff not in availableStaff
        bookedStaffBySlot[time] = staffList.filter(staff => !result.availableStaff.includes(staff.name));
      }
      console.log('Processed bookedSlots:', bookedSlots, 'BookedStaffBySlot:', bookedStaffBySlot, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      setBookedSlots(bookedSlots);
      setBookedStaff(bookedStaffBySlot);
    } catch (error) {
      console.error('Error fetching booked slots or staff:', error.message, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      setBookedSlots([]);
      setBookedStaff({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookedSlotsAndStaff();
  }, [selectedDate, salon.salonId, service.category]);

  const handleDateSelect = (day) => {
    const currentDate = new Date();
    const selected = new Date(day.dateString);
    if (selected < currentDate.setHours(0, 0, 0, 0)) {
      Alert.alert('Error', 'Cannot select a past date.');
      return;
    }
    setSelectedDate(day.dateString);
    setSelectedTime('');
    setSelectedStaff(null);
  };

  const isSlotBooked = (time) => {
    console.log('Checking if', time, 'is booked. Current bookedSlots:', bookedSlots, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    return bookedSlots.includes(time);
  };

  const isStaffBooked = (staffName, time) => {
    if (!time) return false; // If no time is selected, show all staff
    return bookedStaff[time]?.some(staff => staff.name === staffName) || false;
  };

  const handleBookAppointment = () => {
    if (!selectedDate || !selectedTime || !selectedStaff) {
      Alert.alert('Error', 'Please select a date, time, and staff member.');
      return;
    }
    if (isLoading) {
      Alert.alert('Error', 'Please wait while the data is loading.');
      return;
    }
    setShowPaymentModal(true);
  };

  const handleCashPayment = async () => {
    setShowPaymentModal(false);
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('No token provided at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        Alert.alert('Error', 'Please log in to proceed with payment.');
        navigation.navigate('Login');
        return;
      }
      const orderData = {
        salonId: salon.salonId,
        amount: service.price,
        currency: 'INR',
        customerId: customerData.customerId || null,
        customerName: customerData.customerName,
        customerPhone: customerData.mobileNumber,
        location: salon.location,
        services: [{
          id: service.id,
          name: service.name,
          description: service.description,
          category: service.category,
          duration: service.duration,
          price: service.price,
          createdAt: service.createdAt,
          createdBy: service.createdBy
        }],
        paymentMethod: 'cash'
      };
      console.log('Creating cash payment order with data:', orderData, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      const response = await fetch(`${BASE_URL}/api/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });
      const result = await response.json();
      console.log('Cash payment order response:', result, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      if (!response.ok) {
        console.error('Cash payment order creation failed:', response.status, result.error, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        if (response.status === 401) {
          Alert.alert('Authentication Error', 'Please log in again.');
          navigation.navigate('Login');
        }
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      await bookAppointment('cash', null, null);
    } catch (error) {
      console.error('Error creating cash payment order:', error.message, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      Alert.alert('Error', error.message || 'Failed to initiate cash payment order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnlinePayment = async () => {
    setShowPaymentModal(false);
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('No token provided at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        Alert.alert('Error', 'Please log in to proceed with payment.');
        navigation.navigate('Login');
        return;
      }
      if (!customerData.customerName || !customerData.email || !customerData.mobileNumber) {
        console.error('Incomplete customer data at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        Alert.alert('Error', 'Please complete your profile with name, email, and mobile number.');
        navigation.navigate('Profile');
        return;
      }

      // Check slot availability before initiating payment
      const slotCheckResponse = await fetch(
        `${BASE_URL}/api/booking/check-slot?salonId=${salon.salonId}&bookingDate=${selectedDate}&time=${selectedTime}&serviceCategory=${encodeURIComponent(service.category)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const slotCheckResult = await slotCheckResponse.json();
      console.log('Slot availability check result:', slotCheckResult, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      if (!slotCheckResponse.ok) {
        throw new Error(`HTTP error! status: ${slotCheckResponse.status}`);
      }
      if (!slotCheckResult.isAvailable || !slotCheckResult.availableStaff.includes(selectedStaff.name)) {
        Alert.alert('Booking Error', 'The selected staff is no longer available for this time slot. Please select a different time or staff member.');
        await fetchBookedSlotsAndStaff();
        setSelectedTime('');
        setSelectedStaff(null);
        return;
      }

      const orderData = {
        salonId: salon.salonId,
        amount: service.price,
        currency: 'INR',
        customerId: customerData.customerId || null,
        customerName: customerData.customerName,
        customerPhone: customerData.mobileNumber,
        location: salon.location,
        services: [{
          id: service.id,
          name: service.name,
          description: service.description,
          category: service.category,
          duration: service.duration,
          price: service.price,
          createdAt: service.createdAt,
          createdBy: service.createdBy
        }],
        paymentMethod: 'online'
      };
      console.log('Creating Razorpay order with data:', orderData, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      const response = await fetch(`${BASE_URL}/api/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });
      const result = await response.json();
      console.log('Razorpay order response:', result, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      if (!response.ok) {
        console.error('Razorpay order creation failed:', response.status, result.error, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        if (response.status === 401) {
          Alert.alert('Authentication Error', 'Please log in again.');
          navigation.navigate('Login');
        }
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      if (result.success) {
        const options = {
          description: `${service.name} Appointment`,
          image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
          currency: 'INR',
          key: RAZORPAY_KEY,
          amount: result.order.amount,
          name: salon.salonName,
          order_id: result.razorpayOrderId,
          prefill: {
            email: customerData.email,
            contact: customerData.mobileNumber,
            name: customerData.customerName
          },
          theme: { color: '#A16EFF' },
          retry: { enabled: true, max_count: 2 }
        };
        console.log('Opening Razorpay with options:', options, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        const data = await RazorpayCheckout.open(options).catch((error) => {
          console.error('Razorpay checkout error:', error.code, error.description, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          throw error;
        });
        console.log('Razorpay payment response (full):', JSON.stringify(data, null, 2), 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        if (data && data.razorpay_payment_id && !data.error) {
          console.log('Payment successful. Payment ID:', data.razorpay_payment_id, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          await bookAppointment('online', data.razorpay_payment_id, result.razorpayOrderId);
        } else {
          console.error('Payment failed or cancelled. Response:', JSON.stringify(data, null, 2), 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          Alert.alert('Payment Failed', 'Payment was cancelled or failed. Details: ' + (data?.error ? data.error.description : 'No payment ID received'));
        }
      } else {
        throw new Error(result.error || 'Failed to create Razorpay order');
      }
    } catch (error) {
      console.error('Error creating Razorpay order:', error.message, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      Alert.alert('Error', error.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const bookAppointment = async (paymentMethod, razorpayPaymentId = null, razorpayOrderId = null) => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('No token provided at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        Alert.alert('Error', 'Please log in to book an appointment.');
        navigation.navigate('Login');
        return;
      }
      const slotCheckResponse = await fetch(
        `${BASE_URL}/api/booking/check-slot?salonId=${salon.salonId}&bookingDate=${selectedDate}&time=${selectedTime}&serviceCategory=${encodeURIComponent(service.category)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const slotCheckResult = await slotCheckResponse.json();
      console.log('Slot availability check result:', slotCheckResult, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      if (!slotCheckResponse.ok) {
        throw new Error(`HTTP error! status: ${slotCheckResponse.status}`);
      }
      if (!slotCheckResult.isAvailable) {
        Alert.alert('Booking Error', 'The selected time slot is no longer available. Please choose a different time.');
        await fetchBookedSlotsAndStaff();
        setSelectedTime('');
        return;
      }
      const appointmentData = {
        salonName: salon.salonName,
        salonId: salon.salonId,
        location: salon.location,
        services: [{
          id: service.id,
          name: service.name,
          description: service.description,
          category: service.category,
          duration: service.duration,
          price: service.price,
          createdAt: service.createdAt || new Date().toISOString(),
          createdBy: service.createdBy || 'admin',
        }],
        Date: selectedDate,
        time: selectedTime,
        staff: selectedStaff.name,
        customerId: customerData.customerId || null,
        customerName: customerData.customerName || 'Guest',
        email: customerData.email || '',
        mobileNumber: customerData.mobileNumber || '',
        address: customerData.address || '',
        paymentMethod: paymentMethod === 'cash' ? 'cash' : paymentMethod === 'online' ? 'Razorpay' : 'unknown',
        razorpayOrderId: paymentMethod === 'cash' ? null : razorpayOrderId,
        razorpayPaymentId: paymentMethod === 'cash' ? null : razorpayPaymentId
      };
      console.log('Sending appointment data to backend:', JSON.stringify(appointmentData, null, 2), 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      const response = await fetch(`${BASE_URL}/api/booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(appointmentData),
      });
      const result = await response.json();
      console.log('Backend response:', JSON.stringify(result, null, 2), 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to book appointment');
      }
      Alert.alert('Success', `Appointment booked successfully with ${paymentMethod === 'cash' ? 'Cash' : 'Online'} payment!`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      await fetchBookedSlotsAndStaff();
      navigation.navigate('Appointment', {
        appointment: {
          service: service.name,
          price: service.price,
          date: selectedDate,
          time: selectedTime,
          stylist: selectedStaff.name,
          image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
          paymentMethod: paymentMethod,
        },
      });
    } catch (error) {
      console.error('Error booking appointment:', error.message, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      Alert.alert('Error', error.message || 'Failed to book appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Appointment</Text>
        </View>
        <View style={styles.serviceImageContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80' }}
            style={styles.mainImage}
          />
        </View>
        <View style={styles.details}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.servicePrice}>₹{service.price}</Text>
          <Text style={styles.serviceTime}>{service.duration} min</Text>
        </View>
        <View style={styles.datePicker}>
          <CalendarIcon size={20} color="#A16EFF" />
          <Calendar
            current={selectedDate}
            onDayPress={handleDateSelect}
            markedDates={{
              [selectedDate]: { selected: true, disableTouchEvent: true, selectedDotColor: '#A16EFF' },
            }}
            theme={{
              selectedDayBackgroundColor: '#A16EFF',
              todayTextColor: '#A16EFF',
            }}
          />
          {selectedDate && <Text style={styles.selectedDate}>Selected: {selectedDate}</Text>}
        </View>
        <View style={styles.timeSlots}>
          <Clock size={20} color="#A16EFF" />
          <Text style={styles.timeTitle}>Available Time Slots</Text>
          <View style={styles.timeOptions}>
            {timeSlots.map((slot, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.timeSlot,
                  selectedTime === slot && styles.timeSlotActive,
                  isSlotBooked(slot) && styles.timeSlotBooked,
                ]}
                onPress={() => !isSlotBooked(slot) && setSelectedTime(slot)}
                disabled={isSlotBooked(slot)}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    selectedTime === slot && styles.timeSlotTextActive,
                    isSlotBooked(slot) && styles.timeSlotTextBooked,
                  ]}
                >
                  {isSlotBooked(slot) ? 'Booked' : slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedTime && <Text style={styles.selectedTime}>Selected: {selectedTime}</Text>}
        </View>
        <View style={styles.staffSection}>
          <UserIcon size={20} color="#A16EFF" />
          <Text style={styles.staffTitle}>Select Staff</Text>
          {isLoading ? (
            <Text>Loading staff...</Text>
          ) : staffList.length === 0 ? (
            <Text>No staff available for {service.category}</Text>
          ) : !selectedTime ? (
            <Swiper showsButtons={false} loop={false} style={styles.swiper}>
              {staffList.map((staffMember, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.staffCard, selectedStaff?.name === staffMember.name && styles.staffCardActive]}
                  onPress={() => setSelectedStaff(staffMember)}
                >
                  <View style={styles.imageContainer}>
                    {imageLoading[staffMember.name] && (
                      <ActivityIndicator size="small" color="#A16EFF" style={styles.imageLoading} />
                    )}
                    <Image
                      source={{ uri: staffMember.image }}
                      style={styles.staffImage}
                      defaultSource={{ uri: defaultImage }}
                      onLoadStart={() => setImageLoading(prev => ({ ...prev, [staffMember.name]: true }))}
                      onLoadEnd={() => setImageLoading(prev => ({ ...prev, [staffMember.name]: false }))}
                      onError={(e) => {
                        console.warn(`Failed to load image for ${staffMember.name}: ${staffMember.image}, error: ${e.nativeEvent.error}`, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
                        setStaffList(prev =>
                          prev.map(s =>
                            s.name === staffMember.name ? { ...s, image: defaultImage } : s
                          )
                        );
                        setImageLoading(prev => ({ ...prev, [staffMember.name]: false }));
                      }}
                    />
                  </View>
                  <Text style={styles.staffName}>{staffMember.name}</Text>
                  <Text style={styles.staffRole}>{staffMember.role}</Text>
                </TouchableOpacity>
              ))}
            </Swiper>
          ) : staffList.filter(staffMember => !isStaffBooked(staffMember.name, selectedTime)).length === 0 ? (
            <Text>No staff available for {service.category} at {selectedTime}</Text>
          ) : (
            <Swiper showsButtons={false} loop={false} style={styles.swiper}>
              {staffList
                .filter(staffMember => !isStaffBooked(staffMember.name, selectedTime))
                .map((staffMember, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.staffCard, selectedStaff?.name === staffMember.name && styles.staffCardActive]}
                    onPress={() => setSelectedStaff(staffMember)}
                  >
                    <View style={styles.imageContainer}>
                      {imageLoading[staffMember.name] && (
                        <ActivityIndicator size="small" color="#A16EFF" style={styles.imageLoading} />
                      )}
                      <Image
                        source={{ uri: staffMember.image }}
                        style={styles.staffImage}
                        defaultSource={{ uri: defaultImage }}
                        onLoadStart={() => setImageLoading(prev => ({ ...prev, [staffMember.name]: true }))}
                        onLoadEnd={() => setImageLoading(prev => ({ ...prev, [staffMember.name]: false }))}
                        onError={(e) => {
                          console.warn(`Failed to load image for ${staffMember.name}: ${staffMember.image}, error: ${e.nativeEvent.error}`, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
                          setStaffList(prev =>
                            prev.map(s =>
                              s.name === staffMember.name ? { ...s, image: defaultImage } : s
                            )
                          );
                          setImageLoading(prev => ({ ...prev, [staffMember.name]: false }));
                        }}
                      />
                    </View>
                    <Text style={styles.staffName}>{staffMember.name}</Text>
                    <Text style={styles.staffRole}>{staffMember.role}</Text>
                  </TouchableOpacity>
                ))}
            </Swiper>
          )}
          {selectedStaff && <Text style={styles.selectedStaff}>Selected: {selectedStaff.name} ({selectedStaff.role})</Text>}
        </View>
      </ScrollView>
      {selectedDate && selectedTime && selectedStaff && !isLoading && (
        <TouchableOpacity
          style={[styles.bookButton, isLoading && styles.bookButtonDisabled]}
          onPress={handleBookAppointment}
          disabled={isLoading}
        >
          <Text style={styles.bookText}>{isLoading ? 'Booking...' : 'Book Appointment'}</Text>
        </TouchableOpacity>
      )}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPaymentModal}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            <TouchableOpacity style={styles.paymentOption} onPress={handleCashPayment}>
              <Text style={styles.paymentOptionText}>Pay with Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.paymentOption} onPress={handleOnlinePayment}>
              <Text style={styles.paymentOptionText}>Pay with UPI/Net Banking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 10,
  },
  serviceImageContainer: {
    marginTop: 20,
    marginHorizontal: 10,
  },
  mainImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  details: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E2E2E',
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A16EFF',
    marginTop: 5,
  },
  serviceTime: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 5,
  },
  datePicker: {
    margin: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
  },
  selectedDate: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 10,
    textAlign: 'center',
  },
  timeSlots: {
    padding: 15,
    backgroundColor: '#FFFFFF',
    margin: 10,
    borderRadius: 10,
  },
  timeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E2E2E',
    marginBottom: 15,
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeSlot: {
    padding: 12,
    backgroundColor: '#ECF0F1',
    borderRadius: 15,
    marginBottom: 12,
    width: '30%',
    alignItems: 'center',
  },
  timeSlotActive: {
    backgroundColor: '#A16EFF',
  },
  timeSlotBooked: {
    backgroundColor: '#FFE4E1',
  },
  timeSlotText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#000000',
    fontWeight: '500',
  },
  timeSlotTextActive: {
    color: '#FFFFFF',
  },
  timeSlotTextBooked: {
    color: '#FF4500',
    fontWeight: '600',
  },
  selectedTime: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 10,
  },
  staffSection: {
    padding: 15,
    margin: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  staffTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E2E2E',
    marginBottom: 10,
  },
  swiper: {
    height: 220,
  },
  staffCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  staffCardActive: {
    borderColor: '#A16EFF',
    borderWidth: 2,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  staffImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  imageLoading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
  },
  staffName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E2E2E',
    textAlign: 'center',
  },
  staffRole: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 5,
  },
  selectedStaff: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 10,
    textAlign: 'center',
  },
  bookButton: {
    backgroundColor: '#A16EFF',
    padding: 15,
    borderRadius: 10,
    margin: 10,
    alignItems: 'center',
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  bookButtonDisabled: {
    backgroundColor: '#B0A8FF',
    opacity: 0.7,
  },
  bookText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2E2E2E',
  },
  paymentOption: {
    backgroundColor: '#A16EFF',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  paymentOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 10,
    padding: 10,
  },
  cancelButtonText: {
    color: '#FF4500',
    fontSize: 16,
    fontWeight: 'bold',
  },
});