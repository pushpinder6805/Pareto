import { ajax } from "discourse/lib/ajax";

export default {
  setupComponent(args, component) {
    console.log("🔍 user-card connector args:", args);

    // Try all possible locations for username
    const username =
      args?.model?.user?.username ||
      args?.model?.username ||
      args?.user?.username ||
      args?.user?.user?.username;

    console.log("🔍 extracted username:", username);

    if (!username) {
      component.set("groups", []);
      return;
    }

    ajax(`/u/${username}.json`)
      .then((data) => {
        console.log("🔍 /u response:", data);
        const groups = (data?.user?.groups || []).filter(
          (g) => !["everyone", "trust_level_0"].includes(g.name)
        );
        console.log("🔍 filtered groups:", groups);
        component.set("groups", groups);
      })
      .catch((e) => {
        console.warn("user-card-groups ajax error", e);
        component.set("groups", []);
      });
  },
};

