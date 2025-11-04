import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import { SidebarSection, SidebarSectionLink } from "discourse/lib/sidebar/section";

export default apiInitializer("1.9.0", (api) => {
  console.log("🧩 Dynamic Sidebar v3.5.2 — sections injector");

  async function buildDynamicSidebar() {
    const sidebar = api.container.lookup("service:sidebar-state");
    const panel = sidebar.panels?.[0];
    if (!panel || !panel.sections) {
      console.warn("⚠️ No sidebar sections available yet");
      return;
    }

    // fetch all categories
    const { category_list } = await ajax("/categories.json");
    const allCats = category_list.categories;
    const topCats = allCats.filter((c) => !c.parent_category_id);

    // remove old dynamic sections (optional safety)
    panel.sections = panel.sections.filter((s) => !s.name?.startsWith("dynamic-"));

    for (const cat of topCats) {
      const subs = allCats.filter((s) => s.parent_category_id === cat.id);
      if (!subs.length) continue;

      const links = subs.map(
        (s) =>
          new SidebarSectionLink({
            name: `dynamic-${s.slug}`,
            title: s.name,
            route: "discovery.category",
            models: [s.slug],
            icon: "folder",
          })
      );

      const section = new SidebarSection({
        name: `dynamic-${cat.slug}`,
        title: cat.name,
        links,
        icon: "folder-tree",
      });

      panel.sections.push(section);
      console.log(`✅ Injected sidebar section for: ${cat.name}`);
    }

    sidebar.appEvents?.trigger?.("sidebar:refresh");
    console.log("🎯 Sidebar refreshed with dynamic project sections");
  }

  api.onAppEvent("sidebar:initialized", buildDynamicSidebar);
});

