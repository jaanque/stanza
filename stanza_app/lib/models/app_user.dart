// models/app_user.dart
// Clase para representar al usuario de la aplicación
class AppUser {
  final String id; // ID único del usuario (Supabase UID o ID local)
  final String? name; // Nombre del usuario
  final bool isRegistered; // Indica si el usuario ya ha registrado un nombre

  AppUser({required this.id, this.name, this.isRegistered = false});
}