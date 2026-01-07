import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LucideIcon, Calendar as CalendarIcon, Clock, User as UserIcon } from 'lucide-react-native';
import Swiper from 'react-native-swiper';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RazorpayCheckout from 'react-native-razorpay';
import axios from 'axios';
import ReactNativeBlobUtil from 'react-native-blob-util';
import moment from 'moment-timezone';

const apiService = {
  BASE_URL: 'https://backendsalon.pragyacode.com',
 
  async fetchWithAuth(endpoint, options = {}, retries = 3) {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('Authentication required');
   
    const fetchOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    };
   
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.BASE_URL}${endpoint}`, fetchOptions);
        const data = await response.json();
       
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        return data;
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  },
 
  async getSalonDetails(salonId) {
    return this.fetchWithAuth(`/api/public/salons?salonId=${salonId}`);
  },
 
  async getCustomerData() {
    return this.fetchWithAuth('/api/customer-app/me');
  },
 
  async checkSlotAvailability(salonId, date, time, category) {
    return this.fetchWithAuth(
      `/api/booking/check-slot?salonId=${salonId}&bookingDate=${date}&time=${time}&serviceCategory=${encodeURIComponent(category)}`
    );
  },
 
  async createOrder(orderData) {
    return this.fetchWithAuth('/api/razorpay/create-order', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },
 
  async verifyPayment(paymentData) {
    return this.fetchWithAuth('/api/razorpay/verify-payment', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  },
 
  async bookAppointment(appointmentData) {
    return this.fetchWithAuth('/api/booking', {
      method: 'POST',
      body: JSON.stringify(appointmentData)
    });
  }
};

// Custom Hooks
const useSalonDetails = (salonId) => {
  const [salon, setSalon] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchSalon = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getSalonDetails(salonId);
      setSalon(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [salonId]);
  useEffect(() => {
    fetchSalon();
  }, [fetchSalon]);
  return { salon, loading, error, refetch: fetchSalon };
};

const useCustomerData = () => {
  const [customer, setCustomer] = useState({
    customerId: null,
    customerName: 'Guest',
    email: '',
    mobileNumber: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchCustomer = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getCustomerData();
      if (data.customer) {
        setCustomer({
          customerId: data.customer.customerId || null,
          customerName: data.customer.fullName || 'Guest',
          email: data.customer.email || '',
          mobileNumber: data.customer.mobileNumber || '',
          address: data.customer.address || ''
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);
  return { customer, loading, error, refetch: fetchCustomer };
};

const useSlotAvailability = (salonId, date, category, staffList) => {
  const [bookedSlots, setBookedSlots] = useState([]);
  const [bookedStaff, setBookedStaff] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const checkAvailability = useCallback(async () => {
    if (!date || !category) return;
   
    try {
      setLoading(true);
      const slots = generateTimeSlots('10:00', '18:00'); // Default slots
      const bookedSlots = [];
      const bookedStaffBySlot = {};
     
      for (const time of slots) {
        const result = await apiService.checkSlotAvailability(salonId, date, time, category);
        if (!result.isAvailable) bookedSlots.push(time);
       
        const unavailableStaffNames = (result.availableStaff || []).map(s => (s.name || '').trim());
        bookedStaffBySlot[time] = staffList.filter(staff => !unavailableStaffNames.includes(staff.name));
      }
     
      setBookedSlots(bookedSlots);
      setBookedStaff(bookedStaffBySlot);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [salonId, date, category, staffList]);
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);
  return { bookedSlots, bookedStaff, loading, error, refetch: checkAvailability };
};

// Helper Functions
const generateTimeSlots = (open, close) => {
  const slots = [];
  const [openHour, openMinute] = open.split(':').map(Number);
  const [closeHour, closeMinute] = close.split(':').map(Number);
 
  let currentHour = openHour;
  let currentMinute = openMinute;
  while (currentHour < closeHour || (currentHour === closeHour && currentMinute <= closeMinute)) {
    slots.push(`${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentHour += 1;
      currentMinute -= 60;
    }
  }
 
  return slots;
};

const generateInvoicePDF = async (orderData) => {
  try {
    const filename = `invoice_${orderData.orderId}_BMG.pdf`;
    const pdfPath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${filename}`;
    const formattedDate = moment().tz("Asia/Kolkata").format("DD MMM YYYY, hh:mm A");
    const salonAddressLines = [
      orderData.location?.addressLine1 || 'Address Line 1',
      `${orderData.location?.city || 'City'}, ${orderData.location?.state || 'State'} - ${orderData.location?.pincode || 'PIN'}`
    ].filter(line => line && line !== 'Address Line 1' && line !== 'City, State - PIN').join(', ');
    const pdfContent = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 842]
   /Contents 4 0 R
   /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 5000 >>
stream
% === Dashed Border & Lines Setup ===
0.5 w
[2 2] 0 d % Dashed pattern for all lines
% Draw outer dashed border around content (not full page)
45 820 m 45 430 l S % left
45 820 m 355 820 l S % top
355 820 m 355 430 l S % right
45 430 m 355 430 l S % bottom just below thank-you text
% Reset for text layout
[] 0 d
BT
/F1 14 Tf
140 800 Td
(BOOKMYGLOW) Tj
ET
BT
/F1 9 Tf
80 780 Td
(Registered Office: Bombay House) Tj
0 -12 Td
(24 Homi Modi Street, Mumbai - 400001) Tj
0 -12 Td
(GSTIN: ${orderData.gstNumber || "09ABBFP5267E1Z5"}) Tj
ET
BT
/F1 9 Tf
80 730 Td
(Salon: ${orderData.salonName || "Glamour Beauty Salon"}) Tj
0 -12 Td
(${salonAddressLines || "First Floor, H-Block, Goel Tower, Faizabad Rd, Lucknow, UP - 226028"}) Tj
ET
[2 2] 0 d
0.5 w
50 700 m 350 700 l S
[] 0 d
BT
/F1 11 Tf
150 685 Td
(TAX INVOICE) Tj
ET
[2 2] 0 d
0.5 w
50 670 m 350 670 l S
[] 0 d
BT
/F1 9 Tf
60 655 Td
(Order No: ${orderData.orderId}) Tj
130 0 Td
(Date: ${formattedDate}) Tj
-130 -12 Td
(Mobile: ${orderData.customerPhone || "N/A"}) Tj
ET
[2 2] 0 d
0.5 w
50 635 m 350 635 l S
[] 0 d
BT
/F1 9 Tf
60 620 Td
(Description Price Qty Disc Net) Tj
ET
[2 2] 0 d
0.5 w
50 610 m 350 610 l S
[] 0 d
BT
/F1 9 Tf
 ${orderData.services
  .map(
    (s, i) =>
      `60 ${595 - i * 12} Td
(${s.name || "Service"} ${s.price.toFixed(2)} ${s.qty || 1} 0.00 ${(s.qty || 1) * s.price}) Tj`
  )
  .join("\n")}
ET
[2 2] 0 d
0.5 w
50 560 m 350 560 l S
[] 0 d
BT
/F1 9 Tf
60 545 Td
(Gross Total: INR ${orderData.amount.toFixed(2)}) Tj
0 -12 Td
(Total Invoice: INR ${orderData.amount.toFixed(2)}) Tj
0 -12 Td
(GST Inclusive | Total: INR ${orderData.amount.toFixed(2)}) Tj
ET
[2 2] 0 d
0.5 w
50 510 m 350 510 l S
[] 0 d
BT
/F1 9 Tf
60 495 Td
(Payment Mode: ${orderData.paymentMode || "CASH"}) Tj
0 -12 Td
(Amount Paid: INR ${orderData.amount.toFixed(2)}) Tj
ET
[2 2] 0 d
0.5 w
50 470 m 350 470 l S
[] 0 d
BT
/F1 8 Tf
90 455 Td
(* All offers are subject to T&C) Tj
0 -12 Td
(Thank You for choosing BookMyGlow) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Courier >>
endobj
xref
0 6
0000000000 65535 f
0000000010 00000 n
0000000070 00000 n
0000000150 00000 n
0000000410 00000 n
0000004820 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
5200
%%EOF
`.trim();
    await ReactNativeBlobUtil.fs.writeFile(pdfPath, pdfContent, "utf8");
    const base64 = await ReactNativeBlobUtil.fs.readFile(pdfPath, "base64");
    const pdfBase64 = `data:application/pdf;base64,${base64}`;
    await ReactNativeBlobUtil.fs.unlink(pdfPath).catch(() => {});
    return { pdfBase64, filename };
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    throw new Error(`Failed to generate invoice PDF: ${error.message}`);
  }
};

const sendWhatsAppDocument = async ({ to, filename, document, caption }) => {
  try {
    const formattedPhone = to.startsWith('+') ? to : `+91${to}`;
    if (!/^\+\d{10,15}$/.test(formattedPhone)) {
      throw new Error(`Invalid phone number format: ${to}`);
    }
    if (!document.startsWith('data:application/pdf;base64,')) {
      throw new Error('Invalid Base64 string: Must be a PDF with correct MIME type');
    }
    const base64Data = document.replace(/^data:application\/pdf;base64,/, '');
    const fileSizeMB = (base64Data.length * 0.75) / (1024 * 1024);
    const maxFileSizeMB = 90;
    if (fileSizeMB > maxFileSizeMB) {
      throw new Error(`PDF size (${fileSizeMB.toFixed(2)} MB) exceeds WhatsApp limit of ${maxFileSizeMB} MB`);
    }
    const ULTRAMSG_TOKEN_VALUE = (process.env.ULTRAMSG_TOKEN || '').toString().trim() || '36afbkrxwoijp3sj';
    const ULTRAMSG_INSTANCE_ID_VALUE = (process.env.ULTRAMSG_INSTANCE_ID || '').toString().trim() || 'instance141580';
    const documentData = new URLSearchParams({
      token: ULTRAMSG_TOKEN_VALUE,
      to: formattedPhone,
      filename,
      document: base64Data,
      caption,
    }).toString();
    const response = await axios.post(
      `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID_VALUE}/messages/document`,
      documentData,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000,
      }
    );
    console.log('WhatsApp Document Sent:', JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp document:', error);
    throw new Error(`Failed to send WhatsApp document: ${error.message}`);
  }
};

// UI Components (unchanged)
const ServiceDetails = ({ service }) => (
  <View style={styles.details}>
    <Text style={styles.serviceName}>{service.name}</Text>
    <Text style={styles.servicePrice}>₹{service.price}</Text>
    <Text style={styles.serviceTime}>{service.duration} min</Text>
  </View>
);

const CalendarPicker = ({ selectedDate, onDateSelect }) => (
  <View style={styles.datePicker}>
    <CalendarIcon size={20} color="#A16EFF" />
    <Calendar
      current={selectedDate}
      onDayPress={onDateSelect}
      markedDates={{ [selectedDate]: { selected: true, disableTouchEvent: true, selectedDotColor: '#A16EFF' } }}
      theme={{ selectedDayBackgroundColor: '#A16EFF', todayTextColor: '#A16EFF' }}
      minDate={new Date().toISOString().split('T')[0]}
    />
    {selectedDate && <Text style={styles.selectedDate}>Selected: {selectedDate}</Text>}
  </View>
);

const TimeSlotPicker = ({ timeSlots, selectedTime, bookedSlots, onSelectTime }) => (
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
            bookedSlots.includes(slot) && styles.timeSlotBooked
          ]}
          onPress={() => !bookedSlots.includes(slot) && onSelectTime(slot)}
          disabled={bookedSlots.includes(slot)}
        >
          <Text style={[
            styles.timeSlotText,
            selectedTime === slot && styles.timeSlotTextActive,
            bookedSlots.includes(slot) && styles.timeSlotTextBooked
          ]}>
            {bookedSlots.includes(slot) ? 'Booked' : slot}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
    {selectedTime && <Text style={styles.selectedTime}>Selected: {selectedTime}</Text>}
  </View>
);

const StaffPicker = ({ staffList, selectedStaff, selectedTime, bookedStaff, onSelectStaff, imageLoading, setImageLoading }) => {
  const defaultImage = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80';
 
  const availableStaff = selectedTime
    ? staffList.filter(staff => !bookedStaff[selectedTime]?.some(s => s.name === staff.name))
    : staffList;
  return (
    <View style={styles.staffSection}>
      <UserIcon size={20} color="#A16EFF" />
      <Text style={styles.staffTitle}>Select Staff</Text>
     
      {staffList.length === 0 ? (
        <Text>No staff available</Text>
      ) : availableStaff.length === 0 ? (
        <Text>No staff available at {selectedTime}</Text>
      ) : (
        <Swiper showsButtons={false} loop={false} style={styles.swiper}>
          {availableStaff.map((staffMember, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.staffCard,
                selectedStaff?.name === staffMember.name && styles.staffCardActive
              ]}
              onPress={() => onSelectStaff(staffMember)}
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
                  onError={() => {
                    setImageLoading(prev => ({ ...prev, [staffMember.name]: false }));
                  }}
                />
              </View>
              <Text style={styles.staffName}>{staffMember.name}</Text>
            </TouchableOpacity>
          ))}
        </Swiper>
      )}
     
      {selectedStaff && <Text style={styles.selectedStaff}>Selected: {selectedStaff.name}</Text>}
    </View>
  );
};

const PaymentModal = ({ visible, onClose, onCashPayment, onOnlinePayment }) => (
  <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Select Payment Method</Text>
        <TouchableOpacity style={styles.paymentOption} onPress={onCashPayment}>
          <Text style={styles.paymentOptionText}>Pay with Cash</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.paymentOption} onPress={onOnlinePayment}>
          <Text style={styles.paymentOptionText}>Pay with UPI/Net Banking</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// Main Component
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
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [timeSlots, setTimeSlots] = useState(generateTimeSlots('10:00', '18:00'));
 
  const { salon: salonData, loading: salonLoading } = useSalonDetails(salon.salonId);
  const { customer, loading: customerLoading } = useCustomerData();
  const { bookedSlots, bookedStaff, loading: slotsLoading } = useSlotAvailability(
    salon.salonId,
    selectedDate,
    service.category,
    staffList
  );

  useEffect(() => {
    if (salonData) {
      const slots = generateTimeSlots(salonData.openTime || '10:00', salonData.closeTime || '18:00');
      setTimeSlots(slots);
    }
  }, [salonData]);

  useEffect(() => {
    const fetchStaff = async () => {
      if (timeSlots.length === 0) return;
     
      try {
        setIsLoading(true);
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          navigation.navigate('Login');
          return;
        }
       
        const firstSlot = timeSlots[0] || '10:00';
        const result = await apiService.checkSlotAvailability(
          salon.salonId,
          selectedDate,
          firstSlot,
          service.category
        );
       
        const availableStaff = Array.isArray(result.availableStaff) ? result.availableStaff : [];
        const defaultImage = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80';
       
        const formattedStaff = availableStaff.map(staff => ({
          name: (staff.name || '').trim(),
          image: staff.image || defaultImage
        })).filter(staff => staff.name);
       
        setStaffList(formattedStaff);
        setImageLoading(formattedStaff.reduce((acc, staff) => ({ ...acc, [staff.name]: true }), {}));
      } catch (error) {
        console.error('Error fetching staff:', error.message);
        setStaffList([]);
      } finally {
        setIsLoading(false);
      }
    };
   
    fetchStaff();
  }, [salon.salonId, service.category, selectedDate, timeSlots, navigation]);

  const handleDateSelect = (day) => {
    const today = moment().startOf('day');
    const selected = moment(day.dateString);
   
    if (selected.isBefore(today)) {
      Alert.alert('Error', 'Cannot select a past date.');
      return;
    }
   
    setSelectedDate(day.dateString);
    setSelectedTime('');
    setSelectedStaff(null);
  };

  const handleBookAppointment = () => {
    if (!selectedDate || !selectedTime || !selectedStaff) {
      Alert.alert('Error', 'Please select a date, time, and staff member.');
      return;
    }
   
    if (isLoading || salonLoading || customerLoading || slotsLoading) {
      Alert.alert('Error', 'Please wait while the data is loading.');
      return;
    }
   
    setShowPaymentModal(true);
  };

  const handleCashPayment = async () => {
    setShowPaymentModal(false);
    try {
      setIsLoading(true);
     
      if (!customer.customerName || !customer.email || !customer.mobileNumber) {
        Alert.alert('Error', 'Please complete your profile with name, email, and mobile number.');
        navigation.navigate('Profile');
        return;
      }
      const slotCheckResult = await apiService.checkSlotAvailability(
        salon.salonId,
        selectedDate,
        selectedTime,
        service.category
      );
      if (!slotCheckResult.isAvailable ||
          !(slotCheckResult.availableStaff || []).some(staff =>
            (staff.name || '').trim() === selectedStaff.name)) {
        Alert.alert('Booking Error', 'The selected staff is no longer available for this time slot.');
        setSelectedTime('');
        setSelectedStaff(null);
        return;
      }
      const orderData = {
        salonId: salon.salonId,
        amount: service.price,
        currency: 'INR',
        customerId: customer.customerId || null,
        customerName: customer.customerName,
        customerPhone: customer.mobileNumber,
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
      await apiService.createOrder(orderData);
      await bookAppointment('cash');
    } catch (error) {
      console.error('Error processing cash payment:', error);
      Alert.alert('Error', error.message || 'Failed to process cash payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnlinePayment = async () => {
    setShowPaymentModal(false);
    try {
      setIsLoading(true);
     
      if (!customer.customerName || !customer.email || !customer.mobileNumber) {
        Alert.alert('Error', 'Please complete your profile with name, email, and mobile number.');
        navigation.navigate('Profile');
        return;
      }
      if (!/^\+?\d{10,12}$/.test(customer.mobileNumber)) {
        Alert.alert('Error', 'Please provide a valid mobile number (e.g., +91xxxxxxxxxx or 91xxxxxxxxxx).');
        return;
      }
      if (service.price < 1) {
        Alert.alert('Error', 'Payment amount must be at least 100 INR.');
        return;
      }
      const slotCheckResult = await apiService.checkSlotAvailability(
        salon.salonId,
        selectedDate,
        selectedTime,
        service.category
      );
      if (!slotCheckResult.isAvailable ||
          !(slotCheckResult.availableStaff || []).some(staff =>
            (staff.name || '').trim() === selectedStaff.name)) {
        Alert.alert('Booking Error', 'The selected staff is no longer available for this time slot.');
        setSelectedTime('');
        setSelectedStaff(null);
        return;
      }
      const orderData = {
        salonId: salon.salonId,
        amount: service.price,
        currency: 'INR',
        customerId: customer.customerId || null,
        customerName: customer.customerName,
        customerPhone: customer.mobileNumber,
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
      const orderResult = await apiService.createOrder(orderData);
     
      if (!orderResult.success || !orderResult.razorpayOrderId) {
        throw new Error(orderResult.error || `Failed to create Razorpay order`);
      }
      const keyToUse = (orderResult.key || process.env.RAZORPAY_KEY_ID || '').trim();
      if (!keyToUse) {
        Alert.alert('Payment Setup Error', 'Razorpay key is missing.');
        return;
      }
      const amountPaise = parseInt(Number(service.price) * 100, 10);
      if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
        Alert.alert('Payment Error', 'Invalid amount for payment.');
        return;
      }
      const options = {
        description: `${service.name} Appointment`,
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
        currency: 'INR',
        key: keyToUse,
        amount: amountPaise,
        name: salon.salonName,
        order_id: orderResult.razorpayOrderId,
        prefill: {
          email: customer.email || '',
          contact: customer.mobileNumber || '',
          name: customer.customerName || ''
        },
        theme: { color: '#A16EFF' },
        retry: { enabled: true, max_count: 2 }
      };
      const data = await RazorpayCheckout.open(options).catch((error) => {
        if (error.code === 0) {
          Alert.alert('Payment Cancelled', 'Payment has been cancelled. You can try again.');
          return null;
        }
        throw new Error(`Razorpay checkout failed: ${error.description || error.message}`);
      });
     
      if (data === null) return;
      const paymentIdFromRazorpay = data?.razorpay_payment_id || null;
      const orderIdFromRazorpay = data?.razorpay_order_id || null;
      const signatureFromRazorpay = data?.razorpay_signature || null;
      if (paymentIdFromRazorpay && orderIdFromRazorpay && signatureFromRazorpay) {
        const verifyResult = await apiService.verifyPayment({
          razorpay_order_id: orderIdFromRazorpay,
          razorpay_payment_id: paymentIdFromRazorpay,
          razorpay_signature: signatureFromRazorpay
        });
        if (!verifyResult.success) {
          throw new Error(verifyResult.error || `Payment verification failed`);
        }
        // Generate and send invoice PDF via WhatsApp
        const invoiceData = {
          orderId: orderIdFromRazorpay,
          customerName: customer.customerName,
          customerPhone: customer.mobileNumber,
          amount: service.price,
          services: [{ name: service.name, price: service.price, qty: 1 }],
          salonName: salon.salonName,
          location: salon.location,
          paymentMode: 'ONLINE',
          gstNumber: '09ABBFP5267E1Z5'
        };
       
        const { pdfBase64, filename } = await generateInvoicePDF(invoiceData);
       
        try {
          await sendWhatsAppDocument({
            to: customer.mobileNumber,
            filename,
            document: pdfBase64,
            caption: `Invoice for Order ${orderIdFromRazorpay}`,
          });
          Alert.alert('Success', 'Payment successful! Your invoice has been sent to your WhatsApp number.');
        } catch (whatsappError) {
          console.error('Failed to send WhatsApp invoice:', whatsappError);
          Alert.alert('Warning', 'Payment successful, but we couldn’t send the invoice via WhatsApp.');
        }
        await bookAppointment('online', paymentIdFromRazorpay, orderIdFromRazorpay, signatureFromRazorpay);
      } else {
        Alert.alert('Payment Failed', 'Did not receive valid payment details from Razorpay.');
      }
    } catch (error) {
      console.error('Error processing online payment:', error);
      Alert.alert('Error', error.message || 'Failed to process payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const bookAppointment = async (paymentMethod, razorpayPaymentId = null, razorpayOrderId = null, razorpaySignature = null) => {
    try {
      setIsLoading(true);
     
      const slotCheckResult = await apiService.checkSlotAvailability(
        salon.salonId,
        selectedDate,
        selectedTime,
        service.category
      );
      if (!slotCheckResult.isAvailable) {
        Alert.alert('Booking Error', 'The selected time slot is no longer available.');
        setSelectedTime('');
        return;
      }

      // ✅ FIXED PAYLOAD: using bookingDate instead of Date
      const appointmentData = {
        salonName: salon.salonName,
        salonId: salon.salonId,
        location: {
          addressLine1: salon.location?.addressLine1 || '',
          addressLine2: salon.location?.addressLine2 || '',
          city: salon.location?.city || '',
          state: salon.location?.state || '',
          pincode: salon.location?.pincode || '',
          country: salon.location?.country || 'India'
        },
        services: [{
          id: service.id,
          name: service.name,
          description: service.description,
          category: service.category,
          duration: service.duration,
          price: service.price,
          createdAt: service.createdAt || new Date().toISOString(),
          createdBy: service.createdBy || 'admin'
        }],
        bookingDate: selectedDate,  // ✅ Correct field name & value (e.g., "2025-12-26")
        time: selectedTime,
        staff: selectedStaff.name.trim(),
        customerName: customer.customerName,
        email: customer.email,
        mobileNumber: customer.mobileNumber,
        address: customer.address,
        paymentMethod: paymentMethod === 'cash' ? 'Cash' : 'Razorpay',
        razorpayOrderId: razorpayOrderId || null,
        razorpayPaymentId: razorpayPaymentId || null,
        razorpaySignature: razorpaySignature || null,
      };

      await apiService.bookAppointment(appointmentData);
     
      Alert.alert('Success', `Appointment booked successfully with ${paymentMethod === 'cash' ? 'Cash' : 'Online'} payment!`);
     
      setTimeout(() => {
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
      }, 1500);
    } catch (error) {
      console.error('Error booking appointment:', error);
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
       
        <ServiceDetails service={service} />
       
        <CalendarPicker
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />
       
        <TimeSlotPicker
          timeSlots={timeSlots}
          selectedTime={selectedTime}
          bookedSlots={bookedSlots}
          onSelectTime={setSelectedTime}
        />
       
        <StaffPicker
          staffList={staffList}
          selectedStaff={selectedStaff}
          selectedTime={selectedTime}
          bookedStaff={bookedStaff}
          onSelectStaff={setSelectedStaff}
          imageLoading={imageLoading}
          setImageLoading={setImageLoading}
        />
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
     
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onCashPayment={handleCashPayment}
        onOnlinePayment={handleOnlinePayment}
      />
     
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    marginTop: 25
  },
  scrollView: {
    flex: 1
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 10
  },
  serviceImageContainer: {
    marginTop: 20,
    marginHorizontal: 10
  },
  mainImage: {
    width: '100%',
    height: 200,
    borderRadius: 10
  },
  details: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    borderRadius: 10,
    marginHorizontal: 10
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E2E2E'
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A16EFF',
    marginTop: 5
  },
  serviceTime: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 5
  },
  datePicker: {
    margin: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10
  },
  selectedDate: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 10,
    textAlign: 'center'
  },
  timeSlots: {
    padding: 15,
    backgroundColor: '#FFFFFF',
    margin: 10,
    borderRadius: 10
  },
  timeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E2E2E',
    marginBottom: 15
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  timeSlot: {
    padding: 12,
    backgroundColor: '#ECF0F1',
    borderRadius: 15,
    marginBottom: 12,
    width: '30%',
    alignItems: 'center'
  },
  timeSlotActive: {
    backgroundColor: '#A16EFF'
  },
  timeSlotBooked: {
    backgroundColor: '#FFE4E1'
  },
  timeSlotText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#000000',
    fontWeight: '500'
  },
  timeSlotTextActive: {
    color: '#FFFFFF'
  },
  timeSlotTextBooked: {
    color: '#FF4500',
    fontWeight: '600'
  },
  selectedTime: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 10
  },
  staffSection: {
    padding: 15,
    margin: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF'
  },
  staffTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E2E2E',
    marginBottom: 10
  },
  swiper: {
    height: 220
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
    elevation: 2
  },
  staffCardActive: {
    borderColor: '#A16EFF',
    borderWidth: 2
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100
  },
  staffImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10
  },
  imageLoading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }]
  },
  staffName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E2E2E',
    textAlign: 'center'
  },
  selectedStaff: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 10,
    textAlign: 'center'
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
    right: 10
  },
  bookButtonDisabled: {
    backgroundColor: '#B0A8FF',
    opacity: 0.7
  },
  bookText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2E2E2E'
  },
  paymentOption: {
    backgroundColor: '#A16EFF',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: '100%',
    alignItems: 'center'
  },
  paymentOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  cancelButton: {
    marginTop: 10,
    padding: 10
  },
  cancelButtonText: {
    color: '#FF4500',
    fontSize: 16,
    fontWeight: 'bold'
  },
});