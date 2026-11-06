import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, FlatList, Text, RefreshControl, StyleSheet } from 'react-native';
import { getHistory } from '../services/api';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const records = await getHistory();
      setHistory(records);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.disease}>{item.disease}</Text>
      <Text style={styles.confidence}>Confidence: {((item.confidence || 0) * 100).toFixed(1)}%</Text>
      <Text style={styles.date}>{new Date(item.timestamp).toLocaleString()}</Text>
    </View>
  );

  if (history.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No scans yet. Scan your first leaf!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.detectionId}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchHistory} />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  disease: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  confidence: {
    fontSize: 14,
    marginTop: 5,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
