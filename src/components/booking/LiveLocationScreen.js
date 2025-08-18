import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  TextInput, 
  FlatList, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet,
  ActivityIndicator,
  PermissionsAndroid,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import Geolocation from 'react-native-geolocation-service';
import axios from 'axios';
import debounce from 'lodash.debounce';

// Axios instance with Nominatim user-agent
const api = axios.create({
  headers: {
    'User-Agent': 'YourAppName/1.0 (contact@example.com)', // Replace with your details
  },
});

const LiveLocationScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState('Getting location...');
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const webviewRef = useRef(null);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      try {
        const status = await Geolocation.requestAuthorization('whenInUse');
        return status === 'granted';
      } catch (err) {
        console.warn('iOS permission error:', err);
        return false;
      }
    }
    return true;
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const response = await api.get(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      );
      const address = response.data.address;
      const name = [
        address.road || address.street,
        address.city || address.town || address.village,
        address.state || address.region,
        address.country
      ].filter(Boolean).join(', ');
      setLocationName(name || 'Current location');
      return address;
    } catch (error) {
      console.warn('Reverse geocode error:', error);
      setLocationName('Current location');
      return null;
    }
  };

  const fetchSalons = async (lat, lng) => {
    try {
      const overpassQuery = `
        [out:json];
        (
          node["shop"="hairdresser"](around:1000,${lat},${lng});
          way["shop"="hairdresser"](around:1000,${lat},${lng});
          relation["shop"="hairdresser"](around:1000,${lat},${lng});
        );
        out center;
      `;
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`
      });
      const data = await response.json();
      const places = data.elements.map(el => {
        const coords = el.center || { lat: el.lat, lon: el.lon };
        return {
          lat: coords.lat,
          lng: coords.lon,
          name: el.tags?.name || 'Hair Salon',
          address: el.tags?.['addr:street'] || '',
          phone: el.tags?.['phone'] || ''
        };
      });
      setSalons(places);
    } catch (err) {
      console.log('Error fetching salons:', err);
    }
  };

  useEffect(() => {
    (async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setError('Location permission denied. Please enable it in settings.');
        Alert.alert('Permission Denied', 'Please enable location permissions.');
        setLoading(false);
        return;
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoords(position.coords);
          const address = await reverseGeocode(latitude, longitude);
          if (address?.country === 'India') {
            setSelectedLocation(locationName);
            await fetchSalons(latitude, longitude);
          } else {
            setSelectedLocation('Location outside India');
            setError('Current location is not in India.');
          }
          setLoading(false);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setError('Unable to fetch location.');
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

      const watchId = Geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoords(position.coords);
          const address = await reverseGeocode(latitude, longitude);
          if (address?.country === 'India') {
            setSelectedLocation(locationName);
            fetchSalons(latitude, longitude);
          } else {
            setSelectedLocation('Location outside India');
            setError('Current location is not in India.');
          }
        },
        (error) => {
          console.warn('Watch position error:', error);
        },
        { enableHighAccuracy: true, distanceFilter: 10, interval: 5000 }
      );

      return () => Geolocation.clearWatch(watchId);
    })();
  }, []);

  const fetchSuggestions = useCallback(
    debounce(async (query) => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }
      try {
        const response = await api.get(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=in`
        );
        setSuggestions(response.data.filter((item) => item.address.country === 'India'));
      } catch (error) {
        console.warn('Search error:', error);
        setError('Failed to fetch suggestions.');
      }
    }, 300),
    []
  );

  useEffect(() => {
    fetchSuggestions(searchQuery);
  }, [searchQuery, fetchSuggestions]);

  useEffect(() => {
    if (webviewRef.current && coords) {
      webviewRef.current.postMessage(
        JSON.stringify({
          lat: coords.latitude,
          lng: coords.longitude,
          salons,
          locationName
        })
      );
    }
  }, [coords, salons, locationName]);

  const saveLocation = () => {
    if (selectedLocation) {
      navigation.navigate('Home', { selectedLocation: { name: selectedLocation } });
    } else {
      Alert.alert('Error', 'No location selected.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF5733" />
        <Text style={styles.loadingText}>Finding nearby hair salons...</Text>
      </View>
    );
  }

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <script src="https://unpkg.com/protomaps-leaflet@latest/dist/protomaps-leaflet.js"></script>
        <style>
          html, body { margin: 0; padding: 0; height: 100%; background: #f5f5f5; }
          #map { height: 100vh; width: 100vw; }

          .user-marker {
            background-image: url('https://cdn-icons-png.flaticon.com/512/684/684908.png');
            background-size: cover;
            width: 45px; height: 45px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 8px rgba(0,0,0,0.3);
          }

          .salon-marker {
            background-image: url('https://cdn-icons-png.flaticon.com/512/1085/1085943.png');
            background-size: cover;
            width: 35px; height: 35px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 6px rgba(255,87,51,0.6);
            transition: transform 0.2s ease-in-out;
          }
          .salon-marker:hover {
            transform: scale(1.2);
          }

          .leaflet-popup-content {
            font-family: Arial, sans-serif;
            font-size: 14px;
            color: #333;
            min-width: 150px;
          }
          .leaflet-popup-content-wrapper {
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          }
          .popup-title {
            font-weight: bold;
            color: #FF5733;
            margin-bottom: 5px;
          }
          .popup-address {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
          }
          .popup-phone {
            font-size: 12px;
            color: #333;
          }

          .leaflet-control-zoom {
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
          }
          .leaflet-control-zoom a {
            background: #FF5733;
            color: white;
          }
          .leaflet-control-zoom a:hover {
            background: #e14d2a;
          }
          
          .location-info {
            position: absolute;
            bottom: 20px;
            left: 10px;
            right: 10px;
            background: rgba(255,255,255,0.9);
            padding: 10px 15px;
            border-radius: 15px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            font-family: Arial, sans-serif;
            font-size: 14px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div id="locationInfo" class="location-info"></div>
        <script>
          var map = L.map('map', { zoomControl: true }).setView([20.5937, 78.9629], 5);

          var basemap = protomapsL.leafletLayer({
            url: 'https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=e5d2adc86da97cbe',
            flavor: 'light',
            lang: 'en'
          });
          basemap.addTo(map);

          var userIcon = L.divIcon({ className: 'user-marker', iconSize: [45, 45] });
          var userMarker = L.marker([20.5937, 78.9629], { 
            icon: userIcon,
            zIndexOffset: 1000
          }).addTo(map);
          
          function updateUserPopup(locationName) {
            userMarker.bindPopup(
              \`<div class="popup-title">📍 You are here</div>\${locationName ? \`<div class="popup-address">\${locationName}</div>\` : ''}\`
            );
          }
          
          var salonIcon = L.divIcon({ className: 'salon-marker', iconSize: [35, 35] });
          var salonMarkers = [];

          function createPopupContent(salon) {
            return \`
              <div class="popup-title">💇‍♀️ \${salon.name}</div>
              \${salon.address ? \`<div class="popup-address">\${salon.address}</div>\` : ''}
              \${salon.phone ? \`<div class="popup-phone">📞 \${salon.phone}</div>\` : ''}
            \`;
          }

          function updateSalons(salons) {
            salonMarkers.forEach(m => map.removeLayer(m));
            salonMarkers = [];
            salons.forEach(salon => {
              var m = L.marker([salon.lat, salon.lng], { 
                icon: salonIcon,
                title: salon.name
              }).addTo(map).bindPopup(createPopupContent(salon));
              salonMarkers.push(m);
            });
          }

          function updateLocationInfo(locationName) {
            const infoDiv = document.getElementById('locationInfo');
            infoDiv.textContent = locationName || "Current location";
          }

          document.addEventListener("message", function(event) {
            var data = JSON.parse(event.data);
            if (data.lat && data.lng) {
              userMarker.setLatLng([data.lat, data.lng]);
              map.setView([data.lat, data.lng], 16);
            }
            if (data.salons) {
              updateSalons(data.salons);
            }
            if (data.locationName) {
              updateUserPopup(data.locationName);
              updateLocationInfo(data.locationName);
            }
          });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Selected Location: {selectedLocation || 'Fetching...'}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        placeholder="Search your area in India..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.input}
      />

      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.place_id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={async () => {
              setSelectedLocation(item.display_name);
              setLocationName(item.display_name);
              setCoords({ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) });
              await fetchSalons(item.lat, item.lon);
              setSearchQuery('');
              setSuggestions([]);
              setError('');
            }}
            style={styles.suggestionItem}
          >
            <Text style={styles.suggestionText}>{item.display_name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No results found</Text>}
      />

      <WebView
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.map}
        ref={webviewRef}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#FF5733" />
          </View>
        )}
      />

      <TouchableOpacity style={styles.saveButton} onPress={saveLocation}>
        <Text style={styles.saveButtonText}>Save Location</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  label: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
    marginTop: 30,
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 10,                 
  },
  saveButton: {
    backgroundColor: '#A16EFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  map: { 
    flex: 1 
  },
  loading: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333'
  },
});

export default LiveLocationScreen;