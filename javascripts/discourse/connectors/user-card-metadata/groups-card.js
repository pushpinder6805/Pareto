import { ajax } from "discourse/lib/ajax";

export default {
  setupComponent(args, component) {
    const username =
      args?.model?.user?.username ||
      args?.model?.username ||
      args?.user?.username;

    console.log("👤 Loading groups for:", username);

    if (!username) return;

    ajax(`/u/${username}.json`)
      .then((data) => {
        console.log("📦 User JSON:", data);

        const groups = (data?.user?.groups || []).filter(
          (g) => !["everyone", "trust_level_0"].includes(g.name)
        );

        console.log("✅ Groups extracted:", groups);
        component.set("groups", groups);
      })
      .catch((e) => {
        console.warn("❌ Failed to load groups", e);
        component.set("groups", []);
      });
  },
};

