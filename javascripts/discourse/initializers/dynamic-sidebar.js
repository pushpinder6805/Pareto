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

  function injectWhenSidebarReady() {
    const sidebar = document.querySelector(".sidebar, .sidebar-container");
    const cats = site?.categories || [];
    if (!sidebar || !cats.length) {
      setTimeout(injectWhenSidebarReady, 800);
      return;
    }

    // wait for built-in sections like "Community" to appear
    const community = Array.from(
      sidebar.querySelectorAll(".sidebar-section-header-text, .sidebar-section-title")
    ).find((el) => el.textContent.trim().toLowerCase().includes("community"));

    if (!community) {
      setTimeout(injectWhenSidebarReady, 800);
      return;
    }

    // remove previous injected block only
    const old = document.getElementById("dynamic-category-sections");
    if (old) old.remove();

    // build HTML and insert before "Community" section
    const html = buildCategoryHTML();
    const communitySection = community.closest(".sidebar-section");
    if (communitySection && html) {
      communitySection.insertAdjacentHTML("beforebegin", html);
    }
  }

  // re-check repeatedly until the theme finishes rendering its sidebar
  const observerInterval = setInterval(() => {
    injectWhenSidebarReady();
    // stop after successful insertion
    if (document.getElementById("dynamic-category-sections")) {
      clearInterval(observerInterval);
    }
  }, 1000);
});

