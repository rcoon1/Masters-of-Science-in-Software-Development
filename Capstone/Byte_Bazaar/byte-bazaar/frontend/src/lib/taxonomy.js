import tree from "../../../backend/src/main/resources/taxonomy.json";
export const productCategories = tree.products;
export const serviceCategories = tree.services;
export const forumCategories = tree.forums;
export const listingTree = (kind) =>
  kind === "SERVICE" ? serviceCategories : productCategories;
export const sectionItems = (items, page) =>
  items.filter((i) =>
    page === "Auctions"
      ? i.kind === "AUCTION"
      : page === "Services"
        ? i.kind === "SERVICE"
        : ["SALE", "DIGITAL"].includes(i.kind),
  );
export function filterListings(
  items,
  {
    page = "Shop",
    category = "All",
    subcategory = "All",
    query = "",
    inStock = false,
    sort = "newest",
  } = {},
) {
  const rows = sectionItems(items, page).filter(
    (i) =>
      (category === "All" || i.category === category) &&
      (subcategory === "All" || i.subcategory === subcategory) &&
      (!inStock || i.stock > 0) &&
      (i.title + " " + i.description + " " + i.category + " " + i.subcategory)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return rows.sort((a, b) =>
    sort === "price-low"
      ? Number(a.price) - Number(b.price)
      : sort === "price-high"
        ? Number(b.price) - Number(a.price)
        : sort === "ending"
          ? Date.parse(a.endsAt) - Date.parse(b.endsAt)
          : b.id - a.id,
  );
}
