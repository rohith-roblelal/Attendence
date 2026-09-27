import 'package:dio/dio.dart';
import 'package:mobile/core/storage/local_storage.dart';

class ApiClient {
  static final Dio _dio = Dio(BaseOptions(
    // We will use localtunnel to completely bypass firewalls and adb!
    baseUrl: 'https://angry-wombats-pull.loca.lt/api/v1',
    receiveTimeout: const Duration(seconds: 10),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
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
