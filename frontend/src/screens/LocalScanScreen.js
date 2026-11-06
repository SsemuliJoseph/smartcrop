import React, { useRef, useState } from 'react';
import { View, Button, Image, Text, ActivityIndicator, Alert, Platform, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import OnDeviceEngine from '../components/OnDeviceEngine';
import { recordDiagnosis } from '../services/api';

// Your deployed web app (it serves engine.html). Set in frontend/.env - see .env.example.
const ENGINE_URL = (process.env.EXPO_PUBLIC_ENGINE_URL || '').replace(/\/+$/, '');

const STATUS_TEXT = {
  loading: 'Preparing the on-device AI (first time downloads ~10 MB)...',
  ready: 'On-device AI ready. Photos stay on this phone.',
  failed: 'On-device AI could not start. Connect to the internet once and reopen this screen.',
};

export default function LocalScanScreen({ navigation }) {
  const engine = useRef(null);
  const [image, setImage] = useState(null); // { uri, base64 }
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Scan a Leaf</Text>
        <Text style={styles.note}>
          On the web, open the PotatoGuard website directly - it runs the same on-device model in your browser.
        </Text>
      </View>
    );
  }
  if (!ENGINE_URL) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Not configured</Text>
        <Text style={styles.note}>Set EXPO_PUBLIC_ENGINE_URL in frontend/.env (see .env.example), then restart Expo.</Text>
      </View>
    );
  }

  const pick = async (useCamera) => {
    try {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Allow access to take or choose a leaf photo.'); return; }
      const opts = { allowsEditing: true, aspect: [4, 3], quality: 0.8, base64: true };
      const r = useCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!r.canceled) setImage({ uri: r.assets[0].uri, base64: r.assets[0].base64 });
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const diagnose = async () => {
    if (!image || !image.base64) { Alert.alert('Error', 'Please select a leaf photo first'); return; }
    setBusy(true);
    try {
      const prediction = await engine.current.predict(image.base64);
      const result = await recordDiagnosis(prediction);
      navigation.navigate('Result', result);
    } catch (e) {
      Alert.alert('Error', e.message || 'Detection failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <OnDeviceEngine ref={engine} url={ENGINE_URL} onStatus={setStatus} />
      <Text style={styles.title}>Scan a Leaf</Text>
      <Text style={[styles.note, status === 'failed' && styles.noteError]}>{STATUS_TEXT[status]}</Text>

      {image && <Image source={{ uri: image.uri }} style={styles.preview} />}

      <Button title="Take Photo" onPress={() => pick(true)} />
      <Button title="Choose from Gallery" onPress={() => pick(false)} />

      {busy ? (
        <ActivityIndicator size="large" color="#1B5E20" style={{ marginTop: 12 }} />
      ) : (
        <Button title="Diagnose on this phone" onPress={diagnose} disabled={status === 'failed'} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  note: { fontSize: 14, color: '#555', marginBottom: 16 },
  noteError: { color: '#B71C1C' },
  preview: { width: '100%', height: 300, marginBottom: 20 },
});
