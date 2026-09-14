# Project: HLS 2025 Club Website Upgrade

## Architecture
- **Frontend**: Multi-page website (6 pages: `index.html`, `hoat-dong.html`, `su-kien.html`, `cuoc-thi.html`, `thanh-vien.html`, `lien-he.html`) using HTML5, Bootstrap 5.3, Bootstrap Icons, custom CSS in `css/style.css`, dynamic hydration via `js/dynamic-content.js`.
- **Admin Dashboard**: SPA (`admin/index.html`, `admin/js/admin.js`, `admin/css/admin.css`) managing dynamic JSON stores.
- **Backend**:
  - Production: PHP 7.4+ API endpoints (`api/config.php`, `api/auth.php`, `api/data.php`, `api/upload.php`) running on Apache cPanel Shared Hosting with `.htaccess` protection.
  - Local Development: Node.js HTTP server (`dev-server.js`) on port 3000 mocking PHP endpoints and handling JSON persistence.
- **Data Persistence**: Flat JSON files in `data/` (`gioi-thieu.json`, `hoat-dong.json`, `su-kien.json`, `cuoc-thi.json`, `thanh-vien.json`, `lien-he.json`, `admin.json`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Bcrypt Password Hashing | Replace plaintext password in `data/admin.json` with bcrypt hash and ensure safe upgrade | M1 | R4 |
| F2 | Dev-Server Security Hardening | Eliminate case-sensitivity leak (`/Data/admin.json`) and API mock leak (`?type=admin`) in `dev-server.js` | M1 | R4 |
| F3 | Backend Session & Inactivity Timeout | Add 2-hour inactivity timeout to PHP admin session in `api/config.php` and `api/auth.php` | M1 | R4 |
| F4 | Root .htaccess Security | Create root `.htaccess` with `Options -Indexes`, sensitive file protection (`.cpanel.yml`, `dev-server.js`), HTTPS redirect | M1 | R4 |
| F5 | cPanel Deployment Sync | Update `.cpanel.yml` to deploy root `.htaccess`, `robots.txt`, `sitemap.xml`, and chmod permissions | M1 | R4 |
| F6 | Tailwind CDN Removal | Remove `<script src="https://cdn.tailwindcss.com">` and config script from `index.html` | M2 | R2 |
| F7 | CSS Utility Conversion | Convert all `tw-*` classes in `index.html` and `dynamic-content.js` to pure CSS in `css/style.css` and Bootstrap 5 | M2 | R2 |
| F8 | FOUC Elimination | Move `bootstrap-icons.min.css` to `<head>` on all 6 pages; fix `activities` featured filter in `dynamic-content.js` | M2 | R2 |
| F9 | Synchronized 6-Page Footer | Add semantic 4-column dark responsive Footer with HLS logo, description, quick links, contact, social, copyright to all 6 HTML pages & `css/style.css` | M3 | R1 |
| F10 | Unified Navbar & CTA | Standardize Navbar across all 6 pages (add CTA to index, active states, mobile auto-close catch CTA) | M3 | R1 |
| F11 | Competition & Event Detail Modals | Implement rich detail modals for competitions (SCRACE, VNYLT, Nhìn lại kinh tế) and events (ERP, Shopee/SPX) with timeline, speakers, regulations, prizes | M3 | R1 |
| F12 | Partner & Enterprise Logo Section | Add responsive enterprise partners section (SPX, Shopee, Logistics partners) on `index.html` with grayscale hover effect | M3 | R1 |
| F13 | Dynamic CTA Data Schema | Add `"cta"` structure to `data/gioi-thieu.json` (`title`, `description`, `image`, `button_enabled`, `button_text`, `button_link`) | M4 | R3 |
| F14 | Admin CTA Management UI | Build visual CTA management UI in `admin/index.html` and logic in `admin/js/admin.js` (live toggle, text, link, image) | M4 | R3 |
| F15 | Frontend Dynamic CTA Hydration | Render CTA button (`.btn-cta-large`) in `index.html` and dynamically hydrate title, description, image, and toggle visibility in `js/dynamic-content.js` | M4 | R3 |
| F16 | Search Engine Robots.txt | Create compliant `robots.txt` at project root with sitemap reference | M5 | R5 |
| F17 | XML Sitemap | Create compliant `sitemap.xml` at project root indexing all 6 pages with priorities and changefreq | M5 | R5 |
| F18 | Canonical & Social Metadata | Add `<link rel="canonical">`, absolute OpenGraph tags, and Twitter Cards to all 6 HTML pages | M5 | R5 |
| F19 | Schema.org Structured Data | Inject JSON-LD Schema.org (`EducationalOrganization` on index.html, `Event` on su-kien.html & cuoc-thi.html) | M5 | R5 |
| F20 | E2E Regression Verification | 100% pass of E2E testing suite (Tiers 1-4) & adversarial test hardening (Tier 5) | M6 | Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Security & Backend Architecture | F1, F2, F3, F4, F5 | none | DONE (89/89 tests passed, verified by worker_m1) |
| M2 | CSS Optimization & Tailwind Removal | F6, F7, F8 | none | DONE (15/15 tests passed, verified by worker_m2) |
| M3 | UI/UX Standardization | F9, F10, F11, F12 | M2 | DONE (33/33 tests passed, verified by worker_m3) |
| M4 | Dynamic CTA Admin System | F13, F14, F15 | M1, M3 | DONE (29/29 tests passed, verified by worker_m4) |
| M5 | SEO & Metadata Standardization | F16, F17, F18, F19 | M3 | IN_PROGRESS (worker_m5) |
| M6 | Final Integration, E2E Pass & Adversarial Hardening | F20 (Tiers 1-5 pass) | M1, M2, M3, M4, M5, E2E Suite | PLANNED |

## Interface Contracts
### CTA Data Contract (`data/gioi-thieu.json` ↔ `admin.js` ↔ `dynamic-content.js`)
```json
{
  "cta": {
    "title": "Sẵn sàng gia nhập cộng đồng HLS?",
    "description": "Đừng bỏ lỡ cơ hội phát triển bản thân và kết nối với những người có cùng đam mê. Hãy trở thành một phần của gia đình HLS ngay hôm nay!",
    "image": "image/background/backgroundgen5.webp",
    "button_enabled": true,
    "button_text": "Đăng ký tuyển quân Gen 6",
    "button_link": "https://forms.gle/hls2025"
  }
}
```

### Competition & Event Modal Contract (`data/cuoc-thi.json`, `data/su-kien.json` ↔ `dynamic-content.js`)
```json
{
  "modal_data": {
    "regulations": "Đối tượng tham gia: Sinh viên toàn quốc...",
    "timeline": [
      {"phase": "Vòng 1", "date": "15/03 - 25/03", "desc": "Đơn đăng ký & sơ loại"},
      {"phase": "Vòng Chung kết", "date": "15/04", "desc": "Bảo vệ đề án trước hội đồng"}
    ],
    "speakers": ["ThS. Nguyễn Văn A - Trưởng phòng Logistics SPX"],
    "prizes": "Tổng giá trị giải thưởng lên đến 50.000.000 VNĐ"
  }
}
```

## Code Layout & Ownership
- **M1 (Backend & Security)**: `data/admin.json`, `dev-server.js`, `api/config.php`, `api/auth.php`, `api/data.php`, `.htaccess`, `.cpanel.yml`.
- **M2 (CSS & Tailwind)**: `index.html` (head & hero), `css/style.css` (hero & base), `js/dynamic-content.js` (hero item template & featured filter).
- **M3 (UI/UX)**: all 6 `*.html` (navbar, footer, modals, partners section), `css/style.css` (footer, modal, partner styling), `js/script.js` (nav close), `data/cuoc-thi.json`, `data/su-kien.json`, `image/partners/`.
- **M4 (CTA System)**: `admin/index.html`, `admin/js/admin.js`, `data/gioi-thieu.json`, `index.html` (cta section), `js/dynamic-content.js` (cta hydration).
- **M5 (SEO)**: `robots.txt`, `sitemap.xml`, all 6 `*.html` (`<head>` tags).
- **E2E Testing Track**: `tests/` directory (opaque-box runners and test cases).
