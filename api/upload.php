<?php
require_once __DIR__ . '/config.php';
set_cors_headers();

// Bắt buộc quyền admin
require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(['success' => false, 'message' => 'Phương thức không được hỗ trợ.'], 405);
}

$category = preg_replace('/[^a-z0-9_-]/i', '', $_POST['category'] ?? 'general');
if (empty($category)) {
    $category = 'general';
}

$target_dir = UPLOADS_DIR . '/' . $category;
if (!is_dir($target_dir)) {
    @mkdir($target_dir, 0755, true);
}

// Kiểm tra xem có file nào được gửi lên không
if (empty($_FILES['image']) && empty($_FILES['files'])) {
    send_json(['success' => false, 'message' => 'Không tìm thấy file tải lên.'], 400);
}

$allowed_extensions = ['webp', 'jpg', 'jpeg', 'png', 'gif'];
$allowed_mimes = ['image/webp', 'image/jpeg', 'image/png', 'image/gif'];

function process_single_image($file_tmp, $original_name, $target_dir, $category) {
    global $allowed_extensions, $allowed_mimes;

    // Kiểm tra định dạng hợp lệ
    $ext = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowed_extensions)) {
        return ['success' => false, 'message' => 'Định dạng file không được phép! Chỉ chấp nhận WebP, JPG, PNG, GIF.'];
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file_tmp);
    finfo_close($finfo);

    if (!in_array($mime, $allowed_mimes)) {
        return ['success' => false, 'message' => 'Nội dung file không phải là ảnh hợp lệ!'];
    }

    $unique_suffix = time() . '_' . substr(md5(uniqid(mt_rand(), true)), 0, 8);
    $output_ext = 'webp';
    $output_filename = $category . '_' . $unique_suffix . '.' . $output_ext;
    $output_path = $target_dir . '/' . $output_filename;

    // Tối ưu và lưu ảnh
    $saved = false;

    // Nếu PHP hỗ trợ GD và WebP
    if (extension_loaded('gd') && function_exists('imagewebp')) {
        $image_data = @file_get_contents($file_tmp);
        if ($image_data !== false) {
            $src = @imagecreatefromstring($image_data);
            if ($src !== false) {
                // Xử lý xoay theo EXIF nếu là ảnh JPEG chụp từ điện thoại
                if ($ext === 'jpg' || $ext === 'jpeg') {
                    if (function_exists('exif_read_data')) {
                        $exif = @exif_read_data($file_tmp);
                        if (!empty($exif['Orientation'])) {
                            switch ($exif['Orientation']) {
                                case 3: $src = imagerotate($src, 180, 0); break;
                                case 6: $src = imagerotate($src, -90, 0); break;
                                case 8: $src = imagerotate($src, 90, 0); break;
                            }
                        }
                    }
                }

                $w = imagesx($src);
                $h = imagesy($src);

                // Giới hạn kích thước tối đa để ảnh nhẹ & load mượt
                $max_dim = ($category === 'thanh-vien') ? 800 : 1600;

                if ($w > $max_dim || $h > $max_dim) {
                    if ($w >= $h) {
                        $new_w = $max_dim;
                        $new_h = (int)round(($h / $w) * $max_dim);
                    } else {
                        $new_h = $max_dim;
                        $new_w = (int)round(($w / $h) * $max_dim);
                    }
                    $dst = imagecreatetruecolor($new_w, $new_h);

                    // Giữ độ trong suốt (Transparency)
                    imagealphablending($dst, false);
                    imagesavealpha($dst, true);

                    imagecopyresampled($dst, $src, 0, 0, 0, 0, $new_w, $new_h, $w, $h);
                    imagedestroy($src);
                    $src = $dst;
                }

                // Xuất file WebP chất lượng 82%
                $saved = @imagewebp($src, $output_path, 82);
                imagedestroy($src);
            }
        }
    }

    // Nếu GD không hỗ trợ hoặc lỗi, di chuyển file gốc (client đã nén trước)
    if (!$saved) {
        $output_filename = $category . '_' . $unique_suffix . '.' . $ext;
        $output_path = $target_dir . '/' . $output_filename;
        $saved = @move_uploaded_file($file_tmp, $output_path);
    }

    if ($saved) {
        $relative_url = 'uploads/' . $category . '/' . $output_filename;
        return [
            'success' => true,
            'url' => $relative_url,
            'filename' => $output_filename,
            'size' => @filesize($output_path)
        ];
    } else {
        return ['success' => false, 'message' => 'Lỗi khi lưu ảnh lên máy chủ hosting!'];
    }
}

// Xử lý 1 file đơn lẻ ('image')
if (!empty($_FILES['image']['tmp_name'])) {
    $res = process_single_image(
        $_FILES['image']['tmp_name'],
        $_FILES['image']['name'],
        $target_dir,
        $category
    );
    send_json($res, $res['success'] ? 200 : 400);
}

// Xử lý upload nhiều file cùng lúc ('files')
if (!empty($_FILES['files']['tmp_name']) && is_array($_FILES['files']['tmp_name'])) {
    $results = [];
    $count = count($_FILES['files']['tmp_name']);
    for ($i = 0; $i < $count; $i++) {
        if (!empty($_FILES['files']['tmp_name'][$i])) {
            $res = process_single_image(
                $_FILES['files']['tmp_name'][$i],
                $_FILES['files']['name'][$i],
                $target_dir,
                $category
            );
            $results[] = $res;
        }
    }
    send_json([
        'success' => true,
        'uploaded' => $results
    ]);
}

send_json(['success' => false, 'message' => 'Không có file nào được xử lý.'], 400);
