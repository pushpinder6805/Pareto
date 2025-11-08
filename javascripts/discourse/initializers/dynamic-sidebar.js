import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  const currentUser = api.getCurrentUser();
  if (!currentUser) return;

  const store = api.container.lookup("store:main");

  // Wait until category data is ready
  api.onAppEvent("store:loaded", () => {
    api.decorateSidebar((helper) => {
      const all = store.peekAll("category").filter(
        (c) => !c.permission_denied && !c.read_restricted
      );

      const top = all.filter((c) => !c.parent_category_id).sortBy("position");

      const sections = top.map((parent) => {
        const subs = all
          .filter((s) => s.parent_category_id === parent.id)
          .sortBy("position");

        return {
          name: `cat-${parent.id}`,
          title: parent.name,
          links: [
            {
              name: `cat-main-${parent.id}`,
              title: parent.name,
              href: `/c/${parent.slug}/${parent.id}`,
            },
            ...subs.map((s) => ({
              name: `sub-${s.id}`,
              title: `↳ ${s.name}`,
              href: `/c/${s.slug}/${s.id}`,
            })),
          ],
        };
      });

      return sections;
    });
  });
});

