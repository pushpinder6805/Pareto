import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import { SidebarSection, SidebarSectionLink } from "discourse/lib/sidebar/section";

export default apiInitializer("1.9.0", (api) => {
  console.log("🧩 Dynamic Sidebar v3.5 live");

  async function buildSidebar() {
    try {
      const data = await ajax("/categories.json");
      const cats = data.category_list.categories;
      const parents = cats.filter((c) => !c.parent_category_id);

      parents.forEach((parent) => {
        const subs = cats.filter((sc) => sc.parent_category_id === parent.id);
        if (subs.length === 0) return;

        const section = new SidebarSection({
          name: `cat-${parent.slug}`,
          title: parent.name,
          icon: "folder-tree",
          links: subs.map(
            (s) =>
              new SidebarSectionLink({
                name: `cat-${s.slug}`,
                title: s.name,
                route: "discovery.category",
                models: [s.slug],
                icon: "folder",
              })
          ),
        });

        api.addSidebarSection(section);
        console.log(`✅ Added section for ${parent.name}`);
      });
    } catch (err) {
      console.error("❌ Failed to build sidebar:", err);
    }
  }

  // Rebuild when sidebar is ready
  api.onAppEvent("sidebar:initialized", buildSidebar);
});

