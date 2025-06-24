// screens/name_registration_screen.dart
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../models/app_user.dart';

class NameRegistrationScreen extends StatefulWidget {
  final Function(AppUser) onNameRegistered;

  const NameRegistrationScreen({super.key, required this.onNameRegistered});

  @override
  State<NameRegistrationScreen> createState() => _NameRegistrationScreenState();
}

class _NameRegistrationScreenState extends State<NameRegistrationScreen> {
  final TextEditingController _nameController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  final SupabaseClient _supabase = Supabase.instance.client;

  Future<void> _registerName() async {
    final String name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() {
        _errorMessage = 'Por favor, introduce tu nombre.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      String? localUserId = prefs.getString('stanza_local_user_id');

      if (localUserId == null) {
        // Esto no debería ocurrir si main.dart lo maneja correctamente, pero como fallback
        localUserId = const Uuid().v4();
        await prefs.setString('stanza_local_user_id', localUserId);
      }

      // El UID de Supabase (si hay sesión autenticada) o el ID local
      final String effectiveUserId = _supabase.auth.currentUser?.id ?? localUserId;

      // Guardar el nombre en Supabase
      await _supabase.from('users').upsert({
        'id': effectiveUserId,
        'name': name,
        'created_at': DateTime.now().toIso8601String(),
      }, onConflict: 'id'); // Upsert para crear o actualizar si el ID ya existe

      // Guardar el nombre localmente
      await prefs.setString('stanza_user_name', name);

      widget.onNameRegistered(AppUser(id: effectiveUserId, name: name, isRegistered: true));
    } catch (e) {
      setState(() {
        _errorMessage = 'Error al registrar el nombre: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF42A5F5), Color(0xFF8E24AA)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              elevation: 10,
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '¿Cuál es tu nombre?',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey[800],
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: 'Tu nombre',
                        hintText: 'Ej. Juan Pérez',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: Colors.grey[100],
                        prefixIcon: const Icon(Icons.person, color: Colors.blueAccent),
                      ),
                      maxLength: 30,
                      keyboardType: TextInputType.text,
                    ),
                    if (_errorMessage != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 12.0),
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: Colors.red, fontSize: 14),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    const SizedBox(height: 24),
                    _isLoading
                        ? const CircularProgressIndicator()
                        : ElevatedButton(
                            onPressed: _registerName,
                            style: ElevatedButton.styleFrom(
                              minimumSize: const Size(double.infinity, 50),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              backgroundColor: const Color(0xFF42A5F5),
                              elevation: 5,
                            ),
                            child: const Text(
                              'Empezar',
                              style: TextStyle(fontSize: 18, color: Colors.white),
                            ),
                          ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}