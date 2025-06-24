// models/room.dart
// Clase para representar una habitación
class Room {
  final String id;
  late final String name;
  final String ownerId;
  final DateTime createdAt;

  Room({
    required this.id,
    required this.name,
    required this.ownerId,
    required this.createdAt,
  });

  factory Room.fromJson(Map<String, dynamic> json) {
    return Room(
      id: json['id'] as String,
      name: json['name'] as String,
      ownerId: json['owner_id'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'owner_id': ownerId,
      'created_at': createdAt.toIso8601String(),
    };
  }
}