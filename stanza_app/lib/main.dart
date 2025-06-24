// main.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

// Importa las pantallas y modelos que definirás a continuación
import 'screens/name_registration_screen.dart';
import 'screens/home_screen.dart';
import 'screens/room_screen.dart';
import 'models/room.dart';
import 'models/room_member.dart';
import 'models/app_user.dart';

// Claves de Supabase (reemplaza con las tuyas)
// Normalmente se obtienen de variables de entorno o un archivo de configuración.
const String supabaseUrl = 'https://xqgdudnucagzzcdwhsxx.supabase.co'; // E.g., 'https://abcde12345.supabase.co'
const String supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZ2R1ZG51Y2FnenpjZHdoc3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjgxNTEsImV4cCI6MjA2NjM0NDE1MX0.uxg1dvrLp2FlvWjh3HnE-6uFG7_H8fRP98gQwZUthEA'; // E.g., 'eyJ...'

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized(); // Asegura que los widgets estén inicializados

  // Inicializa Supabase
  await Supabase.initialize(
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    debug: true, // Habilitar para ver logs de Supabase
  );

  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final SupabaseClient supabase = Supabase.instance.client;
  AppUser? _currentUser;
  Room? _currentRoom;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    // Escuchar cambios de autenticación de Supabase
    supabase.auth.onAuthStateChange.listen((data) async {
      final AuthChangeEvent event = data.event;
      final Session? session = data.session;

      if (event == AuthChangeEvent.signedIn || event == AuthChangeEvent.initialSession) {
        // Si hay una sesión activa (ya sea de un login real o anónimo)
        await _loadOrCreateLocalUser(session?.user?.id);
      } else if (event == AuthChangeEvent.signedOut) {
        // Si el usuario cierra sesión, limpia el usuario actual y la habitación
        setState(() {
          _currentUser = null;
          _currentRoom = null;
          _isLoading = false;
        });
      }
    });

    // Cargar o crear el usuario local al inicio
    await _loadOrCreateLocalUser(supabase.auth.currentUser?.id);
  }

  // Carga o crea un usuario local y lo autentica con Supabase
  Future<void> _loadOrCreateLocalUser(String? supabaseUid) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    String? localUserId = prefs.getString('stanza_local_user_id');
    String? userName = prefs.getString('stanza_user_name');

    String effectiveUserId = localUserId ?? const Uuid().v4(); // Genera un UUID si no existe
    prefs.setString('stanza_local_user_id', effectiveUserId); // Guarda el ID local

    // Si Supabase ya tiene un UID, lo usamos; de lo contrario, usamos el local
    String finalUserId = supabaseUid ?? effectiveUserId;

    // Si no hay usuario autenticado en Supabase, intentamos iniciar sesión anónimamente
    // Opcional: Si el PRD permite solo guardar localmente y no "autenticar" con Supabase Auth
    // para usuarios que no tienen email, se podría omitir signInAnonymously si no se necesita un session.user.id
    if (supabase.auth.currentUser == null) {
      try {
        await supabase.auth.signInAnonymously();
        finalUserId = supabase.auth.currentUser!.id; // Usa el UID generado por Supabase Auth
      } catch (e) {
        print('Error al iniciar sesión anónimamente: $e');
        // Fallback: Si no podemos autenticar con Supabase, seguimos con el ID local
      }
    }


    if (userName != null) {
      // Si ya tenemos un nombre, cargamos el usuario
      setState(() {
        _currentUser = AppUser(
          id: finalUserId,
          name: userName,
          isRegistered: true, // Indica que tiene un nombre registrado
        );
        _isLoading = false;
      });
    } else {
      // Si no hay nombre, el usuario debe registrarlo
      setState(() {
        _currentUser = AppUser(
          id: finalUserId,
          name: null, // El nombre se establecerá en la pantalla de registro
          isRegistered: false,
        );
        _isLoading = false;
      });
    }
  }

  // Función para establecer el usuario actual después del registro
  void _setAppUser(AppUser user) {
    setState(() {
      _currentUser = user;
    });
  }

  // Función para establecer la habitación actual (navegar a RoomScreen)
  void _setCurrentRoom(Room? room) {
    setState(() {
      _currentRoom = room;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const MaterialApp(
        home: Scaffold(
          body: Center(
            child: CircularProgressIndicator(),
          ),
        ),
      );
    }

    return MaterialApp(
      title: 'Stanza',
      theme: ThemeData(
        primarySwatch: Colors.blueGrey,
        visualDensity: VisualDensity.adaptivePlatformDensity,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.blueGrey,
          foregroundColor: Colors.white,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blueAccent,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: Colors.blueAccent,
          ),
        ),
      ),
      home: _currentUser == null || !_currentUser!.isRegistered
          ? NameRegistrationScreen(onNameRegistered: _setAppUser)
          : (_currentRoom == null
              ? HomeScreen(setCurrentRoom: _setCurrentRoom, currentUser: _currentUser!)
              : RoomScreen(
                  room: _currentRoom!,
                  currentUser: _currentUser!,
                  onLeaveRoom: () => _setCurrentRoom(null), // Al salir, regresa a HomeScreen
                )),
    );
  }
}