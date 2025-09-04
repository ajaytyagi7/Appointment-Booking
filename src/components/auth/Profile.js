import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  ScrollView,
  TextInput,
   ActivityIndicator,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LucideUser,
  LucideLogOut,
  LucideMail,
  LucidePhone,
  LucideCreditCard,
  LucideBell,
  LucideHelpCircle,
  LucideX,
  LucideEdit,
} from 'lucide-react-native';
import { LucideIcon, Home as HomeIcon, Calendar, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';

const { width } = Dimensions.get('window');
const BASE_URL = 'http://172.24.57.37:8005';

export default function Profile({ navigation }) {
  const mainNavigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [fullName, setFullName] = useState('Guest');
  const [mobileNumber, setMobileNumber] = useState('N/A');
  const [email, setEmail] = useState('You are not logged in');
  const [gender, setGender] = useState('N/A');
  const [address, setAddress] = useState('N/A');
  const [roleId, setRoleId] = useState('N/A');
  const [customerId, setCustomerId] = useState('N/A');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeNav, setActiveNav] = useState('Profile');
  // Edit form states
  const [editFullName, setEditFullName] = useState('');
  const [editMobileNumber, setEditMobileNumber] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editAddress, setEditAddress] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const fetchCustomerData = async () => {
      let storedToken;
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          storedToken = await AsyncStorage.getItem('userToken');
          if (storedToken) break;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!storedToken) {
          console.error('No token found at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          Alert.alert('Error', 'Please log in to view profile');
          await performLogout();
          return;
        }

        setIsLoggedIn(true);

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
          if (customerResponse.status === 401) {
            await performLogout();
          } else {
            Alert.alert('Error', `Could not fetch customer data (Status: ${customerResponse.status})`);
          }
          setIsLoading(false);
          return;
        }

        const customerData = await customerResponse.json();
        console.log('Customer Data Response:', JSON.stringify(customerData, null, 2), 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        const customer = customerData.customer;
        if (customer) {
          setFullName(customer.fullName || 'Guest');
          setMobileNumber(customer.mobileNumber || 'N/A');
          setEmail(customer.email || 'No email provided');
          setGender(customer.gender || 'N/A');
          setAddress(customer.address || 'N/A');
          setRoleId(customer.roleId || 'N/A');
          setCustomerId(customer.customerId || 'N/A');
          // Initialize edit form states
          setEditFullName(customer.fullName || '');
          setEditMobileNumber(customer.mobileNumber || '');
          setEditEmail(customer.email || '');
          setEditGender(customer.gender || 'Male');
          setEditAddress(customer.address || '');
        } else {
          setEmail('You are not logged in');
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Error fetching data:', error.message, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        Alert.alert('Error', 'Failed to fetch data due to a network or server issue');
        await performLogout();
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerData();
  }, []);

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
  };

  const performLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('customerId');
      setIsLoggedIn(false);
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error.message, 'at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      Alert.alert('Error', 'Logout failed. Please try again.');
    }
  };

  const handleUpdateProfile = async () => {
    const trimmedFullName = editFullName.trim();
    const trimmedMobileNumber = editMobileNumber.trim();
    const trimmedEmail = editEmail.trim();
    const trimmedAddress = editAddress.trim();

    if (
      !trimmedFullName ||
      !trimmedMobileNumber ||
      !trimmedEmail ||
      !editGender ||
      !trimmedAddress
    ) {
      Alert.alert('Error', 'Please fill in all fields correctly.');
      return;
    }

    setEditLoading(true);

    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      if (!storedToken) {
        Alert.alert('Error', 'No authentication token found. Please log in again.');
        await performLogout();
        return;
      }

     const response = await axios.post(`${BASE_URL}/api/customer-app/update`, {
        fullName: trimmedFullName,
        mobileNumber: trimmedMobileNumber,
        email: trimmedEmail,
        gender: editGender,
        address: trimmedAddress,
      }, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Update local state with new data
      setFullName(trimmedFullName);
      setMobileNumber(trimmedMobileNumber);
      setEmail(trimmedEmail);
      setGender(editGender);
      setAddress(trimmedAddress);

      setEditLoading(false);
      Alert.alert('Success', 'Profile updated successfully!');
      setEditModalVisible(false);
    } catch (error) {
      setEditLoading(false);
      const errorMessage =
        error.response?.data?.error || 'Something went wrong. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const getRealData = (item) => {
    switch (item) {
      case 'Personal Information':
        return {
          title: 'Personal Information',
          details: `Name: ${fullName || 'N/A'}\nMobile Number: ${mobileNumber}\nGender: ${gender}\nAddress: ${address}`,
        };
      case 'Email Notifications':
        return {
          title: 'Email Notifications',
          details: `Email: ${email || 'N/A'}`,
        };
      case 'Phone Number':
        return {
          title: 'Phone Number',
          details: `Primary: ${mobileNumber}`,
        };
      case 'Payment Methods':
        return {
          title: 'Payment Methods',
          details: `UPI: Google Pay, PhonePe, Paytm\nNet Banking: Debit Card, Credit Card\nCash: Available`,
        };
      default:
        return { title: 'Details', details: 'No data available' };
    }
  };

  const realData = selectedItem ? getRealData(selectedItem) : null;

  const navItems = [
    { icon: HomeIcon, label: 'Home', screen: 'Home' },
    { icon: Calendar, label: 'Appointment', screen: 'Appointment' },
    { icon: User, label: 'Profile', screen: 'Profile' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Image source={require('../../assets/man2.jpg')} style={styles.avatar} />
          <View style={styles.textContainer}>
            <Text style={styles.name}>{isLoading ? 'Loading...' : fullName}</Text>
            <Text style={styles.email}>{isLoading ? 'Loading...' : email}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditModalVisible(true)}
            >
              <LucideEdit size={20} color="#A16EFF" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.menu}>
        <Text style={styles.menuHeader}>Account</Text>
        <MenuItem
          icon={<LucideUser color="#6B46C1" size={24} />}
          label="Personal Information"
          onPress={() => handleItemClick('Personal Information')}
        />
        <MenuItem
          icon={<LucideMail color="#6B46C1" size={24} />}
          label="Email Notifications"
          onPress={() => handleItemClick('Email Notifications')}
        />
        <MenuItem
          icon={<LucidePhone color="#6B46C1" size={24} />}
          label="Phone Number"
          onPress={() => handleItemClick('Phone Number')}
        />
        <MenuItem
          icon={<LucideCreditCard color="#6B46C1" size={24} />}
          label="Payment Methods"
          onPress={() => handleItemClick('Payment Methods')}
        />

        <Text style={styles.menuHeader}>Settings</Text>
        <MenuItem icon={<LucideBell color="#6B46C1" size={24} />} label="Notifications" />
        <MenuItem icon={<LucideHelpCircle color="#6B46C1" size={24} />} label="Help & Support" />

        {isLoggedIn && (
          <MenuItem
            icon={<LucideLogOut color="#FF3B30" size={24} />}
            label="Logout"
            onPress={performLogout}
          />
        )}
      </View>

      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          <Text style={styles.link} onPress={() => navigation.navigate('Privacy')}>Privacy Policy</Text> | 
          <Text style={styles.link} onPress={() => navigation.navigate('Terms')}>Terms & Conditions</Text>
        </Text>
      </View>

      <View style={styles.versionContainer}>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      <View style={styles.navBar}>
        {navItems.map(({ icon: Icon, label, screen }) => (
          <TouchableOpacity
            key={label}
            style={styles.navButton}
            onPress={() => {
              setActiveNav(label);
              mainNavigation.navigate(screen);
            }}
          >
            <Icon size={20} color={activeNav === label ? '#A16EFF' : '#969292ff'} />
            <Text style={[styles.navText, activeNav === label ? styles.navTextActive : styles.navTextInactive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <LucideX color="#6B46C1" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{realData?.title}</Text>
            <Text style={styles.modalDetails}>{realData?.details}</Text>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeEditModal}>
              <LucideX color="#6B46C1" size={24} />
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.editContentContainer}>
              <Text style={styles.topText}>Edit Profile</Text>
              <Text style={styles.subText}>Update your personal information</Text>

              <TextInput
                style={styles.input}
                value={editFullName}
                onChangeText={setEditFullName}
                placeholder="Full Name"
                placeholderTextColor="#999"
              />

              <TextInput
                style={styles.input}
                value={editMobileNumber}
                onChangeText={setEditMobileNumber}
                placeholder="Mobile Number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />

              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Email"
                placeholderTextColor="#999"
                keyboardType="email-address"
              />

              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[styles.genderButton, editGender === 'Male' && styles.selectedGender]}
                  onPress={() => setEditGender('Male')}
                >
                  <Text style={styles.genderText}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderButton, editGender === 'Female' && styles.selectedGender]}
                  onPress={() => setEditGender('Female')}
                >
                  <Text style={styles.genderText}>Female</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Address"
                placeholderTextColor="#999"
              />

              {editLoading ? (
                <ActivityIndicator size="large" color="#A16EFF" style={{ marginTop: 20 }} />
              ) : (
                <TouchableOpacity onPress={handleUpdateProfile} style={styles.buttonWrapper}>
                  <LinearGradient colors={['#dca5f1ff', '#A16EFF']} style={styles.button}>
                    <Text style={styles.buttonText}>Update Profile</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const MenuItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    {icon}
    <Text style={[styles.menuText, label === 'Logout' ? { color: '#FF3B30' } : {}]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    marginTop: 40,
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
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFF',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'semibold',
    color: '#2E2E2E',
  },
  email: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#F2F2F2',
    padding: 10,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#A16EFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  menu: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  menuHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#444',
    marginVertical: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  menuText: {
    marginLeft: 15,
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  versionContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  version: {
    color: '#999',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  editModalContent: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    elevation: 5,
    padding: 20,
  },
  editContentContainer: {
    paddingBottom: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalDetails: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  termsContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  termsText: {
    fontSize: 14,
  },
  link: {
    color: '#800080',
    textDecorationLine: 'underline',
    marginHorizontal: 5,
  },
  topText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F2F2F2',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
  },
  genderContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  genderButton: {
    flex: 1,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  selectedGender: {
    borderColor: '#A16EFF',
    backgroundColor: '#ffeaea',
  },
  genderText: {
    color: '#333',
  },
  buttonWrapper: {
    marginTop: 10,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});