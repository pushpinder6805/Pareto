// /javascripts/discourse/initializers/user-card-groups.js
import { withPluginApi } from "discourse/lib/plugin-api";
import { ajax } from "discourse/lib/ajax";
import { createElement } from "discourse-common/lib/dom";

export default {
  name: "user-card-groups",
  initialize() {
    withPluginApi("1.32.0", (api) => {
      api.addUserCardContents((user, card) => {
        const username = user?.username;
        if (!username) return;

        const container = createElement("div", { class: "user-card-groups" });
        container.textContent = "Loading groups…";

        // Async load user data
        ajax(`/u/${username}.json`)
          .then((result) => {
            const groups = result?.user?.groups || [];
            if (groups.length) {
              container.textContent = "";
              const dt = createElement("dt");
              dt.textContent = "Groups";
              const dd = createElement("dd");
              dd.innerHTML = groups
                .map(
                  (g) =>
                    `<a class="group-link" href="/g/${g.name}">${g.name}</a>`
                )
                .join(", ");
              container.appendChild(dt);
              container.appendChild(dd);
            } else {
              container.textContent = "";
            }
          })
          .catch(() => {
            container.textContent = "";
          });

        return container;
      });
    });
  },
};

