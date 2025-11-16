import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("0.14.0", (api) => {
  const CUSTOM_FIELD = "multi_emoji_reactions";

  // Read existing reactions stored in post custom fields
  function getReactions(post) {
    const data = post.get("custom_fields." + CUSTOM_FIELD);
    return data ? JSON.parse(data) : {};
  }

  // Save reaction back to server
  function saveReactions(post, reactions) {
    const payload = {};
    payload[CUSTOM_FIELD] = JSON.stringify(reactions);

    return post.save({ custom_fields: payload });
  }

  // UI: add a small "Add Reaction" button under every post
  api.decorateWidget("post-bottom-icons:after", (helper) => {
    const post = helper.widget.model;
    return helper.h(
      "button.multi-emoji-react-btn",
      {
        title: "Add Emoji Reaction",
        onclick: () => openEmojiPicker(post),
      },
      "😀"
    );
  });

  // Render reactions under the post content
  api.decorateWidget("post-bottom:after", (helper) => {
    const post = helper.widget.model;
    const reactions = getReactions(post);

    const items = Object.keys(reactions).map((emoji) => {
      const count = reactions[emoji].length;
      return helper.h(
        "span.multi-emoji-reaction",
        {
          onclick: () => toggleUserReaction(post, emoji),
        },
        `${emoji} ${count}`
      );
    });

    return helper.h("div.multi-emoji-reaction-container", items);
  });

  // Basic emoji picker (prompt version)
  function openEmojiPicker(post) {
    const emoji = prompt("Enter emoji to react with:");
    if (!emoji) return;

    addEmojiReaction(post, emoji);
  }

  // Add emoji
  function addEmojiReaction(post, emoji) {
    const reactions = getReactions(post);
    const userId = api.getCurrentUser().id;

    if (!reactions[emoji]) reactions[emoji] = [];

    // Avoid duplicate reaction from same user for same emoji
    if (!reactions[emoji].includes(userId)) {
      reactions[emoji].push(userId);
    }

    saveReactions(post, reactions);
  }

  // Remove emoji if user already reacted
  function toggleUserReaction(post, emoji) {
    const reactions = getReactions(post);
    const userId = api.getCurrentUser().id;

    if (!reactions[emoji]) return;

    if (reactions[emoji].includes(userId)) {
      // remove user reaction
      reactions[emoji] = reactions[emoji].filter((id) => id !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji].push(userId);
    }

    saveReactions(post, reactions);
  }
});

