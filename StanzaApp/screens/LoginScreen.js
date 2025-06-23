import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const LoginScreen = ({ navigation }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        navigation.replace('Home');
      }
    };
    checkUser();
  }, [navigation]);

  const handleLogin = async () => {
    if (name.trim() === '') {
      Alert.alert('Name Required', 'Please enter your name to continue.');
      return;
    }

    try {
      let { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('name', name.trim())
        .single();

      let userId;

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (existingUser) {
        userId = existingUser.id;
        // Alert.alert('Welcome back!', `Signed in as ${name}.`); // Less intrusive, rely on Home screen welcome
      } else {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([{ name: name.trim() }])
          .select('id')
          .single();

        if (insertError) throw insertError;
        userId = newUser.id;
        // Alert.alert('Welcome!', `User ${name} created successfully.`);
      }

      await AsyncStorage.setItem('userId', userId);
      await AsyncStorage.setItem('userName', name.trim());
      navigation.replace('Home');

    } catch (error) {
      console.error('Error logging in:', error);
      Alert.alert('Login Failed', error.message || 'An unexpected error occurred.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.title}>Stanza</Text>
        <Text style={styles.subtitle}>Who's In? Who's Out? Instantly.</Text>

        <TextInput
          style={styles.input}
          placeholder="Your Name"
          placeholderTextColor="#A0A0A0"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleLogin} // Allow submitting with keyboard 'done'
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FA', // Neutral background
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30, // More padding
  },
  title: {
    fontSize: Platform.OS === 'ios' ? 60 : 52,
    fontWeight: Platform.OS === 'ios' ? 'bold' : 'normal',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed', // Or a more stylish sans-serif
    color: '#B68BD9', // Primary color
    marginBottom: 10,
  },
  subtitle: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    color: '#666', // Softer text color
    marginBottom: 50, // Increased spacing
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50, // Standard iOS height
    backgroundColor: '#FFFFFF', // White background for input
    borderColor: Platform.OS === 'ios' ? '#E0E0E0' : '#C0C0C0', // Lighter border for iOS
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderRadius: 8, // Slightly rounded corners
    paddingHorizontal: 15,
    marginBottom: 25, // Increased spacing
    fontSize: 17, // Standard iOS text size
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#B68BD9', // Primary color
    borderRadius: 8, // Matching input field
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Platform.OS === 'ios' ? '#000000' : undefined, // iOS shadow
    shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined,
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : undefined,
    shadowRadius: Platform.OS === 'ios' ? 3 : undefined,
    elevation: Platform.OS === 'android' ? 2 : 0, // Android elevation
  },
  buttonText: {
    color: '#FFFFFF', // White text on button
    fontSize: 17,
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold', // Semibold for iOS
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
});

export default LoginScreen;
