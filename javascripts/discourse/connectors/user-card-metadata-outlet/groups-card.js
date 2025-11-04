import { ajax } from "discourse/lib/ajax";

export default {
  setupComponent(args, component) {
    const username = args.model?.user?.username;
    if (!username) return;

    ajax(`/u/${username}.json`)
      .then((data) => {
        const groups = data?.user?.groups || [];
        if (!groups.length) return;

        component.set("userGroups", groups);
      })
      .catch(() => {});
  },
};

