import React, { useState } from 'react';
import { View, Button, Image, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { detectDisease } from '../services/api';

export default function UploadScreen({ navigation }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });
      }

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleDetect = async () => {
    if (!image) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setLoading(true);
    try {
      const result = await detectDisease(image);
      navigation.navigate('Result', result);
    } catch (error) {
      Alert.alert('Error', error.message || 'Detection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Leaf Image</Text>
      
      {image && <Image source={{ uri: image }} style={styles.preview} />}
      
      <Button title="Take Photo" onPress={() => pickImage(true)} />
      <Button title="Choose from Gallery" onPress={() => pickImage(false)} />
      
      {loading ? (
        <ActivityIndicator size="large" color="#1B5E20" />
      ) : (
        <Button title="Detect Disease" onPress={handleDetect} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  preview: {
    width: '100%',
    height: 300,
    marginBottom: 20,
  },
});
