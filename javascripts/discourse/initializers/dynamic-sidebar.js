import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  // detect which sidebar API exists
  const canDecorate = typeof api.decorateSidebar === "function";
  const canAdd = typeof api.addSidebarSection === "function";

  if (!canDecorate && !canAdd) return;

  // use site service (already permission-filtered)
  const site =
    api.container.lookup?.("service:site") ||
    api.container.lookup?.("site:main") ||
    api.site;

  // helper to safely get categories
  function getCategories() {
    const cats = site?.categories;
    return Array.isArray(cats) ? cats : [];
  }

  // sort helpers
  function sortedTopAndSubs(all) {
    const byPos = (a, b) => (a.position || 0) - (b.position || 0);
    const top = all.filter((c) => !c.parent_category_id).slice().sort(byPos);
    const subsByParent = new Map();
    all.forEach((c) => {
      if (c.parent_category_id) {
        if (!subsByParent.has(c.parent_category_id)) {
          subsByParent.set(c.parent_category_id, []);
        }
        subsByParent.get(c.parent_category_id).push(c);
      }
    });
    for (const [k, arr] of subsByParent) {
      subsByParent.set(k, arr.slice().sort(byPos));
    }
    return { top, subsByParent };
  }

  // build flat link list (for old addSidebarSection)
  function buildLinks(all) {
    const { top, subsByParent } = sortedTopAndSubs(all);
    const links = [];
    top.forEach((p) => {
      links.push({
        name: `cat-${p.id}`,
        title: p.name,
        href: `/c/${p.slug}/${p.id}`,
      });
      const subs = subsByParent.get(p.id) || [];
      subs.forEach((s) => {
        links.push({
          name: `sub-${s.id}`,
          title: `↳ ${s.name}`,
          href: `/c/${s.slug}/${s.id}`,
        });
      });
    });
    return links;
  }

  // build nested section objects (for new decorateSidebar)
  function buildSections(all) {
    const { top, subsByParent } = sortedTopAndSubs(all);
    return top.map((p) => {
      const subs = subsByParent.get(p.id) || [];
      return {
        name: `cat-${p.id}`,
        title: p.name,
        links: [
          {
            name: `cat-main-${p.id}`,
            title: p.name,
            href: `/c/${p.slug}/${p.id}`,
          },
          ...subs.map((s) => ({
            name: `sub-${s.id}`,
            title: `↳ ${s.name}`,
            href: `/c/${s.slug}/${s.id}`,
          })),
        ],
      };
    });
  }

  // build once categories are available
  function renderOnceCategoriesAvailable(tries = 0) {
    const all = getCategories();
    if (!all.length) {
      if (tries > 20) return; // stop retrying after ~6s
      setTimeout(() => renderOnceCategoriesAvailable(tries + 1), 300);
      return;
    }

    if (canDecorate) {
      api.decorateSidebar(() => buildSections(all));
    } else if (canAdd) {
      api.addSidebarSection({
        name: "dynamic-categories",
        title: "Categories",
        links: () => buildLinks(all), // must be a function
      });
    }
  }

  renderOnceCategoriesAvailable();
});

