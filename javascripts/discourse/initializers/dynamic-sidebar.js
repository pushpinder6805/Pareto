// /javascripts/discourse/initializers/dynamic-sidebar.js
import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  const site =
    api.container.lookup?.("service:site") ||
    api.container.lookup?.("site:main") ||
    api.site;

  const buildHTML = () => {
    const cats = site?.categories || [];
    if (!cats.length) return "";

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
    return html;
  };

  const insertSections = () => {
    const sidebar = document.querySelector(".sidebar-container, .sidebar");
    if (!sidebar) return;

    const html = buildHTML();
    if (!html) return;

    // clear only our injected blocks
    sidebar.querySelectorAll(".sidebar-section--custom").forEach((el) => el.remove());

    // find where to place (before “Community” or at end)
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
  };

  // observe sidebar mutations (rebuilds)
  const observeSidebar = () => {
    const sidebar = document.querySelector(".sidebar-container, .sidebar");
    if (!sidebar) {
      setTimeout(observeSidebar, 500);
      return;
    }

    const observer = new MutationObserver(() => {
      insertSections();
    });

    observer.observe(sidebar, { childList: true, subtree: false });
    insertSections(); // initial load
  };

  // run after app fully ready
  setTimeout(observeSidebar, 1000);
});

