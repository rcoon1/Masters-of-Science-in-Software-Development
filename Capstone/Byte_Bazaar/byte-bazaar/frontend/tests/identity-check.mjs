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
  "File",
])
  globalThis[key] = dom.window[key];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let previewId = 0;
URL.createObjectURL = () => `blob:test-${++previewId}`;
URL.revokeObjectURL = () => {};
const require = createRequire(import.meta.url),
  React = require("react"),
  { act } = React,
  { createRoot } = require("react-dom/client");
const bundle = new URL("./.identity-check.cjs", import.meta.url);
await build({
  stdin: {
    contents:
      "export {default as Dialog} from './src/components/MarketplaceDialog.jsx';export {default as Profile} from './src/components/Profile.jsx';export {PostPhotos} from './src/components/ForumMedia.jsx';export {default as Community} from './src/components/Community.jsx';",
    resolveDir: process.cwd(),
    loader: "jsx",
  },
  outfile: bundle.pathname,
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["react", "react-dom", "react-dom/client"],
});
let account = {
    id: 1,
    name: "Private Customer",
    username: "TechBuilder",
    avatarVersion: 0,
  },
  registered,
  uploadedTopic,
  replyUploaded,
  notice,
  profileSaved,
  photoIds = [11],
  lastUpload,
  nextPhotoId = 12;
const topic = {
  id: 7,
  title: "My build",
  body: "A new build.",
  author: "TechBuilder",
  authorId: 1,
  authorAvatarVersion: 12,
  category: "Community Hub",
  subcategory: "General Discussion",
  createdAt: "2026-11-19T12:00:00Z",
};
let replies = [];
globalThis.fetch = async (url, options = {}) => {
  let data = [],
    path = url.replace("/api", "");
  const method = options.method || "GET";
  if (path === "/csrf") data = { token: "test" };
  else if (path === "/auth/register") {
    registered = JSON.parse(options.body);
    account = { ...account, username: registered.username };
    data = account;
  } else if (path === "/profile" && method === "PUT") {
    profileSaved = JSON.parse(options.body);
    account = { ...account, username: profileSaved.username };
    data = account;
  } else if (path === "/profile/avatar" && method === "POST") {
    assert.equal(options.body.get("file").name, "avatar.png");
    account = { ...account, avatarVersion: 123 };
    data = account;
  } else if (path === "/profile/avatar" && method === "DELETE") {
    account = { ...account, avatarVersion: 0 };
    data = account;
  } else if (path === "/topics" && method === "POST") {
    data = { ...JSON.parse(options.body), id: 7 };
  } else if (path === "/topics/7/replies" && method === "POST") {
    const reply = {
      id: 31,
      topicId: 7,
      authorId: 2,
      author: "OtherUser",
      body: JSON.parse(options.body).body,
      createdAt: topic.createdAt,
    };
    replies = [reply];
    data = reply;
  } else if (path === "/topics/7/replies") data = replies;
  else if (path === "/topics/7/replies/31/photos" && method === "POST") {
    replyUploaded = options.body.getAll("files").length;
  } else if (path === "/topics/7/photos" && method === "POST") {
    lastUpload = options.body.getAll("files");
    uploadedTopic = true;
    photoIds = [...photoIds, nextPhotoId++];
  } else if (path === "/topics/7/photos") data = photoIds;
  else if (path.startsWith("/topics/7/photos/") && method === "DELETE") {
    const id = Number(path.split("/").pop());
    photoIds = photoIds.filter((p) => p !== id);
  }
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
const errors = [],
  run = async (fn) => {
    try {
      await fn();
    } catch (e) {
      errors.push(e.message);
    }
  },
  refresh = async () => {};
const root = createRoot(document.getElementById("root"));
const button = (name) => {
  const item = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === name,
  );
  assert.ok(item, "Button: " + name);
  return item;
};
const field = (name) => {
  const el = document.querySelector(`[name="${name}"]`);
  assert.ok(el, "Field: " + name);
  return el;
};
const click = async (el) => act(async () => el.click());
const change = async (el, value) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(
      el.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype,
      "value",
    ).set.call(el, value);
    el.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
const choose = async (el, name = "photo.png", type = "image/png") =>
  act(async () => {
    Object.defineProperty(el, "files", {
      value: [new File(["image bytes"], name, { type })],
      configurable: true,
    });
    el.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
const submit = async (form) =>
  act(async () =>
    form.dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    ),
  );
const form = (event, fn) => {
  event.preventDefault();
  run(() => fn(Object.fromEntries(new FormData(event.currentTarget))));
};
const { Dialog, Profile, PostPhotos, Community } = require(bundle.pathname);
function DialogHarness({ type }) {
  const [modal, setModal] = React.useState({
    type,
    category: "Community Hub",
    subcategory: "General Discussion",
  });
  return modal
    ? React.createElement(Dialog, {
        modal,
        setModal,
        form,
        run,
        user: account,
        setUser: (value) => {
          account = value;
        },
        setNotice: (value) => {
          notice = value;
        },
        refresh,
        cart: [],
        setCart: () => {},
        busy: false,
        open: setModal,
      })
    : React.createElement("p", null, "Closed");
}
function ProfileHarness() {
  const [user, setUser] = React.useState(account);
  return React.createElement(Profile, {
    user,
    setUser: (value) => {
      account = value;
      setUser(value);
    },
    refresh,
  });
}
try {
  await act(async () =>
    root.render(
      React.createElement(DialogHarness, { key: "signup", type: "register" }),
    ),
  );
  assert.equal(field("username").required, true);
  assert.equal(field("username").minLength, 3);
  for (const [name, value] of Object.entries({
    username: "Builder42",
    firstName: "Test",
    lastName: "Buyer",
    phone: "5551234567",
    street: "100 Main",
    city: "Austin",
    region: "TX",
    postal: "78701",
    email: "test@example.com",
    password: "password123",
  }))
    await change(field(name), value);
  await choose(field("avatar"), "avatar.png");
  await submit(document.querySelector(".modal form"));
  assert.equal(registered.username, "Builder42");
  assert.equal(account.avatarVersion, 123);
  assert.match(notice, /avatar saved/);
  await act(async () => root.render(React.createElement(ProfileHarness)));
  assert.match(
    document.querySelector(".forum-avatar img").src,
    /profiles\/1\/avatar\?v=123/,
  );
  await change(field("username"), "NewBuilder");
  await submit(document.querySelector(".profile-settings form"));
  assert.equal(profileSaved.username, "NewBuilder");
  assert.equal(account.username, "NewBuilder");
  await click(button("Remove avatar"));
  assert.equal(document.querySelector(".forum-avatar img"), null);
  await choose(field("avatar"), "avatar.png");
  await submit(document.querySelectorAll(".profile-settings form")[1]);
  assert.equal(account.avatarVersion, 123);
  await act(async () =>
    root.render(
      React.createElement(DialogHarness, { key: "topic", type: "topic" }),
    ),
  );
  await change(field("title"), "My photo post");
  await change(field("body"), "See my build.");
  await choose(field("pictures"));
  await submit(document.querySelector(".modal form"));
  assert.equal(uploadedTopic, true);
  assert.equal(lastUpload.length, 1);
  await act(async () =>
    root.render(
      React.createElement(PostPhotos, {
        topicId: 7,
        authorId: 1,
        user: account,
      }),
    ),
  );
  assert.equal(document.querySelectorAll(".post-photo-grid img").length, 2);
  await click(button("Remove photo"));
  assert.equal(document.querySelectorAll(".post-photo-grid img").length, 1);
  await choose(field("postPhotos-topic"), "bad.txt", "text/plain");
  assert.ok(field("postPhotos-topic").validationMessage);
  await choose(field("postPhotos-topic"));
  await click(button("Upload photos"));
  assert.equal(lastUpload.length, 1);
  await act(async () =>
    root.render(
      React.createElement(PostPhotos, {
        topicId: 7,
        authorId: 1,
        user: { id: 2 },
      }),
    ),
  );
  assert.equal(document.querySelectorAll(".post-photos button").length, 0);
  await act(async () =>
    root.render(
      React.createElement(Community, {
        topics: [topic],
        user: { id: 2, username: "OtherUser" },
        open: () => {},
        run,
        refresh,
        busy: false,
      }),
    ),
  );
  const welcome = [...document.querySelectorAll(".recent-topic")][0];
  await click(welcome);
  assert.match(
    document.querySelector(".forum-post aside").textContent,
    /TechBuilder/,
  );
  assert.ok(
    !document
      .querySelector(".forum-post aside")
      .textContent.includes("Private Customer"),
  );
  await change(field("body"), "Reply with an image");
  await choose(field("pictures"));
  await submit(document.querySelector(".forum-compose form"));
  assert.equal(replyUploaded, 1);
  assert.equal(document.querySelectorAll(".forum-post").length, 2);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: required signup username; signup avatar upload; username editing; avatar display/removal/replacement; topic and reply photo uploads; owner controls; image validation; public forum identity. DOM integration with mocked API.",
  );
} finally {
  await act(async () => root.unmount());
  await unlink(bundle);
}
