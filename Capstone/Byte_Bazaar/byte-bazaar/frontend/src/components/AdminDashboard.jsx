import CategoryFields from "./CategoryFields";
import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import Reports from "./Reports";
import ListingPhotos, { PictureInput, uploadPictures } from "./ListingPhotos";
import { money } from "../lib/format";

export default function AdminDashboard({ user, onUser, refresh }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("Storefront");
  const [kind, setKind] = useState("SALE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setData(await api("/admin/overview"));
  }

  useEffect(() => {
    if (!user?.admin) {
      setData(null);
      return;
    }
    let active = true;
    api("/admin/overview")
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [user]);

  async function run(action, success) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      if (success) setNotice(success);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function login(event) {
    event.preventDefault();
    const credentials = Object.fromEntries(new FormData(event.currentTarget));
    run(async () => onUser(await api("/admin/login", "POST", credentials)));
  }

  function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    run(
      async () => {
        const listing = await api("/admin/listings", "POST", {
          ...fields,
          kind,
          price: Number(fields.price),
          stock: kind === "AUCTION" ? 1 : Number(fields.stock),
          endsAt:
            kind === "AUCTION" ? new Date(fields.endsAt).toISOString() : null,
        });
        const files = Array.from(form.elements.pictures.files);
        form.reset();
        await Promise.all([load(), refresh()]);
        try {
          await uploadPictures(listing.id, files);
        } catch (e) {
          throw Error(
            "Listing saved. Photos failed: " +
              e.message +
              ". Add pictures using Manage listings below.",
          );
        }
        await Promise.all([load(), refresh()]);
      },
      kind === "AUCTION"
        ? "Auction draft saved."
        : "Listing added to the storefront.",
    );
  }

  function changeVisibility(type, item) {
    run(
      async () => {
        await api(`/admin/${type}/${item.id}/visibility`, "POST", {
          hidden: !item.hidden,
        });
        await Promise.all([load(), refresh()]);
      },
      item.hidden ? "Restored." : "Removed from public view.",
    );
  }

  function auction(item, action) {
    if (
      action !== "start" &&
      !window.confirm(
        `${action === "close" ? "Close" : "Cancel"} this auction? This action cannot be undone.`,
      )
    )
      return;
    run(
      async () => {
        await api(`/admin/auctions/${item.id}/${action}`, "POST");
        await Promise.all([load(), refresh()]);
      },
      action === "start"
        ? "Auction started."
        : action === "close"
          ? "Auction closed."
          : "Auction cancelled.",
    );
  }

  return (
    <section className="admin-area">
      <span className="eyebrow">BYTE BAZAAR ADMINISTRATION</span>
      <h1>{user?.admin ? "Admin dashboard" : "Admin sign-in"}</h1>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {!user?.admin ? (
        <form className="admin-form" onSubmit={login}>
          <label>
            Admin email
            <input type="email" name="email" required autoComplete="username" />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button className="dark" disabled={busy}>
            Sign in as admin
          </button>
        </form>
      ) : (
        <>
          <div className="filters">
            {["Storefront", "Auctions", "Moderation", "Reports"].map((name) => (
              <button
                key={name}
                className={tab === name ? "selected" : ""}
                aria-pressed={tab === name}
                onClick={() => {
                  setTab(name);
                  setKind(name === "Auctions" ? "AUCTION" : "SALE");
                }}
              >
                {name}
              </button>
            ))}
            <button disabled={busy} onClick={() => run(load)}>
              Refresh
            </button>
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api("/auth/logout", "POST");
                  onUser(null);
                })
              }
            >
              Sign out
            </button>
          </div>
          {!data ? (
            <p>{error ? "Use Refresh to try again." : "Loading dashboard…"}</p>
          ) : tab === "Reports" ? (
            <Reports />
          ) : tab === "Moderation" ? (
            <>
              <h2>Forum topics</h2>
              {!data.topics.length && <p>No topics yet.</p>}
              {data.topics.map((topic) => (
                <div className="row" key={topic.id}>
                  <div>
                    <strong>{topic.title}</strong>
                    <p>{topic.body}</p>
                    <small>
                      {topic.author} · {topic.hidden ? "Hidden" : "Visible"}
                    </small>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => changeVisibility("topics", topic)}
                  >
                    {topic.hidden ? "Restore topic" : "Hide topic"}
                  </button>
                </div>
              ))}
              <h2>Replies</h2>
              {!data.replies.length && <p>No replies yet.</p>}
              {data.replies.map((reply) => (
                <div className="row" key={reply.id}>
                  <div>
                    <strong>{reply.author}</strong>
                    <p>{reply.body}</p>
                    <small>
                      {
                        data.topics.find((topic) => topic.id === reply.topicId)
                          ?.title
                      }{" "}
                      · {reply.hidden ? "Hidden" : "Visible in public topics"}
                    </small>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => changeVisibility("replies", reply)}
                  >
                    {reply.hidden ? "Restore reply" : "Hide reply"}
                  </button>
                </div>
              ))}
            </>
          ) : (
            <>
              <h2>
                {tab === "Auctions"
                  ? "Create an auction draft"
                  : "Add a storefront listing"}
              </h2>
              <form className="admin-form" onSubmit={create}>
                <PictureInput />
                <label>
                  Title
                  <input name="title" maxLength="255" required />
                </label>
                <label>
                  Description
                  <textarea name="description" maxLength="255" required />
                </label>
                <CategoryFields kind={tab === "Auctions" ? "AUCTION" : kind} />
                {tab === "Storefront" && (
                  <label>
                    Type
                    <select
                      value={kind}
                      onChange={(e) => setKind(e.target.value)}
                    >
                      <option value="SALE">Physical item</option>
                      <option value="DIGITAL">Digital item</option>
                      <option value="SERVICE">Service</option>
                    </select>
                  </label>
                )}
                <label>
                  {tab === "Auctions" ? "Starting price" : "Price"}
                  <input
                    name="price"
                    type="number"
                    step=".01"
                    min=".01"
                    max="9999999999.99"
                    required
                  />
                </label>
                {tab === "Auctions" ? (
                  <label>
                    Closing time (local)
                    <input name="endsAt" type="datetime-local" required />
                  </label>
                ) : (
                  <label>
                    Stock
                    <input
                      name="stock"
                      type="number"
                      min="1"
                      defaultValue="1"
                      required
                    />
                  </label>
                )}
                <button className="dark" disabled={busy}>
                  {tab === "Auctions"
                    ? "Save auction draft"
                    : "Publish listing"}
                </button>
              </form>
              <h2>
                {tab === "Auctions" ? "Manage auctions" : "Manage storefront"}
              </h2>
              {data.listings
                .filter(
                  (item) => (item.kind === "AUCTION") === (tab === "Auctions"),
                )
                .map((item) => (
                  <div className="row" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <ListingPhotos id={item.id} editable />
                      <p>
                        {money(item.price)} ·{" "}
                        {item.hidden
                          ? "Removed"
                          : item.auctionStatus === "OPEN" &&
                              Date.parse(item.endsAt) <= Date.now()
                            ? "Bidding ended · awaiting close"
                            : item.auctionStatus || item.kind}
                        {item.kind === "AUCTION" &&
                          item.endsAt &&
                          ` · ${new Date(item.endsAt).toLocaleString()}`}
                        {item.auctionStatus === "CLOSED" &&
                          (item.winningBidId
                            ? ` · Winner: ${data.winnerNames[item.id] ?? "Bidder"} (bid #${item.winningBidId})`
                            : " · No bids")}
                      </p>
                    </div>
                    <div className="admin-actions">
                      {!item.hidden && item.auctionStatus === "DRAFT" && (
                        <button
                          disabled={
                            busy || Date.parse(item.endsAt) <= Date.now()
                          }
                          onClick={() => auction(item, "start")}
                        >
                          Start
                        </button>
                      )}
                      {!item.hidden && item.auctionStatus === "OPEN" && (
                        <button
                          disabled={busy}
                          onClick={() => auction(item, "close")}
                        >
                          Close and select winner
                        </button>
                      )}
                      {!item.hidden &&
                        ["DRAFT", "OPEN"].includes(item.auctionStatus) && (
                          <button
                            disabled={busy}
                            onClick={() => auction(item, "cancel")}
                          >
                            Cancel auction
                          </button>
                        )}
                      {item.auctionStatus !== "OPEN" && (
                        <button
                          disabled={busy}
                          onClick={() => changeVisibility("listings", item)}
                        >
                          {item.hidden ? "Restore listing" : "Remove listing"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
