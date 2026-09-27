import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocalStorage {
  static const _secureStorage = FlutterSecureStorage();
  static const String _tokenKey = 'auth_token';
  static const String _userRoleKey = 'user_role';
  
  // Securely store JWT token
  static Future<void> saveToken(String token) async {
    await _secureStorage.write(key: _tokenKey, value: token);
  }

  static Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }

  static Future<void> deleteToken() async {
    await _secureStorage.delete(key: _tokenKey);
  }
  
  // Store user role in SharedPreferences (non-sensitive)
  static Future<void> saveUserRole(String role) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userRoleKey, role);
  }
  
  static Future<String?> getUserRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userRoleKey);
  }
  
  static Future<void> clearAll() async {
    await deleteToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userRoleKey);
  }
}
