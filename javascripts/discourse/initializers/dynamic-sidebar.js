import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";

export default apiInitializer("1.9.0", (api) => {
  console.log("🧩 Dynamic Sidebar Initialized");

  async function buildDynamicSidebar() {
    try {
      // Fetch categories visible to the current user
      const data = await ajax("/categories.json");
      const categories = data.category_list.categories.filter(
        (c) => !c.parent_category_id // top-level only
      );

      categories.forEach((cat) => {
        // Find subcategories
        const subs = data.category_list.categories.filter(
          (sc) => sc.parent_category_id === cat.id
        );

        // Add sidebar section dynamically
        api.addSidebarSection((BaseSection, BaseLink) => {
          return class extends BaseSection {
            get name() {
              return cat.name;
            }

            get links() {
              return subs.map(
                (s) =>
                  new BaseLink({
                    label: s.name,
                    title: s.description_text,
                    route: "discovery.category",
                    models: [s.slug],
                  })
              );
            }
          };
        });
      });
    } catch (err) {
      console.error("❌ Failed to load dynamic sidebar:", err);
    }
  }

  // Build on load
  buildDynamicSidebar();

  // Optionally rebuild when categories change (live update)
  api.onAppEvent("categories:changed", () => buildDynamicSidebar());
});

