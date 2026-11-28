import React, { useState } from "react";
import { listingTree, forumCategories } from "../lib/taxonomy";
export default function CategoryFields({
  kind = "SALE",
  forum = false,
  initialCategory,
  initialSubcategory,
}) {
  const tree = forum ? forumCategories : listingTree(kind);
  const [selected, setSelected] = useState(
    initialCategory || Object.keys(tree)[0],
  );
  const category = tree[selected] ? selected : Object.keys(tree)[0];
  return (
    <div className="form-grid">
      <label>
        Category
        <select
          name="category"
          value={category}
          onChange={(e) => setSelected(e.target.value)}
          required
        >
          {Object.keys(tree).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Subcategory
        <select
          name="subcategory"
          key={category}
          defaultValue={
            tree[category].includes(initialSubcategory)
              ? initialSubcategory
              : tree[category][0]
          }
          required
        >
          {tree[category].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
