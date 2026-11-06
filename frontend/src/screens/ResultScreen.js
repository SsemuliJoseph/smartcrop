import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export default function ResultScreen({ route, navigation }) {
  const { disease, confidence, treatment } = route.params || {};

  const getBackgroundColor = () => {
    if (!disease) return '#FFFFFF';
    if (disease === 'Uncertain') return '#607D8B';
    if (disease === 'Healthy') return '#4CAF50';
    if (disease.includes('Blight')) return '#F44336';
    if (disease === 'Bacterial Wilt') return '#9C27B0';
    return '#FF9800';
  };

  return (
    <View style={styles.container}>
      <View style={[styles.banner, { backgroundColor: getBackgroundColor() }]}>
        <Text style={styles.diseaseTitle}>{disease || 'Unknown'}</Text>
        <Text style={styles.confidence}>
          Confidence: {((confidence || 0) * 100).toFixed(1)}%
        </Text>
      </View>

      <Text style={styles.treatmentHeader}>Treatment Advice</Text>
      <Text style={styles.treatmentText}>{treatment || 'No treatment information available'}</Text>

      <Button
        title="Scan Another Leaf"
        onPress={() => navigation.navigate('Upload')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  banner: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  diseaseTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  confidence: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 10,
  },
  treatmentHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  treatmentText: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
});
