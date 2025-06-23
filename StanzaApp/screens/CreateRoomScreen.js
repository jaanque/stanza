import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Share, Platform, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 9; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const CreateRoomScreen = ({ navigation }) => {
  const [roomName, setRoomName] = useState('');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createdRoomDetails, setCreatedRoomDetails] = useState(null);

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

  const handleCreateRoom = async () => {
    if (roomName.trim() === '') {
      Alert.alert('Room Name Required', 'Please enter a name for your room.');
      return;
    }
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Cannot create room.');
      return;
    }

    setLoading(true);
    setCreatedRoomDetails(null);
    let uniqueCode = generateRoomCode(); // Initial code

    try {
      let existingCodeCheck = true;
      let attempts = 0;
      const MAX_ATTEMPTS = 5;

      while (existingCodeCheck && attempts < MAX_ATTEMPTS) {
        const { data: codeCheck, error: codeCheckError } = await supabase
          .from('rooms')
          .select('code')
          .eq('code', uniqueCode)
          .maybeSingle();

        if (codeCheckError && codeCheckError.code !== 'PGRST116') throw codeCheckError;
        if (!codeCheck) existingCodeCheck = false; // Code is unique
        else uniqueCode = generateRoomCode(); // Collision, generate new
        attempts++;
      }
      if (existingCodeCheck) throw new Error("Failed to generate a unique room code after several attempts.");

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert([{ name: roomName.trim(), code: uniqueCode }])
        .select('id, name, code')
        .single();

      if (roomError || !roomData) throw roomError || new Error("Failed to create room entry.");

      const { error: memberError } = await supabase
        .from('room_members')
        .insert([{ room_id: roomData.id, user_id: userId, status: 'outside' }]);

      if (memberError) throw memberError;

      setCreatedRoomDetails({ name: roomData.name, code: roomData.code, id: roomData.id });
      // Alert is less iOS-idiomatic for success, inline message is better
      // Alert.alert(
      //   'Room Created!',
      //   `"${roomData.name}" is ready with code: ${roomData.code}.`,
      //   [{ text: "Awesome!", onPress: () => {} }] // navigation.goBack() handled by button
      // );
    } catch (error) {
      console.error('Error creating room:', error);
      Alert.alert('Creation Failed', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const onShare = async () => {
    if (!createdRoomDetails) return;
    try {
      await Share.share({
        message: `Join our Stanza room "${createdRoomDetails.name}"! Code: ${createdRoomDetails.code}\nOr join directly: stanza://join?code=${createdRoomDetails.code}`,
        // url: `stanza://join?code=${createdRoomDetails.code}` // For deep linking (future)
      });
    } catch (error) {
      Alert.alert('Share Error', error.message);
    }
  };

  const navigateToRoom = () => {
      if (!createdRoomDetails) return;
      navigation.replace('Room', { roomId: createdRoomDetails.id, roomName: createdRoomDetails.name });
  }

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
    >
      <View style={styles.innerContainer}>
        {!createdRoomDetails ? (
          <>
            <Text style={styles.label}>Room Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Study Group, Apartment 3B"
              placeholderTextColor="#A0A0A0"
              value={roomName}
              onChangeText={setRoomName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleCreateRoom}
            />
            {loading ? (
              <ActivityIndicator size="small" color="#B68BD9" style={{marginTop: 20}}/>
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleCreateRoom} disabled={!userId || loading}>
                <Text style={styles.buttonText}>Create Room</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Room Created!</Text>
            <View style={styles.codeDisplayBox}>
                <Text style={styles.detailLabel}>Room Name:</Text>
                <Text style={styles.detailValue}>{createdRoomDetails.name}</Text>
                <Text style={styles.detailLabel}>Share Code:</Text>
                <Text style={styles.codeValue}>{createdRoomDetails.code}</Text>
            </View>

            <TouchableOpacity style={[styles.button, styles.actionButton]} onPress={onShare}>
              <Text style={styles.buttonText}>Share Code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.actionButton, styles.secondaryButton]} onPress={navigateToRoom}>
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Go to Room</Text>
            </TouchableOpacity>
             <TouchableOpacity style={[styles.button, styles.linkButton]} onPress={() => navigation.navigate('Home')}>
              <Text style={[styles.buttonText, styles.linkButtonText]}>Back to Home</Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'center', // Center content vertically
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, // Padding for keyboard
  },
  label: {
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    color: '#6D6D72', // iOS label color
    marginBottom: 8,
    marginLeft: Platform.OS === 'ios' ? 16 : 4, // Indent like iOS grouped list labels
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: Platform.OS === 'ios' ? '500' : 'normal',
  },
  input: {
    width: '100%',
    height: Platform.OS === 'ios' ? 44 : 50, // iOS standard input height in lists
    backgroundColor: '#FFFFFF',
    borderColor: Platform.OS === 'ios' ? '#C8C7CC' : '#C0C0C0',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: 15,
    marginBottom: 25,
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  button: {
    width: '100%',
    height: Platform.OS === 'ios' ? 48 : 50,
    backgroundColor: '#B68BD9', // Primary color
    borderRadius: Platform.OS === 'ios' ? 8 : 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10, // Spacing after input
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  // Success state styles
  successContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#FFFFFF', // iOS usually doesn't box this in a card
    borderRadius: Platform.OS === 'ios' ? 0 : 10,
    // shadow for Android if card-like
  },
  successTitle: {
    fontSize: Platform.OS === 'ios' ? 28 : 24,
    fontWeight: Platform.OS === 'ios' ? 'bold' : 'bold',
    color: '#333',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  codeDisplayBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 0,
    borderColor: Platform.OS === 'ios' ? '#C8C7CC' : 'transparent',
  },
  detailLabel: {
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    color: '#8E8E93', // iOS secondary label color
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  detailValue: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    color: '#000000',
    marginBottom: 15,
    fontWeight: Platform.OS === 'ios' ? '500' : 'normal',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  codeValue: {
    fontSize: Platform.OS === 'ios' ? 28 : 26,
    fontWeight: 'bold',
    color: '#B68BD9', // Primary color for the code itself
    fontFamily: Platform.OS === 'ios' ? 'System' : 'monospace', // Monospace can be nice for codes
    letterSpacing: 2, // Spacing for code
  },
  actionButton: {
    marginBottom: 15,
  },
  secondaryButton: {
    backgroundColor: Platform.OS === 'ios' ? '#EFEFF4' : '#DDDDDD', // iOS secondary button color
  },
  secondaryButtonText: {
    color: '#B68BD9', // Primary color for text
  },
  linkButton: {
      backgroundColor: 'transparent',
  },
  linkButtonText: {
      color: '#B68BD9', // Primary color for link-style button
      fontWeight: Platform.OS === 'ios' ? '500' : 'normal',
  }
});

export default CreateRoomScreen;
