import { JSDOM } from "jsdom";
import { build } from "esbuild";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { unlink } from "node:fs/promises";
const dom = new JSDOM(
  '<!doctype html><html><body><div id="root"></div></body></html>',
  { url: "http://localhost" },
);
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLSelectElement",
  "HTMLTextAreaElement",
  "Event",
  "MouseEvent",
  "FormData",
])
  globalThis[key] = dom.window[key];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const React = require("react"),
  { act } = React,
  { createRoot } = require("react-dom/client");
const fixtureItems = [
  {
    id: 1,
    title: "Mechanical keyboard kit",
    description: "Hot swap keyboard",
    category: "Peripherals",
    subcategory: "Keyboards",
    kind: "SALE",
    price: 129,
    stock: 8,
    sellerId: 1,
  },
  {
    id: 2,
    title: "Fast SSD",
    description: "Solid state storage",
    category: "Storage",
    subcategory: "Solid State Drives",
    kind: "SALE",
    price: 79,
    stock: 4,
    sellerId: 1,
  },
  {
    id: 3,
    title: "Graphics card",
    description: "Graphics",
    category: "PC Components",
    subcategory: "Graphics Cards",
    kind: "SALE",
    price: 399,
    stock: 0,
    sellerId: 1,
  },
  {
    id: 4,
    title: "Workstation auction",
    description: "Workstation",
    category: "Computers & Laptops",
    subcategory: "Workstations",
    kind: "AUCTION",
    price: 250,
    stock: 1,
    sellerId: 1,
    auctionStatus: "OPEN",
    endsAt: "2027-12-31T23:59:00Z",
  },
  {
    id: 5,
    title: "React consultation",
    description: "Consultation",
    category: "Development & Design",
    subcategory: "Web Development",
    kind: "SERVICE",
    price: 85,
    stock: 20,
    sellerId: 1,
  },
  {
    id: 6,
    title: "Icon collection",
    description: "Digital",
    category: "Software & Digital",
    subcategory: "Digital Assets",
    kind: "DIGITAL",
    price: 29,
    stock: 50,
    sellerId: 1,
  },
];
const fixtureTopics = [
  {
    id: 1,
    title: "Welcome to the community",
    body: "Share builds.",
    author: "Studio",
    category: "Community Hub",
    subcategory: "General Discussion",
    createdAt: "2026-11-01T12:00:00Z",
    latestActivity: "2026-11-02T12:00:00Z",
    replyCount: 1,
    lastAuthor: "Alex",
  },
];
let lastTopic, lastListing, lastCheckout;
globalThis.fetch = async (url, options = {}) => {
  const path = url.replace("/api", "");
  let body = [];
  if (path === "/csrf") body = { token: "test" };
  else if (path === "/auth/me")
    body = {
      id: 8,
      firstName: "Test",
      lastName: "Buyer",
      name: "Test Buyer",
      email: "test@example.com",
      phone: "5551234567",
      shippingAddress: "100 Main St",
    };
  else if (path === "/topics" && options.method === "POST") {
    lastTopic = JSON.parse(options.body);
    body = { id: 99, ...lastTopic };
  } else if (path === "/listings" && options.method === "POST") {
    lastListing = JSON.parse(options.body);
    body = { id: 99, ...lastListing };
  } else if (path === "/orders" && options.method === "POST") {
    lastCheckout = JSON.parse(options.body);
    body = [
      {
        id: 99,
        checkoutId: "test-invoice",
        title: "Mechanical keyboard kit",
        total: 136.99,
        shippingCost: 7.99,
        createdAt: "2026-11-19T12:00:00Z",
        ...lastCheckout,
      },
    ];
  } else if (path === "/listings") body = fixtureItems;
  else if (path === "/topics") body = fixtureTopics;
  else if (path === "/topics/1/replies")
    body = [
      {
        id: 1,
        author: "Alex",
        body: "Hello",
        createdAt: "2026-11-02T12:00:00Z",
      },
    ];
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
const appFile = new URL("./.app-check.cjs", import.meta.url);
await build({
  entryPoints: ["src/App.jsx"],
  outfile: appFile.pathname,
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["react", "react-dom", "react-dom/client"],
});
try {
  const { default: App } = require(appFile.pathname),
    root = createRoot(document.getElementById("root"));
  const all = (s) => [...document.querySelectorAll(s)];
  const button = (name, within = document) => {
    const b = [...within.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === name,
    );
    assert.ok(b, "Button: " + name);
    return b;
  };
  const click = async (b) =>
    act(async () => {
      b.click();
    });
  const field = (name) => {
    const f = document.querySelector(`[name="${name}"]`);
    assert.ok(f, "Field " + name);
    return f;
  };
  const change = async (el, value) =>
    act(async () => {
      Object.getOwnPropertyDescriptor(
        el.tagName === "SELECT"
          ? window.HTMLSelectElement.prototype
          : el.tagName === "TEXTAREA"
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype,
        "value",
      ).set.call(el, value);
      el.dispatchEvent(
        new window.Event(el.tagName === "SELECT" ? "change" : "input", {
          bubbles: true,
        }),
      );
    });
  const submit = async (form) =>
    act(async () => {
      form.dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      );
    });
  await act(async () => {
    root.render(React.createElement(App));
  });
  assert.equal(all(".retail-card").length, 4);
  assert.ok(
    !document
      .querySelector(".retail-grid")
      .textContent.includes("Workstation auction"),
  );
  await click(button("Auctions", document.querySelector(".retail-nav")));
  assert.equal(all(".retail-card").length, 1);
  assert.match(
    document.querySelector(".retail-grid").textContent,
    /Workstation auction/,
  );
  await click(button("Services", document.querySelector(".retail-nav")));
  assert.equal(all(".retail-card").length, 1);
  assert.match(
    document.querySelector(".retail-grid").textContent,
    /React consultation/,
  );
  await click(button("Items for sale"));
  await click(
    button("Peripherals", document.querySelector(".category-sidebar")),
  );
  const keyboard = all(".subcategory-links button").find((b) =>
    b.textContent.startsWith("Keyboards"),
  );
  await click(keyboard);
  assert.equal(all(".retail-card").length, 1);
  assert.match(
    document.querySelector(".retail-grid").textContent,
    /Mechanical keyboard/,
  );
  await click(button("Clear filters ×"));
  await change(
    document.querySelector('[aria-label="Search marketplace"]'),
    "SSD",
  );
  assert.equal(all(".retail-card").length, 1);
  await change(document.querySelector('[aria-label="Search marketplace"]'), "");
  await change(
    document.querySelector('[aria-label="Sort listings"]'),
    "price-low",
  );
  assert.match(
    document.querySelector(".retail-card").textContent,
    /Icon collection/,
  );
  await click(document.querySelector('.catalog-tools input[type="checkbox"]'));
  assert.equal(all(".retail-card").length, 3);
  await click(
    button(
      "Add to cart",
      all(".retail-card").find((c) =>
        c.textContent.includes("Mechanical keyboard"),
      ),
    ),
  );
  await click(document.querySelector(".cart-button"));
  await click(button("Continue to checkout"));
  await change(field("city"), "Austin");
  await change(field("region"), "TX");
  await change(field("postal"), "78701");
  await submit(document.querySelector(".checkout-modal form"));
  assert.equal(lastCheckout.shippingMethod, "STANDARD");
  assert.match(lastCheckout.shippingAddress, /Austin/);
  assert.ok(button("Print invoice / Save as PDF"));
  await click(document.querySelector('[aria-label="Close dialog"]'));
  await click(button("Community", document.querySelector(".retail-nav")));
  assert.equal(all(".forum-group").length, 5);
  assert.equal(all(".forum-board-row").length, 18);
  await click(button("General Discussion"));
  assert.equal(all(".forum-topic-row").length, 1);
  await click(document.querySelector(".forum-topic-title"));
  assert.equal(all(".forum-post").length, 2);
  await click(button("← Back to General Discussion"));
  await click(button("Start a topic +"));
  assert.equal(field("category").value, "Community Hub");
  assert.equal(field("subcategory").value, "General Discussion");
  await change(field("title"), "Test topic");
  await change(field("body"), "A topic in the chosen board.");
  await submit(document.querySelector(".modal form"));
  assert.equal(lastTopic.subcategory, "General Discussion");
  await click(button("← All forums"));
  await change(
    document.querySelector('[aria-label="Search community"]'),
    "no matching topics",
  );
  assert.equal(all(".forum-topic-row").length, 0);
  await click(button("Sell on Byte Bazaar"));
  await change(field("kind"), "SERVICE");
  assert.equal(field("category").value, "Tech Support");
  await change(field("category"), "Development & Design");
  await change(field("subcategory"), "Web Development");
  await change(field("title"), "Test service");
  await change(field("description"), "Testing category persistence");
  await change(field("price"), "20");
  await submit(document.querySelector(".modal form"));
  assert.equal(lastListing.kind, "SERVICE");
  assert.equal(lastListing.subcategory, "Web Development");
  await act(async () => root.unmount());
  console.log(
    "PASS: shop/auction/service separation; nested category filters; search; sorting; in-stock filter; checkout and invoice; forum categories, subforums, topic navigation; topic and service category submission. DOM integration with mocked API.",
  );
} finally {
  await unlink(appFile);
}
