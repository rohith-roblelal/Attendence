<?php
/**
 * Database Connection Helper (PDO Singleton)
 * Windows XAMPP  |  MySQL port 3306  |  user: root  |  password: (empty)
 */

require_once __DIR__ . '/functions.php';

function get_db(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $config_file = __DIR__ . '/../config/database.php';
        if (!file_exists($config_file)) {
            die("Database configuration missing. Please create config/database.php from config/database.example.php");
        }

        $config = require $config_file;

        $dsn = sprintf(
            "mysql:host=%s;port=%s;dbname=%s;charset=%s",
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );

        try {
            $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
        } catch (PDOException $e) {
            http_response_code(500);
            ?>
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Database Connection Error</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; padding: 2rem; display: flex; justify-content: center; align-items: center; min-height: 80vh; margin: 0; }
                    .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 640px; padding: 2rem; border-top: 4px solid #ef4444; }
                    h1 { color: #dc2626; margin-top: 0; font-size: 1.5rem; }
                    pre { background: #f1f5f9; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.875rem; }
                    .tip { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 0.75rem 1rem; margin-top: 1rem; font-size: 0.9rem; }
                    code { background:#e2e8f0; padding:2px 6px; border-radius:4px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>⚠️ Database Connection Failed</h1>
                    <p>Could not connect to MySQL on <code>127.0.0.1:3306</code>.</p>
                    <pre><?= htmlspecialchars($e->getMessage()) ?></pre>
                    <div class="tip">
                        <strong>Troubleshooting Checklist (XAMPP on Windows):</strong>
                        <ul>
                            <li>Open <strong>XAMPP Control Panel</strong> and make sure <strong>MySQL</strong> shows green (Running).</li>
                            <li>MySQL should be on port <strong>3306</strong>.</li>
                            <li>Database <code>college_attendance</code> must exist — import <code>database/full_setup.sql</code> via phpMyAdmin.</li>
                            <li>phpMyAdmin: <a href="http://localhost/phpmyadmin">http://localhost/phpmyadmin</a></li>
                        </ul>
                    </div>
                </div>
            </body>
            </html>
            <?php
            exit;
        }
    }

    return $pdo;
}
