<?php
require_once __DIR__ . '/config.php';
set_cors_headers();

$type = $_GET['type'] ?? $_POST['type'] ?? '';
$type = preg_replace('/[^a-z0-9_-]/i', '', $type);

$valid_types = [
    'hoat-dong' => 'hoat-dong.json',
    'su-kien' => 'su-kien.json',
    'cuoc-thi' => 'cuoc-thi.json',
    'thanh-vien' => 'thanh-vien.json',
    'gioi-thieu' => 'gioi-thieu.json',
    'lien-he' => 'lien-he.json'
];

// Chặn tuyệt đối truy cập dữ liệu admin hoặc loại dữ liệu ngoài danh mục cho phép
if ($type === 'admin' || !isset($valid_types[$type])) {
    send_json([
        'success' => false,
        'message' => 'Loại dữ liệu không hợp lệ hoặc bị cấm truy cập! Chỉ chấp nhận: ' . implode(', ', array_keys($valid_types))
    ], 403);
}

$file_name = $valid_types[$type];
$method = $_SERVER['REQUEST_METHOD'];

// Lấy dữ liệu body
$raw_input = file_get_contents('php://input');
$body = json_decode($raw_input, true);
if (!is_array($body) && !empty($_POST)) {
    $body = $_POST;
}

// 1. GET: Lấy dữ liệu công khai (ai cũng xem được)
if ($method === 'GET') {
    $data = read_json_data($file_name, []);
    send_json([
        'success' => true,
        'type' => $type,
        'data' => $data
    ]);
}

// Các phương thức thay đổi dữ liệu yêu cầu quyền Admin
require_admin();

// 2. DELETE: Xóa 1 phần tử theo ID
if ($method === 'DELETE' || ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'delete')) {
    $id = $_GET['id'] ?? $body['id'] ?? null;
    if (empty($id)) {
        send_json(['success' => false, 'message' => 'Thiếu tham số ID để xóa!'], 400);
    }

    $current_data = read_json_data($file_name, []);
    if (!is_array($current_data)) {
        send_json(['success' => false, 'message' => 'Dữ liệu không hỗ trợ xóa theo ID!'], 400);
    }

    $initial_count = count($current_data);
    $filtered = array_values(array_filter($current_data, function($item) use ($id) {
        return ($item['id'] ?? '') !== $id;
    }));

    if (count($filtered) === $initial_count) {
        send_json(['success' => false, 'message' => 'Không tìm thấy mục với ID đã cho!'], 404);
    }

    write_json_data($file_name, $filtered);
    send_json([
        'success' => true,
        'message' => 'Đã xóa mục thành công!',
        'deleted_id' => $id,
        'remaining' => count($filtered)
    ]);
}

// 3. POST / PUT: Thêm mới hoặc Cập nhật dữ liệu
if ($method === 'POST' || $method === 'PUT') {
    if (empty($body)) {
        send_json(['success' => false, 'message' => 'Dữ liệu gửi lên rỗng!'], 400);
    }

    // Các loại dữ liệu dạng đối tượng đơn lẻ (Singleton Objects)
    if ($type === 'gioi-thieu' || $type === 'lien-he') {
        $saved = write_json_data($file_name, $body);
        if ($saved) {
            send_json([
                'success' => true,
                'message' => 'Cập nhật thành công!',
                'data' => $body
            ]);
        } else {
            send_json(['success' => false, 'message' => 'Lỗi khi ghi dữ liệu lên hosting!'], 500);
        }
    }

    // Các loại dữ liệu dạng danh sách mảng (Collections)
    $current_data = read_json_data($file_name, []);
    if (!is_array($current_data)) {
        $current_data = [];
    }

    // Trường hợp gửi cả mảng mới để sắp xếp (reorder / bulk update)
    if (isset($body['bulk']) && is_array($body['bulk'])) {
        $saved = write_json_data($file_name, $body['bulk']);
        send_json([
            'success' => $saved,
            'message' => $saved ? 'Đã lưu danh sách mới thành công!' : 'Lỗi khi lưu dữ liệu!',
            'data' => $body['bulk']
        ]);
    }

    $item = $body['item'] ?? $body;
    $id = $item['id'] ?? null;

    if (!empty($id)) {
        // Cập nhật mục đã có
        $found = false;
        foreach ($current_data as $key => $existing) {
            if (($existing['id'] ?? '') === $id) {
                $current_data[$key] = array_merge($existing, $item);
                $found = true;
                break;
            }
        }

        if (!$found) {
            // Nếu có ID nhưng chưa tồn tại trong danh sách thì thêm vào đầu
            array_unshift($current_data, $item);
        }
    } else {
        // Thêm mới
        $prefix_map = [
            'hoat-dong' => 'hd',
            'su-kien' => 'sk',
            'cuoc-thi' => 'ct',
            'thanh-vien' => 'tv'
        ];
        $prefix = $prefix_map[$type] ?? 'item';
        $item['id'] = generate_id($prefix);
        if (!isset($item['created_at'])) {
            $item['created_at'] = date('Y-m-d');
        }
        // Thêm lên đầu danh sách
        array_unshift($current_data, $item);
    }

    $saved = write_json_data($file_name, $current_data);
    if ($saved) {
        send_json([
            'success' => true,
            'message' => !empty($id) ? 'Cập nhật thành công!' : 'Thêm mới thành công!',
            'item' => $item,
            'data' => $current_data
        ]);
    } else {
        send_json(['success' => false, 'message' => 'Lỗi khi ghi dữ liệu lên máy chủ!'], 500);
    }
}

send_json(['success' => false, 'message' => 'Phương thức HTTP không hợp lệ.'], 405);
