
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
      const subs = cats
        .filter((s) => s.parent_category_id === parent.id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      const hasSubs = subs.length > 0;

      html += `
        <div class="sidebar-section sidebar-section-wrapper sidebar-section--expanded sidebar-parent-category"
             data-section-name="${parent.slug}">
          <div class="sidebar-section-header-wrapper sidebar-row">`;

      if (hasSubs) {
        html += `
            <button class="btn sidebar-section-header sidebar-section-header-collapsable btn-transparent"
                    data-target="#sidebar-section-content-${parent.slug}"
                    aria-controls="sidebar-section-content-${parent.slug}"
                    aria-expanded="true"
                    title="Toggle section"
                    type="button">
              <span class="sidebar-section-header-caret">
                <svg class="fa d-icon d-icon-angle-down svg-icon svg-string"><use href="#angle-down"></use></svg>
              </span>
              <span class="sidebar-section-header-text">${parent.name}</span>
            </button>`;
      } else {
        html += `
            <a href="/c/${parent.slug}/${parent.id}" class="sidebar-section-header sidebar-section-header-link sidebar-row">
              <span class="sidebar-section-header-caret">
                <svg class="fa d-icon d-icon-link svg-icon svg-string"><use href="#link"></use></svg>
              </span>
              <span class="sidebar-section-header-text">${parent.name}</span>
            </a>`;
      }

      html += `
          </div>
          <ul id="sidebar-section-content-${parent.slug}" class="sidebar-section-content" ${
            hasSubs ? "" : 'style="display:none;"'
          }>
      `;

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


    const old = document.getElementById("dynamic-category-sections");
    if (old) old.remove();

    const container =
      sidebar.querySelector(".sidebar-sections") || sidebar;
    const firstSection = container.querySelector(".sidebar-section");

    if (firstSection) {
      firstSection.insertAdjacentHTML("beforebegin", html);
    } else {
      container.insertAdjacentHTML("afterbegin", html);
    }

    enableCollapsing();
  }

  function enableCollapsing() {
    const toggles = document.querySelectorAll(
      "#dynamic-category-sections .sidebar-section-header-collapsable"
    );

    toggles.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const section = btn.closest(".sidebar-section");
        const target = section.querySelector(".sidebar-section-content");
        const isExpanded = btn.getAttribute("aria-expanded") === "true";

        if (isExpanded) {
          target.style.display = "none";
          btn.setAttribute("aria-expanded", "false");
          section.classList.remove("sidebar-section--expanded");
        } else {
          target.style.display = "";
          btn.setAttribute("aria-expanded", "true");
          section.classList.add("sidebar-section--expanded");
        }
      });
    });
  }


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
