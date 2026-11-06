import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DiseaseCard({ disease, confidence, date }) {
  const getEmoji = () => {
    if (disease === 'Uncertain') return '❓';
    if (disease === 'Healthy') return '🍃';
    if (disease.includes('Blight')) return '⚠️';
    if (disease === 'Bacterial Wilt') return '🚫';
    return '❓';
  };

  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{getEmoji()}</Text>
      <View style={styles.content}>
        <Text style={styles.disease}>{disease}</Text>
        <Text style={styles.confidence}>{((confidence || 0) * 100).toFixed(1)}%</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  disease: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  confidence: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});
