import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  const currentUser = api.getCurrentUser();
  if (!currentUser) return; // guests: skip, or remove this line if you want public cats

  const site = api.container.lookup("site:main"); // authoritative list, permission-filtered

  function build() {
    const all = (site.categories || []);
    if (!all.length) {
      setTimeout(build, 300);
      return;
    }

    // top-level categories
    const top = all
      .filter((c) => !c.parent_category_id)
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    api.decorateSidebar(() => {
      const sections = top.map((parent) => {
        const subs = all
          .filter((s) => s.parent_category_id === parent.id)
          .slice()
          .sort((a, b) => (a.position || 0) - (b.position || 0));

        return {
          name: `cat-${parent.id}`,
          title: parent.name, // “Category name - Parent Title” isn’t needed for top level
          links: [
            {
              name: `cat-main-${parent.id}`,
              title: parent.name,
              href: `/c/${parent.slug}/${parent.id}`,
            },
            ...subs.map((s) => ({
              name: `sub-${s.id}`,
              title: `↳ ${s.name}`, // subcategories listed under parent
              href: `/c/${s.slug}/${s.id}`,
            })),
          ],
        };
      });

      return sections;
    });
  }

  build();
});

