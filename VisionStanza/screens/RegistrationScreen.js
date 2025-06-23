import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient'; // Assuming supabaseClient.js is in the root
import 'react-native-get-random-values'; // Import for uuid
import { v4 as uuidv4 } from 'uuid';

const RegistrationScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          // If user ID exists, navigate to Home, assuming they are already registered
          navigation.replace('Home');
        }
      } catch (e) {
        console.error('Failed to load user ID from storage', e);
        // Handle error, maybe show a message to the user
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [navigation]);

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const userId = uuidv4();
      // Save to Supabase
      const { data, error: supabaseError } = await supabase
        .from('users')
        .insert([{ id: userId, name: name.trim() }])
        .select();

      if (supabaseError) {
        throw supabaseError;
      }

      // Save to AsyncStorage
      await AsyncStorage.setItem('userId', userId);
      await AsyncStorage.setItem('userName', name.trim());

      // Navigate to Home Screen
      navigation.replace('Home');
    } catch (e) {
      console.error('Registration failed', e);
      setError('Registration failed. Please try again.');
      // Potentially remove stored items if registration failed mid-way
      try {
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('userName');
      } catch (cleanupError) {
        console.error('Cleanup failed after registration error', cleanupError);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !name) { // Show loading indicator only during initial check or submission
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#B68BD9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Vision Stanza!</Text>
      <Text style={styles.subtitle}>Please enter your name to get started.</Text>
      <TextInput
        style={styles.input}
        placeholder="Your Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Button
        title={loading ? "Registering..." : "Register"}
        onPress={handleRegister}
        disabled={loading}
        color="#B68BD9"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F8FA',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    fontFamily: 'Inter-Bold', // Assuming Inter font is available
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 30,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Regular',
  },
  errorText: {
    color: '#F44336',
    marginBottom: 10,
    fontFamily: 'Inter-Regular',
  },
});

// Placeholder for font loading if needed, e.g., using expo-font
// For now, we assume 'Inter-Bold' and 'Inter-Regular' might fallback or be loaded elsewhere.

export default RegistrationScreen;
