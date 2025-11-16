import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.0.0", (api) => {
  const FIELD = "multi_emoji_reactions";

  // New API (v3.5+) – expose post custom field
  api.addTrackedPostProperties([FIELD]);

  //
  // 1. Inject UI directly into cooked HTML
  //
  api.decorateCookedElement(
    (cooked, helper) => {
      const post = helper.getModel();
      if (!post) return;

      let reactions = {};
      if (post[FIELD]) {
        try {
          reactions = JSON.parse(post[FIELD]);
        } catch {
          reactions = {};
        }
      }

      // Create the reaction bar
      const bar = document.createElement("div");
      bar.className = "multi-reaction-bar";
      bar.dataset.postId = post.id;

      // Existing reactions
      Object.keys(reactions).forEach((emoji) => {
        const count = reactions[emoji].length;
        const item = document.createElement("span");
        item.className = "reaction-item";
        item.dataset.emoji = emoji;
        item.innerText = `${emoji} ${count}`;
        bar.appendChild(item);
      });

      // Add reaction button
      const addBtn = document.createElement("button");
      addBtn.className = "add-reaction-btn";
      addBtn.innerText = "😀";
      addBtn.dataset.postId = post.id;
      bar.appendChild(addBtn);

      // Insert under cooked post
      cooked.parentNode.appendChild(bar);
    },
    { id: "multi-emoji-reactions" }
  );

  //
  // 2. Handle Add/Remove reactions
  //
  document.addEventListener("click", async (event) => {
    if (event.target.classList.contains("add-reaction-btn")) {
      const postId = event.target.dataset.postId;
      const emoji = prompt("Enter emoji:");
      if (emoji) await updateReaction(postId, emoji, true);
      return;
    }

    if (event.target.classList.contains("reaction-item")) {
      const bar = event.target.closest(".multi-reaction-bar");
      const postId = bar.dataset.postId;
      const emoji = event.target.dataset.emoji;
      await updateReaction(postId, emoji, false);
    }
  });

  //
  // 3. Update PostCustomField server-side
  //
  async function updateReaction(postId, emoji, addMode) {
    const store = api.container.lookup("store:main");
    const post = await store.find("post", postId);

    let reactions = {};
    if (post[FIELD]) {
      try {
        reactions = JSON.parse(post[FIELD]);
      } catch {
        reactions = {};
      }
    }

    const user = api.getCurrentUser();
    if (!user) return;

    reactions[emoji] ||= [];

    if (addMode) {
      if (!reactions[emoji].includes(user.id)) reactions[emoji].push(user.id);
    } else {
      reactions[emoji] = reactions[emoji].filter((id) => id !== user.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    }

    await post.save({
      custom_fields: {
        [FIELD]: JSON.stringify(reactions),
      },
    });

    // force re-render
    location.reload();
  }
});

