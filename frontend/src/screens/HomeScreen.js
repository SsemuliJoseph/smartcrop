import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// The HomeScreen component takes 'navigation' as a prop so we can move between screens
const HomeScreen = ({ navigation }) => {
  
  // This function handles what happens when the scan button is pressed
  const handleScanPress = () => {
    // No server configured -> the model runs on this phone (LocalScan); otherwise use the server flow (Upload)
    navigation.navigate(process.env.EXPO_PUBLIC_INFERENCE_URL ? 'Upload' : 'LocalScan');
  };

  // This function handles what happens when the history button is pressed
  const handleHistoryPress = () => {
    // Navigate to the 'History' screen
    navigation.navigate('History');
  };

  return (
    // Main container view that centers everything
    <View style={styles.container}>
      
      {/* App title */}
      <Text style={styles.appTitle}>PotatoGuard</Text>
      
      {/* App subtitle */}
      <Text style={styles.appSubtitle}>Detect potato diseases instantly with AI</Text>
      
      {/* Container for the buttons */}
      <View style={styles.buttonContainer}>
        
        {/* The green scan button */}
        <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
          <Text style={styles.buttonText}>Scan a Leaf Now</Text>
        </TouchableOpacity>
        
        {/* The purple history button */}
        <TouchableOpacity style={styles.historyButton} onPress={handleHistoryPress}>
          <Text style={styles.buttonText}>View History</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
};

// Styles for our components
const styles = StyleSheet.create({
  // Style for the main container
  container: {
    flex: 1, // Takes up the whole screen
    justifyContent: 'center', // Centers content vertically
    alignItems: 'center', // Centers content horizontally
    backgroundColor: '#fff', // White background
    padding: 20, // Space around the edges
  },
  // Style for the main PotatoGuard title
  appTitle: {
    fontSize: 36, // Large text
    fontWeight: 'bold', // Bold text
    color: '#1B5E20', // Dark green color
    marginBottom: 10, // Space below title
  },
  // Style for the subtitle text
  appSubtitle: {
    fontSize: 18,
    color: '#666', // Gray text
    marginBottom: 40, // Space before the buttons
    textAlign: 'center',
  },
  // Wrapper for the buttons
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  // Style for the Scan button (Green)
  scanButton: {
    backgroundColor: '#1B5E20', // Green color
    paddingVertical: 15, // Space top and bottom
    paddingHorizontal: 40, // Space left and right
    borderRadius: 8, // Rounded corners
    width: '80%', // Takes up 80% of width
    alignItems: 'center', // Centers text natively
    marginBottom: 20, // Space between buttons
  },
  // Style for the History button (Purple)
  historyButton: {
    backgroundColor: '#4A148C', // Purple color
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  // Text inside the buttons
  buttonText: {
    color: '#fff', // White text
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
