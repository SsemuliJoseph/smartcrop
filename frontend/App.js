import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import UploadScreen from './src/screens/UploadScreen';
import LocalScanScreen from './src/screens/LocalScanScreen';
import ResultScreen from './src/screens/ResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'PotatoGuard' }} />
        <Stack.Screen name="Upload" component={UploadScreen} options={{ title: 'Scan a Leaf' }} />
        <Stack.Screen name="LocalScan" component={LocalScanScreen} options={{ title: 'Scan a Leaf' }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Diagnosis' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Scan History' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
