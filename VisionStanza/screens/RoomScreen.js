import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';
import { useFocusEffect } from '@react-navigation/native';

const USER_STATUS_INSIDE = 'inside';
const USER_STATUS_OUTSIDE = 'outside';
const COLOR_INSIDE = '#4CAF50'; // Green
const COLOR_OUTSIDE = '#F44336'; // Red

const RoomScreen = ({ route, navigation }) => {
  const { roomId, roomName } = route.params;
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  const fetchCurrentUserId = async () => {
    const id = await AsyncStorage.getItem('userId');
    setCurrentUserId(id);
    return id;
  };

  const fetchRoomMembers = useCallback(async (userId) => {
    if (!roomId || !userId) return;
    setLoading(true);
    try {
      const { data, error: membersError } = await supabase
        .from('room_members')
        .select(`
          id,
          status,
          user_id,
          users (id, name)
        `)
        .eq('room_id', roomId);

      if (membersError) throw membersError;

      const fetchedMembers = data.map(m => ({
        id: m.id, // room_members primary key
        userId: m.users.id,
        name: m.users.name,
        status: m.status,
      }));
      setMembers(fetchedMembers);

      const CUser = fetchedMembers.find(m => m.userId === userId);
      setCurrentUser(CUser);

    } catch (e) {
      console.error('Failed to fetch room members:', e);
      setError('Failed to load room details. ' + e.message);
      Alert.alert('Error', 'Failed to load room details.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchCurrentUserId().then(id => {
      if (id) {
        fetchRoomMembers(id);
      } else {
        Alert.alert("Error", "User session not found. Please restart.");
        navigation.replace('Registration');
      }
    });
  }, [roomId, fetchRoomMembers]);

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          // Refetch members on any change in this room's memberships
          // More granular update is possible by inspecting payload (new, old, eventType)
          if (currentUserId) { // Ensure userId is available for refetch context
            fetchRoomMembers(currentUserId);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to room-${roomId} changes!`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`Subscription Error on room-${roomId}:`, status, err);
          // Optionally, try to resubscribe or notify user
        }
      });

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
      console.log(`Unsubscribed from room-${roomId}`);
    };
  }, [roomId, fetchRoomMembers, currentUserId]); // Add currentUserId to dependencies

  const handleToggleStatus = async () => {
    if (!currentUser || !currentUserId) {
      Alert.alert('Error', 'Could not find your details in this room.');
      return;
    }
    setLoading(true);
    const newStatus = currentUser.status === USER_STATUS_INSIDE ? USER_STATUS_OUTSIDE : USER_STATUS_INSIDE;

    try {
      const { error: updateError } = await supabase
        .from('room_members')
        .update({ status: newStatus })
        .eq('user_id', currentUserId)
        .eq('room_id', roomId);

      if (updateError) throw updateError;

      // Optimistic update for current user, or rely on realtime fetch
      // setCurrentUser(prev => ({ ...prev, status: newStatus }));
      // The realtime subscription should handle updating the list, including the current user.
      // If immediate UI feedback is desired without waiting for DB roundtrip, update state here.
    } catch (e) {
      console.error('Failed to update status:', e);
      Alert.alert('Error', 'Failed to update your status. ' + e.message);
    } finally {
      setLoading(false); // Realtime should refresh, so loading might not be needed long
    }
  };

  // Set room name in header
  useEffect(() => {
    navigation.setOptions({ title: roomName || 'Room' });
  }, [navigation, roomName]);


  if (loading && members.length === 0) { // Show loading only on initial load
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B68BD9" />
        <Text>Loading room members...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} color="#B68BD9" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.roomTitleText}>Members in {roomName}:</Text>
      <View style={styles.membersContainer}>
        {members.map((member) => (
          <View key={member.userId} style={styles.memberItem}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: member.status === USER_STATUS_INSIDE ? COLOR_INSIDE : COLOR_OUTSIDE },
                member.userId === currentUserId && styles.currentUserDotHighlight
              ]}
            />
            <Text
              style={[
                styles.memberName,
                member.userId === currentUserId && styles.currentUserNameHighlight
              ]}
            >
              {member.name} {member.userId === currentUserId ? '(You)' : ''}
            </Text>
          </View>
        ))}
      </View>

      {currentUser && (
        <View style={styles.actionButtonContainer}>
          <Button
            title={currentUser.status === USER_STATUS_INSIDE ? 'Salir (Exit)' : 'Entrar (Enter)'}
            onPress={handleToggleStatus}
            disabled={loading}
            color={currentUser.status === USER_STATUS_INSIDE ? COLOR_OUTSIDE : COLOR_INSIDE}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FA',
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center', // Center items like the members container if it's not full width
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  roomTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    // fontFamily: 'Inter-Bold',
  },
  membersContainer: {
    width: '100%',
    maxWidth: 400, // Max width for member list on larger screens
    marginBottom: 30,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 15,
    borderWidth: 2,
    borderColor: 'transparent', // Default no border
  },
  currentUserDotHighlight: {
    borderColor: '#B68BD9', // Highlight color for current user's dot
    transform: [{ scale: 1.1 }], // Slightly larger
  },
  memberName: {
    fontSize: 18,
    color: '#333',
    // fontFamily: 'Inter-Regular',
  },
  currentUserNameHighlight: {
    fontWeight: 'bold',
    color: '#B68BD9', // Highlight color for current user's name
    // fontFamily: 'Inter-Bold',
  },
  actionButtonContainer: {
    width: '80%',
    maxWidth: 300,
    marginTop: 20,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default RoomScreen;
