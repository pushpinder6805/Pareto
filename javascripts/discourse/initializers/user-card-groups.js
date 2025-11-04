// /javascripts/discourse/initializers/user-card-groups.js
import { withPluginApi } from "discourse/lib/plugin-api";
import { ajax } from "discourse/lib/ajax";
import { h } from "virtual-dom";

export default {
  name: "user-card-groups",
  initialize() {
    withPluginApi("1.40.0", (api) => {
      api.decorateUserCard((user, card) => {
        if (!user?.username) return;

        const div = document.createElement("div");
        div.className = "user-card-groups";
        div.textContent = "Loading groups…";

        ajax(`/u/${user.username}.json`)
          .then((result) => {
            const groups = result?.user?.groups || [];
            div.innerHTML = "";

            if (groups.length) {
              const strong = document.createElement("strong");
              strong.textContent = "Groups: ";
              div.appendChild(strong);

              groups.forEach((g, i) => {
                const a = document.createElement("a");
                a.href = `/g/${g.name}`;
                a.className = "group-link";
                a.textContent = g.name;
                div.appendChild(a);
                if (i < groups.length - 1) {
                  div.append(", ");
                }
              });
            } else {
              div.textContent = "";
            }
          })
          .catch(() => {
            div.textContent = "";
          });

        card.append(div);
      });
    });
  },
};

