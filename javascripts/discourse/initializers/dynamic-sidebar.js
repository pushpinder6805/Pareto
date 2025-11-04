import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import {
  SidebarPanel,
  SidebarSection,
  SidebarSectionLink,
} from "discourse/lib/sidebar/section";

export default apiInitializer("1.9.0", (api) => {
  console.log("🧩 Dynamic Sidebar initialized (Discourse 3.5 stable)");

  api.addSidebarPanel("projects", function () {
    console.log("⚙️ Building Projects panel...");

    // Return a promise manually instead of using async function
    return ajax("/categories.json").then(({ category_list }) => {
      const all = category_list.categories;
      const top = all.filter((c) => !c.parent_category_id);

      const sections = top
        .map((cat) => {
          const subs = all.filter((s) => s.parent_category_id === cat.id);
          if (!subs.length) return null;

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

          return new SidebarSection({
            name: `cat-${cat.slug}`,
            title: cat.name,
            icon: "folder-tree",
            links,
          });
        })
        .filter(Boolean);

      return new SidebarPanel({
        name: "projects",
        title: "Projects",
        icon: "diagram-project",
        sections,
      });
    });
  });
});

