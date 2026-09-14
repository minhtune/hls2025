<?php
/**
 * HLS Website - Configuration & Core Utilities
 * Tương thích 100% PHP 7.4+ trên cPanel Shared Hosting
 */

// Bắt đầu session an toàn nếu chưa có
if (session_status() === PHP_SESSION_NONE) {
    // Cấu hình cookie an toàn
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    session_start();
}

// Đường dẫn hệ thống
define('ROOT_DIR', dirname(__DIR__));
define('DATA_DIR', ROOT_DIR . '/data');
define('UPLOADS_DIR', ROOT_DIR . '/uploads');

// Thiết lập header CORS và JSON khi cần
function set_cors_headers() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// Gửi phản hồi JSON
function send_json($data, $status_code = 200) {
    http_response_code($status_code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Hằng số thời gian timeout phiên làm việc (2 giờ = 7200 giây)
if (!defined('SESSION_INACTIVITY_TIMEOUT')) {
    define('SESSION_INACTIVITY_TIMEOUT', 7200);
}

// Kiểm tra quyền Admin đã đăng nhập và thời hạn phiên không hoạt động (7200s)
function is_admin_logged_in() {
    if (empty($_SESSION['hls_admin_logged_in']) || $_SESSION['hls_admin_logged_in'] !== true) {
        return false;
    }

    // Kiểm tra thời gian không hoạt động dựa trên $_SESSION['hls_admin_time']
    if (!isset($_SESSION['hls_admin_time']) || (time() - $_SESSION['hls_admin_time']) > SESSION_INACTIVITY_TIMEOUT) {
        $_SESSION['hls_admin_logged_in'] = false;
        unset($_SESSION['hls_admin_logged_in'], $_SESSION['hls_admin_username'], $_SESSION['hls_admin_time']);
        return false;
    }

    // Cập nhật thời điểm hoạt động mới nhất
    $_SESSION['hls_admin_time'] = time();
    return true;
}

// Bắt buộc quyền Admin
function require_admin() {
    if (!is_admin_logged_in()) {
        send_json([
            'success' => false,
            'message' => 'Phiên làm việc đã hết hạn hoặc bạn chưa đăng nhập quyền Admin.'
        ], 401);
    }
}

// Đọc file JSON an toàn
function read_json_data($file_name, $default = []) {
    $path = DATA_DIR . '/' . $file_name;
    if (!file_exists($path)) {
        return $default;
    }
    $content = @file_get_contents($path);
    if ($content === false || empty($content)) {
        return $default;
    }
    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : $default;
}

// Ghi file JSON với cờ khóa file LOCK_EX (chống race conditions)
function write_json_data($file_name, $data) {
    if (!is_dir(DATA_DIR)) {
        @mkdir(DATA_DIR, 0755, true);
    }
    $path = DATA_DIR . '/' . $file_name;
    $content = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($content === false) {
        return false;
    }
    return @file_put_contents($path, $content, LOCK_EX) !== false;
}

// Tạo ID duy nhất theo tiền tố
function generate_id($prefix = 'id') {
    return $prefix . '-' . time() . '-' . mt_rand(100, 999);
}
