import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import { SidebarSection, SidebarSectionLink } from "discourse/lib/sidebar/section";

export default apiInitializer("1.9.0", (api) => {
  console.log("🧩 Dynamic Sidebar Initialized (modern)");

  async function buildDynamicSidebar() {
    try {
      const { category_list } = await ajax("/categories.json");
      const all = category_list.categories;

      // Top-level categories only
      const topCategories = all.filter((c) => !c.parent_category_id);

      // Create one section per top-level category
      topCategories.forEach((cat) => {
        const subcats = all.filter((sc) => sc.parent_category_id === cat.id);

        if (subcats.length === 0) return; // skip empty

        const links = subcats.map(
          (sc) =>
            new SidebarSectionLink({
              name: sc.name,
              route: "discovery.category",
              models: [sc.slug],
              title: sc.description_text || "",
              icon: "folder", // optional
            })
        );

        const section = new SidebarSection({
          name: cat.name,
          links,
          icon: "folder-tree", // optional
          prioritize: true,
        });

        api.addSidebarSection(section);
      });
    } catch (err) {
      console.error("❌ Sidebar build failed:", err);
    }
  }

  // Run after sidebar initializes
  api.onAppEvent("sidebar:initialized", buildDynamicSidebar);
});

