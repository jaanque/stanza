import 'react-native-get-random-values'; // Must be imported before uuid
import React from 'react'; // Removed useEffect, useCallback
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Removed useFonts and SplashScreen imports

import RegistrationScreen from './screens/RegistrationScreen';
import HomeScreen from './screens/HomeScreen';
import CreateRoomScreen from './screens/CreateRoomScreen';
import JoinRoomScreen from './screens/JoinRoomScreen';
import RoomScreen from './screens/RoomScreen'; // Placeholder for RoomScreen

const Stack = createStackNavigator();

// Basic theme for navigation header
const navTheme = {
  colors: {
    primary: '#B68BD9', // Primary color for header, etc.
    background: '#F8F8FA', // Background of screens
    card: '#FFFFFF', // Background of header
    text: '#333333', // Text color in header
    border: '#DDD', // Border color for header
    notification: '#FF3B30', // Notification badge color
  },
};

// SplashScreen.preventAutoHideAsync(); // Removed

export default function App() {
  // const [fontsLoaded, fontError] = useFonts({
  //   // 'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
  //   // 'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
  // });

  // const onLayoutRootView = useCallback(async () => {
  //   if (fontsLoaded || fontError) {
  //     await SplashScreen.hideAsync();
  //   }
  // }, [fontsLoaded, fontError]);

  // useEffect(() => {
  //   if (fontError) {
  //     console.error('Font loading error:', fontError);
  //   }
  // }, [fontError]);

  // if (!fontsLoaded && !fontError) {
  //   return null;
  // }

  return (
    <SafeAreaProvider> {/* Removed onLayout={onLayoutRootView} */}
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator initialRouteName="Registration">
          <Stack.Screen
            name="Registration"
            component={RegistrationScreen}
            options={{ headerShown: false }} // No header for registration
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Your Rooms', headerLeft: () => null }} // Disable back button on Home
          />
          <Stack.Screen
            name="CreateRoom"
            component={CreateRoomScreen}
            options={{ title: 'Create New Room' }}
          />
          <Stack.Screen
            name="JoinRoom"
            component={JoinRoomScreen}
            options={{ title: 'Join Existing Room' }}
          />
          <Stack.Screen
            name="Room"
            component={RoomScreen}
            // Options can be set dynamically based on route params, e.g., room name
            options={({ route }) => ({ title: route.params?.roomName || 'Room' })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
