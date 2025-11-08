import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  const currentUser = api.getCurrentUser();
  if (!currentUser) return;

  const store = api.container.lookup("store:main");

  function buildSections() {
    const all = store.peekAll("category").filter(
      (c) => !c.permission_denied && !c.read_restricted
    );

    if (!all.length) {
      // categories not ready yet — try again shortly
      setTimeout(buildSections, 500);
      return;
    }

    const top = all.filter((c) => !c.parent_category_id).sortBy("position");

    api.decorateSidebar(() => {
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
  }

  buildSections();
});

