// /javascripts/discourse/initializers/user-card-groups.js
import { withPluginApi } from "discourse/lib/plugin-api";
import { ajax } from "discourse/lib/ajax";

export default {
  name: "user-card-groups",
  initialize() {
    withPluginApi("1.32.0", (api) => {
      api.onAppEvent("user-card:show", async (card) => {
        const username = card?.user?.username;
        if (!username) return;

        try {
          const result = await ajax(`/u/${username}.json`);
          const groups = result?.user?.groups || [];
          if (!groups.length) return;

          const groupNames = groups.map((g) => g.name).join(", ");
          const container = document.createElement("div");
          container.classList.add("user-card-groups");
          container.innerHTML = `<dt>Groups</dt><dd>${groupNames}</dd>`;

          const cardContent = document.querySelector("#user-card .card-content");
          if (cardContent && !cardContent.querySelector(".user-card-groups")) {
            cardContent.appendChild(container);
          }
        } catch (e) {
          console.warn("Failed to load groups for user card:", e);
        }
      });
    });
  },
};

