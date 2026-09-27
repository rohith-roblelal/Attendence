import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:mobile/features/auth/providers/auth_provider.dart';
import 'package:mobile/features/auth/presentation/login_screen.dart';

// Placeholder dashboards
class PlaceholderScreen extends StatelessWidget {
  final String title;
  const PlaceholderScreen({super.key, required this.title});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: ElevatedButton(
          onPressed: () => context.read<AuthProvider>().logout(),
          child: const Text('Logout'),
        ),
      ),
    );
  }
}

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createRouter(AuthProvider authProvider) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/login',
    refreshListenable: authProvider,
    redirect: (context, state) {
      final isLoggedIn = authProvider.isAuthenticated;
      final isGoingToLogin = state.matchedLocation == '/login';

      if (!isLoggedIn && !isGoingToLogin) {
        return '/login';
      }

      if (isLoggedIn && isGoingToLogin) {
        // Redirect to appropriate dashboard based on role
        final role = authProvider.user?.role;
        switch (role) {
          case 'ADMINISTRATION':
            return '/admin';
          case 'HOD':
            return '/hod';
          case 'TUTOR':
            return '/tutor';
          case 'TEACHER':
            return '/teacher';
          case 'STUDENT':
            return '/student';
          default:
            return '/login'; // Fallback
        }
      }

      // Root path redirect
      if (isLoggedIn && state.matchedLocation == '/') {
        final role = authProvider.user?.role;
        switch (role) {
          case 'ADMINISTRATION': return '/admin';
          case 'HOD': return '/hod';
          case 'TUTOR': return '/tutor';
          case 'TEACHER': return '/teacher';
          case 'STUDENT': return '/student';
          default: return '/login';
        }
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/admin',
        builder: (context, state) => const PlaceholderScreen(title: 'Administration Dashboard'),
      ),
      GoRoute(
        path: '/hod',
        builder: (context, state) => const PlaceholderScreen(title: 'HOD Dashboard'),
      ),
      GoRoute(
        path: '/tutor',
        builder: (context, state) => const PlaceholderScreen(title: 'Tutor Dashboard'),
      ),
      GoRoute(
        path: '/teacher',
        builder: (context, state) => const PlaceholderScreen(title: 'Teacher Dashboard'),
      ),
      GoRoute(
        path: '/student',
        builder: (context, state) => const PlaceholderScreen(title: 'Student Dashboard'),
      ),
    ],
  );
}
