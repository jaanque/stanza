import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';
import 'react-native-get-random-values'; // For uuid
import { v4 as uuidv4 } from 'uuid';

const generateRoomCode = (length = 9) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const CreateRoomScreen = ({ navigation }) => {
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError('Please enter a name for your room.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert("Error", "User not found. Please restart the app.");
        navigation.navigate('Registration'); // Or handle more gracefully
        return;
      }

      const roomCode = generateRoomCode();
      const newRoomId = uuidv4();

      // 1. Create the room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert([{ id: newRoomId, name: roomName.trim(), code: roomCode }])
        .select()
        .single(); // Use single to get the created object back directly

      if (roomError) throw roomError;
      if (!roomData) throw new Error("Room creation failed, no data returned.");

      // 2. Add current user as a member
      const { error: memberError } = await supabase
        .from('room_members')
        .insert([{ room_id: roomData.id, user_id: userId, status: 'outside' }]);

      if (memberError) throw memberError;

      // Navigate to the new room screen
      // Pass room ID and name to the RoomScreen
      navigation.replace('Room', { roomId: roomData.id, roomName: roomData.name });
      // Consider navigation.navigate instead of replace if back behavior is desired
      // or reset stack if this is a main flow completion

    } catch (e) {
      console.error('Failed to create room:', e);
      setError('Failed to create room. Please try again. ' + (e.message || ''));
      Alert.alert("Error", "Failed to create room. " + (e.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a New Room</Text>
      <Text style={styles.label}>Room Name:</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Living Room, Office Hub"
        value={roomName}
        onChangeText={setRoomName}
        autoCapitalize="words"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Button
        title={loading ? "Creating Room..." : "Create Room"}
        onPress={handleCreateRoom}
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
    // justifyContent: 'center', // Remove if header is present and you want content at top
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    // fontFamily: 'Inter-Bold',
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    // fontFamily: 'Inter-Regular',
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
    // fontFamily: 'Inter-Regular',
  },
  errorText: {
    color: '#F44336',
    marginBottom: 15,
    textAlign: 'center',
    // fontFamily: 'Inter-Regular',
  },
  // Add styles for Button if using custom TouchableOpacity
});

export default CreateRoomScreen;
