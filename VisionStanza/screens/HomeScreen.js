import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';
import { useFocusEffect } from '@react-navigation/native';

const HomeScreen = ({ navigation }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserDataAndRooms = useCallback(async () => {
    setLoading(true);
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      const storedUserName = await AsyncStorage.getItem('userName');
      if (!storedUserId) {
        navigation.replace('Registration');
        return;
      }
      setUserId(storedUserId);
      setUserName(storedUserName || 'User'); // Fallback name

      // Fetch room memberships for the user
      const { data: roomMemberships, error: memberError } = await supabase
        .from('room_members')
        .select('room_id, rooms (id, name, code)') // Join with rooms table
        .eq('user_id', storedUserId);

      if (memberError) throw memberError;

      if (roomMemberships) {
        const userRooms = roomMemberships.map(mem => ({
          id: mem.rooms.id,
          name: mem.rooms.name,
          code: mem.rooms.code,
        }));
        setRooms(userRooms);
      }
    } catch (error) {
      console.error('Error fetching user data or rooms:', error);
      // Handle error (e.g., show a message to the user)
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  // useFocusEffect to refetch data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUserDataAndRooms();
    }, [fetchUserDataAndRooms])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserDataAndRooms();
  }, [fetchUserDataAndRooms]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Optional: Call Supabase sign out if you implement full auth later
      // const { error } = await supabase.auth.signOut();
      // if (error) throw error;

      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userName');
      // Potentially clear other app-specific async storage data
      navigation.replace('Registration');
    } catch (error) {
      console.error('Logout failed:', error);
      setLoading(false);
      // Show error message to user
    }
  };

  const renderRoomItem = ({ item }) => (
    <TouchableOpacity
      style={styles.roomItem}
      onPress={() => navigation.navigate('Room', { roomId: item.id, roomName: item.name })}
    >
      <Text style={styles.roomName}>{item.name}</Text>
      <Text style={styles.roomCode}>Code: {item.code}</Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B68BD9" />
        <Text>Loading your rooms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome, {userName}!</Text>

      {rooms.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.noRoomsText}>You are not part of any rooms yet.</Text>
          <View style={styles.buttonContainer}>
            <Button
              title="Create a New Room"
              onPress={() => navigation.navigate('CreateRoom')}
              color="#B68BD9"
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Join an Existing Room"
              onPress={() => navigation.navigate('JoinRoom')}
              color="#B68BD9"
            />
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.subtitle}>Your Rooms:</Text>
          <FlatList
            data={rooms}
            renderItem={renderRoomItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#B68BD9"]} />
            }
          />
        </>
      )}
       <View style={styles.footerButtons}>
        {rooms.length > 0 && (
          <>
            <Button
              title="Create Room"
              onPress={() => navigation.navigate('CreateRoom')}
              color="#B68BD9"
            />
            <View style={{ marginVertical: 5 }} />
            <Button
              title="Join Room"
              onPress={() => navigation.navigate('JoinRoom')}
              color="#B68BD9"
            />
          </>
        )}
        <View style={{ marginVertical: 10 }} />
        <Button
          title="Logout"
          onPress={handleLogout}
          color="#777"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8F8FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    // fontFamily: 'Inter-Bold', // Assuming Inter font
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
    // fontFamily: 'Inter-SemiBold',
  },
  noRoomsText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    // fontFamily: 'Inter-Regular',
  },
  list: {
    width: '100%',
  },
  roomItem: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B68BD9',
    // fontFamily: 'Inter-Bold',
  },
  roomCode: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
    // fontFamily: 'Inter-Regular',
  },
  buttonContainer: {
    width: '80%',
    marginVertical: 8,
    alignSelf: 'center',
  },
  footerButtons: {
    marginTop: 'auto', // Pushes buttons to the bottom if there's room
    paddingTop: 10, // Some padding from the list or content above
    width: '100%',
  }
});

export default HomeScreen;
