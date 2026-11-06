import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { treatmentFor } from './treatments';

// Expo only inlines env vars prefixed EXPO_PUBLIC_. Set it in frontend/.env (see .env.example).
const BASE_URL = (process.env.EXPO_PUBLIC_INFERENCE_URL || '').replace(/\/+$/, '');
const HISTORY_KEY = 'potatoguard_history_v1';
const MAX_HISTORY = 200;

async function saveScan(record) {
  const history = await getHistory();
  history.unshift(record);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

// Send the leaf photo to the model service and return the diagnosis. History is stored on this device.
export async function detectDisease(imageUri) {
  if (!BASE_URL) {
    throw new Error('Diagnosis service not configured: set EXPO_PUBLIC_INFERENCE_URL in frontend/.env');
  }
  const form = new FormData();
  if (Platform.OS === 'web') {
    form.append('file', await (await fetch(imageUri)).blob(), 'leaf.jpg');
  } else {
    form.append('file', { uri: imageUri, name: 'leaf.jpg', type: 'image/jpeg' });
  }

  let resp;
  try {
    resp = await fetch(`${BASE_URL}/predict`, { method: 'POST', body: form });
  } catch (e) {
    throw new Error('Cannot reach the diagnosis service. Check your internet connection and try again.');
  }
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(
      resp.status === 503
        ? 'The diagnosis model is starting up or unavailable. Try again in a minute.'
        : body.detail || 'Detection failed'
    );
  }

  return recordDiagnosis(await resp.json());
}

// Turn a prediction ({disease, confidence, uncertain}) into a stored scan result. Shared by the
// server path above and the on-device path (LocalScanScreen).
export async function recordDiagnosis(p) {
  const disease = p.uncertain === true ? 'Uncertain' : p.disease;
  const result = {
    disease,
    confidence: p.confidence,
    treatment: treatmentFor(disease),
    detectionId: `local-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  await saveScan(result);
  return result;
}

// Scan history stored on this device, newest first.
export async function getHistory() {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function clearHistory() {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
