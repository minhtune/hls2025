/**
 * HLS Website - Dynamic Content Engine
 * Tự động nạp dữ liệu từ API hoặc fallback JSON để hiển thị dữ liệu mới nhất
 */

(function () {
  'use strict';

  // Helper nạp dữ liệu (ưu tiên API PHP, fallback về file JSON tĩnh)
  async function fetchHLSData(type) {
    try {
      const apiRes = await fetch(`api/data.php?type=${type}`, { cache: 'no-cache' });
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (e) {
      // Fallback khi chạy trên static hosting hoặc file://
    }

    try {
      const fileRes = await fetch(`data/${type}.json`, { cache: 'no-cache' });
      if (fileRes.ok) {
        return await fileRes.json();
      }
    } catch (err) {
      console.warn(`Không thể nạp dữ liệu cho: ${type}`, err);
    }
    return null;
  }

  // Khởi tạo theo từng trang
  document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop() || 'index.html';

    if (page === 'thanh-vien.html' || document.getElementById('member-grid-container')) {
      initMemberPage();
    }
    if (page === 'hoat-dong.html' || document.getElementById('activities-container')) {
      initActivitiesPage();
    }
    if (page === 'su-kien.html' || document.getElementById('events-container')) {
      initEventsPage();
    }
    if (page === 'cuoc-thi.html' || document.getElementById('competitions-container')) {
      initCompetitionsPage();
    }
    if (page === 'lien-he.html' || document.getElementById('contact-container')) {
      initContactPage();
    }
    if (page === 'index.html' || page === '' || document.getElementById('hero-section-wrapper')) {
      initHomePage();
    }
  });

  // ================= 1. TRANG THÀNH VIÊN =================
  async function initMemberPage() {
    const container = document.getElementById('member-grid-container');
    const emptyState = document.getElementById('member-empty-state');
    const filterTabs = document.getElementById('member-filter-tabs');
    const searchInput = document.getElementById('member-search-input');

    if (!container) return;

    const members = await fetchHLSData('thanh-vien');
    if (!members || !Array.isArray(members) || members.length === 0) return;

    let currentFilter = 'all';
    let currentSearch = '';

    // Sắp xếp theo order
    members.sort((a, b) => (a.order || 99) - (b.order || 99));

    function render(list) {
      if (!list.length) {
        container.innerHTML = '';
        if (emptyState) emptyState.classList.remove('d-none');
        return;
      }
      if (emptyState) emptyState.classList.add('d-none');

      container.innerHTML = list.map(m => `
        <div class="col member-item">
          <div class="card h-100 border-0 shadow-sm member-card text-center p-3">
            <div class="member-avatar-box mx-auto mb-3">
              <img
                src="${m.avatar || 'image/herosection/1.webp'}"
                alt="${m.name}"
                class="img-fluid member-avatar"
                loading="lazy"
                decoding="async"
              />
            </div>
            <h5 class="fw-bold mb-1">${m.name}</h5>
            <div class="text-danger small fw-semibold mb-2">${m.role || 'Thành viên'}</div>
            <div class="badge bg-danger-subtle text-danger mb-2 align-self-center px-3 py-1 rounded-pill">
              ${m.department || 'Ban'}
            </div>
            ${m.cohort ? `<div class="text-muted small mb-2">${m.cohort}</div>` : ''}
            ${m.bio ? `<p class="text-muted small mb-3 flex-grow-1">${m.bio}</p>` : '<div class="flex-grow-1"></div>'}
            ${m.social ? `
              <div class="mt-2">
                <a href="${m.social}" target="_blank" class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1">
                  <i class="bi bi-facebook me-1"></i> Kết nối
                </a>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('');
    }

    function applyFilterAndSearch() {
      const filtered = members.filter(m => {
        const matchDept = currentFilter === 'all' || (m.department && m.department.trim() === currentFilter.trim());
        const q = currentSearch.toLowerCase();
        const matchSearch = !q 
          || (m.name && m.name.toLowerCase().includes(q))
          || (m.role && m.role.toLowerCase().includes(q))
          || (m.department && m.department.toLowerCase().includes(q));
        return matchDept && matchSearch;
      });
      render(filtered);
    }

    if (filterTabs) {
      filterTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-filter');
        if (!btn) return;
        filterTabs.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter');
        applyFilterAndSearch();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.trim();
        applyFilterAndSearch();
      });
    }

    render(members);
  }

  // ================= 2. TRANG HOẠT ĐỘNG =================
  async function initActivitiesPage() {
    const container = document.getElementById('activities-container');
    if (!container) return;

    const activities = await fetchHLSData('hoat-dong');
    if (!activities || !Array.isArray(activities) || !activities.length) return;

    container.innerHTML = activities.map(act => `
      <div class="activity-section">
        <h2>${act.title}</h2>
        <p class="text-muted">${act.description || ''}</p>
        ${act.images && act.images.length ? `
          <div class="row g-4 mt-2 activity-gallery">
            ${act.images.map(img => `
              <div class="col-md-4">
                <img src="${img}" alt="${act.title}" loading="lazy" decoding="async" />
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  // ================= 3. TRANG SỰ KIỆN =================
  async function initEventsPage() {
    const container = document.getElementById('events-container');
    if (!container) return;

    const events = await fetchHLSData('su-kien');
    if (!events || !Array.isArray(events) || !events.length) return;

    container.innerHTML = events.map(evt => {
      const subImgs = (evt.gallery || []).slice(0, 2);
      return `
        <div class="timeline-item">
          <div class="row g-4 align-items-center">
            <div class="col-lg-5">
              <div class="row g-2 event-gallery">
                <div class="col-12 col-md-8 mb-2 mb-md-0">
                  <img class="img-fluid rounded" src="${evt.main_image || 'image/logo/thumbnailog.webp'}" alt="${evt.title}" loading="lazy" decoding="async" />
                </div>
                ${subImgs.length ? `
                  <div class="col-12 col-md-4">
                    <div class="row g-2">
                      ${subImgs.map(sub => `
                        <div class="col-12">
                          <img class="img-fluid rounded" src="${sub}" alt="${evt.title}" loading="lazy" decoding="async" />
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="col-lg-7">
              <div class="d-flex align-items-center gap-2 mb-2">
                <span class="badge bg-primary-subtle text-primary">${evt.category || 'Workshop'}</span>
                ${evt.status === 'upcoming' 
                  ? '<span class="badge bg-warning text-dark">Sắp diễn ra</span>' 
                  : '<span class="badge bg-secondary-subtle text-secondary-emphasis">Đã kết thúc</span>'}
                ${evt.date ? `<span class="text-muted small ms-2"><i class="bi bi-calendar-event me-1"></i>${evt.date}</span>` : ''}
              </div>
              <h5 class="fw-semibold mb-1">${evt.title}</h5>
              ${evt.subtitle ? `<div class="text-muted small mb-2">${evt.subtitle}</div>` : ''}
              <p class="mb-2">${evt.description || ''}</p>
              <button type="button" class="btn btn-primary btn-sm px-3 mt-2" data-bs-toggle="modal" data-bs-target="#modal-event-detail" onclick="openEventDetail('${evt.id}')">
                Xem chi tiết <i class="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ================= 4. TRANG CUỘC THI =================
  async function initCompetitionsPage() {
    const container = document.getElementById('competitions-container');
    if (!container) return;

    const competitions = await fetchHLSData('cuoc-thi');
    if (!competitions || !Array.isArray(competitions) || !competitions.length) return;

    container.innerHTML = competitions.map((comp, idx) => {
      const isEven = idx % 2 === 1;
      return `
        <div class="row g-5 align-items-center ${idx > 0 ? 'mt-5 pt-4' : 'mt-4'}">
          <div class="col-lg-6 ${isEven ? 'order-lg-2' : ''}">
            <img
              src="${comp.image || 'image/logo/thumbnailog.webp'}"
              alt="${comp.title}"
              class="img-fluid rounded-4"
              style="box-shadow: 0 16px 40px rgba(0,0,0,0.12);"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div class="col-lg-6 ${isEven ? 'order-lg-1' : ''}">
            <h2 class="fw-bold mb-3">${comp.title}</h2>
            <p class="text-muted">${comp.description || ''}</p>
            <div class="d-flex align-items-center gap-3 my-4">
              <span class="badge bg-primary-subtle text-primary-emphasis rounded-pill px-3 py-2">${comp.season || 'Mùa giải'}</span>
              <span class="badge ${comp.status === 'ongoing' ? 'bg-success-subtle text-success-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'} rounded-pill px-3 py-2">
                ${comp.status === 'ongoing' ? 'Đang diễn ra' : (comp.status === 'upcoming' ? 'Sắp diễn ra' : 'Đã kết thúc')}
              </span>
            </div>
            <button type="button" class="btn btn-primary px-4" data-bs-toggle="modal" data-bs-target="#modal-competition-detail" onclick="openCompetitionDetail('${comp.id}')">
              ${comp.link_text || 'Tìm hiểu thêm'} <i class="bi bi-arrow-right ms-1"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ================= MODAL HANDLERS (F11) =================
  let competitionsCache = null;
  let eventsCache = null;

  window.openCompetitionDetail = async function (compId) {
    try {
      if (!competitionsCache) {
        competitionsCache = await fetchHLSData('cuoc-thi');
      }
      const comp = (competitionsCache || []).find(c => c.id === compId || c.title.includes(compId));
      if (!comp) return;

      const titleEl = document.getElementById('modalCompetitionTitle');
      const seasonEl = document.getElementById('modal-comp-season');
      const imgEl = document.getElementById('modal-comp-img');
      const descEl = document.getElementById('modal-comp-desc');
      const rulesEl = document.getElementById('modal-comp-rules');
      const timelineEl = document.getElementById('modal-comp-timeline');
      const speakersEl = document.getElementById('modal-comp-speakers');
      const prizesEl = document.getElementById('modal-comp-prizes');
      const linkEl = document.getElementById('modal-comp-link');

      if (titleEl) titleEl.textContent = comp.title;
      if (seasonEl) seasonEl.textContent = comp.season || 'Mùa giải';
      if (imgEl) {
        imgEl.src = comp.image || 'image/logo/thumbnailog.webp';
        imgEl.alt = comp.title;
      }
      if (descEl) descEl.textContent = comp.description || '';

      const md = comp.modal_data || {};

      if (rulesEl) {
        rulesEl.textContent = md.regulations || 'Đang cập nhật thể lệ chi tiết từ Ban tổ chức.';
      }

      if (timelineEl) {
        if (Array.isArray(md.timeline)) {
          timelineEl.innerHTML = md.timeline.map(step => `
            <div class="modal-timeline-step">
              <div class="fw-bold text-dark">${step.phase} ${step.date ? `<span class="badge bg-primary-subtle text-primary ms-1">${step.date}</span>` : ''}</div>
              <div class="small text-muted">${step.desc || ''}</div>
            </div>
          `).join('');
        } else {
          timelineEl.textContent = md.timeline || 'Lịch trình sẽ được thông báo sớm nhất.';
        }
      }

      if (speakersEl) {
        const speakers = md.speakers || md.judges || [];
        if (speakers.length) {
          speakersEl.innerHTML = speakers.map(spk => `
            <li class="mb-2 d-flex align-items-center gap-2">
              <i class="bi bi-check-circle-fill text-primary"></i>
              <span>${spk}</span>
            </li>
          `).join('');
        } else {
          speakersEl.innerHTML = '<li class="text-muted small">Đang cập nhật danh sách diễn giả và giám khảo.</li>';
        }
      }

      if (prizesEl) {
        prizesEl.textContent = md.prizes || 'Đang cập nhật cơ cấu giải thưởng.';
      }

      if (linkEl) {
        if (comp.link && comp.link !== '#') {
          linkEl.href = comp.link;
          linkEl.classList.remove('d-none');
        } else {
          linkEl.classList.add('d-none');
        }
      }

      const modalEl = document.getElementById('modal-competition-detail');
      if (modalEl && typeof bootstrap !== 'undefined') {
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalInstance.show();
      }
    } catch (e) {
      console.error('Error opening competition detail:', e);
    }
  };

  window.openEventDetail = async function (eventId) {
    try {
      if (!eventsCache) {
        eventsCache = await fetchHLSData('su-kien');
      }
      const evt = (eventsCache || []).find(e => e.id === eventId || e.title.includes(eventId));
      if (!evt) return;

      const titleEl = document.getElementById('modalEventTitle');
      const catEl = document.getElementById('modal-event-category');
      const imgEl = document.getElementById('modal-event-img');
      const descEl = document.getElementById('modal-event-desc');
      const agendaEl = document.getElementById('modal-event-agenda');
      const speakersEl = document.getElementById('modal-event-speakers');
      const venueEl = document.getElementById('modal-event-venue');
      const regEl = document.getElementById('modal-event-registration');

      if (titleEl) titleEl.textContent = evt.title;
      if (catEl) catEl.textContent = evt.category || 'Sự kiện';
      if (imgEl) {
        imgEl.src = evt.main_image || 'image/logo/thumbnailog.webp';
        imgEl.alt = evt.title;
      }
      if (descEl) descEl.textContent = evt.description || '';

      const md = evt.modal_data || {};

      if (agendaEl) {
        const agenda = md.agenda || md.timeline;
        if (Array.isArray(agenda)) {
          agendaEl.innerHTML = agenda.map(item => `
            <div class="modal-timeline-step">
              <div class="fw-bold text-dark">${item.time || item.phase || ''}</div>
              <div class="small text-muted">${item.topic || item.desc || ''}</div>
            </div>
          `).join('');
        } else {
          agendaEl.textContent = agenda || 'Chương trình chi tiết sẽ được gửi tới đại biểu tham dự.';
        }
      }

      if (speakersEl) {
        const speakers = md.speakers || [];
        if (speakers.length) {
          speakersEl.innerHTML = speakers.map(spk => `
            <li class="mb-2 d-flex align-items-center gap-2">
              <i class="bi bi-person-check-fill text-primary"></i>
              <span>${spk}</span>
            </li>
          `).join('');
        } else {
          speakersEl.innerHTML = '<li class="text-muted small">Đang cập nhật danh sách diễn giả.</li>';
        }
      }

      if (venueEl) {
        venueEl.textContent = md.venue || 'Đại học Bách Khoa Hà Nội';
      }

      if (regEl) {
        regEl.textContent = md.registration || (evt.status === 'completed' ? 'Đã kết thúc' : 'Mở đăng ký trực tuyến');
      }

      const modalEl = document.getElementById('modal-event-detail');
      if (modalEl && typeof bootstrap !== 'undefined') {
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalInstance.show();
      }
    } catch (e) {
      console.error('Error opening event detail:', e);
    }
  };

  // ================= 5. TRANG LIÊN HỆ =================
  async function initContactPage() {
    const contact = await fetchHLSData('lien-he');
    if (!contact) return;

    const emailEl = document.getElementById('contact-email-val');
    const fanpageEl = document.getElementById('contact-fanpage-val');
    const addressEl = document.getElementById('contact-address-val');
    const mapIframe = document.getElementById('contact-map-iframe');

    if (emailEl && contact.email) {
      emailEl.href = `mailto:${contact.email}`;
      emailEl.textContent = contact.email;
    }
    if (fanpageEl && contact.fanpage) {
      fanpageEl.href = contact.fanpage;
      fanpageEl.textContent = contact.fanpage_text || 'Facebook - HLS';
    }
    if (addressEl && contact.address) {
      addressEl.textContent = contact.address;
    }
    if (mapIframe && contact.map_url) {
      mapIframe.src = contact.map_url;
    }
  }

  // ================= 6. TRANG CHỦ (INDEX.HTML) =================
  async function initHomePage() {
    // 6.1. Hero & About
    const aboutData = await fetchHLSData('gioi-thieu');
    if (aboutData) {
      // Hero
      if (aboutData.hero) {
        const badgeBtn = document.getElementById('hero-badge-btn');
        const badgeText = document.getElementById('hero-badge-text');
        const titleHighlight = document.getElementById('hero-title-highlight');
        const subtitle = document.getElementById('hero-subtitle');
        const imagesScroll = document.getElementById('hero-images-scroll');

        if (badgeBtn && aboutData.hero.badge_link) {
          badgeBtn.onclick = () => window.location.href = aboutData.hero.badge_link;
        }
        if (badgeText && aboutData.hero.badge_text) {
          badgeText.textContent = aboutData.hero.badge_text;
        }
        if (titleHighlight && aboutData.hero.title_highlight) {
          titleHighlight.textContent = aboutData.hero.title_highlight;
        }
        if (subtitle && aboutData.hero.subtitle) {
          subtitle.textContent = aboutData.hero.subtitle;
        }
        if (imagesScroll && aboutData.hero.images && aboutData.hero.images.length) {
          imagesScroll.innerHTML = aboutData.hero.images.map(img => `
            <img
              alt="Thành viên HLS"
              class="hero-img-item img-fluid w-100 h-100 object-fit-cover rounded-3"
              height="176"
              src="${img}"
              width="144"
              loading="lazy"
              decoding="async"
            />
          `).join('');
        }
      }

      // About text
      if (aboutData.about) {
        const aboutTitle = document.getElementById('home-about-title');
        const aboutP1 = document.getElementById('home-about-p1');
        const aboutP2 = document.getElementById('home-about-p2');
        if (aboutTitle && aboutData.about.title) aboutTitle.textContent = aboutData.about.title;
        if (aboutP1 && aboutData.about.paragraphs && aboutData.about.paragraphs[0]) aboutP1.textContent = aboutData.about.paragraphs[0];
        if (aboutP2 && aboutData.about.paragraphs && aboutData.about.paragraphs[1]) aboutP2.textContent = aboutData.about.paragraphs[1];
      }

      // Departments
      if (aboutData.departments && aboutData.departments.length) {
        const tabBtns = document.getElementById('home-dept-tabs');
        const tabPanels = document.getElementById('home-dept-panels');

        if (tabBtns && tabPanels) {
          tabBtns.innerHTML = aboutData.departments.map((d, i) => `
            <button class="org-tab-btn ${i === 0 ? 'active' : ''}" data-target="${d.id}">${d.name}</button>
          `).join('');

          tabPanels.innerHTML = aboutData.departments.map((d, i) => `
            <div class="org-panel ${i === 0 ? 'active fade-in' : ''}" id="${d.id}">
              <img
                src="${d.image}"
                class="img-fluid rounded-3 mb-4"
                alt="${d.name}"
                style="height: 350px; width: 100%; object-fit: contain"
                loading="lazy"
                decoding="async"
              />
              <h5 class="fw-bold mb-2">${d.name}</h5>
              <p class="mb-0 text-muted-2">${d.description || ''}</p>
              ${d.tasks && d.tasks.length ? `
                <ul class="mt-2 text-muted-2">
                  ${d.tasks.map(t => `<li>${t}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('');

          // Kích hoạt lại tabs
          if (typeof initOrgTabs === 'function') {
            initOrgTabs();
          }
        }
      }

      // 6.1b. Call To Action (CTA)
      if (aboutData.cta) {
        const ctaTitle = document.getElementById('cta-title') || document.getElementById('home-cta-title');
        const ctaDesc = document.getElementById('cta-desc') || document.getElementById('cta-description') || document.getElementById('home-cta-desc');
        const ctaImg = document.getElementById('cta-image') || document.getElementById('home-cta-img');
        const ctaBtn = document.getElementById('cta-btn') || document.getElementById('home-cta-btn');

        if (ctaTitle && aboutData.cta.title) {
          ctaTitle.textContent = aboutData.cta.title;
        }
        if (ctaDesc && aboutData.cta.description) {
          ctaDesc.textContent = aboutData.cta.description;
        }
        if (ctaImg && aboutData.cta.image) {
          ctaImg.src = aboutData.cta.image;
        }
        if (ctaBtn) {
          if (aboutData.cta.button_enabled) {
            ctaBtn.classList.remove('d-none');
            ctaBtn.style.display = '';
            const btnLink = aboutData.cta.button_link || aboutData.cta.button_url || '#';
            ctaBtn.href = btnLink;
            if (aboutData.cta.button_text) {
              ctaBtn.innerHTML = `${aboutData.cta.button_text} <i class="bi bi-arrow-right ms-2"></i>`;
            }
            if (btnLink.startsWith('http://') || btnLink.startsWith('https://')) {
              ctaBtn.target = '_blank';
              ctaBtn.rel = 'noopener noreferrer';
            } else {
              ctaBtn.removeAttribute('target');
              ctaBtn.removeAttribute('rel');
            }
          } else {
            ctaBtn.classList.add('d-none');
            ctaBtn.style.display = 'none';
          }
        }
      }
    }

    // 6.2. Hoạt động Teaser (3 mục)
    const activities = await fetchHLSData('hoat-dong');
    const actContainer = document.getElementById('home-activities-teaser');
    if (actContainer && activities && Array.isArray(activities)) {
      const featuredActs = activities.filter(a => a.featured).slice(0, 3);
      actContainer.innerHTML = featuredActs.map(a => {
        const img = (a.images && a.images.length) ? a.images[0] : 'image/logo/thumbnailog.webp';
        return `
          <div class="col-md-6 col-lg-4">
            <div class="card h-100 activity-card border-0 shadow-sm">
              <img src="${img}" class="card-img-top" alt="${a.title}" style="height: 220px; object-fit: cover;" loading="lazy" decoding="async">
              <div class="card-body">
                <h5 class="fw-semibold mb-2">${a.title}</h5>
                <p class="text-muted mb-0">${a.description ? (a.description.length > 80 ? a.description.substring(0, 80) + '...' : a.description) : ''}</p>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 6.3. Sự kiện Teaser (1 mục nổi bật)
    const events = await fetchHLSData('su-kien');
    const evtContainer = document.getElementById('home-event-teaser');
    if (evtContainer && events && Array.isArray(events) && events.length) {
      const topEvt = events.find(e => e.featured) || events[0];
      evtContainer.innerHTML = `
        <div class="col-lg-6">
          <div class="event-feature-card">
            <img src="${topEvt.main_image || 'image/logo/thumbnailog.webp'}" alt="${topEvt.title}" class="img-fluid rounded-4 shadow-lg" loading="lazy" decoding="async">
          </div>
        </div>
        <div class="col-lg-6">
          <div class="event-badge mb-3">
            <span class="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill">
              <i class="bi bi-calendar-event me-1"></i> ${topEvt.category || 'Workshop'}
            </span>
          </div>
          <h3 class="fw-bold mb-3">${topEvt.title}</h3>
          <p class="text-muted mb-4">${topEvt.description || ''}</p>
          ${topEvt.stats ? `
            <div class="event-stats mb-4">
              <div class="d-flex gap-4">
                <div>
                  <div class="text-primary fw-bold fs-4">${topEvt.stats.participants || '100+'}</div>
                  <div class="text-muted small">Sinh viên tham gia</div>
                </div>
                <div>
                  <div class="text-primary fw-bold fs-4">${topEvt.stats.experts || '2'}</div>
                  <div class="text-muted small">Chuyên gia</div>
                </div>
              </div>
            </div>
          ` : ''}
          <a href="su-kien.html" class="btn btn-primary px-4">
            Khám phá các sự kiện <i class="bi bi-arrow-right ms-2"></i>
          </a>
        </div>
      `;
    }

    // 6.4. Cuộc thi Teaser (3 cuộc thi)
    const competitions = await fetchHLSData('cuoc-thi');
    const compContainer = document.getElementById('home-competitions-teaser');
    if (compContainer && competitions && Array.isArray(competitions)) {
      const topComps = competitions.slice(0, 3);
      compContainer.innerHTML = topComps.map(c => `
        <div class="col-lg-4">
          <div class="competition-card">
            <div class="competition-image">
              <img src="${c.image || 'image/logo/thumbnailog.webp'}" alt="${c.title}" class="img-fluid" loading="lazy" decoding="async">
              <div class="competition-overlay">
                <span class="badge ${c.status === 'ongoing' ? 'bg-success' : 'bg-secondary'}">
                  ${c.status === 'ongoing' ? 'Đang diễn ra' : (c.status === 'upcoming' ? 'Sắp diễn ra' : 'Đã kết thúc')}
                </span>
              </div>
            </div>
            <div class="competition-content">
              <h5 class="fw-bold mb-2">${c.short_name || c.title}</h5>
              <p class="text-muted mb-3">${c.short_desc || c.description || ''}</p>
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-primary small fw-semibold">
                  <i class="bi bi-trophy-fill me-1"></i> ${c.tag || 'Cuộc thi chính'}
                </span>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

})();
