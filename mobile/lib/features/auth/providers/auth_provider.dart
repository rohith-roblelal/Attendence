import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/storage/local_storage.dart';
import 'package:mobile/features/auth/models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _user;
  bool _isLoading = true;
  String? _error;

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  AuthProvider() {
    ApiClient.init(() {
      // Global callback triggered when Dio catches a 401 Unauthorized
      logout();
    });
  }

  Future<void> checkAuth() async {
    _setLoading(true);
    try {
      final token = await LocalStorage.getToken();
      if (token == null) {
        _setLoading(false);
        return;
      }

      final response = await ApiClient.dio.get('/auth/me');
      _user = UserModel.fromJson(response.data['data']);
    } catch (e) {
      _user = null;
      await LocalStorage.deleteToken();
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> login(String username, String password) async {
    _setLoading(true);
    _error = null;
    
    try {
      final response = await ApiClient.dio.post('/auth/login', data: {
        'username': username,
        'password': password,
      });

      final data = response.data['data'];
      final token = data['token'];
      _user = UserModel.fromJson(data['user']);

      await LocalStorage.saveToken(token);
      _setLoading(false);
      return true;
    } on DioException catch (e) {
      _error = e.response?.data['message'] ?? 'Login failed. Please check your credentials.';
      _setLoading(false);
      return false;
    } catch (e) {
      _error = 'Unexpected error: $e';
      _setLoading(false);
      return false;
    }
  }

  Future<void> logout() async {
    _user = null;
    await LocalStorage.deleteToken();
    notifyListeners();
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }
}
