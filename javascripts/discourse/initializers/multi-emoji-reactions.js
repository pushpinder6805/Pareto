import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.0.0", (api) => {
  const FIELD = "multi_emoji_reactions";

  // Track custom field in the post stream
  api.addTrackedPostProperties([FIELD]);

  //
  // Add button to the post controls bar
  //
  api.attachWidgetActionButton("post", "multi-emoji", (model) => {
    return {
      icon: "far-smile",
      title: "Add emoji reaction",
      action: "addEmojiReaction",
    };
  });

  //
  // Handle click from the new button
  //
  api.attachWidgetAction("post", "addEmojiReaction", async function () {
    const post = this.model;
    const emoji = prompt("Enter emoji:");
    if (!emoji) return;

    const store = api.container.lookup("store:main");
    const fullPost = await store.find("post", post.id);

    let reactions = {};
    if (fullPost[FIELD]) {
      try {
        reactions = JSON.parse(fullPost[FIELD]);
      } catch (e) {
        reactions = {};
      }
    }

    const user = api.getCurrentUser();
    reactions[emoji] ||= [];

    if (!reactions[emoji].includes(user.id)) {
      reactions[emoji].push(user.id);
    }

    await fullPost.save({
      custom_fields: {
        [FIELD]: JSON.stringify(reactions),
      },
    });

    // Update the DOM counter inside the built-in reactions plugin
    // If you want: I can integrate with their UI fully
    alert("Emoji reaction added!");
  });
});

