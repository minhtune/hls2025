/**
 * HLS Website - Admin Control Panel Controller
 */

// Trạng thái dữ liệu cục bộ
const AppState = {
  user: null,
  currentSection: 'dashboard',
  members: [],
  activities: [],
  events: [],
  competitions: [],
  about: null,
  contact: null,
  // Cache tạm cho modal
  currentActivityGallery: [],
  currentEventGallery: [],
  currentHeroImages: []
};

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  checkAuth();
});

// Toast thông báo
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;
  const icon = type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-danger';
  toast.innerHTML = `
    <i class="bi ${icon} fs-5"></i>
    <div class="small fw-semibold flex-grow-1">${message}</div>
    <button type="button" class="btn-close btn-close-sm" onclick="this.parentElement.remove()"></button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// 1. KIỂM TRA ĐĂNG NHẬP
async function checkAuth() {
  try {
    const res = await fetch('../api/auth.php?action=check', { cache: 'no-store' });
    const data = await res.json();
    if (data.success && data.logged_in) {
      AppState.user = data.username;
      showAdminApp();
    } else {
      showAuthScreen();
    }
  } catch (e) {
    showAuthScreen();
  }
}

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('d-none');
  document.getElementById('admin-app').classList.add('d-none');
}

function showAdminApp() {
  document.getElementById('auth-screen').classList.add('d-none');
  document.getElementById('admin-app').classList.remove('d-none');
  document.getElementById('admin-user-display').textContent = AppState.user || 'admin';
  loadAllData();
}

// 2. SỰ KIỆN GIAO DIỆN
function initEvents() {
  // Toggle Sidebar Mobile
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('admin-sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('show');
    });
  }

  // Chuyển Tab Sidebar
  document.querySelectorAll('.nav-item-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.getAttribute('data-section');
      switchSection(section);
      if (window.innerWidth < 992 && sidebar) {
        sidebar.classList.remove('show');
      }
    });
  });

  // Đăng nhập form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value.trim();
      const alertBox = document.getElementById('login-alert');
      const spinner = document.getElementById('login-spinner');
      const btn = document.getElementById('btn-login');

      alertBox.classList.add('d-none');
      spinner.classList.remove('d-none');
      btn.disabled = true;

      try {
        const res = await fetch('../api/auth.php?action=login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const result = await res.json();
        if (result.success) {
          AppState.user = result.username || username;
          showToast('Đăng nhập thành công!');
          showAdminApp();
        } else {
          alertBox.textContent = result.message || 'Sai tên đăng nhập hoặc mật khẩu!';
          alertBox.classList.remove('d-none');
        }
      } catch (err) {
        alertBox.textContent = 'Không thể kết nối đến máy chủ API: ' + err.message;
        alertBox.classList.remove('d-none');
      } finally {
        spinner.classList.add('d-none');
        btn.disabled = false;
      }
    });
  }

  // Đăng xuất
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
        try {
          await fetch('../api/auth.php?action=logout');
          AppState.user = null;
          showToast('Đã đăng xuất.');
          showAuthScreen();
        } catch (e) {
          showAuthScreen();
        }
      }
    });
  }

  // Đổi mật khẩu
  const changePassForm = document.getElementById('change-pass-form');
  if (changePassForm) {
    changePassForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const curPass = document.getElementById('pass-current').value;
      const newPass = document.getElementById('pass-new').value;
      const confPass = document.getElementById('pass-confirm').value;

      if (newPass !== confPass) {
        showToast('Mật khẩu mới và xác nhận mật khẩu không trùng khớp!', 'error');
        return;
      }

      try {
        const res = await fetch('../api/auth.php?action=change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_password: curPass, new_password: newPass })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Đã đổi mật khẩu thành công!');
          changePassForm.reset();
        } else {
          showToast(data.message || 'Lỗi khi đổi mật khẩu!', 'error');
        }
      } catch (e) {
        showToast('Lỗi mạng: ' + e.message, 'error');
      }
    });
  }

  // Upload nén ảnh avatar thành viên
  const avatarInput = document.getElementById('member-avatar-input');
  if (avatarInput) {
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const badge = document.getElementById('member-avatar-badge');
      badge.className = 'compression-badge';
      badge.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang tự động nén WebP...';
      badge.classList.remove('d-none');

      try {
        const compressed = await HLSCompressor.compress(file, { maxWidth: 800, maxHeight: 800, quality: 0.82 });
        const uploadRes = await HLSCompressor.upload(compressed.file, 'thanh-vien');
        if (uploadRes.success) {
          document.getElementById('member-avatar-url').value = uploadRes.url;
          document.getElementById('member-avatar-preview').src = '../' + uploadRes.url;
          badge.innerHTML = `<i class="bi bi-check-circle-fill text-success"></i> Đã nén: ${HLSCompressor.formatSize(compressed.originalSize)} ➔ ${HLSCompressor.formatSize(compressed.compressedSize)} (-${compressed.savedPercent}%)`;
          showToast('Ảnh đại diện đã được nén và tải lên thành công!');
        }
      } catch (err) {
        badge.className = 'badge bg-danger mt-1';
        badge.textContent = 'Lỗi: ' + err.message;
        showToast('Lỗi tải ảnh: ' + err.message, 'error');
      }
    });
  }

  // Upload nén ảnh hoạt động (nhiều ảnh)
  const actInput = document.getElementById('activity-image-input');
  if (actInput) {
    actInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      const status = document.getElementById('activity-upload-status');
      status.textContent = `Đang xử lý và nén ${files.length} ảnh...`;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        status.textContent = `Đang nén và upload ảnh ${i + 1}/${files.length}...`;
        try {
          const comp = await HLSCompressor.compress(file, { maxWidth: 1600, quality: 0.82 });
          const up = await HLSCompressor.upload(comp.file, 'hoat-dong');
          if (up.success) {
            AppState.currentActivityGallery.push(up.url);
            renderActivityGalleryPreview();
          }
        } catch (err) {
          showToast('Lỗi upload file: ' + file.name, 'error');
        }
      }
      status.textContent = `Đã hoàn thành thêm ${files.length} ảnh vào album.`;
      showToast(`Đã tự động nén & tải lên ${files.length} ảnh.`);
    });
  }

  // Upload nén ảnh chính sự kiện
  const evtMainInput = document.getElementById('event-main-img-input');
  if (evtMainInput) {
    evtMainInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const badge = document.getElementById('event-main-img-badge');
      badge.className = 'compression-badge';
      badge.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang nén ảnh WebP...';
      badge.classList.remove('d-none');

      try {
        const comp = await HLSCompressor.compress(file, { maxWidth: 1600, quality: 0.82 });
        const up = await HLSCompressor.upload(comp.file, 'su-kien');
        if (up.success) {
          document.getElementById('event-main-img-url').value = up.url;
          const preview = document.getElementById('event-main-img-preview');
          preview.src = '../' + up.url;
          preview.classList.remove('d-none');
          badge.innerHTML = `<i class="bi bi-check-circle-fill text-success"></i> Đã nén: ${HLSCompressor.formatSize(comp.originalSize)} ➔ ${HLSCompressor.formatSize(comp.compressedSize)} (-${comp.savedPercent}%)`;
          showToast('Đã nén và lưu ảnh chính sự kiện!');
        }
      } catch (err) {
        showToast('Lỗi nén ảnh: ' + err.message, 'error');
      }
    });
  }

  // Upload nén ảnh thư viện sự kiện
  const evtGalInput = document.getElementById('event-gallery-input');
  if (evtGalInput) {
    evtGalInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        try {
          const comp = await HLSCompressor.compress(file, { maxWidth: 1200, quality: 0.82 });
          const up = await HLSCompressor.upload(comp.file, 'su-kien');
          if (up.success) {
            AppState.currentEventGallery.push(up.url);
            renderEventGalleryPreview();
          }
        } catch (err) {
          showToast('Lỗi: ' + err.message, 'error');
        }
      }
    });
  }

  // Upload nén ảnh cuộc thi
  const compImgInput = document.getElementById('competition-img-input');
  if (compImgInput) {
    compImgInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const badge = document.getElementById('competition-img-badge');
      badge.className = 'compression-badge';
      badge.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang nén ảnh WebP...';
      badge.classList.remove('d-none');

      try {
        const comp = await HLSCompressor.compress(file, { maxWidth: 1600, quality: 0.82 });
        const up = await HLSCompressor.upload(comp.file, 'cuoc-thi');
        if (up.success) {
          document.getElementById('competition-img-url').value = up.url;
          const preview = document.getElementById('competition-img-preview');
          preview.src = '../' + up.url;
          preview.classList.remove('d-none');
          badge.innerHTML = `<i class="bi bi-check-circle-fill text-success"></i> Đã nén: ${HLSCompressor.formatSize(comp.originalSize)} ➔ ${HLSCompressor.formatSize(comp.compressedSize)} (-${comp.savedPercent}%)`;
          showToast('Đã nén và lưu ảnh cuộc thi!');
        }
      } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
      }
    });
  }
}

// Chuyển Tab hiển thị
function switchSection(sectionId) {
  AppState.currentSection = sectionId;

  // Cập nhật nút active
  document.querySelectorAll('.nav-item-btn[data-section]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-section') === sectionId);
  });

  // Ẩn/Hiện nội dung
  document.querySelectorAll('.content-section').forEach(sec => {
    sec.classList.add('d-none');
  });

  const activeSec = document.getElementById(`sec-${sectionId}`);
  if (activeSec) {
    activeSec.classList.remove('d-none');
  }

  // Tiêu đề đầu trang
  const headings = {
    dashboard: '<i class="bi bi-speedometer2 text-danger"></i> Tổng quan',
    'thanh-vien': '<i class="bi bi-people-fill text-danger"></i> Quản lý Thành viên',
    'hoat-dong': '<i class="bi bi-calendar4-week text-danger"></i> Quản lý Hoạt động',
    'su-kien': '<i class="bi bi-megaphone-fill text-danger"></i> Quản lý Sự kiện',
    'cuoc-thi': '<i class="bi bi-trophy-fill text-danger"></i> Quản lý Cuộc thi',
    'gioi-thieu': '<i class="bi bi-info-circle-fill text-danger"></i> Quản lý Giới thiệu & Trang chủ',
    'lien-he': '<i class="bi bi-telephone-fill text-danger"></i> Quản lý Thông tin Liên hệ',
    'cai-dat': '<i class="bi bi-shield-lock-fill text-danger"></i> Đổi Mật khẩu Quản trị'
  };

  const titleEl = document.getElementById('page-heading');
  if (titleEl) {
    titleEl.innerHTML = headings[sectionId] || 'HLS Quản Trị';
  }
}

// Nạp toàn bộ dữ liệu từ API
async function loadAllData() {
  await Promise.all([
    loadMembers(),
    loadActivities(),
    loadEvents(),
    loadCompetitions(),
    loadAbout(),
    loadContact()
  ]);
  updateDashboardStats();
}

function updateDashboardStats() {
  document.getElementById('stat-members').textContent = AppState.members.length;
  document.getElementById('stat-activities').textContent = AppState.activities.length;
  document.getElementById('stat-events').textContent = AppState.events.length;
  document.getElementById('stat-competitions').textContent = AppState.competitions.length;
}

// ==================== 3. QUẢN LÝ THÀNH VIÊN ====================
async function loadMembers() {
  try {
    const res = await fetch('../api/data.php?type=thanh-vien', { cache: 'no-store' });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      AppState.members = json.data;
      renderMembers(AppState.members);
    }
  } catch (e) {
    console.error('Lỗi nạp thành viên:', e);
  }
}

function renderMembers(list) {
  const tbody = document.getElementById('member-table-body');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Chưa có thành viên nào. Hãy nhấn "Thêm Thành viên mới"!</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(m => `
    <tr>
      <td>
        <img src="../${m.avatar || 'image/herosection/1.webp'}" class="avatar-thumbnail" alt="${m.name}" style="width: 46px; height: 46px;" />
      </td>
      <td>
        <div class="fw-bold">${m.name}</div>
        <div class="text-muted small">${m.bio || ''}</div>
      </td>
      <td>
        <span class="badge bg-secondary-subtle text-secondary-emphasis">${m.department || 'Chưa phân ban'}</span>
      </td>
      <td>
        <span class="fw-semibold text-danger">${m.role || 'Thành viên'}</span>
      </td>
      <td>
        <span class="badge bg-light text-dark border">${m.cohort || 'Gen 5'}</span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openMemberModal('${m.id}')" title="Sửa">
          <i class="bi bi-pencil-square"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteMember('${m.id}')" title="Xóa">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function filterMembers() {
  const q = (document.getElementById('search-member')?.value || '').toLowerCase().trim();
  const dept = document.getElementById('filter-member-dept')?.value || '';

  const filtered = AppState.members.filter(m => {
    const matchName = !q || (m.name && m.name.toLowerCase().includes(q)) || (m.role && m.role.toLowerCase().includes(q));
    const matchDept = !dept || m.department === dept;
    return matchName && matchDept;
  });
  renderMembers(filtered);
}

function openMemberModal(id = null) {
  const modalEl = document.getElementById('modal-member');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  document.getElementById('member-avatar-badge').classList.add('d-none');

  if (id) {
    const m = AppState.members.find(x => x.id === id);
    if (!m) return;
    document.getElementById('modal-member-title').textContent = 'Chỉnh sửa Thành viên';
    document.getElementById('member-id').value = m.id;
    document.getElementById('member-name').value = m.name || '';
    document.getElementById('member-department').value = m.department || 'Ban Chủ nhiệm';
    document.getElementById('member-role').value = m.role || '';
    document.getElementById('member-cohort').value = m.cohort || '';
    document.getElementById('member-order').value = m.order || 1;
    document.getElementById('member-bio').value = m.bio || '';
    document.getElementById('member-social').value = m.social || '';
    document.getElementById('member-avatar-url').value = m.avatar || 'image/herosection/1.webp';
    document.getElementById('member-avatar-preview').src = '../' + (m.avatar || 'image/herosection/1.webp');
  } else {
    document.getElementById('modal-member-title').textContent = 'Thêm Thành viên mới';
    document.getElementById('member-id').value = '';
    document.getElementById('member-name').value = '';
    document.getElementById('member-department').value = 'Ban Chủ nhiệm';
    document.getElementById('member-role').value = '';
    document.getElementById('member-cohort').value = 'Gen 5 - K68';
    document.getElementById('member-order').value = AppState.members.length + 1;
    document.getElementById('member-bio').value = '';
    document.getElementById('member-social').value = '';
    document.getElementById('member-avatar-url').value = 'image/herosection/1.webp';
    document.getElementById('member-avatar-preview').src = '../image/herosection/1.webp';
  }

  modal.show();
}

async function saveMember() {
  const name = document.getElementById('member-name').value.trim();
  const role = document.getElementById('member-role').value.trim();
  const dept = document.getElementById('member-department').value;

  if (!name || !role) {
    showToast('Vui lòng nhập họ tên và chức vụ thành viên!', 'error');
    return;
  }

  const item = {
    id: document.getElementById('member-id').value || undefined,
    name: name,
    department: dept,
    role: role,
    cohort: document.getElementById('member-cohort').value.trim(),
    order: parseInt(document.getElementById('member-order').value) || 1,
    bio: document.getElementById('member-bio').value.trim(),
    social: document.getElementById('member-social').value.trim(),
    avatar: document.getElementById('member-avatar-url').value
  };

  try {
    const res = await fetch('../api/data.php?type=thanh-vien', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Lưu thành viên thành công!');
      bootstrap.Modal.getInstance(document.getElementById('modal-member')).hide();
      await loadMembers();
      updateDashboardStats();
    } else {
      showToast(data.message || 'Lỗi lưu dữ liệu!', 'error');
    }
  } catch (e) {
    showToast('Lỗi mạng: ' + e.message, 'error');
  }
}

async function deleteMember(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa thành viên này?')) return;
  try {
    const res = await fetch(`../api/data.php?type=thanh-vien&action=delete&id=${id}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success) {
      showToast('Đã xóa thành viên!');
      await loadMembers();
      updateDashboardStats();
    } else {
      showToast(data.message || 'Lỗi khi xóa!', 'error');
    }
  } catch (e) {
    showToast('Lỗi mạng: ' + e.message, 'error');
  }
}

// ==================== 4. QUẢN LÝ HOẠT ĐỘNG ====================
async function loadActivities() {
  try {
    const res = await fetch('../api/data.php?type=hoat-dong', { cache: 'no-store' });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      AppState.activities = json.data;
      renderActivities(AppState.activities);
    }
  } catch (e) {
    console.error('Lỗi nạp hoạt động:', e);
  }
}

function renderActivities(list) {
  const tbody = document.getElementById('activity-table-body');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Chưa có hoạt động nào. Hãy thêm mới!</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(a => {
    const firstImg = (a.images && a.images.length) ? a.images[0] : 'image/logo/thumbnailog.webp';
    const imgCount = (a.images && a.images.length) || 0;
    return `
      <tr>
        <td>
          <img src="../${firstImg}" class="rounded" style="width: 70px; height: 50px; object-fit: cover;" alt="${a.title}" />
        </td>
        <td>
          <div class="fw-bold">${a.title}</div>
          <div class="text-muted small">${a.created_at || ''}</div>
        </td>
        <td class="small text-muted" style="max-width: 260px;">
          ${a.description ? (a.description.length > 80 ? a.description.substring(0, 80) + '...' : a.description) : ''}
        </td>
        <td>
          <span class="badge bg-primary-subtle text-primary"><i class="bi bi-images me-1"></i>${imgCount} ảnh</span>
        </td>
        <td>
          ${a.featured ? '<span class="badge bg-success">Hiện</span>' : '<span class="badge bg-light text-muted">Ẩn</span>'}
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary me-1" onclick="openActivityModal('${a.id}')" title="Sửa">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteActivity('${a.id}')" title="Xóa">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openActivityModal(id = null) {
  const modalEl = document.getElementById('modal-activity');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  document.getElementById('activity-upload-status').textContent = '';

  if (id) {
    const a = AppState.activities.find(x => x.id === id);
    if (!a) return;
    document.getElementById('modal-activity-title').textContent = 'Chỉnh sửa Hoạt động';
    document.getElementById('activity-id').value = a.id;
    document.getElementById('activity-title').value = a.title || '';
    document.getElementById('activity-desc').value = a.description || '';
    document.getElementById('activity-featured').checked = !!a.featured;
    AppState.currentActivityGallery = a.images ? [...a.images] : [];
  } else {
    document.getElementById('modal-activity-title').textContent = 'Thêm Hoạt động mới';
    document.getElementById('activity-id').value = '';
    document.getElementById('activity-title').value = '';
    document.getElementById('activity-desc').value = '';
    document.getElementById('activity-featured').checked = false;
    AppState.currentActivityGallery = [];
  }

  renderActivityGalleryPreview();
  modal.show();
}

function renderActivityGalleryPreview() {
  const container = document.getElementById('activity-gallery-preview');
  if (!container) return;

  if (!AppState.currentActivityGallery.length) {
    container.innerHTML = '<div class="text-muted small">Chưa có ảnh nào trong album. Hãy tải ảnh lên!</div>';
    return;
  }

  container.innerHTML = AppState.currentActivityGallery.map((img, idx) => `
    <div class="gallery-item">
      <img src="../${img}" alt="Ảnh ${idx + 1}" />
      <button type="button" class="gallery-item-remove" onclick="removeActivityImage(${idx})" title="Xóa ảnh này">
        <i class="bi bi-x"></i>
      </button>
    </div>
  `).join('');
}

function removeActivityImage(index) {
  AppState.currentActivityGallery.splice(index, 1);
  renderActivityGalleryPreview();
}

async function saveActivity() {
  const title = document.getElementById('activity-title').value.trim();
  const desc = document.getElementById('activity-desc').value.trim();

  if (!title || !desc) {
    showToast('Vui lòng điền tên hoạt động và mô tả!', 'error');
    return;
  }

  const item = {
    id: document.getElementById('activity-id').value || undefined,
    title: title,
    description: desc,
    featured: document.getElementById('activity-featured').checked,
    images: AppState.currentActivityGallery
  };

  try {
    const res = await fetch('../api/data.php?type=hoat-dong', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    const data = await res.json();
    if (data.success) {
      showToast('Đã lưu hoạt động thành công!');
      bootstrap.Modal.getInstance(document.getElementById('modal-activity')).hide();
      await loadActivities();
      updateDashboardStats();
    } else {
      showToast(data.message || 'Lỗi khi lưu!', 'error');
    }
  } catch (e) {
    showToast('Lỗi mạng: ' + e.message, 'error');
  }
}

async function deleteActivity(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa hoạt động này?')) return;
  try {
    const res = await fetch(`../api/data.php?type=hoat-dong&action=delete&id=${id}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success) {
      showToast('Đã xóa hoạt động!');
      await loadActivities();
      updateDashboardStats();
    } else {
      showToast(data.message || 'Lỗi khi xóa!', 'error');
    }
  } catch (e) {
    showToast('Lỗi: ' + e.message, 'error');
  }
}

// ==================== 5. QUẢN LÝ SỰ KIỆN ====================
async function loadEvents() {
  try {
    const res = await fetch('../api/data.php?type=su-kien', { cache: 'no-store' });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      AppState.events = json.data;
      renderEvents(AppState.events);
    }
  } catch (e) {
    console.error('Lỗi nạp sự kiện:', e);
  }
}

function renderEvents(list) {
  const tbody = document.getElementById('event-table-body');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Chưa có sự kiện nào. Hãy thêm mới!</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(e => `
    <tr>
      <td>
        <img src="../${e.main_image || 'image/logo/thumbnailog.webp'}" class="rounded" style="width: 70px; height: 50px; object-fit: cover;" alt="${e.title}" />
      </td>
      <td>
        <div class="fw-bold">${e.title}</div>
        <div class="text-muted small">${e.subtitle || ''}</div>
      </td>
      <td>
        <span class="badge bg-info-subtle text-info-emphasis">${e.category || 'Workshop'}</span>
      </td>
      <td>
        ${e.status === 'upcoming' 
          ? '<span class="badge bg-warning text-dark">Sắp diễn ra</span>' 
          : '<span class="badge bg-success">Đã kết thúc</span>'}
      </td>
      <td>
        ${e.featured ? '<span class="badge bg-success">Hiện</span>' : '<span class="badge bg-light text-muted">Ẩn</span>'}
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openEventModal('${e.id}')" title="Sửa">
          <i class="bi bi-pencil-square"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteEvent('${e.id}')" title="Xóa">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function openEventModal(id = null) {
  const modalEl = document.getElementById('modal-event');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  document.getElementById('event-main-img-badge').classList.add('d-none');

  if (id) {
    const e = AppState.events.find(x => x.id === id);
    if (!e) return;
    document.getElementById('modal-event-title').textContent = 'Chỉnh sửa Sự kiện';
    document.getElementById('event-id').value = e.id;
    document.getElementById('event-title').value = e.title || '';
    document.getElementById('event-category').value = e.category || 'Workshop';
    document.getElementById('event-subtitle').value = e.subtitle || '';
    document.getElementById('event-status').value = e.status || 'completed';
    document.getElementById('event-date').value = e.date || '';
    document.getElementById('event-desc').value = e.description || '';
    document.getElementById('event-featured').checked = !!e.featured;
    document.getElementById('event-main-img-url').value = e.main_image || '';
    
    const preview = document.getElementById('event-main-img-preview');
    if (e.main_image) {
      preview.src = '../' + e.main_image;
      preview.classList.remove('d-none');
    } else {
      preview.classList.add('d-none');
    }

    AppState.currentEventGallery = e.gallery ? [...e.gallery] : [];
  } else {
    document.getElementById('modal-event-title').textContent = 'Thêm Sự kiện mới';
    document.getElementById('event-id').value = '';
    document.getElementById('event-title').value = '';
    document.getElementById('event-category').value = 'Workshop';
    document.getElementById('event-subtitle').value = '';
    document.getElementById('event-status').value = 'completed';
    document.getElementById('event-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('event-desc').value = '';
    document.getElementById('event-featured').checked = false;
    document.getElementById('event-main-img-url').value = '';
    document.getElementById('event-main-img-preview').classList.add('d-none');
    AppState.currentEventGallery = [];
  }

  renderEventGalleryPreview();
  modal.show();
}

function renderEventGalleryPreview() {
  const container = document.getElementById('event-gallery-preview');
  if (!container) return;

  if (!AppState.currentEventGallery.length) {
    container.innerHTML = '<div class="text-muted small">Chưa có ảnh phụ.</div>';
    return;
  }

  container.innerHTML = AppState.currentEventGallery.map((img, idx) => `
    <div class="gallery-item">
      <img src="../${img}" alt="Ảnh ${idx + 1}" />
      <button type="button" class="gallery-item-remove" onclick="removeEventImage(${idx})">
        <i class="bi bi-x"></i>
      </button>
    </div>
  `).join('');
}

function removeEventImage(index) {
  AppState.currentEventGallery.splice(index, 1);
  renderEventGalleryPreview();
}

async function saveEvent() {
  const title = document.getElementById('event-title').value.trim();
  if (!title) {
    showToast('Vui lòng nhập tiêu đề sự kiện!', 'error');
    return;
  }

  const status = document.getElementById('event-status').value;
  const status_text = status === 'upcoming' ? 'Sắp diễn ra' : 'Đã kết thúc';

  const item = {
    id: document.getElementById('event-id').value || undefined,
    title: title,
    category: document.getElementById('event-category').value.trim() || 'Workshop',
    subtitle: document.getElementById('event-subtitle').value.trim(),
    status: status,
    status_text: status_text,
    date: document.getElementById('event-date').value,
    description: document.getElementById('event-desc').value.trim(),
    featured: document.getElementById('event-featured').checked,
    main_image: document.getElementById('event-main-img-url').value,
    gallery: AppState.currentEventGallery
  };

  try {
    const res = await fetch('../api/data.php?type=su-kien', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    const data = await res.json();
    if (data.success) {
      showToast('Đã lưu sự kiện thành công!');
      bootstrap.Modal.getInstance(document.getElementById('modal-event')).hide();
      await loadEvents();
      updateDashboardStats();
    } else {
      showToast(data.message || 'Lỗi khi lưu sự kiện!', 'error');
    }
  } catch (e) {
    showToast('Lỗi mạng: ' + e.message, 'error');
  }
}

async function deleteEvent(id) {
  if (!confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
  try {
    const res = await fetch(`../api/data.php?type=su-kien&action=delete&id=${id}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success) {
      showToast('Đã xóa sự kiện!');
      await loadEvents();
      updateDashboardStats();
    } else {
      showToast(data.message || 'Lỗi khi xóa!', 'error');
    }
  } catch (e) {
    showToast('Lỗi: ' + e.message, 'error');
  }
}

// ==================== 6. QUẢN LÝ CUỘC THI ====================
async function loadCompetitions() {
  try {
    const res = await fetch('../api/data.php?type=cuoc-thi', { cache: 'no-store' });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      AppState.competitions = json.data;
      renderCompetitions(AppState.competitions);
    }
  } catch (e) {
    console.error('Lỗi nạp cuộc thi:', e);
  }
}

function renderCompetitions(list) {
  const tbody = document.getElementById('competition-table-body');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Chưa có cuộc thi nào.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(c => `
    <tr>
      <td>
        <img src="../${c.image || 'image/logo/thumbnailog.webp'}" class="rounded" style="width: 70px; height: 50px; object-fit: cover;" alt="${c.title}" />
      </td>
      <td>
        <div class="fw-bold">${c.title}</div>
        <div class="text-muted small">${c.short_name || ''}</div>
      </td>
      <td>
        <span class="badge bg-secondary-subtle text-secondary-emphasis">${c.season || ''}</span>
      </td>
      <td>
        ${c.status === 'ongoing' 
          ? '<span class="badge bg-success">Đang diễn ra</span>' 
          : '<span class="badge bg-secondary">Đã kết thúc</span>'}
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openCompetitionModal('${c.id}')" title="Sửa">
          <i class="bi bi-pencil-square"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteCompetition('${c.id}')" title="Xóa">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function openCompetitionModal(id = null) {
  const modalEl = document.getElementById('modal-competition');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  document.getElementById('competition-img-badge').classList.add('d-none');

  if (id) {
    const c = AppState.competitions.find(x => x.id === id);
    if (!c) return;
    document.getElementById('modal-competition-title').textContent = 'Chỉnh sửa Cuộc thi';
    document.getElementById('competition-id').value = c.id;
    document.getElementById('competition-title').value = c.title || '';
    document.getElementById('competition-season').value = c.season || '';
    document.getElementById('competition-status').value = c.status || 'completed';
    document.getElementById('competition-tag').value = c.tag || '';
    document.getElementById('competition-desc').value = c.description || '';
    document.getElementById('competition-link').value = c.link || '#';
    document.getElementById('competition-link-text').value = c.link_text || 'Tìm hiểu thêm';
    document.getElementById('competition-img-url').value = c.image || '';

    const preview = document.getElementById('competition-img-preview');
    if (c.image) {
      preview.src = '../' + c.image;
      preview.classList.remove('d-none');
    } else {
      preview.classList.add('d-none');
    }
  } else {
    document.getElementById('modal-competition-title').textContent = 'Thêm Cuộc thi mới';
    document.getElementById('competition-id').value = '';
    document.getElementById('competition-title').value = '';
    document.getElementById('competition-season').value = 'Mùa giải ' + new Date().getFullYear();
    document.getElementById('competition-status').value = 'completed';
    document.getElementById('competition-tag').value = 'Cuộc thi chính';
    document.getElementById('competition-desc').value = '';
    document.getElementById('competition-link').value = '#';
    document.getElementById('competition-link-text').value = 'Tìm hiểu thêm';
    document.getElementById('competition-img-url').value = '';
    document.getElementById('competition-img-preview').classList.add('d-none');
  }

  modal.show();
}

async function saveCompetition() {
  const title = document.getElementById('competition-title').value.trim();
  const season = document.getElementById('competition-season').value.trim();

  if (!title || !season) {
    showToast('Vui lòng nhập tên cuộc thi và mùa giải!', 'error');
    return;
  }

  const status = document.getElementById('competition-status').value;
  const status_text = status === 'ongoing' ? 'Đang diễn ra' : (status === 'upcoming' ? 'Sắp diễn ra' : 'Đã kết thúc');

  const item = {
    id: document.getElementById('competition-id').value || undefined,
    title: title,
    short_name: title,
    season: season,
    status: status,
    status_text: status_text,
    tag: document.getElementById('competition-tag').value.trim(),
    description: document.getElementById('competition-desc').value.trim(),
    short_desc: document.getElementById('competition-desc').value.trim().substring(0, 100),
    link: document.getElementById('competition-link').value.trim() || '#',
    link_text: document.getElementById('competition-link-text').value.trim() || 'Tìm hiểu thêm',
    image: document.getElementById('competition-img-url').value
  };

  try {
    const res = await fetch('../api/data.php?type=cuoc-thi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    const data = await res.json();
    if (data.success) {
      showToast('Đã lưu cuộc thi thành công!');
      bootstrap.Modal.getInstance(document.getElementById('modal-competition')).hide();
      await loadCompetitions();
      updateDashboardStats();
    } else {
      showToast(data.message || 'Lỗi khi lưu!', 'error');
    }
  } catch (e) {
    showToast('Lỗi mạng: ' + e.message, 'error');
  }
}

async function deleteCompetition(id) {
  if (!confirm('Bạn có chắc muốn xóa cuộc thi này?')) return;
  try {
    const res = await fetch(`../api/data.php?type=cuoc-thi&action=delete&id=${id}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success) {
      showToast('Đã xóa cuộc thi!');
      await loadCompetitions();
      updateDashboardStats();
    } else {
      showToast(data.message || 'Lỗi khi xóa!', 'error');
    }
  } catch (e) {
    showToast('Lỗi: ' + e.message, 'error');
  }
}

// ==================== 7. QUẢN LÝ GIỚI THIỆU ====================
async function loadAbout() {
  try {
    const res = await fetch('../api/data.php?type=gioi-thieu', { cache: 'no-store' });
    const json = await res.json();
    if (json.success && json.data) {
      AppState.about = json.data;
      renderAboutForm();
    }
  } catch (e) {
    console.error('Lỗi nạp giới thiệu:', e);
  }
}

function renderAboutForm() {
  const d = AppState.about;
  if (!d) return;

  // Hero
  if (d.hero) {
    document.getElementById('hero-badge-text').value = d.hero.badge_text || '';
    document.getElementById('hero-badge-link').value = d.hero.badge_link || '';
    document.getElementById('hero-title-prefix').value = d.hero.title_prefix || 'HUST';
    document.getElementById('hero-title-highlight').value = d.hero.title_highlight || 'Logistics and Supply Chain Club';
    document.getElementById('hero-subtitle').value = d.hero.subtitle || '';
    AppState.currentHeroImages = d.hero.images ? [...d.hero.images] : [];
    renderHeroImages();
  }

  // About paragraphs
  if (d.about) {
    document.getElementById('about-title').value = d.about.title || 'VỀ HLS';
    document.getElementById('about-p1').value = (d.about.paragraphs && d.about.paragraphs[0]) || '';
    document.getElementById('about-p2').value = (d.about.paragraphs && d.about.paragraphs[1]) || '';
  }

  // Departments
  const deptContainer = document.getElementById('dept-list-container');
  if (deptContainer && d.departments) {
    deptContainer.innerHTML = d.departments.map((dept, idx) => `
      <div class="p-3 mb-3 border rounded bg-white" data-dept-idx="${idx}">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="fw-bold mb-0 text-danger">${dept.name}</h6>
          <span class="badge bg-light text-muted border">${dept.id}</span>
        </div>
        <div class="row g-3">
          <div class="col-md-3">
            <img src="../${dept.image}" id="dept-img-preview-${idx}" class="img-fluid rounded border mb-2" style="max-height: 120px; object-fit: contain;" alt="${dept.name}" />
            <input type="file" id="dept-file-${idx}" class="d-none" accept="image/*" />
            <button type="button" class="btn btn-outline-secondary btn-sm w-100" onclick="uploadDeptImage(${idx})">
              <i class="bi bi-camera me-1"></i> Đổi ảnh Ban
            </button>
          </div>
          <div class="col-md-9">
            <div class="mb-2">
              <label class="form-label small fw-semibold">Mô tả ban</label>
              <textarea class="form-control form-control-sm dept-desc" rows="2">${dept.description || ''}</textarea>
            </div>
            <div>
              <label class="form-label small fw-semibold">Nhiệm vụ chính (mỗi dòng 1 gạch đầu dòng)</label>
              <textarea class="form-control form-control-sm dept-tasks" rows="3">${(dept.tasks || []).join('\n')}</textarea>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // CTA Section
  const cta = (d && d.cta) ? d.cta : {
    title: 'Sẵn sàng gia nhập cộng đồng HLS?',
    description: 'Đừng bỏ lỡ cơ hội phát triển bản thân và kết nối với những người có cùng đam mê. Hãy trở thành một phần của gia đình HLS ngay hôm nay!',
    image: 'image/background/backgroundgen5.webp',
    button_enabled: true,
    button_text: 'Đăng ký tuyển quân Gen 6',
    button_link: 'https://forms.gle/hls2025'
  };

  const ctaTitleEl = document.getElementById('cta-title');
  if (ctaTitleEl) ctaTitleEl.value = cta.title || '';

  const ctaDescEl = document.getElementById('cta-description') || document.getElementById('cta-desc');
  if (ctaDescEl) {
    ctaDescEl.value = cta.description || '';
    const altDesc = document.getElementById('cta-desc');
    if (altDesc && altDesc !== ctaDescEl) altDesc.value = cta.description || '';
  }

  const ctaImgUrlEl = document.getElementById('cta-img-url');
  if (ctaImgUrlEl) ctaImgUrlEl.value = cta.image || '';

  const ctaPreviewEl = document.getElementById('cta-img-preview');
  if (ctaPreviewEl && cta.image) {
    ctaPreviewEl.src = cta.image.startsWith('http') || cta.image.startsWith('/') ? cta.image : '../' + cta.image;
  }

  const ctaEnabledEl = document.getElementById('cta-button-enabled') || document.getElementById('cta-toggle');
  if (ctaEnabledEl) {
    ctaEnabledEl.checked = (cta.button_enabled !== undefined) ? Boolean(cta.button_enabled) : true;
    const btnFields = document.getElementById('cta-btn-fields-wrapper');
    if (btnFields) btnFields.style.opacity = ctaEnabledEl.checked ? '1' : '0.5';
  }

  const ctaBtnTextEl = document.getElementById('cta-btn-text') || document.getElementById('cta-button-text');
  if (ctaBtnTextEl) {
    ctaBtnTextEl.value = cta.button_text || '';
    const altText = document.getElementById('cta-button-text');
    if (altText && altText !== ctaBtnTextEl) altText.value = cta.button_text || '';
  }

  const ctaBtnLinkEl = document.getElementById('cta-button-link') || document.getElementById('cta-btn-link');
  if (ctaBtnLinkEl) {
    ctaBtnLinkEl.value = cta.button_link || cta.button_url || '';
    const altLink = document.getElementById('cta-btn-link');
    if (altLink && altLink !== ctaBtnLinkEl) altLink.value = ctaBtnLinkEl.value;
  }

  initCtaAdminListeners();
}

function initCtaAdminListeners() {
  const ctaFile = document.getElementById('cta-img-file');
  if (ctaFile && !ctaFile.dataset.bound) {
    ctaFile.dataset.bound = 'true';
    ctaFile.onchange = async () => {
      const file = ctaFile.files[0];
      if (!file) return;
      try {
        showToast('Đang nén và tải ảnh CTA...');
        const comp = await HLSCompressor.compress(file, { maxWidth: 1600, quality: 0.82 });
        const up = await HLSCompressor.upload(comp.file, 'gioi-thieu');
        if (up.success) {
          const urlInput = document.getElementById('cta-img-url');
          if (urlInput) urlInput.value = up.url;
          const preview = document.getElementById('cta-img-preview');
          if (preview) preview.src = '../' + up.url;
          showToast('Tải ảnh CTA thành công!');
        }
      } catch (e) {
        showToast('Lỗi tải ảnh CTA: ' + e.message, 'error');
      }
    };
  }

  const ctaUrl = document.getElementById('cta-img-url');
  if (ctaUrl && !ctaUrl.dataset.bound) {
    ctaUrl.dataset.bound = 'true';
    ctaUrl.addEventListener('input', () => {
      const preview = document.getElementById('cta-img-preview');
      if (preview && ctaUrl.value) {
        preview.src = ctaUrl.value.startsWith('http') || ctaUrl.value.startsWith('/') ? ctaUrl.value : '../' + ctaUrl.value;
      }
    });
  }

  const ctaToggle = document.getElementById('cta-button-enabled') || document.getElementById('cta-toggle');
  if (ctaToggle && !ctaToggle.dataset.bound) {
    ctaToggle.dataset.bound = 'true';
    ctaToggle.addEventListener('change', () => {
      const btnFields = document.getElementById('cta-btn-fields-wrapper');
      if (btnFields) {
        btnFields.style.opacity = ctaToggle.checked ? '1' : '0.5';
      }
    });
  }

  // Sync helpers between primary and alias IDs
  const ctaDesc = document.getElementById('cta-description');
  const ctaDescAlt = document.getElementById('cta-desc');
  if (ctaDesc && ctaDescAlt && !ctaDesc.dataset.bound) {
    ctaDesc.dataset.bound = 'true';
    ctaDesc.addEventListener('input', () => { ctaDescAlt.value = ctaDesc.value; });
  }

  const ctaBtnText = document.getElementById('cta-btn-text');
  const ctaBtnTextAlt = document.getElementById('cta-button-text');
  if (ctaBtnText && ctaBtnTextAlt && !ctaBtnText.dataset.bound) {
    ctaBtnText.dataset.bound = 'true';
    ctaBtnText.addEventListener('input', () => { ctaBtnTextAlt.value = ctaBtnText.value; });
  }

  const ctaBtnLink = document.getElementById('cta-button-link');
  const ctaBtnLinkAlt = document.getElementById('cta-btn-link');
  if (ctaBtnLink && ctaBtnLinkAlt && !ctaBtnLink.dataset.bound) {
    ctaBtnLink.dataset.bound = 'true';
    ctaBtnLink.addEventListener('input', () => { ctaBtnLinkAlt.value = ctaBtnLink.value; });
  }
}

function renderHeroImages() {
  const container = document.getElementById('hero-images-container');
  if (!container) return;

  container.innerHTML = AppState.currentHeroImages.map((img, idx) => `
    <div class="gallery-item">
      <img src="../${img}" alt="Hero ${idx + 1}" />
      <button type="button" class="gallery-item-remove" onclick="removeHeroImage(${idx})">
        <i class="bi bi-x"></i>
      </button>
    </div>
  `).join('');
}

function removeHeroImage(index) {
  AppState.currentHeroImages.splice(index, 1);
  renderHeroImages();
}

async function addHeroImage(url) {
  AppState.currentHeroImages.push(url);
  renderHeroImages();
}

async function uploadDeptImage(idx) {
  const fileInput = document.getElementById(`dept-file-${idx}`);
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      showToast('Đang nén ảnh ban...');
      const comp = await HLSCompressor.compress(file, { maxWidth: 1200, quality: 0.82 });
      const up = await HLSCompressor.upload(comp.file, 'gioi-thieu');
      if (up.success) {
        AppState.about.departments[idx].image = up.url;
        document.getElementById(`dept-img-preview-${idx}`).src = '../' + up.url;
        showToast('Đã đổi ảnh ban thành công!');
      }
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error');
    }
  };
  fileInput.click();
}

async function saveAboutData() {
  const ctaTitleVal = (document.getElementById('cta-title')?.value || '').trim();
  const ctaDescEl = document.getElementById('cta-description') || document.getElementById('cta-desc');
  const ctaDescVal = (ctaDescEl?.value || '').trim();
  const ctaImgVal = (document.getElementById('cta-img-url')?.value || '').trim() || 'image/background/backgroundgen5.webp';
  const ctaEnabledEl = document.getElementById('cta-button-enabled') || document.getElementById('cta-toggle');
  const ctaEnabledVal = ctaEnabledEl ? Boolean(ctaEnabledEl.checked) : true;
  const ctaBtnTextEl = document.getElementById('cta-btn-text') || document.getElementById('cta-button-text');
  const ctaBtnTextVal = (ctaBtnTextEl?.value || '').trim();
  const ctaBtnLinkEl = document.getElementById('cta-button-link') || document.getElementById('cta-btn-link');
  const ctaBtnLinkVal = (ctaBtnLinkEl?.value || '').trim();

  const ctaData = {
    title: ctaTitleVal || 'Sẵn sàng gia nhập cộng đồng HLS?',
    description: ctaDescVal,
    image: ctaImgVal,
    button_enabled: ctaEnabledVal,
    button_text: ctaBtnTextVal || 'Đăng ký tuyển quân Gen 6',
    button_link: ctaBtnLinkVal || 'https://forms.gle/hls2025'
  };

  const data = {
    hero: {
      badge_text: document.getElementById('hero-badge-text').value.trim(),
      badge_link: document.getElementById('hero-badge-link').value.trim(),
      title_prefix: document.getElementById('hero-title-prefix').value.trim(),
      title_highlight: document.getElementById('hero-title-highlight').value.trim(),
      subtitle: document.getElementById('hero-subtitle').value.trim(),
      images: AppState.currentHeroImages
    },
    about: {
      title: document.getElementById('about-title').value.trim(),
      paragraphs: [
        document.getElementById('about-p1').value.trim(),
        document.getElementById('about-p2').value.trim()
      ]
    },
    departments: AppState.about.departments.map((dept, idx) => {
      const descEl = document.querySelectorAll('.dept-desc')[idx];
      const tasksEl = document.querySelectorAll('.dept-tasks')[idx];
      return {
        ...dept,
        description: descEl ? descEl.value.trim() : dept.description,
        tasks: tasksEl ? tasksEl.value.split('\n').map(t => t.trim()).filter(t => t.length > 0) : dept.tasks
      };
    }),
    cta: ctaData
  };

  try {
    const res = await fetch('../api/data.php?type=gioi-thieu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Đã lưu dữ liệu Giới thiệu thành công!');
      AppState.about = data;
    } else {
      showToast(result.message || 'Lỗi khi lưu!', 'error');
    }
  } catch (e) {
    showToast('Lỗi mạng: ' + e.message, 'error');
  }
}

// ==================== 8. QUẢN LÝ LIÊN HỆ ====================
async function loadContact() {
  try {
    const res = await fetch('../api/data.php?type=lien-he', { cache: 'no-store' });
    const json = await res.json();
    if (json.success && json.data) {
      AppState.contact = json.data;
      renderContactForm();
    }
  } catch (e) {
    console.error('Lỗi nạp liên hệ:', e);
  }
}

function renderContactForm() {
  const c = AppState.contact;
  if (!c) return;

  document.getElementById('contact-email').value = c.email || '';
  document.getElementById('contact-fanpage').value = c.fanpage || '';
  document.getElementById('contact-fanpage-text').value = c.fanpage_text || 'Facebook - HLS';
  document.getElementById('contact-linkedin').value = c.linkedin || '#';
  document.getElementById('contact-address').value = c.address || '';
  document.getElementById('contact-map').value = c.map_url || '';
}

async function saveContactData() {
  const data = {
    title: "LIÊN HỆ VỚI HLS",
    email: document.getElementById('contact-email').value.trim(),
    fanpage: document.getElementById('contact-fanpage').value.trim(),
    fanpage_text: document.getElementById('contact-fanpage-text').value.trim(),
    linkedin: document.getElementById('contact-linkedin').value.trim(),
    linkedin_text: "LinkedIn - HLS",
    address: document.getElementById('contact-address').value.trim(),
    map_url: document.getElementById('contact-map').value.trim()
  };

  try {
    const res = await fetch('../api/data.php?type=lien-he', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Đã lưu thông tin liên hệ thành công!');
      AppState.contact = data;
    } else {
      showToast(result.message || 'Lỗi khi lưu!', 'error');
    }
  } catch (e) {
    showToast('Lỗi mạng: ' + e.message, 'error');
  }
}

// Upload helper dùng chung
function triggerUpload(category, callback) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      showToast('Đang nén ảnh WebP...');
      const comp = await HLSCompressor.compress(file, { maxWidth: 1600, quality: 0.82 });
      const up = await HLSCompressor.upload(comp.file, category);
      if (up.success) {
        callback(up.url);
        showToast('Tải ảnh thành công!');
      }
    } catch (e) {
      showToast('Lỗi tải ảnh: ' + e.message, 'error');
    }
  };
  input.click();
}
