export default {
  name: "user-card-groups",

  initialize() {
    if (!window.requirejs) return;

    const { withPluginApi } = require("discourse/lib/plugin-api");

    withPluginApi("1.20.0", (api) => {
      api.onUserCardShow((card) => {
        const user = card.user;
        if (!user?.groups?.length) return;

        const existing = card.element.querySelector(".user-card-groups");
        if (existing) return;

        const groups = user.groups
          .filter((g) => !["everyone", "trust_level_0"].includes(g.name))
          .map(
            (g) =>
              `<a href="/g/${g.name}" class="user-card-group">${g.name}</a>`
          )
          .join(", ");

        const div = document.createElement("div");
        div.className = "user-card-groups";
        div.innerHTML = `<strong>Groups:</strong> ${groups}`;

        card.element
          .querySelector(".card-content")
          ?.appendChild(div);
      });
    });
  },
};

