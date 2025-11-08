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

  function insertSections() {
    const sidebar = document.querySelector(".sidebar-container, .sidebar");
    if (!sidebar) return;

    // remove old injected block
    const old = document.getElementById("dynamic-category-sections");
    if (old) old.remove();

    const html = buildCategoryHTML();
    if (!html) return;

    const sections = Array.from(sidebar.querySelectorAll(".sidebar-section"));
    const community = sections.find((sec) => {
      const title = sec.querySelector(".sidebar-section-header-text, .sidebar-section-title");
      return title && title.textContent.trim().toLowerCase().includes("community");
    });

    // Insert before “Community” if found, else at end
    if (community) {
      community.insertAdjacentHTML("beforebegin", html);
    } else {
      sidebar.insertAdjacentHTML("beforeend", html);
    }
  }

  // observe only after app ready and DOM settled
  function startObserver() {
    const sidebar = document.querySelector(".sidebar-container, .sidebar");
    if (!sidebar) {
      setTimeout(startObserver, 800);
      return;
    }

    const observer = new MutationObserver(() => {
      // run in next microtask so Ember click delegation remains intact
      queueMicrotask(insertSections);
    });

    observer.observe(sidebar, { childList: true });
    insertSections();
  }

  // delay to let Ember bind events
  window.addEventListener("load", () => {
    setTimeout(startObserver, 1200);
  });
});

