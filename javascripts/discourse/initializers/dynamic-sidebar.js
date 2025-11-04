import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import { SidebarSection, SidebarSectionLink } from "discourse/lib/sidebar/section";
import { set } from "@ember/object";

export default apiInitializer("1.9.0", (api) => {
  console.log("🧩 Dynamic Sidebar Loader (rebuild-safe)");

  async function buildSidebar() {
    const sidebar = api.container.lookup("service:sidebar-state");
    const panel = sidebar.panels?.[0];
    if (!panel || !panel.sections) {
      console.warn("⚠️ Sidebar not ready");
      return;
    }

    // fetch categories
    const { category_list } = await ajax("/categories.json");
    const all = category_list.categories;
    const top = all.filter((c) => !c.parent_category_id);

    // remove previous dynamic sections
    const kept = panel.sections.filter((s) => !s.name?.startsWith("dynamic-"));
    const dynamicSections = [];

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

      dynamicSections.push(section);
    }

    // reassign full tracked array
    set(panel, "sections", [...kept, ...dynamicSections]);

    // force tracked recompute
    if (sidebar.appEvents) {
      sidebar.appEvents.trigger("sidebar:refresh");
      sidebar.appEvents.trigger("sidebar:recalculate");
    }

    console.log("✅ Dynamic sections injected:", dynamicSections.length);
  }

  // trigger when sidebar is ready
  api.onAppEvent("sidebar:initialized", buildSidebar);
});

