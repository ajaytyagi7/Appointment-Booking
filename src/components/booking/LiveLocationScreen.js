import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import axios from 'axios';
import debounce from 'lodash.debounce';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// IMPORTANT: Replace with your real key from https://geocode.maps.co/
const GEO_API_KEY = '68aed9a14bef6796175016zkuefcff4'; // ← your key here

// Axios instance with proper User-Agent (very important!)
const api = axios.create({
  headers: {
    'User-Agent': 'YourAppName/1.0 (contact@yourcompany.com)', // ← CHANGE THIS!
    // You can also add: 'Referer': 'https://yourapp.com' if needed
  },
});

const LiveLocationScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null); // string (pretty name)
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [locationName, setLocationName] = useState('Fetching your location...');
  const [error, setError] = useState('');

  // Reverse geocode using geocode.maps.co
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const url = `https://geocode.maps.co/reverse?lat=${latitude}&lon=${longitude}&api_key=${GEO_API_KEY}`;
      const response = await api.get(url);
      const address = response.data?.address || {};

      const name = [
        address.road || address.street,
        address.suburb || address.neighbourhood,
        address.city || address.town || address.village || address.county,
        address.state || address.region || address.state_district,
        address.country,
      ].filter(Boolean).join(', ');

      const display = name || response.data?.display_name || 'Selected location';
      setLocationName(display);
      setSelectedLocation(display);
      return { display, address };
    } catch (err) {
      console.warn('Reverse geocode error:', err?.message || err);
      setLocationName('Select a location');
      setError('Unable to fetch location name. Please try searching manually.');
      return null;
    }
  };

  // Debounced search with geocode.maps.co (more reliable than nominatim from client)
  const fetchSuggestions = useCallback(
    debounce(async (query) => {
      if (!query || query.trim().length < 3) {
        setSuggestions([]);
        return;
      }

      setError('');
      try {
        const url = `https://geocode.maps.co/search?q=${encodeURIComponent(query)}&limit=6&api_key=${GEO_API_KEY}`;
        const res = await api.get(url);

        const items = res.data || [];

        // Optional: filter India only
        const indiaItems = items.filter((it) => 
          it.address?.country?.toLowerCase() === 'india' ||
          it.address?.country_code?.toLowerCase() === 'in'
        );

        setSuggestions(indiaItems.length > 0 ? indiaItems : items);
      } catch (err) {
        console.warn('Search suggestions error:', err?.message || err, err?.response);
        setError('Failed to fetch suggestions. Please try again later.');
        setSuggestions([]);
      }
    }, 400),
    []
  );

  useEffect(() => {
    fetchSuggestions(searchQuery);
  }, [searchQuery, fetchSuggestions]);

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
          message: 'This app needs access to your location to show your current location.',
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
          'Location permission is required. Please enable it in Settings.',
          [{ text: 'OK' }]
        );
        return false;
      } else {
        setError('Location permission denied. Please grant permission.');
        Alert.alert(
          'Permission Denied',
          'Please grant location permission to use current location.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (err) {
      console.warn('Permission error:', err);
      setError('Error checking location permission.');
      return false;
    }
  };

  // Fetch current location with retry
  const fetchCurrentLocation = async (retryCount = 0, maxRetries = 3) => {
    try {
      const hasPermission = await checkAndRequestPermissions();
      if (!hasPermission) {
        setLocationName('Select a location');
        return;
      }

      Geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setCoords({ latitude, longitude });
          setError('');
          await reverseGeocode(latitude, longitude);
        },
        (err) => {
          console.warn('Geolocation error:', err?.message, 'Code:', err?.code);
          if (retryCount < maxRetries && err.code !== 1) {
            setTimeout(() => fetchCurrentLocation(retryCount + 1, maxRetries), 3000);
          } else {
            let errorMessage = 'Failed to get current location.';
            switch (err.code) {
              case 1: errorMessage = 'Location permission denied.'; break;
              case 2: errorMessage = 'Location unavailable (GPS/network)'; break;
              case 3: errorMessage = 'Location request timed out.'; break;
            }
            setError(errorMessage);
            setLocationName('Select a location');
            Alert.alert('Location Error', errorMessage, [{ text: 'OK' }]);
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 0,
        }
      );
    } catch (e) {
      console.warn('fetchCurrentLocation error:', e);
      setError('Error while fetching location.');
      setLocationName('Select a location');
    }
  };

  // Auto fetch on mount
  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const onPickSuggestion = async (item) => {
    try {
      const latitude = parseFloat(item.lat);
      const longitude = parseFloat(item.lon);

      if (isNaN(latitude) || isNaN(longitude)) throw new Error('Invalid coordinates');

      setCoords({ latitude, longitude });
      setSearchQuery('');
      setSuggestions([]);
      setError('');

      const result = await reverseGeocode(latitude, longitude);
      if (result?.display) {
        setSelectedLocation(result.display);
      }
    } catch (e) {
      console.warn('Pick suggestion error:', e);
      setError('Unable to select this location.');
      Alert.alert('Error', 'Unable to use the selected place.', [{ text: 'OK' }]);
    }
  };

  const saveLocation = () => {
    if (!selectedLocation || !coords) {
      Alert.alert('Error', 'Please select a location first.');
      return;
    }

    navigation.navigate('Home', {
      selectedLocation: {
        name: selectedLocation,
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Selected Location: {selectedLocation || 'None'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Search your area in India..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.input}
        />
        <TouchableOpacity 
          style={styles.currentLocationButton} 
          onPress={() => fetchCurrentLocation()}
        >
          <MapPin size={20} color="#A16EFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={suggestions}
        keyExtractor={(item, index) => item.place_id?.toString() ?? `${item.lat}-${item.lon}-${index}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onPickSuggestion(item)}
            style={styles.suggestionItem}
          >
            <Text style={styles.suggestionText}>
              {item.display_name}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          searchQuery.length >= 3 ? (
            suggestions.length === 0 ? (
              <Text style={styles.emptyText}>
                {error ? 'Error loading suggestions...' : 'No results found'}
              </Text>
            ) : null
          ) : null
        }
        keyboardShouldPersistTaps="handled"
      />

      <TouchableOpacity style={styles.saveButton} onPress={saveLocation}>
        <Text style={styles.saveButtonText}>Save Location</Text>
      </TouchableOpacity>
    </View>
  );
};

// Styles remain unchanged
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  label: { fontWeight: 'bold', fontSize: 16, color: '#333', marginTop: 30 },
  error: { color: 'red', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
    marginRight: 10,
  },
  currentLocationButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A16EFF',
  },
  suggestionItem: { padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
  suggestionText: { fontSize: 14, color: '#333' },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', padding: 10 },
  saveButton: {
    backgroundColor: '#A16EFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default LiveLocationScreen;