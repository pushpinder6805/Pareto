import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  const site =
    api.container.lookup?.("service:site") ||
    api.container.lookup?.("site:main") ||
    api.site;

  async function fetchChatChannels() {
    try {
      const response = await fetch("/chat/api/channels.json");
      if (!response.ok) return [];
      const data = await response.json();
      return data.channels || []; // ← fixed: was public_channels
    } catch (e) {
      return [];
    }
  }

  async function buildSections() {
    const cats = site?.categories || [];
    if (!cats.length) return "";

    const chatChannels = await fetchChatChannels();

    const top = cats
      .filter((c) => !c.parent_category_id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    let html = '<div id="dynamic-category-sections">';
    top.forEach((parent) => {
      const subs = cats
        .filter((s) => s.parent_category_id === parent.id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      const chats = (chatChannels || []).filter(
        (ch) =>
          ch.chatable_type === "Category" && ch.chatable_id === parent.id
      );

      const hasSubs = subs.length > 0 || chats.length > 0;

      html += `
        <div class="sidebar-section sidebar-section-wrapper sidebar-section--expanded sidebar-parent-category"
             data-section-name="${parent.slug}">
      `;

      if (hasSubs) {
        html += `
          <div class="sidebar-section-header-wrapper sidebar-row">
            <span class="sidebar-section-header-caret toggle-button"
                  data-target="#sidebar-section-content-${parent.slug}"
                  aria-controls="sidebar-section-content-${parent.slug}"
                  aria-expanded="true"
                  title="Toggle section">
              <svg class="fa d-icon d-icon-angle-down svg-icon svg-string"><use href="#angle-down"></use></svg>
            </span>
            <a href="/c/${parent.slug}/${parent.id}" class="sidebar-section-header-text sidebar-section-header-link">
              ${parent.name}
            </a>
          </div>
        `;
      } else {
        html += `
          <div class="sidebar-section-header-wrapper sidebar-row">
            <a href="/c/${parent.slug}/${parent.id}" class="sidebar-section-header sidebar-section-header-link sidebar-row">
              <span class="sidebar-section-header-caret">
                <svg class="fa d-icon d-icon-link svg-icon svg-string"><use href="#link"></use></svg>
              </span>
              <span class="sidebar-section-header-text">${parent.name}</span>
            </a>
          </div>
        `;
      }

      html += `
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

        chats.forEach((chat) => {
          html += `
            <li class="sidebar-section-link-wrapper sidebar-chat-channel" data-chat-channel-id="${chat.id}">
              <a href="/chat/channel/${chat.id}" class="sidebar-section-link sidebar-row">
                <span class="sidebar-section-link-prefix icon">
                  <svg class="fa d-icon d-icon-comments svg-icon prefix-icon"><use href="#comments"></use></svg>
                </span>
                <span class="sidebar-section-link-content-text">${chat.title || "Chat"}</span>
              </a>
            </li>`;
        });


      html += `</ul></div>`;
    });

    html += "</div>";
    return html;
  }

  async function insertSections() {
    const sidebar = document.querySelector(".sidebar, .sidebar-container");
    if (!sidebar) return;

    const html = await buildSections();
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
      "#dynamic-category-sections .toggle-button"
    );

    toggles.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

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

  const waitUntilReady = async () => {
    const sidebar = document.querySelector(".sidebar, .sidebar-container");
    if (!sidebar || !(site?.categories?.length)) {
      setTimeout(waitUntilReady, 800);
      return;
    }
    await insertSections();
  };

  waitUntilReady();
});

