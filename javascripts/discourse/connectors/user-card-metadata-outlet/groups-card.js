import { ajax } from "discourse/lib/ajax";

export default {
  setupComponent(args, component) {
    // args.model.user is the user shown on the card
    const username = args?.model?.user?.username;
    if (!username) return;

    ajax(`/u/${username}.json`)
      .then((data) => {
        const groups = (data?.user?.groups || []).filter(
          (g) => !["everyone", "trust_level_0"].includes(g.name)
        );
        component.set("groups", groups);
      })
      .catch(() => {});
  },
};

