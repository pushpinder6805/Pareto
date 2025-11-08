import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  const site =
    api.container.lookup?.("service:site") ||
    api.container.lookup?.("site:main") ||
    api.site;

  function buildSections() {
    const cats = site?.categories || [];
    if (!cats.length) return "";

    const top = cats
      .filter((c) => !c.parent_category_id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    let html = '<div id="dynamic-category-sections">';
    top.forEach((parent) => {
      html += `
        <div class="sidebar-section sidebar-section-wrapper sidebar-section--expanded sidebar-parent-category"
             data-section-name="${parent.slug}">
          <div class="sidebar-section-header-wrapper sidebar-row">
            <button class="btn no-text sidebar-section-header sidebar-section-header-collapsable btn-transparent"
                    aria-controls="sidebar-section-content-${parent.slug}"
                    aria-expanded="true"
                    title="Toggle section" type="button">
              <span class="sidebar-section-header-caret">
                <svg class="fa d-icon d-icon-angle-down svg-icon svg-string"><use href="#angle-down"></use></svg>
              </span>
              <span class="sidebar-section-header-text">${parent.name}</span>
            </button>
          </div>

          <ul id="sidebar-section-content-${parent.slug}" class="sidebar-section-content">
      `;

      const subs = cats
        .filter((s) => s.parent_category_id === parent.id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      subs.forEach((sub) => {
        html += `
          <li class="sidebar-section-link-wrapper sidebar-subcategory" data-category-id="${sub.id}">
            <a href="/c/${sub.slug}/${sub.id}" class="sidebar-section-link sidebar-row">
              <span class="sidebar-section-link-prefix icon">
                <svg class="fa d-icon d-icon-angle-right svg-icon prefix-icon"><use href="#angle-right"></use></svg>
              </span>
              <span class="sidebar-section-link-content-text">${sub.name}</span>
            </a>
          </li>`;
      });

      html += `</ul></div>`;
    });

    html += "</div>";
    return html;
  }

  function insertSections() {
    const sidebar = document.querySelector(".sidebar, .sidebar-container");
    if (!sidebar) return;

    const html = buildSections();
    if (!html) return;

    // remove previously injected block
    const old = document.getElementById("dynamic-category-sections");
    if (old) old.remove();

    // find main section container
    const container =
      sidebar.querySelector(".sidebar-sections") || sidebar;

    // insert before the first existing section (order 0)
    const firstSection = container.querySelector(".sidebar-section");
    if (firstSection) {
      firstSection.insertAdjacentHTML("beforebegin", html);
    } else {
      container.insertAdjacentHTML("afterbegin", html);
    }
  }

  // wait until sidebar + categories are ready
  const waitUntilReady = () => {
    const sidebar = document.querySelector(".sidebar, .sidebar-container");
    if (!sidebar || !(site?.categories?.length)) {
      setTimeout(waitUntilReady, 800);
      return;
    }
    insertSections();
  };

  waitUntilReady();
});

