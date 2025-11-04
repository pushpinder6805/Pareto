import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import {
  SidebarSection,
  SidebarSectionLink,
} from "discourse/lib/sidebar/section";

export default apiInitializer("1.9.0", (api) => {
  console.log("🧩 Dynamic Sidebar (stable section injector)");

  async function addDynamicSections() {
    try {
      const { category_list } = await ajax("/categories.json");
      const all = category_list.categories;
      const topCats = all.filter((c) => !c.parent_category_id);

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

        api.addSidebarSection(section);
        console.log(`✅ Added section for ${cat.name}`);
      });
    } catch (err) {
      console.error("❌ Sidebar injection failed:", err);
    }
  }

  api.onAppEvent("sidebar:initialized", addDynamicSections);
});

