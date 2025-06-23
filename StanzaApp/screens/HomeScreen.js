import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useFocusEffect, useNavigation } from '@react-navigation/native'; // useNavigation hook

// iOS-style Button (can be a separate component later)
const IOSButton = ({ title, onPress, type = 'primary', style, textStyle }) => {
  return (
    <TouchableOpacity
      style={[
        styles.iosButton,
        type === 'primary' && styles.iosButtonPrimary,
        type === 'secondary' && styles.iosButtonSecondary,
        style,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.iosButtonText,
          type === 'primary' && styles.iosButtonTextPrimary,
          type === 'secondary' && styles.iosButtonTextSecondary,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};


const HomeScreen = () => { // Removed navigation from props, will use hook
  const navigation = useNavigation(); // Use hook for navigation
  const [userName, setUserName] = useState('');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // userId state is not strictly needed in this component if only used for fetching
  // const [userId, setUserId] = useState(null);

  const fetchUserDataAndRooms = useCallback(async () => {
    // setLoading(true); // Only set loading true for initial load, not for refresh
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      const storedUserName = await AsyncStorage.getItem('userName');

      if (!storedUserId) {
        Alert.alert("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => navigation.replace('Login') }]);
        return;
      }
      // setUserId(storedUserId);
      setUserName(storedUserName || 'User');

      const { data, error } = await supabase
        .from('room_members')
        .select(`
          id,
          status,
          rooms (
            id,
            name,
            code
          )
        `)
        .eq('user_id', storedUserId);

      if (error) throw error;

      const DEDUPED_ROOMS_FROM_MEMBERSHIPS = data.reduce((acc, membership) => {
        if (membership.rooms && !acc.find(r => r.id === membership.rooms.id)) {
          acc.push({
            id: membership.rooms.id,
            name: membership.rooms.name,
            code: membership.rooms.code,
          });
        }
        return acc;
      }, []);
      setRooms(DEDUPED_ROOMS_FROM_MEMBERSHIPS);

    } catch (error) {
      console.error('Error fetching rooms:', error);
      Alert.alert('Error', 'Failed to fetch rooms: ' + error.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [navigation]); // Added navigation to dependency array for Alert redirect

  useEffect(() => {
    setLoading(true); // Set loading true on initial mount
    fetchUserDataAndRooms();
  }, [fetchUserDataAndRooms]);


  useFocusEffect(
    useCallback(() => {
      // Don't set loading to true here, as it might cause flicker when returning
      // fetchUserDataAndRooms will handle its own loading for the data part
      fetchUserDataAndRooms();
    }, [fetchUserDataAndRooms])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchUserDataAndRooms();
  }, [fetchUserDataAndRooms]);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userId');
              await AsyncStorage.removeItem('userName');
              navigation.replace('Login');
            } catch (e) { Alert.alert("Error", "Failed to logout."); }
          },
          style: Platform.OS === 'ios' ? "destructive" : "default",
        },
      ],
      { cancelable: true }
    );
  };

  useEffect(() => {
    // Set header options for logout button - more iOS like
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={{ marginRight: Platform.OS === 'ios' ? 16 : 20 }}>
          <Text style={{ color: Platform.OS === 'ios' ? '#B68BD9' : '#FFFFFF', fontSize: 17 }}>Logout</Text>
        </TouchableOpacity>
      ),
      // Example: Update title dynamically based on userName
      // headerTitle: userName ? `Welcome, ${userName}` : 'Stanza Home',
    });
  }, [navigation, userName]); // Add userName if using it in headerTitle

  if (loading && rooms.length === 0) { // Show loader only if loading and no rooms data yet
    return (
      <View style={styles.centered}>
        <ActivityIndicator size={Platform.OS === 'ios' ? "small" : "large"} color="#B68BD9" />
      </View>
    );
  }

  const renderRoomItem = ({ item }) => (
    <TouchableOpacity
      style={styles.roomItem}
      onPress={() => navigation.navigate('Room', { roomId: item.id, roomName: item.name })}
    >
      <View>
        <Text style={styles.roomName}>{item.name}</Text>
        <Text style={styles.roomCode}>Code: {item.code}</Text>
      </View>
      <Text style={styles.roomArrow}>{'>'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Welcome message can be part of the header (large title on iOS) or a separate Text element */}
      {/* <Text style={styles.welcomeMessage}>Welcome, {userName}!</Text> */}

      {rooms.length === 0 && !loading && (
        <View style={styles.centered}>
          <Text style={styles.noRoomsText}>No rooms yet.</Text>
          <Text style={styles.noRoomsSubText}>Create or join a room to get started.</Text>
          <IOSButton title="Create Room" onPress={() => navigation.navigate('CreateRoom')} style={{marginBottom: 15}}/>
          <IOSButton title="Join Room" onPress={() => navigation.navigate('JoinRoom')} type="secondary" />
        </View>
      )}

      {rooms.length > 0 && (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRoomItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <View style={styles.listHeaderFooterContainer}>
              {/* <Text style={styles.listTitle}>Your Rooms</Text> */}
            </View>
          }
          ListFooterComponent={
            <View style={styles.listHeaderFooterContainer}>
              <IOSButton title="Create New Room" onPress={() => navigation.navigate('CreateRoom')} style={{marginTop: 20, marginBottom:10}} />
              <IOSButton title="Join Another Room" onPress={() => navigation.navigate('JoinRoom')} type="secondary" />
            </View>
          }
          contentContainerStyle={styles.listContentContainer}
          refreshControl={ // Pull to refresh
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={Platform.OS === 'ios' ? "#B68BD9" : undefined} // iOS tint color for spinner
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? '#F0F0F0' : '#F8F8FA', // iOS grouped table view style bg
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  welcomeMessage: { // If not using large title for welcome message
    fontSize: 22,
    fontWeight: '500',
    color: '#333',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  noRoomsText: {
    fontSize: Platform.OS === 'ios' ? 22 : 20,
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  noRoomsSubText: {
    fontSize: Platform.OS === 'ios' ? 16 : 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  // List related styles
  listContentContainer: {
    paddingVertical: Platform.OS === 'ios' ? 20 : 10, // More padding for iOS lists
  },
  listHeaderFooterContainer: {
    paddingHorizontal: Platform.OS === 'ios' ? 16 : 20, // Standard iOS horizontal padding for content within lists
    // marginBottom: 10,
  },
  listTitle: { // If using a title like "Your Rooms" above the list
    fontSize: Platform.OS === 'ios' ? 22 : 20, // Similar to section header
    fontWeight: Platform.OS === 'ios' ? 'bold' : 'bold',
    color: '#000',
    paddingHorizontal: Platform.OS === 'ios' ? 16 : 20,
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  roomItem: {
    backgroundColor: '#FFFFFF', // White background for items
    paddingVertical: Platform.OS === 'ios' ? 12 : 15,
    paddingHorizontal: Platform.OS === 'ios' ? 16 : 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // borderBottomWidth: StyleSheet.hairlineWidth, // Separator handled by ItemSeparatorComponent
    // borderBottomColor: '#C8C7CC', // Standard iOS separator color
  },
  roomName: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  roomCode: {
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    color: '#8E8E93', // iOS secondary label color
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  roomArrow: {
    fontSize: Platform.OS === 'ios' ? 20 : 18,
    color: '#C7C7CC', // iOS disclosure indicator color
    fontWeight: 'bold',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C8C7CC', // Standard iOS separator color
    marginLeft: Platform.OS === 'ios' ? 16 : 0, // Indent separator like iOS
  },
  // iOS-style Button styles
  iosButton: {
    width: '100%',
    height: Platform.OS === 'ios' ? 48 : 50, // iOS standard button height
    borderRadius: Platform.OS === 'ios' ? 8 : 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosButtonPrimary: {
    backgroundColor: '#B68BD9', // App's primary color
  },
  iosButtonSecondary: {
    backgroundColor: Platform.OS === 'ios' ? '#EFEFF4' : '#DDDDDD', // Light gray for secondary
  },
  iosButtonText: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold', // Semibold for iOS
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  iosButtonTextPrimary: {
    color: '#FFFFFF',
  },
  iosButtonTextSecondary: {
    color: '#B68BD9', // Primary color for text on secondary button
  },
});

export default HomeScreen;
