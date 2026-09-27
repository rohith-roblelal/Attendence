import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile/core/config/router.dart';
import 'package:mobile/features/auth/providers/auth_provider.dart';

void main() async {
  // Ensure Flutter binding is initialized before making async calls like checkAuth
  WidgetsFlutterBinding.ensureInitialized();
  
  final authProvider = AuthProvider();
  
  // Wait for the auth check to finish before starting the app so we don't flash the login screen
  await authProvider.checkAuth();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: authProvider),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // We pass the authProvider to createRouter to observe state changes
    final router = createRouter(context.read<AuthProvider>());
    
    return MaterialApp.router(
      title: 'College Attendance',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
        inputDecorationTheme: const InputDecorationTheme(
          filled: true,
          border: OutlineInputBorder(),
        ),
      ),
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
