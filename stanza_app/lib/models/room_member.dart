

// models/room_member.dart
// Clase para representar a un miembro de la habitación
class RoomMember {
  final String userId;
  final String userName;
  final String status; // 'dentro' o 'fuera'
  final DateTime lastStatusUpdate;
  final DateTime joinedAt;

  RoomMember({
    required this.userId,
    required this.userName,
    required this.status,
    required this.lastStatusUpdate,
    required this.joinedAt,
  });

  factory RoomMember.fromJson(Map<String, dynamic> json) {
    return RoomMember(
      userId: json['user_id'] as String,
      userName: json['user_name'] as String,
      status: json['status'] as String,
      lastStatusUpdate: DateTime.parse(json['last_status_update'] as String),
      joinedAt: DateTime.parse(json['joined_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'user_name': userName,
      'status': status,
      'last_status_update': lastStatusUpdate.toIso8601String(),
      'joined_at': joinedAt.toIso8601String(),
    };
  }
}