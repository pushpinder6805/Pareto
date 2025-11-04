import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";

export default apiInitializer("1.9.0", async (api) => {
  console.log("🧩 Dynamic Sidebar v3.5.2+ live");

  const { category_list } = await ajax("/categories.json");
  const all = category_list.categories;
  const top = all.filter((c) => !c.parent_category_id);

  for (const cat of top) {
    const subs = all.filter((s) => s.parent_category_id === cat.id);
    if (!subs.length) continue;

    api.addSidebarSection(`project-${cat.slug}`, {
      title: cat.name,
      icon: "folder-tree",
      links: subs.map((s) => ({
        route: "discovery.category",
        models: [s.slug],
        title: s.name,
        name: `project-${s.slug}`,
        icon: "folder",
      })),
    });

    console.log(`📁 Registered sidebar section: ${cat.name}`);
  }
});

