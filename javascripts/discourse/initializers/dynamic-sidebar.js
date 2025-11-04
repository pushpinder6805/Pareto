import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import {
  SidebarSection,
  SidebarSectionLink,
} from "discourse/lib/sidebar/section";

export default apiInitializer("1.9.0", (api) => {
  console.log("🧩 Dynamic Sidebar Loader (3.5.2)");

  async function loadDynamicSidebar() {
    const sidebarService = api.container.lookup("service:sidebar-state");
    if (!sidebarService) {
      console.warn("⚠️ Sidebar service not found");
      return;
    }

    const { category_list } = await ajax("/categories.json");
    const all = category_list.categories;
    const topCats = all.filter((c) => !c.parent_category_id);

    const newSections = [];

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

      newSections.push(section);
      console.log(`✅ Prepared section for: ${cat.name}`);
    });

    // Inject directly into sidebar’s custom sections
    sidebarService.customSections = [
      ...(sidebarService.customSections || []),
      ...newSections,
    ];

    sidebarService.appEvents.trigger("sidebar:refresh");
    console.log("🎯 Injected dynamic sections into sidebar");
  }

  api.onAppEvent("sidebar:initialized", loadDynamicSidebar);
});

