import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Linking from 'react-native';

const { width, height } = Dimensions.get('window');

const Privacy = () => {
  return (
    <View style={styles.container}>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Privacy Policy</Text>
        <Text style={styles.paragraph}>
          This privacy policy applies to the BookMyGlow app (hereby referred to as "Application") for mobile devices that was created by Pragyavani Solution LLP (hereby referred to as "Service Provider") as a Freemium service. This service is intended for use "AS IS".
        </Text>
        <Text style={styles.subSectionTitle}>Information Collection and Use</Text>
        <Text style={styles.paragraph}>
          The Application collects information when you download and use it. This information may include information such as
        </Text>
        <View style={styles.listContainer}>
          <Text style={styles.listItem}>Your device's Internet Protocol address (e.g. IP address)</Text>
          <Text style={styles.listItem}>The pages of the Application that you visit, the time and date of your visit, the time spent on those pages</Text>
          <Text style={styles.listItem}>The time spent on the Application</Text>
          <Text style={styles.listItem}>The operating system you use on your mobile device</Text>
        </View>
        <Text style={styles.paragraph}>
          The Application does not gather precise information about the location of your mobile device.
        </Text>
        <Text style={styles.paragraph}>
          The Service Provider may use the information you provided to contact you from time to time to provide you with important information, required notices and marketing promotions.
        </Text>
        <Text style={styles.paragraph}>
          For a better experience, while using the Application, the Service Provider may require you to provide us with certain personally identifiable information, including but not limited to kishann.cpj@gmail.com, Male. The information that the Service Provider request will be retained by them and used as described in this privacy policy.
        </Text>
        <Text style={styles.subSectionTitle}>Third Party Access</Text>
        <Text style={styles.paragraph}>
          Only aggregated, anonymized data is periodically transmitted to external services to aid the Service Provider in improving the Application and their service. The Service Provider may share your information with third parties in the ways that are described in this privacy statement.
        </Text>
        <Text style={styles.paragraph}>
          The Service Provider may disclose User Provided and Automatically Collected Information:
        </Text>
        <View style={styles.listContainer}>
          <Text style={styles.listItem}>as required by law, such as to comply with a subpoena, or similar legal process;</Text>
          <Text style={styles.listItem}>when they believe in good faith that disclosure is necessary to protect their rights, protect your safety or the safety of others, investigate fraud, or respond to a government request;</Text>
          <Text style={styles.listItem}>with their trusted services providers who work on their behalf, do not have an independent use of the information we disclose to them, and have agreed to adhere to the rules set forth in this privacy statement.</Text>
        </View>
        <Text style={styles.subSectionTitle}>Opt-Out Rights</Text>
        <Text style={styles.paragraph}>
          You can stop all collection of information by the Application easily by uninstalling it. You may use the standard uninstall processes as may be available as part of your mobile device or via the mobile application marketplace or network.
        </Text>
        <Text style={styles.subSectionTitle}>Data Retention Policy</Text>
        <Text style={styles.paragraph}>
          The Service Provider will retain User Provided data for as long as you use the Application and for a reasonable time thereafter. If you'd like them to delete User Provided Data that you have provided via the Application, please contact them at kishann.cpj@gmail.com and they will respond in a reasonable time.
        </Text>
        <Text style={styles.subSectionTitle}>Children</Text>
        <Text style={styles.paragraph}>
          The Service Provider does not use the Application to knowingly solicit data from or market to children under the age of 13.
        </Text>
        <Text style={styles.paragraph}>
          The Service Provider does not knowingly collect personally identifiable information from children. The Service Provider encourages all children to never submit any personally identifiable information through the Application and/or Services. The Service Provider encourage parents and legal guardians to monitor their children's Internet usage and to help enforce this Policy by instructing their children never to provide personally identifiable information through the Application and/or Services without their permission. If you have reason to believe that a child has provided personally identifiable information to the Service Provider through the Application and/or Services, please contact the Service Provider (kishann.cpj@gmail.com) so that they will be able to take the necessary actions. You must also be at least 16 years of age to consent to the processing of your personally identifiable information in your country (in some countries we may allow your parent or guardian to do so on your behalf).
        </Text>
        <Text style={styles.subSectionTitle}>Security</Text>
        <Text style={styles.paragraph}>
          The Service Provider is concerned about safeguarding the confidentiality of your information. The Service Provider provides physical, electronic, and procedural safeguards to protect information the Service Provider processes and maintains.
        </Text>
        <Text style={styles.subSectionTitle}>Changes</Text>
        <Text style={styles.paragraph}>
          This Privacy Policy may be updated from time to time for any reason. The Service Provider will notify you of any changes to the Privacy Policy by updating this page with the new Privacy Policy. You are advised to consult this Privacy Policy regularly for any changes, as continued use is deemed approval of all changes.
        </Text>
        <Text style={styles.paragraph}>
          This privacy policy is effective as of 2025-07-31
        </Text>
        <Text style={styles.subSectionTitle}>Your Consent</Text>
        <Text style={styles.paragraph}>
          By using the Application, you are consenting to the processing of your information as set forth in this Privacy Policy now and as amended by us.
        </Text>
        <Text style={styles.subSectionTitle}>Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions regarding privacy while using the Application, or have questions about the practices, please contact the Service Provider via email at kishann.cpj@gmail.com.
        </Text>
        <View style={styles.divider} />
        <Text style={styles.footerText}>
          This privacy policy page was generated by{' '}
          <Text style={styles.link} onPress={() => Linking.openURL('https://app-privacy-policy-generator.nisrulz.com/')}>
            App Privacy Policy Generator
          </Text>
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    backgroundColor: '#6B46C1',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',

  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    marginTop: 50,

  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 15,
    textAlign: 'center',
    backgroundColor: '#E9ECEF',
    padding: 10,
    borderRadius: 10,
  },
  subSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 24,
    marginBottom: 15,
    textAlign: 'justify',
  },
  listContainer: {
    marginLeft: 20,
    marginBottom: 15,
  },
  listItem: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 24,
    marginBottom: 5,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  link: {
    color: '#6B46C1',
    textDecorationLine: 'underline',
  },
});

export default Privacy;