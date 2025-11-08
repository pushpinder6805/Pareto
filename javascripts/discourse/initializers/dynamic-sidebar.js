import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  const canDecorate = typeof api.decorateSidebar === "function";

  if (!canDecorate) return;

  const site =
    api.container.lookup?.("service:site") ||
    api.container.lookup?.("site:main") ||
    api.site;

  function getCategories() {
    const cats = site?.categories;
    return Array.isArray(cats) ? cats : [];
  }

  function sortedTopAndSubs(all) {
    const byPos = (a, b) => (a.position || 0) - (b.position || 0);
    const top = all.filter((c) => !c.parent_category_id).sort(byPos);
    const subsByParent = new Map();
    
    all.forEach((c) => {
      if (c.parent_category_id) {
        if (!subsByParent.has(c.parent_category_id)) {
          subsByParent.set(c.parent_category_id, []);
        }
        subsByParent.get(c.parent_category_id).push(c);
      }
    });
    
    subsByParent.forEach((arr, k) => {
      subsByParent.set(k, arr.sort(byPos));
    });
    
    return { top, subsByParent };
  }

  function buildSections(all) {
    const { top, subsByParent } = sortedTopAndSubs(all);
    
    return top.map((parent) => {
      const subs = subsByParent.get(parent.id) || [];
      
      return {
        name: `category-section-${parent.id}`,
        title: parent.name,
        links: [
          {
            name: `category-${parent.id}`,
            title: parent.name,
            href: `/c/${parent.slug}/${parent.id}`,
          },
          ...subs.map((sub) => ({
            name: `category-${sub.id}`,
            title: sub.name,
            href: `/c/${sub.slug}/${sub.id}`,
          })),
        ],
      };
    });
  }

  function renderOnceCategoriesAvailable(tries = 0) {
    const all = getCategories();
    
    if (!all.length) {
      if (tries > 20) return;
      setTimeout(() => renderOnceCategoriesAvailable(tries + 1), 300);
      return;
    }

    api.decorateSidebar((widgets) => {
      const sections = buildSections(all);
      return [...widgets, ...sections];
    });
  }

  renderOnceCategoriesAvailable();
});

