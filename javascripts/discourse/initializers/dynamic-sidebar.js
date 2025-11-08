import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.6.0", (api) => {
  const currentUser = api.getCurrentUser();
  if (!currentUser) return;

  const store = api.container.lookup("store:main");

  api.addSidebarSection({
    name: "dynamic-categories",
    title: "Categories",
    links: () => {
      const allCategories = store.peekAll("category").filter(
        (c) => !c.permission_denied && !c.read_restricted
      );

      const topCategories = allCategories
        .filter((c) => !c.parent_category_id)
        .sortBy("position");

      const links = [];

      topCategories.forEach((parent) => {
        links.push({
          name: `category-${parent.id}`,
          title: parent.name,
          href: `/c/${parent.slug}/${parent.id}`,
        });

        const subs = allCategories
          .filter((sub) => sub.parent_category_id === parent.id)
          .sortBy("position");

        subs.forEach((sub) => {
          links.push({
            name: `subcategory-${sub.id}`,
            title: `↳ ${sub.name}`,
            href: `/c/${sub.slug}/${sub.id}`,
          });
        });
      });

      return links;
    },
  });
});

