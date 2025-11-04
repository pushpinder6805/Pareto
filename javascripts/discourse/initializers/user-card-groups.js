// /javascripts/discourse/initializers/user-card-groups.js
import { withPluginApi } from "discourse/lib/plugin-api";
import { ajax } from "discourse/lib/ajax";

export default {
  name: "user-card-groups",
  initialize() {
    withPluginApi("1.32.0", (api) => {
      api.addUserCardContents((user) => {
        const username = user?.username;
        if (!username) return;

        const container = document.createElement("div");
        container.className = "user-card-groups";
        container.textContent = "Loading groups…";

        ajax(`/u/${username}.json`)
          .then((result) => {
            const groups = result?.user?.groups || [];
            container.innerHTML = "";

            if (groups.length) {
              const dt = document.createElement("dt");
              dt.textContent = "Groups";

              const dd = document.createElement("dd");
              groups.forEach((g, i) => {
                const a = document.createElement("a");
                a.href = `/g/${g.name}`;
                a.className = "group-link";
                a.textContent = g.name;
                dd.appendChild(a);
                if (i < groups.length - 1) dd.append(", ");
              });

              container.appendChild(dt);
              container.appendChild(dd);
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

