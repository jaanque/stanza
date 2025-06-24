

// screens/room_screen.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/room.dart';
import '../models/app_user.dart';
import '../models/room_member.dart';
import '../models/room_history_event.dart';

class RoomScreen extends StatefulWidget {
  final Room room;
  final AppUser currentUser;
  final VoidCallback onLeaveRoom;

  const RoomScreen({
    super.key,
    required this.room,
    required this.currentUser,
    required this.onLeaveRoom,
  });

  @override
  State<RoomScreen> createState() => _RoomScreenState();
}

class _RoomScreenState extends State<RoomScreen> {
  final SupabaseClient _supabase = Supabase.instance.client;
  List<RoomMember> _roomMembers = [];
  String? _message;
  bool _isActionLoading = false;
  late Stream<List<RoomMember>> _membersStream;

  @override
  void initState() {
    super.initState();
    _membersStream = _supabase
        .from('room_members')
        .stream(primaryKey: ['room_id', 'user_id'])
        .eq('room_id', widget.room.id)
        .map((data) => data.map((json) => RoomMember.fromJson(json)).toList());

    _membersStream.listen((members) {
      setState(() {
        _roomMembers = members;
      });
    }, onError: (error) {
      print('Error en el stream de miembros: $error');
      setState(() {
        _message = 'Error al cargar miembros: $error';
      });
    });
  }

  // Comprueba si el usuario actual es el propietario de la habitación
  bool get _isOwner => widget.room.ownerId == widget.currentUser.id;

  // Actualiza el estado del usuario ('dentro' o 'fuera')
  Future<void> _setStatus(String status) async {
    setState(() {
      _isActionLoading = true;
      _message = null;
    });
    try {
      await _supabase.from('room_members').update({
        'status': status,
        'last_status_update': DateTime.now().toIso8601String(),
      }).eq('room_id', widget.room.id).eq('user_id', widget.currentUser.id);

      // Insertar evento en el historial
      await _supabase.from('room_history').insert({
        'room_id': widget.room.id,
        'user_id': widget.currentUser.id,
        'user_name': widget.currentUser.name,
        'event_type': status == 'dentro' ? 'entrada' : 'salida',
        'timestamp': DateTime.now().toIso8601String(),
      });

      setState(() {
        _message = 'Tu estado es ahora: ${status.toUpperCase()}';
      });
    } catch (e) {
      setState(() {
        _message = 'Error al cambiar el estado: $e';
      });
      print('Error al cambiar el estado: $e');
    } finally {
      setState(() {
        _isActionLoading = false;
      });
    }
  }

  // Maneja la acción de salir de la habitación
  Future<void> _leaveRoom() async {
    setState(() {
      _isActionLoading = true;
      _message = null;
    });
    try {
      await _supabase.from('room_members').delete().eq('room_id', widget.room.id).eq('user_id', widget.currentUser.id);

      // Insertar evento de salida en el historial
      await _supabase.from('room_history').insert({
        'room_id': widget.room.id,
        'user_id': widget.currentUser.id,
        'user_name': widget.currentUser.name,
        'event_type': 'salida_de_habitación', // Evento específico de salida
        'timestamp': DateTime.now().toIso8601String(),
      });

      widget.onLeaveRoom(); // Regresar a la pantalla anterior
    } catch (e) {
      setState(() {
        _message = 'Error al salir de la habitación: $e';
      });
      print('Error al salir de la habitación: $e');
    } finally {
      setState(() {
        _isActionLoading = false;
      });
    }
  }

  // Maneja la acción de eliminar la habitación (solo propietario)
  Future<void> _deleteRoom() async {
    setState(() {
      _isActionLoading = true;
      _message = null;
    });
    try {
      // Nota: Para una eliminación completa de todos los datos relacionados (miembros, historial)
      // se recomienda configurar CASCADE DELETE en Supabase o usar una función de base de datos.
      // Aquí, simplemente se elimina la entrada de la habitación.
      // Si RLS está bien configurado, solo el propietario podrá eliminarla.

      await _supabase.from('rooms').delete().eq('id', widget.room.id);

      widget.onLeaveRoom(); // Regresar a la pantalla anterior
    } catch (e) {
      setState(() {
        _message = 'Error al eliminar la habitación: $e';
      });
      print('Error al eliminar la habitación: $e');
    } finally {
      setState(() {
        _isActionLoading = false;
      });
    }
  }

  // Muestra un modal de confirmación
  Future<void> _showConfirmationModal({
    required String title,
    required String content,
    required VoidCallback onConfirm,
    bool isDestructive = false,
  }) async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
          content: Text(content),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: isDestructive ? Colors.redAccent : Theme.of(context).primaryColor,
              ),
              child: Text(isDestructive ? 'Eliminar' : 'Confirmar'),
            ),
          ],
        );
      },
    );

    if (confirm == true) {
      onConfirm();
    }
  }

  // Muestra un modal para editar el nombre de la habitación
  Future<void> _showEditRoomModal() async {
    final TextEditingController newNameController = TextEditingController(text: widget.room.name);
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
          title: const Text('Editar Nombre de Habitación', style: TextStyle(fontWeight: FontWeight.bold)),
          content: TextField(
            controller: newNameController,
            decoration: InputDecoration(
              labelText: 'Nuevo nombre',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            maxLength: 50,
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () {
                if (newNameController.text.trim().isNotEmpty) {
                  Navigator.of(context).pop(true);
                }
              },
              child: const Text('Guardar'),
            ),
          ],
        );
      },
    );

    if (confirm == true) {
      setState(() {
        _isActionLoading = true;
        _message = null;
      });
      try {
        await _supabase.from('rooms').update({
          'name': newNameController.text.trim(),
        }).eq('id', widget.room.id);

        // Actualizar el objeto Room en el estado del widget para reflejar el cambio
        setState(() {
          widget.room.name = newNameController.text.trim(); // Esto es una mutación, considera usar un StateNotifier o similar para inmutabilidad
          _message = 'Nombre de la habitación actualizado.';
        });
      } catch (e) {
        setState(() {
          _message = 'Error al actualizar el nombre: $e';
        });
        print('Error al actualizar el nombre de la habitación: $e');
      } finally {
        setState(() {
          _isActionLoading = false;
        });
      }
    }
  }

  // Muestra el historial de la habitación
  Future<void> _showRoomHistory() async {
    setState(() {
      _isActionLoading = true; // Para mostrar un indicador de carga en el modal
    });
    List<RoomHistoryEvent> historyEvents = [];
    try {
      final List<dynamic> data = await _supabase
          .from('room_history')
          .select('*')
          .eq('room_id', widget.room.id)
          .order('timestamp', ascending: false); // Ordenar por fecha más reciente

      historyEvents = data.map((json) => RoomHistoryEvent.fromJson(json)).toList();
    } catch (e) {
      setState(() {
        _message = 'Error al cargar el historial: $e';
      });
      print('Error al cargar el historial: $e');
    } finally {
      setState(() {
        _isActionLoading = false;
      });
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true, // Permite que el modal ocupe más espacio
      builder: (BuildContext context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.8, // Inicia ocupando el 80% de la pantalla
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (_, controller) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 5,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Historial de "${widget.room.name}"',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[800],
                    ),
                  ),
                  const Divider(height: 20, thickness: 1),
                  _isActionLoading
                      ? const Center(child: CircularProgressIndicator())
                      : Expanded(
                          child: historyEvents.isEmpty
                              ? Center(
                                  child: Text(
                                    'No hay eventos en el historial de esta habitación aún.',
                                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                                    textAlign: TextAlign.center,
                                  ),
                                )
                              : ListView.builder(
                                  controller: controller,
                                  itemCount: historyEvents.length,
                                  itemBuilder: (context, index) {
                                    final event = historyEvents[index];
                                    final String actionText = event.eventType == 'entrada'
                                        ? 'entró en la habitación'
                                        : event.eventType == 'salida'
                                            ? 'salió de la habitación'
                                            : 'se unió a la habitación'; // Para 'unión_a_habitación'
                                    return Card(
                                      elevation: 2,
                                      margin: const EdgeInsets.symmetric(vertical: 8),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      child: ListTile(
                                        leading: Icon(
                                          event.eventType == 'entrada'
                                              ? Icons.login
                                              : event.eventType == 'salida'
                                                  ? Icons.logout
                                                  : Icons.person_add, // Icono para unión
                                          color: event.eventType == 'entrada' ? Colors.green : Colors.red,
                                        ),
                                        title: Text(
                                          '${event.userName} ${actionText}',
                                          style: const TextStyle(fontWeight: FontWeight.w500),
                                        ),
                                        subtitle: Text(
                                          '${event.timestamp.toLocal().toIso8601String().substring(0, 16).replaceFirst('T', ' ')}',
                                          style: TextStyle(color: Colors.grey[600], fontSize: 12),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                        ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.room.name),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => widget.onLeaveRoom(), // Permite volver
        ),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF5C6BC0), Color(0xFF9575CD)], // Tonos de índigo y morado
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Padding(
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
                        widget.room.name,
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[800],
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Código: ${widget.room.id}',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.blue[600],
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      if (_message != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 12.0),
                          child: Text(
                            _message!,
                            style: const TextStyle(color: Colors.blue, fontSize: 14),
                            textAlign: TextAlign.center,
                          ),
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
                        'Usuarios en la habitación:',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[700],
                        ),
                      ),
                      const Divider(height: 20, thickness: 1),
                      StreamBuilder<List<RoomMember>>(
                        stream: _membersStream,
                        builder: (context, snapshot) {
                          if (snapshot.connectionState == ConnectionState.waiting) {
                            return const Center(child: CircularProgressIndicator());
                          } else if (snapshot.hasError) {
                            return Center(
                              child: Text('Error: ${snapshot.error}', style: const TextStyle(color: Colors.red)),
                            );
                          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                            return Center(
                              child: Text(
                                'No hay usuarios en esta habitación.',
                                style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                                textAlign: TextAlign.center,
                              ),
                            );
                          } else {
                            final members = snapshot.data!;
                            return Wrap(
                              spacing: 16,
                              runSpacing: 16,
                              alignment: WrapAlignment.center,
                              children: members.map((member) {
                                return Column(
                                  children: [
                                    CircleAvatar(
                                      radius: 28,
                                      backgroundColor: member.status == 'dentro' ? Colors.green[500] : Colors.red[500],
                                      child: Text(
                                        member.userName.isNotEmpty ? member.userName[0].toUpperCase() : '?',
                                        style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      member.userName,
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                                      textAlign: TextAlign.center,
                                    ),
                                    Text(
                                      '(${member.status.toUpperCase()})',
                                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                );
                              }).toList(),
                            );
                          }
                        },
                      ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: GridView.count(
                  crossAxisCount: 2,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 2.5, // Ajusta el aspecto para los botones
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(), // No scrollable para que se ajuste a la columna
                  children: [
                    ElevatedButton(
                      onPressed: _isActionLoading ? null : () => _setStatus('dentro'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green[600],
                        elevation: 5,
                      ),
                      child: const Text('Estoy Dentro', style: TextStyle(fontSize: 16)),
                    ),
                    ElevatedButton(
                      onPressed: _isActionLoading ? null : () => _setStatus('fuera'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red[600],
                        elevation: 5,
                      ),
                      child: const Text('Estoy Fuera', style: TextStyle(fontSize: 16)),
                    ),
                    if (_isOwner)
                      ElevatedButton(
                        onPressed: _isActionLoading ? null : _showEditRoomModal,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.amber[600],
                          elevation: 5,
                        ),
                        child: const Text('Editar Habitación', style: TextStyle(fontSize: 16)),
                      ),
                    ElevatedButton(
                      onPressed: _isActionLoading ? null : () => _showConfirmationModal(
                        title: 'Salir de la Habitación',
                        content: '¿Estás seguro de que quieres salir de esta habitación?',
                        onConfirm: _leaveRoom,
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.grey[600],
                        elevation: 5,
                      ),
                      child: const Text('Salir de la Habitación', style: TextStyle(fontSize: 16)),
                    ),
                    if (_isOwner)
                      ElevatedButton(
                        onPressed: _isActionLoading ? null : () => _showConfirmationModal(
                          title: 'Eliminar Habitación',
                          content: '¿Estás seguro de que quieres eliminar esta habitación? Esta acción es irreversible y eliminará todos los datos asociados a la misma.',
                          onConfirm: _deleteRoom,
                          isDestructive: true,
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red[900], // Rojo más oscuro para acción destructiva
                          elevation: 5,
                        ),
                        child: const Text('Eliminar Habitación', style: TextStyle(fontSize: 16)),
                      ),
                    // Nuevo botón para ver el historial
                    ElevatedButton(
                      onPressed: _isActionLoading ? null : _showRoomHistory,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blueGrey[700],
                        elevation: 5,
                      ),
                      child: const Text('Ver Historial', style: TextStyle(fontSize: 16)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
