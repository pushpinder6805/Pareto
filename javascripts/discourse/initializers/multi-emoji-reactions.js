import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.1.0", (api) => {
  const FIELD = "multi_emoji_reactions";

  // expose the post custom field safely
  api.addTrackedPostProperties([FIELD]);

  // helper: build reaction bar element for a given post object
  function buildReactionBar(post) {
    const reactionsRaw = post[FIELD];
    let reactions = {};
    if (reactionsRaw) {
      try {
        reactions = JSON.parse(reactionsRaw);
      } catch (e) {
        reactions = {};
      }
    }

    const bar = document.createElement("div");
    bar.className = "multi-reaction-bar";
    bar.dataset.postId = `${post.id}`;

    // existing reactions
    Object.keys(reactions).forEach((emoji) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "reaction-item";
      item.dataset.emoji = emoji;
      item.innerText = `${emoji} ${reactions[emoji].length}`;
      bar.appendChild(item);
    });

    // add button
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "add-reaction-btn";
    addBtn.dataset.postId = `${post.id}`;
    addBtn.innerText = "😀";
    bar.appendChild(addBtn);

    return bar;
  }

  // insert element after cooked safely
  function insertAfter(referenceNode, newNode) {
    if (!referenceNode) return false;
    const parent = referenceNode.parentNode;
    if (parent) {
      parent.insertBefore(newNode, referenceNode.nextSibling);
      return true;
    }
    // fallback: try append to referenceNode itself (rare)
    try {
      referenceNode.appendChild(newNode);
      return true;
    } catch (e) {
      return false;
    }
  }

  // decorate cooked HTML (Glimmer-safe)
  api.decorateCookedElement((cooked, helper) => {
    if (!cooked) return;
    const model = helper.getModel && helper.getModel();
    const post = model && (model.post || model);
    if (!post || !post.id) return;

    // remove any existing bar for this cooked to avoid duplicates
    const existing = cooked.parentNode
      ? cooked.parentNode.querySelector(`.multi-reaction-bar[data-post-id="${post.id}"]`)
      : cooked.querySelector(`.multi-reaction-bar[data-post-id="${post.id}"]`);
    if (existing) {
      existing.remove();
    }

    const bar = buildReactionBar(post);

    // try to insert after the cooked element; if that fails, attach to cooked
    if (!insertAfter(cooked, bar)) {
      // final fallback — try append
      try {
        cooked.appendChild(bar);
      } catch (e) {
        // give up silently to avoid console spam
        return;
      }
    }
  }, { id: "multi-emoji-reactions" });

  // single document-level click handler (efficient)
  document.addEventListener("click", async (ev) => {
    const addBtn = ev.target.closest(".add-reaction-btn");
    if (addBtn) {
      const postId = addBtn.dataset.postId;
      if (!postId) return;
      const emoji = prompt("Enter emoji to react with:");
      if (!emoji) return;
      await updateReaction(postId, emoji, true);
      return;
    }

    const reactBtn = ev.target.closest(".reaction-item");
    if (reactBtn) {
      const bar = reactBtn.closest(".multi-reaction-bar");
      if (!bar) return;
      const postId = bar.dataset.postId;
      const emoji = reactBtn.dataset.emoji;
      if (!postId || !emoji) return;
      await updateReaction(postId, emoji, false);
    }
  });

  // update the PostCustomField and then patch the DOM bar (no full reload)
  async function updateReaction(postId, emoji, addMode) {
    const store = api.container.lookup("store:main");
    let post;
    try {
      // use findRecord / find to ensure we get the post model
      post = await store.find("post", postId);
    } catch (e) {
      return;
    }
    if (!post) return;

    // parse existing reactions
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

    if (addMode) {
      if (!reactions[emoji].includes(user.id)) {
        reactions[emoji].push(user.id);
      }
    } else {
      reactions[emoji] = reactions[emoji].filter((id) => id !== user.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    }

    // save as PostCustomField
    try {
      await post.save({
        custom_fields: {
          [FIELD]: JSON.stringify(reactions),
        },
      });
    } catch (e) {
      // save failed — bail
      return;
    }

    // Now update the DOM reaction bar for this post (no reload)
    const bar = document.querySelector(`.multi-reaction-bar[data-post-id="${postId}"]`);
    if (!bar) return;

    // rebuild bar from updated post object (post object already updated by save)
    const newBar = buildReactionBar(post);
    bar.replaceWith(newBar);
  }
});

