import { apiInitializer } from "discourse/lib/api";

// Works with Discourse v3.5+ (Glimmer post stream)

export default apiInitializer("1.0.0", (api) => {
  const FIELD = "multi_emoji_reactions";

  // Make custom field visible to the client
  api.includePostAttributes([FIELD]);

  //
  // 1. RENDER reaction bar under every cooked post
  //
  api.renderInOutlet("post-after-cooked", (model) => {
    const post = model.post;

    let reactions = {};
    if (post[FIELD]) {
      try {
        reactions = JSON.parse(post[FIELD]);
      } catch (e) {
        reactions = {};
      }
    }

    let html = `<div class="multi-reaction-bar" data-post-id="${post.id}">`;

    for (const emoji in reactions) {
      const count = reactions[emoji].length;
      html += `
        <span class="reaction-item" data-emoji="${emoji}">
          ${emoji} ${count}
        </span>`;
    }

    html += `
      <button class="add-reaction-btn" data-post-id="${post.id}">
        😀
      </button>
    </div>`;

    return html;
  });

  //
  // 2. GLOBAL CLICK HANDLER FOR REACTIONS
  //
  api.onPageChange(() => {
    document.addEventListener("click", async (e) => {
      // Add reaction button
      if (e.target.classList.contains("add-reaction-btn")) {
        const postId = e.target.dataset.postId;
        const emoji = prompt("Enter emoji:");
        if (emoji) handleReaction(postId, emoji, true);
        return;
      }

      // Existing reaction item clicked
      const item = e.target.closest(".reaction-item");
      if (item) {
        const postId = item.parentElement.dataset.postId;
        const emoji = item.dataset.emoji;
        handleReaction(postId, emoji, false);
      }
    });
  });

  //
  // 3. SAVE / UPDATE REACTIONS
  //
  async function handleReaction(postId, emoji, addMode) {
    const store = api.container.lookup("store:main");
    const post = await store.find("post", postId);

    let reactions = {};
    if (post[FIELD]) {
      try {
        reactions = JSON.parse(post[FIELD]);
      } catch (e) {
        reactions = {};
      }
    }

    const user = api.getCurrentUser();
    if (!user) return;

    reactions[emoji] ||= [];

    // Add or remove reaction
    if (addMode) {
      if (!reactions[emoji].includes(user.id)) {
        reactions[emoji].push(user.id);
      }
    } else {
      reactions[emoji] = reactions[emoji].filter((id) => id !== user.id);

      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    // Save to PostCustomField
    await post.save({
      custom_fields: {
        [FIELD]: JSON.stringify(reactions),
      },
    });

    // Re-render
    location.reload();
  }
});

