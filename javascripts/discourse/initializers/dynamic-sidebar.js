import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  const canDecorate = typeof api.decorateSidebar === "function";
  if (!canDecorate) return;

  const site =
    api.container.lookup?.("service:site") ||
    api.container.lookup?.("site:main") ||
    api.site;

  function buildSections() {
    const cats = site?.categories || [];
    const top = cats
      .filter((c) => !c.parent_category_id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    return top.map((parent) => {
      const subs = cats
        .filter((s) => s.parent_category_id === parent.id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      return {
        name: `category-${parent.id}`,
        title: parent.name,
        links: [
          {
            name: `cat-main-${parent.id}`,
            title: parent.name,
            href: `/c/${parent.slug}/${parent.id}`,
          },
          ...subs.map((s) => ({
            name: `cat-sub-${s.id}`,
            title: s.name,
            href: `/c/${s.slug}/${s.id}`,
          })),
        ],
      };
    });
  }

  api.decorateSidebar((widgets) => {
    const sections = buildSections();
    return [...widgets, ...sections];
  });
});

