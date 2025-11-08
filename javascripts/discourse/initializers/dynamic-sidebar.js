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

    // remove any old injected sections first
    sidebar.querySelectorAll(".sidebar-section--custom").forEach((el) => el.remove());

    sidebar.insertAdjacentHTML("beforeend", html);
  }

  // wait for sidebar + categories to load
  setTimeout(injectSidebarHTML, 1000);
});

