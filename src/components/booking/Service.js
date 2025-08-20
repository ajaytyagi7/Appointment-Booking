import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// Mapping of service categories to image URLs
const serviceImages = {
  Haircut: 'https://img.freepik.com/free-photo/client-doing-hair-cut-barber-shop-salon_1303-20850.jpg',
  Beard: 'https://t4.ftcdn.net/jpg/02/13/03/89/360_F_213038977_OixVF24VDeUPSvtQSMxkvD7eXXlaSiZh.jpg',
  Nail: 'https://cdn.shopify.com/s/files/1/0555/7148/0761/files/different-types-of-nail-extensions-1_600x600.png?v=1699409874',
  Makeup: 'https://media.gettyimages.com/id/1340302535/photo/beautiful-indian-woman-getting-ready-to-a-wedding-reception-at-the-beauty-parlor.jpg?s=612x612&w=0&k=20&c=GzhivtaqLIDXBQ69R0DlIOfwY4aOYUI67gxWKTM3ooA=',
  Massage: 'https://media.gettyimages.com/id/469916170/photo/young-woman-relaxing-during-back-massage-at-the-spa.jpg?s=612x612&w=gi&k=20&c=Udrw6ym7K-uf97DiduYbgK12sEwrFW1nR1jg60ZG4KA=',
  Facial: 'https://media.gettyimages.com/id/1590247969/photo/beautiful-woman-enjoying-receiving-a-facial-treatment-at-the-spa.jpg?s=612x612&w=gi&k=20&c=CHcOq_lE3cgqDgRu-9DYsXHmJIcsTmy8gJgmw1iAVYQ=',
  pedicure: 'https://d2p5rd30inmhrb.cloudfront.net/fe/Blogs-VLCC/core-blogs/30/1.jpeg',
  manicure: 'https://cdn.shopify.com/s/files/1/0555/7148/0761/files/different-types-of-nail-extensions-1_600x600.png?v=1699409874',
  Wax: 'https://5.imimg.com/data5/TU/PG/VV/ANDROID-73928938/product-jpeg-1000x1000.jpg',
  Detan : 'https://www.bubblesindia.com/wp-content/uploads/2019/03/Bubbles_Services_Banner_Detan.jpg',
  Threading: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSgdIufPnAhlcdJS0AfHx9UtYBJl1wRhGfUA&s',
  HairColoring: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairStyling: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairCut: 'https://media.istockphoto.com/id/1678701754/photo/beautiful-young-woman-getting-her-hair-cut.jpg?s=612x612&w=0&k=20&c=JPn_FIkFLHTHNoaHlnmt9wBpJmt26wiMjLetoEBNYPc=',
  HairRemoval: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairTreatment: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairStraightening: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairPerming: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairExtensions: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairBraiding: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairRelaxing: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairWashing: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairDyeing: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairHighlights: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairLowlights: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairUpdo: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  HairAccessories: 'https://media.istockphoto.com/id/1326466262/photo/eyebrow-threading.jpg?s=612x612&w=0&k=20&c=1b3d7g4f6a5j8Z9sX1z2y3J4Y5v7m8e9n6F5k5l5k5k=',
  BodyPolishing: 'https://media.istockphoto.com/id/477840082/photo/body-polish.jpg?s=612x612&w=0&k=20&c=0CLT-fpK7ZqBDPslTRqdMFoxZAZTygX7i5WlQKU-6nQ=',
  BodyWrap: 'https://media.istockphoto.com/id/177440706/photo/seaweed-body-wrap-treatment-at-a-spa.jpg?s=612x612&w=0&k=20&c=YPd5mD7zdyjQXEVwqU9_EudIib1H0bmIfm9KAYRiNkM=',
  Bleach: 'https://media.istockphoto.com/id/1152601022/photo/woman-getting-face-bleaching.jpg?s=612x612&w=0&k=20&c=gzCfhxBChROuXrw5CQJZEG03V0rPzN0iM6TMEZUZBE8=',
  HairSpa: 'https://media.istockphoto.com/id/1208014144/photo/young-woman-having-hair-washed-in-salon.jpg?s=612x612&w=0&k=20&c=IS_YgJuvNVyWIXr1qZEvK_Nr9jTDY2u2kqpt3XeIvqM=',
  Mehndi: 'https://media.istockphoto.com/id/521021274/photo/henna-tattoo-on-hands.jpg?s=612x612&w=0&k=20&c=EFa9sKnwBkCUAgB2JJz4RSMzvliXtwQWMSDUEU3EZjQ=',
  BridalMakeup: 'https://media.istockphoto.com/id/1025208728/photo/beautiful-indian-bride-ready-for-wedding-ceremony.jpg?s=612x612&w=0&k=20&c=MQsjPo7K-XrMr94U2M8UTIFK8rM2TqTfHUZKmfPDRkk=',
  PreBridalPackage: 'https://media.istockphoto.com/id/1460050036/photo/spa-salon-pre-bridal-package.jpg?s=612x612&w=0&k=20&c=Ax3fwUMpgKmjWGbff2VmheQyzTv7k6ezayUxUw69Cns=',
  PartyMakeup: 'https://media.istockphoto.com/id/1059338214/photo/glamorous-girl-party-makeup.jpg?s=612x612&w=0&k=20&c=X6p3YBTV5xw6oTfG_oSeYOQAcwSc5v_tnND1L0XJ7Aw=',
  Aromatherapy: 'https://media.istockphoto.com/id/1155818570/photo/aromatherapy-oil-and-candles.jpg?s=612x612&w=0&k=20&c=HHnVMyPu0xEjGmWeTJuhQBGjOX_zEMth4AEl6P6B2rU=',
  FootSpa: 'https://media.istockphoto.com/id/1327389053/photo/woman-having-a-relaxing-foot-bath-in-spa.jpg?s=612x612&w=0&k=20&c=aPxZXc3CtTJQ2mOGg-5-4wYX0THRr9UDBp1ayZ3UYGU=',
  HandSpa: 'https://media.istockphoto.com/id/1327390461/photo/hand-spa-treatment-in-beauty-salon.jpg?s=612x612&w=0&k=20&c=6lLkHAgYq8A-ODZly51CyOd9Q2PoOGORAEURMzkHxOw=',
  ScalpTreatment: 'https://media.istockphoto.com/id/1129740486/photo/scalp-treatment.jpg?s=612x612&w=0&k=20&c=aYGVwGeX_Bh5rkpsQvBsqz9fK8i2WTTIQDUTwl7UoGA=',
  AntiAgingFacial: 'https://media.istockphoto.com/id/1327364463/photo/facial-treatment.jpg?s=612x612&w=0&k=20&c=3VW6eXGvjDJpeNUGbIFVmRnTPa8kSkW8qMNsmjjxq_Y=',
  BodyScrub: 'https://media.istockphoto.com/id/471993416/photo/spa-body-scrub-treatment.jpg?s=612x612&w=0&k=20&c=aPb0QVo0FqR_dJ_Yapv5zz47C7U0uUtgNODDLZ0gAhI=',
  KeratinTreatment: 'https://media.istockphoto.com/id/1357042921/photo/keratin-hair-treatment.jpg?s=612x612&w=0&k=20&c=a15EQ2vKxO8BRAYPt1lZu0h0GOVSJK7d8jW3cpKnR9E=',
  BotoxHairTreatment: 'https://media.istockphoto.com/id/1337251076/photo/hair-botox.jpg?s=612x612&w=0&k=20&c=sCzS3o9jHOReAjp0KZ0AqVPiDWjcT4fKbyJzqkEAGPY=',
  Other: 'https://img.freepik.com/premium-photo/pattern-various-shaving-bauty-care-accessories-men-gray-background_93675-166547.jpg',
};

export default function Service() {
  const navigation = useNavigation();
  const route = useRoute();
  const { salon } = route.params || {};
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Guard if no salon is passed
  if (!salon) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ No salon selected. Please go back and select a salon.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Function to get image URL based on service name
  const getServiceImage = (serviceName) => {
    if (!serviceName || typeof serviceName !== 'string') {
      return serviceImages.Other;
    }
    // Split service name into words and convert to lowercase for comparison
    const words = serviceName.toLowerCase().split(' ');
    // Check if any word matches a key in serviceImages
    for (const word of words) {
      const matchedKey = Object.keys(serviceImages).find(key => key.toLowerCase() === word);
      if (matchedKey) {
        return serviceImages[matchedKey];
      }
    }
    // If no match, return the "Other" image
    return serviceImages.Other;
  };

  // Static image URL for salon (fallback)
  const staticServiceImage = 'https://img.freepik.com/premium-photo/pattern-various-shaving-bauty-care-accessories-men-gray-background_93675-166547.jpg';

  const getSalonImageUrl = () => {
    // Check if salonImages is a valid URL and starts with the correct domain
    if (salon.salonImages && typeof salon.salonImages === 'string' && salon.salonImages.startsWith('https://backendsalon.pragyacode.com')) {
      return salon.salonImages; // Use the provided URL directly
    }
    return staticServiceImage;
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch(`https://backendsalon.pragyacode.com/api/public/salons`);
        const data = await response.json();
        const selectedSalon = data.find(s => s.salonId === salon.salonId);
        setServices(selectedSalon?.services || []);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, [salon.salonId]);

  const rating = 4.5;
  const salonDetails = `🌟 Welcome to ${salon.salonName}, a premier grooming haven renowned for its luxurious ambiance and exceptional service. Established with a passion to elevate men's styling, we blend modern techniques with a relaxing atmosphere. Our expert stylists use premium products to craft personalized experiences. Nestled in the vibrant heart of ${salon.location?.city || 'the city'}, we pride ourselves on being a top choice for locals and travelers seeking quality grooming. 🌿`;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Image source={{ uri: getSalonImageUrl() }} style={styles.salonImage} resizeMode="cover" />
          <Text style={styles.salonName}>{salon.salonName}</Text>
          <Text style={styles.salonAddress}>
            {salon.location ? `${salon.location.addressLine1}, ${salon.location.city}` : 'No address'}
          </Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>Rating: {rating} ★</Text>
          </View>
          <Text style={styles.detailsText}>{salonDetails}</Text>
        </View>
        <View style={styles.servicesSection}>
          <Text style={styles.servicesTitle}>Services</Text>
          <View style={styles.servicesContainer}>
            {isLoading ? (
              <Text style={styles.serviceText}>Loading services...</Text>
            ) : services.length === 0 ? (
              <Text style={styles.serviceText}>No services available</Text>
            ) : (
              services.map((service, index) => (
                <TouchableOpacity
                  style={styles.serviceCard}
                  key={index}
                  onPress={() => navigation.navigate('AppointmentDetails', { service, salon })}
                >
                  <Image source={{ uri: getServiceImage(service.name) }} style={styles.serviceImage} resizeMode="cover" />
                  <Text style={styles.serviceText}>{service.name}</Text>
                  <Text style={styles.servicePrice}>₹{service.price}</Text>
                  <TouchableOpacity
                    style={styles.cardBookButton}
                    onPress={() => navigation.navigate('AppointmentDetails', { service, salon })}
                  >
                    <Text style={styles.cardBookText}>Book Now</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
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
    marginTop: 30,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  salonImage: {
    width: '100%',
    height: 250,
    marginTop: 20,
  },
  salonName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E2E2E',
    marginVertical: 10,
  },
  salonAddress: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 10,
  },
  ratingContainer: {
    backgroundColor: '#FFF3E0',
    padding: 5,
    borderRadius: 5,
    marginTop: 5,
  },
  ratingText: {
    fontSize: 16,
    color: '#F4A261',
  },
  detailsText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 24,
    fontWeight: '600',
  },
  servicesSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 10,
  },
  servicesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E2E2E',
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
  serviceText: {
    fontSize: 16,
    margin: 10,
    color: '#2E2E2E',
  },
  servicePrice: {
    fontSize: 18,
    color: '#A16EFF',
    fontWeight: 'bold',
    marginLeft: 10,
    marginBottom: 10,
  },
  cardBookButton: {
    backgroundColor: '#A16EFF',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    margin: 10,
  },
  cardBookText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#A16EFF',
    padding: 10,
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});