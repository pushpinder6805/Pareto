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
      return data.channels || [];
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

        // Emoji detection (for parent)
        const emojiSrc = parent.emoji
          ? `/images/emoji/twemoji/${parent.emoji}.png?v=14`
          : parent.uploaded_logo?.url
          ? parent.uploaded_logo.url
          : null;

        const emojiHTML = emojiSrc
          ? `<img src="${emojiSrc}" alt="" width="20" height="20" class="emoji" style="margin-right:6px;vertical-align:middle;">`
          : "";

        html += `
          <div class="sidebar-section sidebar-section-wrapper sidebar-parent-category"
               data-section-name="${parent.slug}">
        `;

        if (hasSubs) {
          // Parent header with old caret icon + emoji
          html += `
            <div class="sidebar-section-header-wrapper sidebar-row">
              <span class="sidebar-section-header-caret toggle-button"
                    data-target="#sidebar-section-content-${parent.slug}"
                    aria-controls="sidebar-section-content-${parent.slug}"
                    aria-expanded="false"
                    title="Toggle section">
                <svg class="fa d-icon d-icon-angle-down svg-icon svg-string"><use href="#angle-down"></use></svg>
              </span>
              <a href="/c/${parent.slug}/${parent.id}" class="sidebar-section-header-text sidebar-section-header-link">
                ${emojiHTML}${parent.name}
              </a>
            </div>
          `;
        } else {
          // Parent with no subs — simple link with emoji
          html += `
            <div class="sidebar-section-header-wrapper sidebar-row">
              <a href="/c/${parent.slug}/${parent.id}" class="sidebar-section-header sidebar-section-header-link sidebar-row">
                <span class="sidebar-section-header-caret">
                  <svg class="fa d-icon d-icon-link svg-icon svg-string"><use href="#link"></use></svg>
                </span>
                <span class="sidebar-section-header-text">${emojiHTML}${parent.name}</span>
              </a>
            </div>
          `;
        }

        // Default collapsed content list
        html += `
          <ul id="sidebar-section-content-${parent.slug}" class="sidebar-section-content" style="display:none;">
        `;

        subs.forEach((sub) => {
          // Emoji detection for subcategories
          const subEmojiSrc = sub.emoji
            ? `/images/emoji/twemoji/${sub.emoji}.png?v=14`
            : sub.uploaded_logo?.url
            ? sub.uploaded_logo.url
            : null;

          const subEmojiHTML = subEmojiSrc
            ? `<img src="${subEmojiSrc}" alt="" width="16" height="16" class="emoji" style="margin-right:5px;vertical-align:middle;">`
            : "";

          // Subcategory with arrow-right icon
          html += `
            <li class="sidebar-section-link-wrapper sidebar-subcategory" data-category-id="${sub.id}">
              <a href="/c/${sub.slug}/${sub.id}" class="sidebar-section-link sidebar-row">
                <span class="sidebar-section-link-prefix icon">
                  <svg class="fa d-icon d-icon-arrow-right svg-icon prefix-icon"><use href="#arrow-right"></use></svg>
                </span>
                <span class="sidebar-section-link-content-text">${subEmojiHTML}${sub.name}</span>
              </a>
            </li>`;
        });

        // Chat channels under this parent
        chats.forEach((chat) => {
          const slug = chat.chatable?.slug || parent.slug;
          const chatUrl = `/chat/c/${slug}/${chat.id}`;
          html += `
            <li class="sidebar-section-link-wrapper sidebar-chat-channel" data-chat-channel-id="${chat.id}">
              <a href="${chatUrl}" class="sidebar-section-link sidebar-row">
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
    // Detect mobile mode
    const isMobile = !!site?.mobileView;

    // Desktop primary containers
    let sidebar = document.querySelector(".sidebar, .sidebar-container");

    // For mobile, prefer the explicit class you provided; fall back to drawer selectors
    if (isMobile) {
      sidebar =
        document.querySelector(".sidebar-hamburger-dropdown") ||
        document.querySelector(".drawer-content .mobile-nav") ||
        document.querySelector(".drawer-content");
    }

    if (!sidebar) return;

    const html = await buildSections();
    if (!html) return;

    const old = document.getElementById("dynamic-category-sections");
    if (old) old.remove();

    // Prefer inserting into a .sidebar-sections wrapper if present, otherwise append to container
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
      // remove previous listeners by cloning node to ensure mobile toggle rebinds cleanly
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const section = newBtn.closest(".sidebar-section");
        const target = section.querySelector(".sidebar-section-content");
        const isExpanded = newBtn.getAttribute("aria-expanded") === "true";

        if (isExpanded) {
          target.style.display = "none";
          newBtn.setAttribute("aria-expanded", "false");
          section.classList.remove("sidebar-section--expanded");
        } else {
          target.style.display = "";
          newBtn.setAttribute("aria-expanded", "true");
          section.classList.add("sidebar-section--expanded");
        }
      }, { passive: false });
    });
  }

  const waitUntilReady = async () => {
    const sidebar =
      document.querySelector(".sidebar, .sidebar-container") ||
      document.querySelector(".sidebar-hamburger-dropdown") ||
      document.querySelector(".drawer-content .mobile-nav") ||
      document.querySelector(".drawer-content");

    if (!sidebar || !(site?.categories?.length)) {
      setTimeout(waitUntilReady, 800);
      return;
    }
    await insertSections();
  };

  waitUntilReady();
});

