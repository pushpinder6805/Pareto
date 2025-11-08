import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.6.0", (api) => {
  const currentUser = api.getCurrentUser();
  if (!currentUser) return;

  const store = api.container.lookup("store:main");

  api.decorateWidget("sidebar:before", (helper) => {
    const allCategories = store.peekAll("category").filter(
      (c) => !c.permission_denied && !c.read_restricted
    );

    const topCategories = allCategories
      .filter((c) => !c.parent_category_id)
      .sortBy("position");

    const html = [];

    topCategories.forEach((parent) => {
      html.push(
        `<div class="sidebar-section sidebar-section--custom" data-category-id="${parent.id}">
          <div class="sidebar-section-header">
            <a class="sidebar-section-title" href="/c/${parent.slug}/${parent.id}">
              ${parent.name}
            </a>
          </div>
          <ul class="sidebar-section-content">`
      );

      const subs = allCategories
        .filter((sub) => sub.parent_category_id === parent.id)
        .sortBy("position");

      subs.forEach((sub) => {
        html.push(
          `<li class="sidebar-section-link">
            <a href="/c/${sub.slug}/${sub.id}">
              ↳ ${sub.name}
            </a>
          </li>`
        );
      });

      html.push(`</ul></div>`);
    });

    // Return a Handlebars-safe HTML string
    return helper.rawHtml(html.join(""));
  });
});

