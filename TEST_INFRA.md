# E2E Test Infra: HLS 2025 Club Website Upgrade

## Test Philosophy
- Opaque-box, requirement-driven. Derived from `ORIGINAL_REQUEST.md` and user-facing acceptance criteria.
- Complete coverage: Every feature in `PROJECT.md § Feature Inventory` must be tested.
- Zero reliance on internal implementation details; tests interact via HTTP endpoints (port 3000), static file verification, and DOM/HTML structure.
- Runner invocation: `node tests/run-e2e-tests.js` returning exit code 0 if all tests pass.

## Feature Inventory Mapping
| # | Feature | Scope | Tier 1 | Tier 2 | Tier 3 |
|---|---------|-------|:------:|:------:|:------:|
| F1 | Bcrypt Password Hashing | `data/admin.json` | 5 | 5 | ✓ |
| F2 | Dev-Server Security Hardening | `/Data/admin.json`, `?type=admin` | 5 | 5 | ✓ |
| F3 | Backend Session Timeout | `api/config.php`, `api/auth.php` | 5 | 5 | ✓ |
| F4 | Root .htaccess Protection | `.htaccess` rules | 5 | 5 | ✓ |
| F5 | cPanel Deployment Sync | `.cpanel.yml` | 5 | 5 | ✓ |
| F6 | Tailwind CDN Removal | `index.html` script absence | 5 | 5 | ✓ |
| F7 | CSS Utility Clean | Zero `tw-*` classes | 5 | 5 | ✓ |
| F8 | FOUC Elimination | `<head>` stylesheets, featured filter | 5 | 5 | ✓ |
| F9 | Synchronized Footer | 6 HTML pages footer content | 5 | 5 | ✓ |
| F10 | Unified Navbar & CTA | 6 HTML pages nav, CTA button | 5 | 5 | ✓ |
| F11 | Competition & Event Modals | Rich modal markup & triggers | 5 | 5 | ✓ |
| F12 | Partner Logo Section | Partners section & assets | 5 | 5 | ✓ |
| F13 | CTA Data Schema | `data/gioi-thieu.json` CTA keys | 5 | 5 | ✓ |
| F14 | Admin CTA Management | Admin panel inputs & live state | 5 | 5 | ✓ |
| F15 | Frontend Dynamic CTA | Homepage dynamic CTA hydration | 5 | 5 | ✓ |
| F16 | Search Engine Robots.txt | `robots.txt` format & content | 5 | 5 | ✓ |
| F17 | XML Sitemap | `sitemap.xml` 6 URLs & schema | 5 | 5 | ✓ |
| F18 | Canonical & Social Metadata | Canonical, OG, Twitter Cards | 5 | 5 | ✓ |
| F19 | Schema.org Structured Data | JSON-LD schema syntax & types | 5 | 5 | ✓ |

## Test Architecture
- Test directory: `tests/`
- Test Runner: `node tests/run-e2e-tests.js`
- Test Suites:
  - `tests/tier1-feature-coverage.test.js`: Comprehensive feature unit/endpoint tests.
  - `tests/tier2-boundary-corner.test.js`: Boundary, case-sensitivity, bypass attempts, empty/large inputs.
  - `tests/tier3-cross-feature.test.js`: Interaction tests (e.g. Admin CTA update -> Homepage refresh -> SEO meta tags).
  - `tests/tier4-application-scenarios.test.js`: Real-world user flows (new user onboarding, event browsing, competition modal drill-down, admin configuration).

## Coverage Thresholds
- Tier 1: >= 95 test cases (>=5 per feature across 19 features)
- Tier 2: >= 95 test cases (boundary & error-handling)
- Tier 3: >= 20 pairwise tests
- Tier 4: >= 5 end-to-end user workflows
- Total: >= 215 comprehensive test assertions
