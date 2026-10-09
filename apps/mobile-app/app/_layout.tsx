import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as Updates from 'expo-updates';
import { startSyncMonitoring } from '@/lib/offline-storage';

export default function RootLayout() {
  useEffect(() => {
    startSyncMonitoring();

    async function checkOtaUpdate() {
      try {
        if (__DEV__) return;
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          const fetchResult = await Updates.fetchUpdateAsync();
          if (fetchResult.isNew) {
            Alert.alert(
              'Update Available',
              'A new update has been downloaded. Restart now to apply changes?',
              [
                { text: 'Later', style: 'cancel' },
                {
                  text: 'Restart Now',
                  onPress: () => {
                    void Updates.reloadAsync().catch(() => undefined);
                  },
                },
              ]
            );
          }
        }
      } catch {
        // Silently continue if offline or server unreachable
      }
    }

    void checkOtaUpdate();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="asha-profile" />
        <Stack.Screen name="patients" />
        <Stack.Screen name="patient-details" />
        <Stack.Screen name="assessment" />
        <Stack.Screen name="select-patient" />
        <Stack.Screen name="health-assessment" />
        <Stack.Screen name="assessment_details" />
        <Stack.Screen name="prediction" />
      </Stack>
    </SafeAreaProvider>
  );
}
