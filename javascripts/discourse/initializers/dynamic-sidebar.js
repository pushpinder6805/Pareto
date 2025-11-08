import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.6.0", (api) => {
  const currentUser = api.getCurrentUser();
  if (!currentUser) return; // Guests excluded unless desired

  const store = api.container.lookup("store:main");

  api.decorateSidebar((helper) => {
    // Get all categories visible to this user
    const allCategories = store.peekAll("category").filter(
      (c) => !c.permission_denied && !c.read_restricted
    );

    // Filter top-level categories
    const topCategories = allCategories
      .filter((c) => !c.parent_category_id)
      .sortBy("position");

    // Build sections
    const sections = topCategories.map((parent) => {
      const subcats = allCategories
        .filter((sub) => sub.parent_category_id === parent.id)
        .sortBy("position");

      // Each top-level category becomes a sidebar section
      return {
        name: `category-${parent.id}`,
        title: parent.name,
        links: [
          {
            name: `category-${parent.slug}`,
            title: parent.name,
            href: `/c/${parent.slug}/${parent.id}`,
          },
          ...subcats.map((sub) => ({
            name: `subcategory-${sub.slug}`,
            title: `↳ ${sub.name}`,
            href: `/c/${sub.slug}/${sub.id}`,
          })),
        ],
      };
    });

    return sections;
  });
});

