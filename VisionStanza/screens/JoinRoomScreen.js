import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';

const JoinRoomScreen = ({ navigation }) => {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || roomCode.trim().length !== 9) {
      setError('Please enter a valid 9-character room code.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert("Error", "User not found. Please restart the app.");
        navigation.navigate('Registration');
        return;
      }

      const trimmedCode = roomCode.trim().toUpperCase(); // Often codes are case-insensitive or stored uppercase

      // 1. Find the room by code
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id, name') // Select only needed fields
        .eq('code', trimmedCode)
        .single();

      if (roomError || !roomData) {
        setError('Room not found. Please check the code and try again.');
        if (roomError && roomError.code !== 'PGRST116') { // PGRST116: 0 rows, expected 1
             console.error('Error fetching room:', roomError);
        }
        return;
      }

      // 2. Check if user is already a member of this room
      const { data: existingMembership, error: membershipCheckError } = await supabase
        .from('room_members')
        .select('id')
        .eq('room_id', roomData.id)
        .eq('user_id', userId)
        .maybeSingle(); // Returns one row or null, doesn't error if 0 rows

      if (membershipCheckError) throw membershipCheckError;

      if (existingMembership) {
        Alert.alert("Already a Member", "You are already a member of this room.");
        // Navigate to the room directly
        navigation.replace('Room', { roomId: roomData.id, roomName: roomData.name });
        return;
      }

      // 3. Add user to the room
      const { error: memberError } = await supabase
        .from('room_members')
        .insert([{ room_id: roomData.id, user_id: userId, status: 'outside' }]);

      if (memberError) throw memberError;

      Alert.alert("Success", `You've joined the room: ${roomData.name}!`);
      navigation.replace('Room', { roomId: roomData.id, roomName: roomData.name });

    } catch (e) {
      console.error('Failed to join room:', e);
      setError('Failed to join room. ' + (e.message || 'Please try again.'));
      Alert.alert("Error", "Failed to join room. " + (e.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join an Existing Room</Text>
      <Text style={styles.label}>Enter Room Code (9 characters):</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., X1A9B6K3Q"
        value={roomCode}
        onChangeText={(text) => setRoomCode(text.toUpperCase())} // Convert to uppercase for consistency
        autoCapitalize="characters"
        maxLength={9}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Button
        title={loading ? "Joining Room..." : "Join Room"}
        onPress={handleJoinRoom}
        disabled={loading}
        color="#B68BD9"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8F8FA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#FFF',
    textAlign: 'center', // Center text for codes
  },
  errorText: {
    color: '#F44336',
    marginBottom: 15,
    textAlign: 'center',
  },
});

export default JoinRoomScreen;
