<?php
require_once __DIR__ . '/config.php';
set_cors_headers();

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Lấy dữ liệu input (hỗ trợ cả JSON body lẫn Form Data)
$raw_input = file_get_contents('php://input');
$input = json_decode($raw_input, true) ?? $_POST;

if (empty($action) && isset($input['action'])) {
    $action = $input['action'];
}

// Kiểm tra thời hạn phiên làm việc không hoạt động (inactivity timeout: 7200s / 2 giờ)
if (!empty($_SESSION['hls_admin_logged_in'])) {
    if (!isset($_SESSION['hls_admin_time']) || (time() - $_SESSION['hls_admin_time']) > 7200) {
        $_SESSION['hls_admin_logged_in'] = false;
        unset($_SESSION['hls_admin_logged_in'], $_SESSION['hls_admin_username'], $_SESSION['hls_admin_time']);
    }
}

// 1. Kiểm tra trạng thái đăng nhập
if ($action === 'check') {
    if (is_admin_logged_in()) {
        send_json([
            'success' => true,
            'logged_in' => true,
            'username' => $_SESSION['hls_admin_username'] ?? 'admin'
        ]);
    } else {
        send_json([
            'success' => true,
            'logged_in' => false
        ]);
    }
}

// 2. Xử lý đăng nhập
if ($action === 'login') {
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');

    if (empty($username) || empty($password)) {
        send_json([
            'success' => false,
            'message' => 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!'
        ], 400);
    }

    $admin_data = read_json_data('admin.json', [
        'username' => 'admin',
        'password' => '$2y$10$YbmZ1MfMrmuSLwGzmth0P.R.wMrZiAv19663gjCyYm9T78tAAvTBy',
        'is_default' => true
    ]);

    $valid = false;

    // Kiểm tra tên đăng nhập và mật khẩu
    if ($username === ($admin_data['username'] ?? 'admin')) {
        $stored_pass = $admin_data['password'] ?? '';

        // Kiểm tra mật khẩu chuẩn Bcrypt bằng password_verify()
        if (password_verify($password, $stored_pass)) {
            $valid = true;
        } else if (!empty($admin_data['is_default']) && $password === $stored_pass) {
            // Trường hợp chuyển tiếp nếu mật khẩu cũ vẫn ở dạng plaintext
            $valid = true;
            // Tự động băm mật khẩu chuẩn bcrypt để bảo mật tuyệt đối
            $admin_data['password'] = password_hash($password, PASSWORD_DEFAULT);
            $admin_data['updated_at'] = date('Y-m-d H:i:s');
            write_json_data('admin.json', $admin_data);
        }
    }

    if ($valid) {
        session_regenerate_id(true);
        $_SESSION['hls_admin_logged_in'] = true;
        $_SESSION['hls_admin_username'] = $username;
        $_SESSION['hls_admin_time'] = time();

        send_json([
            'success' => true,
            'message' => 'Đăng nhập thành công!',
            'username' => $username
        ]);
    } else {
        send_json([
            'success' => false,
            'message' => 'Tên đăng nhập hoặc mật khẩu không chính xác!'
        ], 401);
    }
}

// 3. Xử lý đăng xuất
if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();

    send_json([
        'success' => true,
        'message' => 'Đã đăng xuất thành công.'
    ]);
}

// 4. Đổi mật khẩu
if ($action === 'change-password') {
    require_admin();

    $current_password = trim($input['current_password'] ?? '');
    $new_password = trim($input['new_password'] ?? '');

    if (empty($current_password) || empty($new_password)) {
        send_json([
            'success' => false,
            'message' => 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới!'
        ], 400);
    }

    if (strlen($new_password) < 6) {
        send_json([
            'success' => false,
            'message' => 'Mật khẩu mới phải có ít nhất 6 ký tự!'
        ], 400);
    }

    $admin_data = read_json_data('admin.json', []);
    $stored_pass = $admin_data['password'] ?? '';

    $is_current_valid = password_verify($current_password, $stored_pass) 
        || (!empty($admin_data['is_default']) && $current_password === $stored_pass);

    if (!$is_current_valid) {
        send_json([
            'success' => false,
            'message' => 'Mật khẩu hiện tại không chính xác!'
        ], 400);
    }

    $admin_data['password'] = password_hash($new_password, PASSWORD_DEFAULT);
    $admin_data['is_default'] = false;
    $admin_data['updated_at'] = date('Y-m-d H:i:s');
    write_json_data('admin.json', $admin_data);

    send_json([
        'success' => true,
        'message' => 'Đã đổi mật khẩu thành công!'
    ]);
}

send_json(['success' => false, 'message' => 'Hành động không hợp lệ.'], 400);
