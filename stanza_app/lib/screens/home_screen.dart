// screens/home_screen.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart'; // Para generar UUID
import '../models/app_user.dart';
import '../models/room.dart';

class HomeScreen extends StatefulWidget {
  final Function(Room?) setCurrentRoom;
  final AppUser currentUser;

  const HomeScreen({super.key, required this.setCurrentRoom, required this.currentUser});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final SupabaseClient _supabase = Supabase.instance.client;
  List<Room> _userRooms = [];
  bool _isLoadingRooms = true;
  String? _message;
  bool _showRoomOptions = false;

  final TextEditingController _createRoomNameController = TextEditingController();
  final TextEditingController _joinRoomCodeController = TextEditingController();
  bool _isActionLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchUserRooms();
  }

  // Obtener las habitaciones a las que el usuario es miembro
  Future<void> _fetchUserRooms() async {
    setState(() {
      _isLoadingRooms = true;
      _message = null;
    });
    try {
      final List<dynamic> roomMemberships = await _supabase
          .from('room_members')
          .select('room_id')
          .eq('user_id', widget.currentUser.id);

      final List<String> roomIds = roomMemberships.map((e) => e['room_id'] as String).toList();

      if (roomIds.isNotEmpty) {
        final List<dynamic> roomsData = await _supabase
            .from('rooms')
            .select('*')
            .inFilter('id', roomIds);

        setState(() {
          _userRooms = roomsData.map((json) => Room.fromJson(json)).toList();
        });
      } else {
        setState(() {
          _userRooms = [];
        });
      }
    } catch (e) {
      _message = 'Error al cargar tus habitaciones: $e';
      print('Error al cargar habitaciones del usuario: $e');
    } finally {
      setState(() {
        _isLoadingRooms = false;
      });
    }
  }

  // Genera un código de habitación de 9 dígitos numéricos
  String _generateRoomCode() {
    String code = '';
    final random = (seed) => 0.0 + (DateTime.now().microsecondsSinceEpoch % 1000000) / 1000000;
    for (int i = 0; i < 9; i++) {
      code += (random(i) * 10).floor().toString();
    }
    return code;
  }

  // Manejar la creación de una nueva habitación
  Future<void> _handleCreateRoom() async {
    final String roomName = _createRoomNameController.text.trim();
    if (roomName.isEmpty) {
      setState(() => _message = 'El nombre de la habitación no puede estar vacío.');
      return;
    }

    setState(() {
      _isActionLoading = true;
      _message = null;
    });

    try {
      String roomCode = _generateRoomCode();
      // Asegurarse de que el código no exista (en un caso muy raro de colisión)
      var existingRoom = await _supabase.from('rooms').select('id').eq('id', roomCode).maybeSingle();
      while (existingRoom != null) {
        roomCode = _generateRoomCode();
        existingRoom = await _supabase.from('rooms').select('id').eq('id', roomCode).maybeSingle();
      }

      // Crear la habitación en la tabla 'rooms'
      await _supabase.from('rooms').insert({
        'id': roomCode,
        'name': roomName,
        'owner_id': widget.currentUser.id,
        'created_at': DateTime.now().toIso8601String(),
      });

      // Añadir al usuario creador a 'room_members'
      await _supabase.from('room_members').insert({
        'room_id': roomCode,
        'user_id': widget.currentUser.id,
        'user_name': widget.currentUser.name,
        'status': 'fuera', // Estado inicial
        'joined_at': DateTime.now().toIso8601String(),
      });

      // Insertar evento en el historial
      await _supabase.from('room_history').insert({
        'room_id': roomCode,
        'user_id': widget.currentUser.id,
        'user_name': widget.currentUser.name,
        'event_type': 'unión_a_habitación', // Evento específico de unión
        'timestamp': DateTime.now().toIso8601String(),
      });


      final newRoom = Room(
        id: roomCode,
        name: roomName,
        ownerId: widget.currentUser.id,
        createdAt: DateTime.now(),
      );
      widget.setCurrentRoom(newRoom); // Navegar a la nueva habitación
      _createRoomNameController.clear();
    } catch (e) {
      setState(() => _message = 'Error al crear la habitación: $e');
      print('Error al crear la habitación: $e');
    } finally {
      setState(() => _isActionLoading = false);
    }
  }

  // Manejar la unión a una habitación existente
  Future<void> _handleJoinRoom() async {
    final String roomCode = _joinRoomCodeController.text.trim();
    if (roomCode.length != 9 || !RegExp(r'^\d{9}$').hasMatch(roomCode)) {
      setState(() => _message = 'Por favor, introduce un código de 9 dígitos numéricos.');
      return;
    }

    setState(() {
      _isActionLoading = true;
      _message = null;
    });

    try {
      // Verificar si la habitación existe
      final roomData = await _supabase.from('rooms').select('*').eq('id', roomCode).maybeSingle();

      if (roomData == null) {
        setState(() => _message = 'La habitación con ese código no existe.');
        return;
      }

      final Room room = Room.fromJson(roomData);

      // Verificar si el usuario ya es miembro para evitar duplicados
      final existingMembership = await _supabase
          .from('room_members')
          .select('user_id')
          .eq('room_id', roomCode)
          .eq('user_id', widget.currentUser.id)
          .maybeSingle();

      if (existingMembership == null) {
        // Añadir al usuario a 'room_members'
        await _supabase.from('room_members').insert({
          'room_id': roomCode,
          'user_id': widget.currentUser.id,
          'user_name': widget.currentUser.name,
          'status': 'fuera', // Estado inicial
          'joined_at': DateTime.now().toIso8601String(),
        });
        // Insertar evento en el historial
        await _supabase.from('room_history').insert({
          'room_id': roomCode,
          'user_id': widget.currentUser.id,
          'user_name': widget.currentUser.name,
          'event_type': 'unión_a_habitación', // Evento específico de unión
          'timestamp': DateTime.now().toIso8601String(),
        });
      }

      widget.setCurrentRoom(room); // Navegar a la habitación
      _joinRoomCodeController.clear();
    } catch (e) {
      setState(() => _message = 'Error al unirse a la habitación: $e');
      print('Error al unirse a la habitación: $e');
    } finally {
      setState(() => _isActionLoading = false);
    }
  }

  // Navegar a una habitación desde la lista "Mis habitaciones"
  Future<void> _goToRoom(Room room) async {
    setState(() {
      _isActionLoading = true;
      _message = null;
    });
    try {
      final roomExists = await _supabase.from('rooms').select('id').eq('id', room.id).maybeSingle();
      if (roomExists == null) {
        setState(() {
          _message = 'La habitación "${room.name}" ya no existe o fue eliminada.';
          _userRooms.removeWhere((r) => r.id == room.id); // Eliminar de la lista local
        });
        return;
      }
      widget.setCurrentRoom(room);
    } catch (e) {
      setState(() => _message = 'Error al cargar la habitación: $e');
      print('Error al cargar la habitación: $e');
    } finally {
      setState(() => _isActionLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Stanza - Mis Habitaciones'),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF66BB6A), Color(0xFF42A5F5)], // Tonos de verde y azul
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: RefreshIndicator(
          onRefresh: _fetchUserRooms, // Permite refrescar la lista de habitaciones
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(), // Hace el scroll siempre posible
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Card(
                  margin: const EdgeInsets.only(bottom: 24),
                  elevation: 8,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      children: [
                        Text(
                          '¡Hola, ${widget.currentUser.name}!',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[800],
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Tu ID: ${widget.currentUser.id}',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
                Card(
                  elevation: 8,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                  margin: const EdgeInsets.only(bottom: 24),
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Mis Habitaciones',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[700],
                          ),
                        ),
                        const Divider(height: 20, thickness: 1),
                        _isLoadingRooms
                            ? const Center(child: CircularProgressIndicator())
                            : _userRooms.isEmpty
                                ? Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 20.0),
                                    child: Text(
                                      'No has unido o creado ninguna habitación aún.',
                                      style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                                      textAlign: TextAlign.center,
                                    ),
                                  )
                                : ListView.builder(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    itemCount: _userRooms.length,
                                    itemBuilder: (context, index) {
                                      final room = _userRooms[index];
                                      return Card(
                                        margin: const EdgeInsets.symmetric(vertical: 8),
                                        elevation: 3,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        child: ListTile(
                                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                          leading: const Icon(Icons.meeting_room, color: Colors.blueAccent, size: 30),
                                          title: Text(
                                            room.name,
                                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 18),
                                          ),
                                          subtitle: Text('Código: ${room.id}', style: TextStyle(color: Colors.grey[600])),
                                          trailing: Icon(Icons.arrow_forward_ios, color: Colors.grey[500]),
                                          onTap: _isActionLoading ? null : () => _goToRoom(room),
                                        ),
                                      );
                                    },
                                  ),
                      ],
                    ),
                  ),
                ),
                ElevatedButton(
                  onPressed: _isActionLoading ? null : () {
                    setState(() {
                      _showRoomOptions = !_showRoomOptions;
                      _message = null; // Limpiar mensajes al cambiar de vista
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8E24AA), // Morado
                    elevation: 5,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                  ),
                  child: Text(
                    _showRoomOptions ? 'Ocultar Opciones' : 'Crear o Unirse a una Habitación',
                    style: const TextStyle(fontSize: 18, color: Colors.white),
                  ),
                ),
                if (_showRoomOptions) ...[
                  const SizedBox(height: 24),
                  if (_message != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16.0),
                      child: Text(
                        _message!,
                        style: const TextStyle(color: Colors.redAccent, fontSize: 15, fontWeight: FontWeight.w500),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  Card(
                    elevation: 8,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                    margin: const EdgeInsets.only(bottom: 16),
                    child: Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Crear nueva habitación',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey[700],
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _createRoomNameController,
                            decoration: InputDecoration(
                              labelText: 'Nombre de la habitación',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              filled: true,
                              fillColor: Colors.grey[50],
                              prefixIcon: const Icon(Icons.add_box),
                            ),
                            maxLength: 50,
                          ),
                          const SizedBox(height: 16),
                          _isActionLoading
                              ? const Center(child: CircularProgressIndicator())
                              : ElevatedButton(
                                  onPressed: _handleCreateRoom,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.green,
                                    minimumSize: const Size(double.infinity, 50),
                                  ),
                                  child: const Text('Crear Habitación', style: TextStyle(fontSize: 18)),
                                ),
                        ],
                      ),
                    ),
                  ),
                  Card(
                    elevation: 8,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                    child: Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Unirse a una habitación existente',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey[700],
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _joinRoomCodeController,
                            decoration: InputDecoration(
                              labelText: 'Código de la habitación (9 dígitos)',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              filled: true,
                              fillColor: Colors.grey[50],
                              prefixIcon: const Icon(Icons.vpn_key),
                            ),
                            maxLength: 9,
                            keyboardType: TextInputType.number,
                          ),
                          const SizedBox(height: 16),
                          _isActionLoading
                              ? const Center(child: CircularProgressIndicator())
                              : ElevatedButton(
                                  onPressed: _handleJoinRoom,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.orange,
                                    minimumSize: const Size(double.infinity, 50),
                                  ),
                                  child: const Text('Unirse a Habitación', style: TextStyle(fontSize: 18)),
                                ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 50), // Espacio extra al final para el scroll
              ],
            ),
          ),
        ),
      ),
    );
  }
}