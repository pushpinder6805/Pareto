import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  const site =
    api.container.lookup?.("service:site") ||
    api.container.lookup?.("site:main") ||
    api.site;

  function injectSidebarHTML() {
    const sidebar = document.querySelector(".sidebar-container, .sidebar");
    if (!sidebar) {
      setTimeout(injectSidebarHTML, 500);
      return;
    }

    const cats = site?.categories || [];
    if (!cats.length) {
      setTimeout(injectSidebarHTML, 500);
      return;
    }

    // Build dynamic sections
    const top = cats
      .filter((c) => !c.parent_category_id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    let html = "";

    top.forEach((parent) => {
      html += `
        <div class="sidebar-section sidebar-section--custom">
          <div class="sidebar-section-header">
            <a href="/c/${parent.slug}/${parent.id}" class="sidebar-section-title">
              ${parent.name}
            </a>
          </div>
          <ul class="sidebar-section-content">
      `;

      const subs = cats
        .filter((s) => s.parent_category_id === parent.id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      subs.forEach((s) => {
        html += `
          <li class="sidebar-section-link">
            <a href="/c/${s.slug}/${s.id}">↳ ${s.name}</a>
          </li>
        `;
      });

      html += `</ul></div>`;
    });

    // Remove old injected sections
    sidebar.querySelectorAll(".sidebar-section--custom").forEach((el) => el.remove());

    // Find reference points
    const allSections = sidebar.querySelectorAll(".sidebar-section");
    let insertBefore = null;

    allSections.forEach((sec) => {
      const title = sec.querySelector(".sidebar-section-header-text, .sidebar-section-title");
      if (title) {
        const text = title.textContent.trim().toLowerCase();
        if (text.includes("community")) insertBefore = sec;
      }
    });

    // Insert at correct position
    if (insertBefore) {
      insertBefore.insertAdjacentHTML("beforebegin", html);
    } else {
      sidebar.insertAdjacentHTML("beforeend", html);
    }
  }

  // Run after load
  setTimeout(injectSidebarHTML, 1000);
});

