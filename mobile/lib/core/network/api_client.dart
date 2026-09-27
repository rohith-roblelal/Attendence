import 'package:dio/dio.dart';
import 'package:mobile/core/storage/local_storage.dart';

class ApiClient {
  static final Dio _dio = Dio(BaseOptions(
    // We assume backend runs on localhost:3000. 
    // Use 10.0.2.2 for Android emulator to access host localhost.
    baseUrl: 'http://10.0.2.2:3000/api/v1', 
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  ));

  static void init(void Function() onUnauthorized) {
    _dio.interceptors.clear();
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Attach token if available
          final token = await LocalStorage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onResponse: (response, handler) {
          return handler.next(response);
        },
        onError: (DioException e, handler) {
          // Handle 401 Unauthorized globally
          if (e.response?.statusCode == 401) {
            onUnauthorized();
          }
          return handler.next(e);
        },
      ),
    );
  }

  static Dio get dio => _dio;
}
