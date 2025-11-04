// /javascripts/discourse/initializers/user-card-groups.js
import { withPluginApi } from "discourse/lib/plugin-api";
import { ajax } from "discourse/lib/ajax";

export default {
  name: "user-card-groups",
  initialize() {
    withPluginApi("1.32.0", (api) => {
      api.decorateWidget("user-card:after-details", (helper) => {
        const user = helper.attrs?.user;
        if (!user?.username) return;

        const container = document.createElement("div");
        container.className = "user-card-groups";
        container.textContent = "Loading groups…";

        ajax(`/u/${user.username}.json`)
          .then((result) => {
            const groups = result?.user?.groups || [];
            container.innerHTML = "";

            if (groups.length) {
              const label = document.createElement("strong");
              label.textContent = "Groups: ";
              container.appendChild(label);

              groups.forEach((g, i) => {
                const a = document.createElement("a");
                a.href = `/g/${g.name}`;
                a.className = "group-link";
                a.textContent = g.name;
                container.appendChild(a);
                if (i < groups.length - 1) {
                  container.append(", ");
                }
              });
            }
          })
          .catch(() => {
            container.textContent = "";
          });

        return container.outerHTML;
      });
    });
  },
};

