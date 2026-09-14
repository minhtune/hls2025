/**
 * HLS Local Development Server
 * Giúp chạy thử nghiệm toàn bộ hệ thống (Frontend + Admin + API Mock) trên máy cục bộ không cần cài PHP hay Apache.
 * Chạy bằng lệnh: node dev-server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { execFileSync } = require('child_process');

const PORT = 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOADS_DIR = path.join(ROOT, 'uploads');

// MIME types
const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// In-memory session cho local dev
let devSessionLoggedIn = false;
let devSessionUser = 'admin';

/**
 * Xác thực mật khẩu Bcrypt chuẩn
 */
function verifyBcrypt(password, storedHash) {
  if (!storedHash || !password) return false;
  // Fallback nếu hash vẫn là plaintext trong môi trường dev
  if (password === storedHash) return true;

  // 1. Thử dùng bcryptjs nếu có sẵn
  try {
    const bcrypt = require('bcryptjs');
    if (bcrypt && typeof bcrypt.compareSync === 'function') {
      return bcrypt.compareSync(password, storedHash);
    }
  } catch (e) {}

  // 2. Sử dụng python3 với thư viện bcrypt chuẩn
  try {
    const py = 'import bcrypt, sys; sys.exit(0 if bcrypt.checkpw(sys.argv[1].encode("utf-8"), sys.argv[2].replace("$2y$", "$2b$").encode("utf-8")) else 1)';
    execFileSync('python3', ['-c', py, password, storedHash], { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Băm mật khẩu bằng Bcrypt chuẩn
 */
function hashBcrypt(password) {
  // 1. Thử dùng bcryptjs nếu có sẵn
  try {
    const bcrypt = require('bcryptjs');
    if (bcrypt && typeof bcrypt.hashSync === 'function') {
      return bcrypt.hashSync(password, 10).replace('$2a$', '$2y$').replace('$2b$', '$2y$');
    }
  } catch (e) {}

  // 2. Sử dụng python3 với thư viện bcrypt chuẩn
  try {
    const py = 'import bcrypt, sys; print(bcrypt.hashpw(sys.argv[1].encode("utf-8"), bcrypt.gensalt(10)).decode("utf-8").replace("$2b$", "$2y$"))';
    return execFileSync('python3', ['-c', py, password], { stdio: 'pipe' }).toString().trim();
  } catch (e) {}

  return password;
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data, null, 2));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
  });
}

function parseMultipart(req) {
  return new Promise((resolve) => {
    const boundaryMatch = req.headers['content-type']?.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) return resolve({ success: false, message: 'Yêu cầu không phải multipart/form-data hợp lệ' });

    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      // Đơn giản hóa lưu file buffer
      const filenameMatch = buffer.toString('binary').match(/filename="([^"]+)"/i);
      const categoryMatch = buffer.toString('binary').match(/name="category"\r\n\r\n([^\r\n]+)/i);
      const category = categoryMatch ? categoryMatch[1].trim() : 'general';
      const ext = filenameMatch ? path.extname(filenameMatch[1]) || '.webp' : '.webp';

      const filename = `${category}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const targetDir = path.join(UPLOADS_DIR, category);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      // Tìm vị trí bắt đầu và kết thúc dữ liệu file
      const headerEnd = buffer.indexOf('\r\n\r\n');
      const nextBoundary = buffer.indexOf('\r\n--' + boundary);

      if (headerEnd !== -1 && nextBoundary !== -1) {
        const fileData = buffer.subarray(headerEnd + 4, nextBoundary);
        fs.writeFileSync(path.join(targetDir, filename), fileData);
        resolve({
          success: true,
          url: `uploads/${category}/${filename}`
        });
      } else {
        resolve({ success: false, message: 'Lỗi phân tích file' });
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // 1. API AUTH
  if (pathname.includes('/api/auth.php')) {
    const action = parsedUrl.query.action;
    if (action === 'check') {
      return sendJSON(res, { success: true, logged_in: devSessionLoggedIn, username: devSessionUser });
    }
    if (action === 'login') {
      const body = await parseBody(req);
      const username = body.username ? body.username.trim() : '';
      const password = body.password ? body.password.trim() : '';

      const adminPath = path.join(DATA_DIR, 'admin.json');
      let adminData = {
        username: 'admin',
        password: '$2y$10$YbmZ1MfMrmuSLwGzmth0P.R.wMrZiAv19663gjCyYm9T78tAAvTBy',
        is_default: true
      };
      if (fs.existsSync(adminPath)) {
        try { adminData = JSON.parse(fs.readFileSync(adminPath, 'utf-8')); } catch (e) {}
      }
      if (username === adminData.username && verifyBcrypt(password, adminData.password)) {
        devSessionLoggedIn = true;
        devSessionUser = username;
        return sendJSON(res, { success: true, message: 'Đăng nhập thành công', username: devSessionUser });
      }
      return sendJSON(res, { success: false, message: 'Sai tên đăng nhập hoặc mật khẩu!' }, 401);
    }
    if (action === 'logout') {
      devSessionLoggedIn = false;
      return sendJSON(res, { success: true, message: 'Đã đăng xuất' });
    }
    if (action === 'change-password') {
      const body = await parseBody(req);
      const currentPassword = body.current_password || body.password || '';
      const newPassword = body.new_password || '';

      const adminPath = path.join(DATA_DIR, 'admin.json');
      let adminData = {
        username: 'admin',
        password: '$2y$10$YbmZ1MfMrmuSLwGzmth0P.R.wMrZiAv19663gjCyYm9T78tAAvTBy',
        is_default: true
      };
      if (fs.existsSync(adminPath)) {
        try { adminData = JSON.parse(fs.readFileSync(adminPath, 'utf-8')); } catch (e) {}
      }

      if (currentPassword && !verifyBcrypt(currentPassword, adminData.password)) {
        return sendJSON(res, { success: false, message: 'Mật khẩu hiện tại không chính xác!' }, 400);
      }

      if (!newPassword) {
        return sendJSON(res, { success: false, message: 'Vui lòng cung cấp mật khẩu mới!' }, 400);
      }

      if (newPassword.length < 6) {
        return sendJSON(res, { success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự!' }, 400);
      }

      adminData.password = hashBcrypt(newPassword);
      adminData.is_default = false;
      adminData.updated_at = new Date().toISOString().slice(0, 10);
      fs.writeFileSync(adminPath, JSON.stringify(adminData, null, 2), 'utf-8');
      return sendJSON(res, { success: true, message: 'Đã đổi mật khẩu thành công!' });
    }
  }

  // 2. API UPLOAD
  if (pathname.includes('/api/upload.php')) {
    const result = await parseMultipart(req);
    return sendJSON(res, result);
  }

  // 3. API DATA
  if (pathname.includes('/api/data.php')) {
    const VALID_TYPES = ['hoat-dong', 'su-kien', 'cuoc-thi', 'thanh-vien', 'gioi-thieu', 'lien-he'];
    const type = parsedUrl.query.type;

    // Chặn truy cập admin với 403 Forbidden
    if (type === 'admin') {
      return sendJSON(res, {
        success: false,
        message: 'Truy cập dữ liệu quản trị bị cấm!'
      }, 403);
    }

    // Thiếu tham số type hoặc không thuộc danh sách cho phép
    if (!type || !VALID_TYPES.includes(type)) {
      return sendJSON(res, {
        success: false,
        message: 'Loại dữ liệu không hợp lệ! Chỉ chấp nhận: ' + VALID_TYPES.join(', ')
      }, 400);
    }

    const jsonFile = path.join(DATA_DIR, `${type}.json`);

    if (req.method === 'GET') {
      if (fs.existsSync(jsonFile)) {
        try {
          const content = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
          return sendJSON(res, { success: true, type, data: content });
        } catch (e) {
          return sendJSON(res, { success: false, message: 'Lỗi đọc file json' }, 500);
        }
      }
      return sendJSON(res, { success: false, message: 'Không tìm thấy loại dữ liệu' }, 404);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const action = parsedUrl.query.action;
      const body = await parseBody(req);

      let currentData = fs.existsSync(jsonFile) ? JSON.parse(fs.readFileSync(jsonFile, 'utf-8')) : [];

      // Xóa
      if (action === 'delete') {
        const id = parsedUrl.query.id || body.id;
        if (Array.isArray(currentData)) {
          currentData = currentData.filter(x => x.id !== id);
          fs.writeFileSync(jsonFile, JSON.stringify(currentData, null, 2), 'utf-8');
          return sendJSON(res, { success: true, message: 'Đã xóa' });
        }
      }

      // Thêm/Sửa
      if (type === 'gioi-thieu' || type === 'lien-he') {
        fs.writeFileSync(jsonFile, JSON.stringify(body, null, 2), 'utf-8');
        return sendJSON(res, { success: true, message: 'Đã cập nhật', data: body });
      }

      if (Array.isArray(currentData)) {
        const item = body.item || body;
        if (item.id) {
          const idx = currentData.findIndex(x => x.id === item.id);
          if (idx !== -1) currentData[idx] = Object.assign(currentData[idx], item);
          else currentData.unshift(item);
        } else {
          item.id = `${type.substring(0, 2)}-${Date.now()}`;
          currentData.unshift(item);
        }
        fs.writeFileSync(jsonFile, JSON.stringify(currentData, null, 2), 'utf-8');
        return sendJSON(res, { success: true, message: 'Đã lưu', item, data: currentData });
      }
    }
  }

  // 4. TĨNH / STATIC FILES
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  const filePath = path.join(ROOT, safePath);

  // Chặn bảo mật truy cập data/ (bảo vệ chống bypass case-insensitive: /data, /Data, /DATA...)
  if (safePath.toLowerCase().startsWith('/data') && !safePath.toLowerCase().endsWith('.webp')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden: Access Denied');
  }

  // Chặn các thư mục hệ thống và tệp ẩn (.git, .agents, tests, etc.)
  const normalizedPath = safePath.replace(/\\/g, '/');
  if (
    /(?:^|\/)\.[^\/]/.test(normalizedPath) ||
    normalizedPath.startsWith('/.agents') ||
    normalizedPath.startsWith('/.git') ||
    normalizedPath.startsWith('/tests')
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden: Protected Path');
  }

  // Chặn các file cấu hình và file phát triển nhạy cảm
  const baseName = path.basename(safePath).toLowerCase();
  if (
    baseName.startsWith('.') ||
    baseName === '.cpanel.yml' ||
    baseName === 'dev-server.js' ||
    baseName === 'package.json' ||
    baseName === 'package-lock.json'
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden: Protected File');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 HLS Local Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📌 Trang chủ:      http://localhost:${PORT}/index.html`);
  console.log(`📌 Trang thành viên: http://localhost:${PORT}/thanh-vien.html`);
  console.log(`📌 Trang quản trị: http://localhost:${PORT}/admin/index.html`);
  console.log(`🔑 Tài khoản mặc định: admin / Hls@2025Admin!\n`);
});
