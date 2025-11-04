import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import { SidebarSection, SidebarSectionLink } from "discourse/lib/sidebar/section";

export default apiInitializer("1.9.0", (api) => {
  console.log("🧩 Dynamic Sidebar (3.5.0-compatible)");

  async function buildDynamicSidebar() {
    try {
      const { category_list } = await ajax("/categories.json");
      const all = category_list.categories;

      // Top-level categories only
      const topCategories = all.filter((c) => !c.parent_category_id);

      // Get default sidebar panel (the “community” one)
      const panel = api.getCurrentUserSidebarPanel?.();
      if (!panel) {
        console.warn("⚠️ No sidebar panel found. Sidebar not ready yet.");
        return;
      }

      topCategories.forEach((cat) => {
        const subcats = all.filter((sc) => sc.parent_category_id === cat.id);
        if (!subcats.length) return;

        const links = subcats.map(
          (sc) =>
            new SidebarSectionLink({
              name: `cat-${sc.slug}`,
              title: sc.name,
              route: "discovery.category",
              models: [sc.slug],
              icon: "folder",
            })
        );

        const section = new SidebarSection({
          name: `cat-${cat.slug}`,
          title: cat.name,
          links,
          icon: "folder-tree",
        });

        // Add section to active panel
        panel.addSection(section);
        console.log(`✅ Added sidebar section for: ${cat.name}`);
      });
    } catch (err) {
      console.error("❌ Failed to build dynamic sidebar:", err);
    }
  }

  // Run after the sidebar is initialized
  api.onAppEvent("sidebar:initialized", buildDynamicSidebar);
});

