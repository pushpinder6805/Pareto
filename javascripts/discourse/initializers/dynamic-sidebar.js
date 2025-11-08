import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.19.0", (api) => {
  const canDecorate = typeof api.decorateSidebar === "function";
  const canAdd = typeof api.addSidebarSection === "function";
  if (!canDecorate && !canAdd) return;

  const site =
    api.container.lookup?.("service:site") ||
    api.container.lookup?.("site:main") ||
    api.site;

  const getCategories = () =>
    Array.isArray(site?.categories) ? site.categories : [];

  const sortCats = (a, b) => (a.position || 0) - (b.position || 0);

  function structure(all) {
    const top = all.filter((c) => !c.parent_category_id).slice().sort(sortCats);
    const subsByParent = new Map();
    all.forEach((c) => {
      if (c.parent_category_id) {
        if (!subsByParent.has(c.parent_category_id))
          subsByParent.set(c.parent_category_id, []);
        subsByParent.get(c.parent_category_id).push(c);
      }
    });
    for (const arr of subsByParent.values()) arr.sort(sortCats);
    return { top, subsByParent };
  }

  function buildLinks(all) {
    const { top, subsByParent } = structure(all);
    const out = [];
    top.forEach((p) => {
      out.push({
        name: `cat-${p.id}`,
        title: p.name,
        href: `/c/${p.slug}/${p.id}`,
      });
      (subsByParent.get(p.id) || []).forEach((s) =>
        out.push({
          name: `sub-${s.id}`,
          title: `↳ ${s.name}`,
          href: `/c/${s.slug}/${s.id}`,
        })
      );
    });
    return out;
  }

  function buildSections(all) {
    const { top, subsByParent } = structure(all);
    return top.map((p) => ({
      name: `cat-${p.id}`,
      title: p.name,
      links: [
        {
          name: `cat-main-${p.id}`,
          title: p.name,
          href: `/c/${p.slug}/${p.id}`,
        },
        ...(subsByParent.get(p.id) || []).map((s) => ({
          name: `sub-${s.id}`,
          title: `↳ ${s.name}`,
          href: `/c/${s.slug}/${s.id}`,
        })),
      ],
    }));
  }

  function render(tries = 0) {
    const all = getCategories();
    if (!all.length) {
      if (tries < 20) setTimeout(() => render(tries + 1), 300);
      return;
    }

    if (canDecorate) {
      api.decorateSidebar(() => buildSections(all));
    } else if (canAdd) {
      const linksArray = buildLinks(all);

      // try callable form first, fall back to plain array
      try {
        api.addSidebarSection({
          name: "dynamic-categories",
          title: "Categories",
          links: () => linksArray,
        });
      } catch {
        api.addSidebarSection({
          name: "dynamic-categories",
          title: "Categories",
          links: linksArray,
        });
      }
    }
  }

  render();
});

