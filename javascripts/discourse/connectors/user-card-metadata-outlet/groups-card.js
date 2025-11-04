import { ajax } from "discourse/lib/ajax";

export default {
  setupComponent(args, component) {
    const username = args.model?.user?.username;
    if (!username) return;

    ajax(`/u/${username}.json`)
      .then((data) => {
        const groups = (data?.user?.groups || []).filter(
          (g) => !["everyone", "trust_level_0"].includes(g.name)
        );
        if (groups.length) component.set("groups", groups);
      })
      .catch(() => {});
  },
};

