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
import axios from 'axios';
import debounce from 'lodash.debounce';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// Axios instance with Nominatim user-agent (required by their policy)
const api = axios.create({
  headers: {
    'User-Agent': 'YourAppName/1.0 (contact@example.com)', // replace with your app info
  },
});

const LiveLocationScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null); // string (pretty name)
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [locationName, setLocationName] = useState('Fetching your location...');
  const [error, setError] = useState('');

  // Reverse geocode using Nominatim
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      const response = await api.get(url);
      const address = response.data?.address || {};

      const name = [
        address.road || address.street,
        address.suburb || address.neighbourhood,
        address.city || address.town || address.village || address.county,
        address.state || address.region,
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

  // Debounced manual search (India only)
  const fetchSuggestions = useCallback(
    debounce(async (query) => {
      if (!query || query.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=in`;
        const res = await api.get(url);
        const items = (res.data || []).filter((it) => it.address?.country === 'India');
        setSuggestions(items);
      } catch (err) {
        console.warn('Search error:', err?.message || err);
        setError('Failed to fetch suggestions.');
      }
    }, 300),
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
                errorMessage = 'Failed to get current location. Please try searching manually.';
            }
            setError(errorMessage);
            setLocationName('Select a location');
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
      setLocationName('Select a location');
      Alert.alert('Error', 'An error occurred while fetching your location.', [{ text: 'OK' }]);
    }
  };

  // Auto-fetch GPS location on mount
  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const onPickSuggestion = async (item) => {
    try {
      const latitude = parseFloat(item.lat);
      const longitude = parseFloat(item.lon);

      setCoords({ latitude, longitude });
      setSearchQuery('');
      setSuggestions([]);
      setError('');

      await reverseGeocode(latitude, longitude);
    } catch (e) {
      console.warn('Pick suggestion error:', e?.message || e);
      setError('Unable to use the selected place.');
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

      <TextInput
        placeholder="Search your area in India..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.input}
      />

      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.place_id?.toString() ?? `${item.lat}-${item.lon}`}
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
            <Text style={styles.emptyText}>No results found</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  label: { fontWeight: 'bold', fontSize: 16, color: '#333', marginTop: 30 },
  error: { color: 'red', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
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