// models/room_history_event.dart
// Clase para representar un evento en el historial de la habitación
class RoomHistoryEvent {
  final int id;
  final String roomId;
  final String userId;
  final String userName;
  final String eventType; // 'entrada' o 'salida'
  final DateTime timestamp;

  RoomHistoryEvent({
    required this.id,
    required this.roomId,
    required this.userId,
    required this.userName,
    required this.eventType,
    required this.timestamp,
  });

  factory RoomHistoryEvent.fromJson(Map<String, dynamic> json) {
    return RoomHistoryEvent(
      id: json['id'] as int,
      roomId: json['room_id'] as String,
      userId: json['user_id'] as String,
      userName: json['user_name'] as String,
      eventType: json['event_type'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }
}