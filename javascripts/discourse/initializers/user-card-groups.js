// /javascripts/discourse/initializers/user-card-groups.js
import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "user-card-groups",
  initialize() {
    withPluginApi("1.32.0", (api) => {
      api.onAppEvent("user-card:show", (card) => {
        const user = card?.user;
        if (!user) return;

        const groups = user.groups
          ?.map((g) => g.name)
          .join(", ");

        if (groups) {
          const container = document.createElement("div");
          container.classList.add("user-card-groups");
          container.innerText = `Groups: ${groups}`;

          const userCardDetails = document.querySelector(".user-card-main");
          if (userCardDetails) userCardDetails.appendChild(container);
        }
      });
    });
  },
};

