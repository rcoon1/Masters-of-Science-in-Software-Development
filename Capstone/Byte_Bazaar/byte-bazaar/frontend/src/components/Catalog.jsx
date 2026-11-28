import React, { useState } from "react";
import {
  productCategories,
  serviceCategories,
  filterListings,
  sectionItems,
} from "../lib/taxonomy";
import { money } from "../lib/format";
import ListingPhotos from "./ListingPhotos";
import TechIcon from "./TechIcon";
export default function Catalog({
  page,
  items,
  query,
  setQuery,
  category,
  setCategory,
  subcategory,
  setSubcategory,
  open,
  user,
  setCart,
  setNotice,
}) {
  const [sort, setSort] = useState("newest"),
    [inStock, setInStock] = useState(false);
  const tree = page === "Services" ? serviceCategories : productCategories,
    section = sectionItems(items, page);
  const rows = filterListings(items, {
    page,
    category,
    subcategory,
    query,
    sort,
    inStock,
  });
  const choose = (c, s = "All") => {
    setCategory(c);
    setSubcategory(s);
  };
  const activeAuctions = section.filter(
    (i) => i.auctionStatus === "OPEN" && Date.parse(i.endsAt) > Date.now(),
  ).length;
  return (
    <div className="store-layout">
      <aside className="category-sidebar">
        <div className="sidebar-heading">
          {page === "Services" ? "Service categories" : "Shop by category"}
        </div>
        <button
          className={"all-categories " + (category === "All" ? "chosen" : "")}
          onClick={() => choose("All")}
        >
          All {page === "Shop" ? "products" : page.toLowerCase()}
          <span>{section.length}</span>
        </button>
        {Object.entries(tree).map(([c, subs]) => (
          <details key={c} open={category === c || undefined}>
            <summary>
              <button
                className={category === c ? "chosen" : ""}
                onClick={() => choose(c)}
              >
                {c}
              </button>
              <span>⌄</span>
            </summary>
            <div className="subcategory-links">
              {subs.map((s) => (
                <button
                  key={s}
                  className={
                    subcategory === s && category === c ? "chosen" : ""
                  }
                  onClick={() => choose(c, s)}
                >
                  {s}
                  <small>
                    {
                      section.filter(
                        (i) => i.category === c && i.subcategory === s,
                      ).length
                    }
                  </small>
                </button>
              ))}
            </div>
          </details>
        ))}
        <div className="sidebar-help">
          <b>Make room for your next upgrade.</b>
          <p>List hardware, digital products or your expertise.</p>
          <button onClick={() => open({ type: user ? "sell" : "login" })}>
            Create a listing →
          </button>
        </div>
      </aside>
      <div className="store-content">
        {page === "Shop" && category === "All" && !query && (
          <>
            <div className="store-promo">
              <div>
                <span className="eyebrow">BUILD IT YOUR WAY</span>
                <h1>
                  Great tech.
                  <br />
                  More possibilities.
                </h1>
                <p>
                  Components, computers and digital essentials.
                  <br />
                  Find what your next project needs.
                </p>
                <button onClick={() => choose("PC Components")}>
                  Shop PC components →
                </button>
              </div>
              <div className="promo-spec">
                <span>THE UPGRADE LIST</span>
                <button
                  onClick={() => choose("PC Components", "Graphics Cards")}
                >
                  <TechIcon type="Graphics Cards" size={34} />
                  <div>
                    Graphics cards<small>Power every frame</small>
                  </div>
                  <b>→</b>
                </button>
                <button onClick={() => choose("Storage", "Solid State Drives")}>
                  <TechIcon type="Storage" size={34} />
                  <div>
                    Storage<small>Space for what’s next</small>
                  </div>
                  <b>→</b>
                </button>
                <button onClick={() => choose("Peripherals", "Monitors")}>
                  <TechIcon type="Monitors" size={34} />
                  <div>
                    Monitors & peripherals<small>Refine your workspace</small>
                  </div>
                  <b>→</b>
                </button>
              </div>
            </div>
            <div className="category-tiles">
              {Object.keys(productCategories).map((c) => (
                <button key={c} onClick={() => choose(c)}>
                  <TechIcon type={c} size={30} />
                  <span>{c}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {page !== "Shop" && (
          <div className="section-intro">
            <span className="eyebrow">
              {page === "Auctions"
                ? "BID. WIN. UPGRADE."
                : "EXPERTISE FOR YOUR NEXT PROJECT"}
            </span>
            <h1>
              {page === "Auctions" ? "Tech auctions" : "Technology services"}
            </h1>
            <p>
              {page === "Auctions"
                ? `${activeAuctions} live auctions · Browse lots and place your next bid.`
                : "Find technical support, developers, designers and consultants."}
            </p>
          </div>
        )}
        <div className="catalog-breadcrumb">
          <button onClick={() => choose("All")}>{page}</button>
          {category !== "All" && (
            <>
              <span>/</span>
              <button onClick={() => choose(category)}>{category}</button>
            </>
          )}
          {subcategory !== "All" && (
            <>
              <span>/</span>
              <span>{subcategory}</span>
            </>
          )}
        </div>
        <div className="catalog-heading">
          <div>
            <h2>
              {subcategory !== "All"
                ? subcategory
                : category !== "All"
                  ? category
                  : page === "Shop"
                    ? "Explore the marketplace"
                    : page === "Auctions"
                      ? "Auction listings"
                      : "Available services"}
            </h2>
            <span>
              {rows.length} {rows.length === 1 ? "result" : "results"}
            </span>
          </div>
          <label>
            Sort by
            <select
              aria-label="Sort listings"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest arrivals</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              {page === "Auctions" && (
                <option value="ending">Ending soonest</option>
              )}
            </select>
          </label>
        </div>
        <div className="catalog-tools">
          <label className="checkline">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
            />
            In stock only
          </label>
          {(category !== "All" || query || inStock) && (
            <button
              onClick={() => {
                choose("All");
                setQuery("");
                setInStock(false);
              }}
            >
              Clear filters ×
            </button>
          )}
          <span>
            {page === "Shop"
              ? "Items for sale only"
              : page === "Auctions"
                ? "Auctions only"
                : "Services only"}
          </span>
        </div>
        <div className="retail-grid">
          {rows.map((i) => {
            const closed =
              i.kind === "AUCTION" &&
              (i.auctionStatus !== "OPEN" ||
                Date.parse(i.endsAt) <= Date.now());
            return (
              <article className="retail-card" key={i.id}>
                <button
                  className="retail-image"
                  aria-label={"View " + i.title}
                  onClick={() => open({ type: "detail", item: i })}
                >
                  <div className="image-placeholder">
                    <TechIcon type={i.subcategory || i.category} size={74} />
                    <small>{i.subcategory || i.category}</small>
                  </div>
                  <ListingPhotos id={i.id} compact />
                </button>
                <div className="retail-card-body">
                  <span className="retail-category">
                    {i.category} / {i.subcategory}
                  </span>
                  <button
                    className="retail-title"
                    onClick={() => open({ type: "detail", item: i })}
                  >
                    {i.title}
                  </button>
                  <p className="retail-description">{i.description}</p>
                  <div className="retail-price">
                    {money(i.price)}
                    <small>
                      {i.kind === "AUCTION"
                        ? "current / starting bid"
                        : i.kind === "SERVICE"
                          ? "per session"
                          : ""}
                    </small>
                  </div>
                  <p
                    className={
                      "availability " +
                      (i.stock < 1 || closed ? "unavailable" : "")
                    }
                  >
                    {i.kind === "AUCTION"
                      ? closed
                        ? "Bidding ended"
                        : "Ends " + new Date(i.endsAt).toLocaleString()
                      : i.kind === "SERVICE"
                        ? "Request your preferred date"
                        : i.stock > 0
                          ? `${i.stock} in stock`
                          : "Out of stock"}
                  </p>
                  <button
                    className="retail-action"
                    disabled={i.stock < 1 || closed}
                    onClick={() => {
                      if (["SALE", "DIGITAL"].includes(i.kind)) {
                        setCart((c) =>
                          c.some((x) => x.id === i.id) ? c : [...c, i],
                        );
                        setNotice("Added to your cart.");
                      } else open({ type: "detail", item: i });
                    }}
                  >
                    {i.kind === "AUCTION"
                      ? "View auction"
                      : i.kind === "SERVICE"
                        ? "View service"
                        : "Add to cart"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {!rows.length && (
          <div className="catalog-empty">
            <TechIcon type={category} />
            <h3>No listings here yet</h3>
            <p>
              Try another category, clear your search, or create the first
              listing.
            </p>
            <button
              onClick={() => {
                choose("All");
                setQuery("");
                setInStock(false);
              }}
            >
              Show all {page === "Shop" ? "products" : page.toLowerCase()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
