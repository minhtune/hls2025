# E2E Test Suite Specification & Runner Guide

**Project**: HLS 2025 Club Website Upgrade  
**Suite Status**: READY  
**Runner Command**: `node tests/run-e2e-tests.js`  
**Test Harness**: Native Node.js test harness (`tests/test-utils.js`), zero third-party dependencies required.

---

## 1. Test Architecture & Coverage Summary

| Tier | File | Description | Target | Count | Status |
|:---:|---|---|:---:|:---:|:---:|
| **Tier 1** | `tests/tier1-feature-coverage.test.js` | 5+ happy-path tests for all 19 features (F1 - F19) | >= 95 | **95** | READY |
| **Tier 2** | `tests/tier2-boundary-corner.test.js` | Boundary conditions, case-sensitivity attacks, negative cases | >= 95 | **101** | READY |
| **Tier 3** | `tests/tier3-cross-feature.test.js` | Cross-page navbar/footer consistency, CTA persistence, SEO | >= 20 | **27** | READY |
| **Tier 4** | `tests/tier4-application-scenarios.test.js` | End-to-end user workflows and search engine crawler journeys | >= 5 | **5** | READY |
| **TOTAL** | | | **>= 215** | **228** | **READY** |

---

## 2. Runner Invocation & Options

### Default Execution (All Tiers)
```bash
node tests/run-e2e-tests.js
```
- Automatically ensures the local server (`dev-server.js`) is up and listening on port 3000 (starts it automatically if needed and shuts it down on exit).
- Returns **exit code 0** when all tests pass.
- Returns **exit code 1** when any test fails.

### Selective Execution
```bash
# Run only a single tier
node tests/run-e2e-tests.js --tier 1
node tests/run-e2e-tests.js --tier 2
node tests/run-e2e-tests.js --tier 3
node tests/run-e2e-tests.js --tier 4

# Run with verbose output (prints every passing test with duration)
node tests/run-e2e-tests.js --verbose

# Run tests matching a specific pattern
node tests/run-e2e-tests.js --filter cta
node tests/run-e2e-tests.js --filter modal
node tests/run-e2e-tests.js --filter bcrypt
```

---

## 3. Feature Inventory Mapping (Tier 1: F1 - F19)

| Feature | Description | Tests Defined | Key Assertions |
|---|---|:---:|---|
| **F1** | Bcrypt Password Hashing | 5 | `data/admin.json` schema, 60-char `$2[aby]$` bcrypt hash, plaintext absence |
| **F2** | Dev-Server Security Hardening | 5 | `/data/admin.json` 403, `/Data/admin.json` 403, `?type=admin` leak blocked |
| **F3** | Backend Session Timeout | 5 | PHP syntax check (`php -l`), httponly/use_only_cookies, 7200s inactivity check |
| **F4** | Root .htaccess Security | 5 | `Options -Indexes`, `.cpanel.yml` / `dev-server.js` blocked, HTTPS rewrite |
| **F5** | cPanel Deployment Sync | 5 | `.cpanel.yml` YAML syntax, `.htaccess`/`robots.txt`/`sitemap.xml` sync, chmod |
| **F6** | Tailwind CDN Removal | 5 | Complete absence of `cdn.tailwindcss.com` and `tailwind.config` across all pages |
| **F7** | CSS Utility Clean | 5 | Zero `tw-*` classes in HTML & JS, custom Hero styles defined in `css/style.css` |
| **F8** | FOUC Elimination | 5 | `bootstrap-icons.min.css` in `<head>` on all 6 pages, corrected featured filter |
| **F9** | Synchronized 6-Page Footer | 5 | Semantic footer on all 6 pages with logo, quick links, contact, social, copyright |
| **F10** | Unified Navbar & CTA | 5 | Brand logo, active states, CTA button "Trở thành thành viên" on all 6 pages |
| **F11** | Competition & Event Modals | 5 | Reusable modal dialogs, `modal_data` schema (regulations, timeline, speakers, prizes) |
| **F12** | Partner Logo Section | 5 | Partner section above CTA, SPX/Shopee logos, grayscale hover styling |
| **F13** | Dynamic CTA Data Schema | 5 | `data/gioi-thieu.json` contains `cta` (title, description, button_enabled, link, image) |
| **F14** | Admin CTA Management UI | 5 | Admin panel inputs (`#cta-title`, `#cta-button-enabled`, etc.) and persistence |
| **F15** | Frontend CTA Hydration | 5 | Homepage dynamic hydration of CTA text, image, and button toggle visibility |
| **F16** | Search Engine Robots.txt | 5 | `User-agent: *`, Allow `/`, Disallow `/admin/`, `/api/`, `/data/`, Sitemap URL |
| **F17** | XML Sitemap | 5 | Valid XML, all 6 URLs indexed, `<lastmod>`, `<changefreq>`, `<priority>` |
| **F18** | Canonical & Social Metadata | 5 | `<link rel="canonical">`, OpenGraph tags, Twitter Card `summary_large_image` |
| **F19** | Schema.org Structured Data | 5 | JSON-LD `EducationalOrganization` on index.html, `Event` on su-kien/cuoc-thi |

---

## 4. Progressive Milestone Readiness Matrix

The test suite serves as the definitive acceptance gate for each milestone:

| Milestone | Scope | Associated Tests | Passing Status |
|---|---|---|---|
| **M1: Backend & Security** | F1, F2, F3, F4, F5 | T1.1–T1.5, T2.1–T2.5, T3.1–T3.5, T4.1–T4.5, T5.1–T5.5, B1.1–B1.10, B2.1–B2.10, B3.1–B3.12, B4.1–B4.12, B5.1–B5.8 | Verified during M1 completion |
| **M2: CSS Optimization** | F6, F7, F8 | T6.1–T6.5, T7.1–T7.5, T8.1–T8.5, B6.1–B6.12 | Verified during M2 completion |
| **M3: UI/UX Standardization**| F9, F10, F11, F12 | T9.1–T9.5, T10.1–T10.5, T11.1–T11.5, T12.1–T12.5, B8.1–B8.10, X1.1–X1.6, X2.1–X2.6, Scenario 1, Scenario 2 | Verified during M3 completion |
| **M4: Dynamic CTA System** | F13, F14, F15 | T13.1–T13.5, T14.1–T14.5, T15.1–T15.5, B7.1–B7.12, X3.1–X3.4, Scenario 3, Scenario 4 | Verified during M4 completion |
| **M5: SEO & Metadata** | F16, F17, F18, F19 | T16.1–T16.5, T17.1–T17.5, T18.1–T18.5, T19.1–T19.5, B9.1–B9.15, X4.1–X4.4, X5.1–X5.4, Scenario 5 | Verified during M5 completion |
| **M6: Final Integration** | F20 (All Tiers) | All 228 tests across Tiers 1-4 | 100% Pass Required (Exit code 0) |

---

## 5. Test Environment & Zero Dependencies Guarantee

- Runs natively with Node.js 18+ (verified on Node.js v22.23.0).
- Zero external `npm install` or third-party dependencies required.
- Self-contained HTTP client, HTML extractor, JSON parser, and test runner.
