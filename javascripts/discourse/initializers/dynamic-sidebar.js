// /javascripts/discourse/initializers/dynamic-sidebar.js
import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  const site =
    api.container.lookup?.("service:site") ||
    api.container.lookup?.("site:main") ||
    api.site;

  function buildCategoryHTML() {
    const cats = site?.categories || [];
    if (!cats.length) return "";

    const top = cats
      .filter((c) => !c.parent_category_id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    let html = '<div id="dynamic-category-sections">';
    top.forEach((p) => {
      html += `
        <div class="sidebar-section sidebar-section--custom">
          <div class="sidebar-section-header">
            <a href="/c/${p.slug}/${p.id}" class="sidebar-section-title">${p.name}</a>
          </div>
          <ul class="sidebar-section-content">
      `;
      const subs = cats
        .filter((s) => s.parent_category_id === p.id)
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
    html += "</div>";
    return html;
  }

  function tryInsert() {
    const sidebar =
      document.querySelector(".sidebar-container") ||
      document.querySelector(".sidebar");
    const cats = site?.categories || [];
    if (!sidebar || !cats.length) {
      // try again until both are ready
      setTimeout(tryInsert, 700);
      return;
    }

    // remove any old block first
    const old = document.getElementById("dynamic-category-sections");
    if (old) old.remove();

    const html = buildCategoryHTML();
    if (!html) return;

    const sections = Array.from(sidebar.querySelectorAll(".sidebar-section"));
    const community = sections.find((sec) => {
      const title = sec.querySelector(".sidebar-section-header-text, .sidebar-section-title");
      return title && title.textContent.trim().toLowerCase().includes("community");
    });

    if (community) {
      community.insertAdjacentHTML("beforebegin", html);
    } else {
      sidebar.insertAdjacentHTML("beforeend", html);
    }
  }

  // run continuously until categories + sidebar ready
  setTimeout(tryInsert, 1000);
});

