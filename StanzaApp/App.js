import 'react-native-gesture-handler'; // Must be at the top
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import CreateRoomScreen from './screens/CreateRoomScreen';
import JoinRoomScreen from './screens/JoinRoomScreen';
import RoomScreen from './screens/RoomScreen';
import { Platform, Text } from 'react-native'; // For custom font example

const Stack = createStackNavigator();

// Basic theme for navigation header
const navTheme = {
  colors: {
    primary: '#B68BD9', // Primary color for header, tint color for back button etc.
    background: '#F8F8FA', // Background of screens
    card: '#FFFFFF', // Background of header
    text: '#333333', // Text color in header
    border: '#DDD', // Border color for header
  },
};

// Custom header title style
const headerTitleStyle = Platform.select({
  ios: {
    fontSize: 17, // Standard iOS title size
    fontWeight: '600', // Semibold for iOS titles
  },
  android: {
    fontSize: 20, // Standard Android title size
    fontFamily: 'sans-serif-medium',
    fontWeight: 'normal', // fontFamily handles weight on Android
  },
  default: {
    fontSize: 18,
    fontWeight: '600',
  }
});

const largeHeaderTitleStyle = Platform.select({
  ios: {
    fontSize: 34, // Large title size for iOS
    fontWeight: 'bold',
    color: navTheme.colors.text,
  },
  android: { // Android doesn't have a direct "largeTitle" like iOS, use prominent title
    fontSize: 24,
    fontFamily: 'sans-serif-medium',
    color: navTheme.colors.text,
  },
  default: {
    fontSize: 28,
    fontWeight: 'bold',
    color: navTheme.colors.text,
  }
});


export default function App() {
  const [initialRouteName, setInitialRouteName] = React.useState(null);

  React.useEffect(() => {
    const checkLoginState = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          setInitialRouteName('Home');
        } else {
          setInitialRouteName('Login');
        }
      } catch (e) {
        // Handle error, maybe default to Login
        console.error("Failed to load user ID from storage", e);
        setInitialRouteName('Login');
      }
    };

    checkLoginState();
  }, []);

  if (initialRouteName === null) {
    // You might want to render a loading spinner here
    // For now, returning null or an empty View until route is determined
    return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text>Loading...</Text></View>;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerStyle: {
            backgroundColor: navTheme.colors.card,
          },
          headerTintColor: Platform.OS === 'ios' ? navTheme.colors.primary : navTheme.colors.text, // iOS uses tint for buttons, Android for text
          headerTitleStyle: headerTitleStyle,
          headerBackTitleVisible: false, // Hides "Back" text on iOS
          headerStyle: Platform.select({
            ios: {
              backgroundColor: navTheme.colors.card, // Standard card background
              // For "blur" effect, more complex setup with @react-navigation/elements Header might be needed
            },
            android: {
              backgroundColor: navTheme.colors.primary, // Android often uses primary color for header
              elevation: 4, // Standard shadow for Android AppBar
            },
            default: {
              backgroundColor: navTheme.colors.card,
            }
          }),
          headerTitleAlign: Platform.OS === 'ios' ? 'center' : 'left', // iOS titles default center, Android left
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Stanza', // Simplified title
            headerLargeTitle: Platform.OS === 'ios', // Enable iOS large title
            headerLargeTitleStyle: largeHeaderTitleStyle,
            // On Android, the title will use standard headerTitleStyle
             headerStyle: Platform.select({ // Custom header style for Home on Android
              android: {
                backgroundColor: navTheme.colors.primary,
                elevation: 4,
              },
              ios: {
                 backgroundColor: navTheme.colors.background, // For large titles, iOS header often matches screen bg
                 borderBottomWidth: 0, // No border for large title style
              }
            }),
            headerTintColor: Platform.select({
                android: '#FFFFFF', // White title text on primary color background for Android
                ios: navTheme.colors.primary
            }),
            headerLargeTitleShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="CreateRoom"
          component={CreateRoomScreen}
          options={{ title: 'Create Room' }} // Standard title
        />
        <Stack.Screen
          name="JoinRoom"
          component={JoinRoomScreen}
          options={{ title: 'Join Room' }} // Standard title
        />
        <Stack.Screen
          name="Room"
          component={RoomScreen}
          options={({ route }) => ({
            title: route.params?.roomName || 'Room',
            // Example of platform-specific options within a screen
            headerTitleAlign: 'center', // Center for this screen on all platforms if desired
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Remove or comment out the old styles if not used
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });
