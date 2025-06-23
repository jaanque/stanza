import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const JoinRoomScreen = ({ navigation }) => {
  const [roomCode, setRoomCode] = useState('');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      if (!id) {
        Alert.alert("Session Expired", "User not found. Please login again.", [{text: "OK", onPress: () => navigation.replace('Login')}]);
      } else {
        setUserId(id);
      }
    };
    loadUserId();
  }, [navigation]);

  const handleJoinRoom = async () => {
    const trimmedCode = roomCode.trim().toUpperCase();
    if (trimmedCode.length !== 9) {
      Alert.alert('Invalid Code', 'Room code must be exactly 9 characters long.');
      return;
    }
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Cannot join room.');
      return;
    }

    setLoading(true);
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('code', trimmedCode)
        .single();

      if (roomError || !roomData) {
        if (roomError && roomError.code === 'PGRST116') {
             Alert.alert('Room Not Found', 'No room exists with this code. Please double-check and try again.');
        } else {
            throw roomError || new Error('Could not find room.');
        }
        setLoading(false);
        return;
      }

      const { data: memberCheck, error: memberCheckError } = await supabase
        .from('room_members')
        .select('id')
        .eq('room_id', roomData.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (memberCheckError && memberCheckError.code !== 'PGRST116') {
        throw memberCheckError;
      }

      if (memberCheck) {
        Alert.alert('Already a Member', `You're already in "${roomData.name}". Taking you there!`, [{ text: "OK", onPress: () => navigation.replace('Room', { roomId: roomData.id, roomName: roomData.name }) }]);
        setLoading(false); // Important: stop loading before navigating if already member
        return;
      }

      const { error: insertMemberError } = await supabase
        .from('room_members')
        .insert([{ room_id: roomData.id, user_id: userId, status: 'outside' }]);

      if (insertMemberError) throw insertMemberError;

      Alert.alert('Joined Successfully!', `Welcome to "${roomData.name}"!`, [{ text: "Let's Go!", onPress: () => navigation.replace('Room', { roomId: roomData.id, roomName: roomData.name }) }]);
    } catch (error) {
      console.error('Error joining room:', error);
      Alert.alert('Join Failed', error.message || 'An unexpected error occurred. Please ensure the code is correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.label}>Room Code</Text>
        <TextInput
          style={styles.input}
          placeholder="ABC123XYZ"
          placeholderTextColor="#A0A0A0"
          value={roomCode}
          onChangeText={(text) => setRoomCode(text)}
          autoCapitalize="characters"
          maxLength={9}
          returnKeyType="done"
          onSubmitEditing={handleJoinRoom}
          keyboardType={Platform.OS === 'ios' ? 'default' : 'visible-password'} // visible-password often good for codes
          autoCorrect={false}
        />
        {loading ? (
          <ActivityIndicator size="small" color="#B68BD9" style={{marginTop:20}}/>
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleJoinRoom} disabled={!userId || loading}>
            <Text style={styles.buttonText}>Join Room</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? '#F0F0F0' : '#F8F8FA', // Grouped table view background for iOS
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, // Padding for keyboard
  },
  label: {
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    color: '#6D6D72', // iOS label color
    marginBottom: 8,
    marginLeft: Platform.OS === 'ios' ? 16 : 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: Platform.OS === 'ios' ? '500' : 'normal',
  },
  input: {
    width: '100%',
    height: Platform.OS === 'ios' ? 44 : 50,
    backgroundColor: '#FFFFFF',
    borderColor: Platform.OS === 'ios' ? '#C8C7CC' : '#C0C0C0',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: 15,
    marginBottom: 25,
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'monospace', // Monospace for code input often looks good
    textAlign: 'center', // Center code
    letterSpacing: Platform.OS === 'ios' ? 3 : 2, // Add some letter spacing for codes
  },
  button: {
    width: '100%',
    height: Platform.OS === 'ios' ? 48 : 50,
    backgroundColor: '#B68BD9', // Primary color
    borderRadius: Platform.OS === 'ios' ? 8 : 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
});

export default JoinRoomScreen;
