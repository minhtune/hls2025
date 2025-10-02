// Activate current nav link based on pathname
(function activateCurrentNavLink() {
  try {
    const path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".navbar .nav-link").forEach((link) => {
      const href = (link.getAttribute("href") || "").trim();
      if (href === path) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    });
  } catch (e) {
    // no-op
  }
})();

// Org tabs behavior for index.html
function initOrgTabs() {
  const container = document.querySelector("[data-org-tabs]");
  if (!container) return;
  const buttons = container.querySelectorAll(".org-tab-btn");
  const panels = container.querySelectorAll(".org-panel");

  function showPanel(targetId) {
    panels.forEach((panel) => {
      const isActive = panel.id === targetId;
      panel.classList.toggle("active", isActive);
      if (isActive) {
        panel.classList.remove("fade-in");
        // trigger reflow for restart animation
        void panel.offsetWidth;
        panel.classList.add("fade-in");
      }
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (target) showPanel(target);
    });
  });
}

// Bootstrap 5 navbar: close on click (mobile)
function initMobileNavAutoClose() {
  const nav = document.querySelector(".navbar-collapse");
  if (!nav) return;
  nav.addEventListener("click", (e) => {
    if (e.target.matches("a.nav-link")) {
      const bsCollapse = bootstrap.Collapse.getInstance(nav);
      if (bsCollapse && nav.classList.contains("show")) {
        bsCollapse.hide();
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initOrgTabs();
  initMobileNavAutoClose();
});



