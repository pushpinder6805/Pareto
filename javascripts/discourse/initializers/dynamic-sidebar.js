import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import {
  SidebarPanel,
  SidebarSection,
  SidebarSectionLink,
} from "discourse/lib/sidebar/section";

export default apiInitializer("1.9.0", (api) => {
  console.log("🧩 Dynamic Sidebar (panels mode 3.5.2)");

  async function loadDynamicSidebar() {
    const sidebarService = api.container.lookup("service:sidebar-state");
    if (!sidebarService || !sidebarService.panels) {
      console.warn("⚠️ Sidebar panels not found");
      return;
    }

    // pick first panel (community/categories)
    const firstPanel = sidebarService.panels[0];
    if (!firstPanel) {
      console.warn("⚠️ No sidebar panel loaded yet");
      return;
    }

    const { category_list } = await ajax("/categories.json");
    const all = category_list.categories;
    const topCats = all.filter((c) => !c.parent_category_id);

    const sections = [];

    topCats.forEach((cat) => {
      const subs = all.filter((s) => s.parent_category_id === cat.id);
      if (!subs.length) return;

      const links = subs.map(
        (s) =>
          new SidebarSectionLink({
            name: `cat-${s.slug}`,
            title: s.name,
            route: "discovery.category",
            models: [s.slug],
            icon: "folder",
          })
      );

      const section = new SidebarSection({
        name: `cat-${cat.slug}`,
        title: cat.name,
        icon: "folder-tree",
        links,
      });

      sections.push(section);
      console.log(`✅ Built section for: ${cat.name}`);
    });

    // Create a new sidebar panel dynamically
    const panel = new SidebarPanel({
      name: "projects",
      title: "Projects",
      icon: "folder",
      sections,
    });

    sidebarService.panels.push(panel);
    console.log("🎯 Injected 'Projects' panel into sidebar");

    // Trigger redraw
    sidebarService.appEvents?.trigger?.("sidebar:refresh");
  }

  api.onAppEvent("sidebar:initialized", loadDynamicSidebar);
});

