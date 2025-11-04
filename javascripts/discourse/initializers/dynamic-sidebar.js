import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import { SidebarSection, SidebarSectionLink } from "discourse/lib/sidebar/section";
import EmberObject, { set } from "@ember/object";

export default apiInitializer("1.9.0", (api) => {
  console.log("🧩 Dynamic Sidebar (tracked-safe injector)");

  async function buildDynamicSidebar() {
    const sidebar = api.container.lookup("service:sidebar-state");
    const panel = sidebar.panels?.[0];
    if (!panel || !panel.sections) {
      console.warn("⚠️ Sidebar not ready");
      return;
    }

    const { category_list } = await ajax("/categories.json");
    const all = category_list.categories;
    const top = all.filter((c) => !c.parent_category_id);

    // create a copy of current sections (tracked-safe)
    const newSections = [...panel.sections.filter((s) => !s.name?.startsWith("dynamic-"))];

    for (const cat of top) {
      const subs = all.filter((s) => s.parent_category_id === cat.id);
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

      newSections.push(section);
      console.log(`✅ Built section for: ${cat.name}`);
    }

    // use Ember.set to notify reactivity
    set(panel, "sections", newSections);

    sidebar.appEvents?.trigger?.("sidebar:refresh");
    console.log("🎯 Sidebar refreshed with dynamic sections");
  }

  api.onAppEvent("sidebar:initialized", buildDynamicSidebar);
});

