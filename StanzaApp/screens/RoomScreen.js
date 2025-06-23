import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Platform, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';

const USER_DOT_SIZE = Platform.OS === 'ios' ? 70 : 60;
const USER_DOT_MARGIN = Platform.OS === 'ios' ? 12 : 10;

const RoomScreen = ({ route, navigation }) => {
  const { roomId, roomName } = route.params;
  const [members, setMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserStatus, setCurrentUserStatus] = useState(null);
  const [loading, setLoading] = useState(true); // For initial load and status toggle
  const [isRefreshing, setIsRefreshing] = useState(false); // For pull-to-refresh
  const [error, setError] = useState(null);

  const fetchRoomData = useCallback(async (isInitialOrPullRefresh = false) => {
    if (isInitialOrPullRefresh && !isRefreshing) setLoading(true); // Show full loader only on initial or if not already refreshing
    setError(null);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert("Session Expired", "Please log in again.", [{text: "OK", onPress: () => navigation.replace('Login')}]);
        return;
      }
      setCurrentUserId(userId);

      const { data, error: fetchError } = await supabase
        .from('room_members')
        .select(`status, users (id, name)`)
        .eq('room_id', roomId);

      if (fetchError) throw fetchError;

      const formattedMembers = data.map(member => ({
        id: member.users.id,
        name: member.users.name,
        status: member.status,
      })).sort((a, b) => { // Sort here for consistency
        if (a.id === userId) return -1;
        if (b.id === userId) return 1;
        return a.name.localeCompare(b.name);
      });
      setMembers(formattedMembers);

      const currentUser = formattedMembers.find(m => m.id === userId);
      if (currentUser) {
        setCurrentUserStatus(currentUser.status);
      } else {
        Alert.alert("Membership Issue", "You don't seem to be a member of this room anymore.", [{text: "OK", onPress: () => navigation.goBack()}]);
      }
    } catch (e) {
      console.error('Error fetching room data:', e);
      setError('Failed to load room data. ' + e.message);
    } finally {
      if (isInitialOrPullRefresh) setLoading(false);
      setIsRefreshing(false);
    }
  }, [roomId, navigation, isRefreshing]); // isRefreshing added

  useEffect(() => {
    fetchRoomData(true); // Initial fetch

    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}`},
        (payload) => {
          console.log('Realtime update received:', payload);
          fetchRoomData(false); // No full loader for realtime updates
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error("Realtime subscription error:", err);
          setError("Realtime connection issue. Status updates might be delayed.");
        } else {
          console.log("Subscribed to realtime for room:", roomId, "Status:", status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      console.log("Unsubscribed from realtime for room:", roomId);
    };
  }, [roomId, fetchRoomData]);

  useFocusEffect(useCallback(() => { fetchRoomData(true); }, [fetchRoomData]));

  const onRefresh = useCallback(() => {
    setIsRefreshing(true); // This will be reset by fetchRoomData
    fetchRoomData(true);   // Treat pull-refresh like an initial load for loader logic
  }, [fetchRoomData]);


  const toggleStatus = async () => {
    if (!currentUserId || !currentUserStatus) {
      Alert.alert('Status Unavailable', 'Cannot change status at the moment.');
      return;
    }
    const newStatus = currentUserStatus === 'inside' ? 'outside' : 'inside';
    setLoading(true); // Indicate loading for this specific action
    try {
      const { error: updateError } = await supabase
        .from('room_members')
        .update({ status: newStatus })
        .eq('room_id', roomId)
        .eq('user_id', currentUserId);
      if (updateError) throw updateError;
      // Rely on real-time update to refresh UI
    } catch (e) {
      console.error('Error updating status:', e);
      Alert.alert('Update Failed', 'Could not update status: ' + e.message);
    } finally {
      setLoading(false); // Stop loading indicator for this action
    }
  };

  // Update header title dynamically - iOS style
  useEffect(() => {
    navigation.setOptions({ title: roomName || 'Room' });
  }, [navigation, roomName]);

  if (loading && members.length === 0 && !isRefreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size={Platform.OS === 'ios' ? "small" : "large"} color="#B68BD9" />
      </View>
    );
  }

  if (error && members.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchRoomData(true)}>
            <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.retryButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Room name is now in header title */}
      {error && !isRefreshing && <Text style={styles.inlineErrorText}>{error}</Text>}

      <ScrollView
        contentContainerStyle={styles.dotsScrollContainer}
        refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={Platform.OS === 'ios' ? "#B68BD9" : undefined}
            />
        }
      >
        <View style={styles.dotsContainer}>
            {members.map(member => (
            <View key={member.id} style={styles.memberDotContainer}>
                <Svg height={USER_DOT_SIZE} width={USER_DOT_SIZE} viewBox={`0 0 ${USER_DOT_SIZE} ${USER_DOT_SIZE}`}>
                <Circle
                    cx={USER_DOT_SIZE / 2}
                    cy={USER_DOT_SIZE / 2}
                    r={(USER_DOT_SIZE / 2) - (member.id === currentUserId ? (Platform.OS === 'ios' ? 3 : 4) : (Platform.OS === 'ios' ? 1.5 : 2))}
                    fill={member.status === 'inside' ? '#4CAF50' : '#F44336'}
                    stroke={member.id === currentUserId ? '#B68BD9' : (member.status === 'inside' ? '#388E3C' : '#D32F2F')}
                    strokeWidth={member.id === currentUserId ? (Platform.OS === 'ios' ? 3 : 4) : (Platform.OS === 'ios' ? 1.5 : 2)}
                />
                </Svg>
                <Text
                    style={[styles.memberName, member.id === currentUserId && styles.currentUserName]}
                    numberOfLines={2} // Allow name to wrap slightly
                    ellipsizeMode="tail"
                >
                {member.name}{member.id === currentUserId ? " (You)" : ""}
                </Text>
            </View>
            ))}
        </View>
      </ScrollView>

      {currentUserId && currentUserStatus && (
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: currentUserStatus === 'inside' ? '#F44336' : '#4CAF50'}]}
            onPress={toggleStatus}
            disabled={loading} // Disable if any loading is active
          >
            {loading && !isRefreshing ? <ActivityIndicator color="#FFFFFF" size="small"/> : <Text style={styles.actionButtonText}>{currentUserStatus === 'inside' ? 'Exit Room' : 'Enter Room'}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? '#F0F0F0' : '#F8F8FA', // iOS grouped table view background
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Platform.OS === 'ios' ? '#F0F0F0' : '#F8F8FA',
  },
  // roomNameTitle is removed as it's in header now
  dotsScrollContainer: {
    flexGrow: 1, // Important for ScrollView to fill space if content is short
    paddingVertical: 20, // Overall padding for the scrollable content
    alignItems: 'center', // Center the dotsContainer if it's narrower than ScrollView
  },
  dotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: USER_DOT_MARGIN / 2, // Half margin for edge spacing
    maxWidth: 500, // Max width for very wide screens, helps keep layout nice
    alignSelf: 'center', // Center the container itself
  },
  memberDotContainer: {
    alignItems: 'center',
    width: USER_DOT_SIZE + USER_DOT_MARGIN, // Total width for one dot item
    marginBottom: Platform.OS === 'ios' ? 25 : 20,
    paddingHorizontal: USER_DOT_MARGIN / 2,
  },
  memberName: {
    marginTop: Platform.OS === 'ios' ? 10 : 8,
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    color: '#3C3C43', // iOS primary label dark mode / secondary label light mode
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    textAlign: 'center',
    fontWeight: Platform.OS === 'ios' ? '500' : 'normal',
  },
  currentUserName: {
    fontWeight: Platform.OS === 'ios' ? '700' : 'bold', // More emphasis for current user
    color: '#B68BD9', // Primary app color
  },
  actionButtonContainer: {
    paddingVertical: Platform.OS === 'ios' ? 15 : 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Extra padding for home indicator on iOS
    borderTopWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderTopColor: Platform.OS === 'ios' ? '#C8C7CC' : '#DDDDDD',
    backgroundColor: Platform.OS === 'ios' ? '#F9F9F9' : '#FFFFFF', // Slightly off-white for iOS bar
  },
  actionButton: {
    height: Platform.OS === 'ios' ? 48 : 50,
    borderRadius: Platform.OS === 'ios' ? 10 : 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  errorText: {
    color: '#FF3B30', // iOS system red
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  inlineErrorText: { // For non-blocking errors shown within the screen
    color: '#FF3B30',
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10, // Give it some space
    backgroundColor: '#FF3B301A', // Light red background
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  retryButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#B68BD933', // Lighter primary color for retry
    borderRadius: 8,
  },
  retryButtonText: {
      color: '#B68BD9', // Primary color text
      fontSize: 16,
      fontWeight: '500',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  // inlineLoader is removed, using button's internal loader
});

export default RoomScreen;
