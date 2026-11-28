import React, { useState } from "react";
import { PhotoPicker, uploadAvatar, uploadPostPhotos } from "./ForumMedia";
import CategoryFields from "./CategoryFields";
import Checkout, { AddressFields, addressText, Invoice } from "./Checkout";
import { api } from "../lib/api";
import ListingPhotos, { PictureInput, uploadPictures } from "./ListingPhotos";
import { money } from "../lib/format";
export default function MarketplaceDialog({
  modal,
  setModal,
  error,
  user,
  cart,
  setCart,
  run,
  form,
  setUser,
  setNotice,
  refresh,
  setReplies,
  replies,
  busy,
  open,
}) {
  const [listingKind, setListingKind] = useState("SALE");
  return (
    <div className="overlay" onClick={() => setModal(null)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Marketplace dialog"
        className={`modal ${modal.type === "checkout" ? "checkout-modal" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close"
          aria-label="Close dialog"
          onClick={() => setModal(null)}
        >
          ×
        </button>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        {["login", "register"].includes(modal.type) && (
          <>
            <span className="eyebrow">WELCOME TO BYTE BAZAAR</span>
            <h2>
              {modal.type === "login"
                ? "Good to see you."
                : "Create your account."}
            </h2>
            <form
              onSubmit={(e) =>
                form(e, async (d) => {
                  const avatar = e.target.elements.avatar?.files[0];
                  const account = await api(
                    "/auth/" + modal.type,
                    "POST",
                    modal.type === "register"
                      ? { ...d, shippingAddress: addressText(d) }
                      : d,
                  );
                  setUser(account);
                  setModal(null);
                  if (avatar) {
                    try {
                      setUser(await uploadAvatar(avatar));
                      setNotice("Account created and avatar saved.");
                    } catch (err) {
                      setNotice(
                        "Account created. Avatar could not be uploaded: " +
                          err.message +
                          ". Try again from your account page.",
                      );
                    }
                  } else setNotice("You’re signed in. Welcome to the bazaar.");
                })
              }
            >
              {modal.type === "register" && (
                <>
                  <label>
                    Username
                    <input
                      name="username"
                      autoComplete="username"
                      minLength={3}
                      maxLength={32}
                      pattern="[A-Za-z][A-Za-z0-9_]{2,31}"
                      required
                    />
                    <small>
                      3–32 characters. Start with a letter; use letters, numbers
                      or underscores. This is your public forum name.
                    </small>
                  </label>
                  <PhotoPicker avatar />
                  <div className="form-grid">
                    <label>
                      First name
                      <input
                        name="firstName"
                        autoComplete="given-name"
                        required
                        maxLength={50}
                      />
                    </label>
                    <label>
                      Last name
                      <input
                        name="lastName"
                        autoComplete="family-name"
                        required
                        maxLength={50}
                      />
                    </label>
                  </div>
                  <label>
                    Phone number
                    <input
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      pattern={"[+0-9() .\\-]{7,40}"}
                    />
                  </label>
                  <h3>Shipping address</h3>
                  <div className="form-grid">
                    <AddressFields />
                  </div>
                </>
              )}
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  minLength="8"
                  maxLength="72"
                  required
                  autoComplete={
                    modal.type === "login" ? "current-password" : "new-password"
                  }
                />
              </label>
              <button className="dark" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : modal.type === "login"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>
            <button
              onClick={() =>
                open({ type: modal.type === "login" ? "register" : "login" })
              }
            >
              {modal.type === "login"
                ? "New here? Create an account"
                : "Already a member? Sign in"}
            </button>
          </>
        )}
        {modal.type === "detail" && (
          <>
            <span className="eyebrow">
              {modal.item.kind} · {modal.item.category}
            </span>
            <h2>{modal.item.title}</h2>
            <p className="detail-taxonomy">
              {modal.item.category} / {modal.item.subcategory}
            </p>
            <ListingPhotos
              id={modal.item.id}
              editable={
                !!user && (user.admin || user.id === modal.item.sellerId)
              }
            />
            <p>{modal.item.description}</p>
            <h2>{money(modal.item.price)}</h2>
            {modal.item.kind === "AUCTION" && (
              <p>
                {modal.item.auctionStatus === "CLOSED"
                  ? modal.item.winningBidId
                    ? "Auction closed. Winning bid recorded."
                    : "Auction closed with no bids."
                  : Date.parse(modal.item.endsAt) <= Date.now()
                    ? "Bidding ended. Awaiting final results."
                    : `Closes ${new Date(modal.item.endsAt).toLocaleString()}.`}{" "}
                No payment is collected.
              </p>
            )}
            {modal.item.kind === "SERVICE" ? (
              <form
                onSubmit={(e) =>
                  form(e, async (d) => {
                    await api("/bookings", "POST", {
                      ...d,
                      listingId: modal.item.id,
                    });
                    setModal(null);
                    setNotice(
                      "Service request submitted. View it in your dashboard.",
                    );
                  })
                }
              >
                <label>
                  Requested date
                  <input
                    name="scheduledDate"
                    type="date"
                    min={new Date(Date.now() + 86400000)
                      .toISOString()
                      .slice(0, 10)}
                    required
                  />
                </label>
                <label>
                  Project notes
                  <textarea name="notes" maxLength="255" required />
                </label>
                <button className="dark" disabled={busy}>
                  Request booking
                </button>
              </form>
            ) : modal.item.kind === "AUCTION" ? (
              <form
                onSubmit={(e) =>
                  form(e, async (d) => {
                    await api("/listings/" + modal.item.id + "/bids", "POST", {
                      amount: Number(d.amount),
                    });
                    await refresh();
                    setModal(null);
                    setNotice("Your bid was recorded.");
                  })
                }
              >
                <label>
                  Your bid
                  <input
                    type="number"
                    name="amount"
                    min={Number(modal.item.price) + 0.01}
                    step=".01"
                    required
                  />
                </label>
                <button
                  className="dark"
                  disabled={
                    busy ||
                    modal.item.auctionStatus !== "OPEN" ||
                    new Date(modal.item.endsAt) <= new Date()
                  }
                >
                  Place bid
                </button>
              </form>
            ) : (
              <button
                className="dark"
                disabled={modal.item.stock < 1}
                onClick={() => {
                  setCart((c) =>
                    c.some((i) => i.id === modal.item.id)
                      ? c
                      : [...c, modal.item],
                  );
                  setModal(null);
                  setNotice("Added to your cart.");
                }}
              >
                Add to cart
              </button>
            )}
            {!user && (
              <p>Sign in before placing bids or requesting services.</p>
            )}
          </>
        )}
        {modal.type === "cart" && (
          <>
            <h2>Your cart</h2>
            {cart.map((i) => (
              <div className="row" key={i.id}>
                <span>{i.title}</span>
                <strong>{money(i.price)}</strong>
                <button
                  aria-label={"Remove " + i.title}
                  onClick={() => setCart(cart.filter((x) => x.id !== i.id))}
                >
                  ×
                </button>
              </div>
            ))}
            {!cart.length ? (
              <p>Your cart is empty.</p>
            ) : (
              <>
                <h3>
                  Total {money(cart.reduce((s, i) => s + Number(i.price), 0))}
                </h3>
                <p>
                  Demo checkout creates order records and reserves stock. No
                  money is charged and no files are delivered.
                </p>
                <button
                  className="dark"
                  disabled={busy}
                  onClick={() =>
                    user ? open({ type: "checkout" }) : open({ type: "login" })
                  }
                >
                  {user ? "Continue to checkout" : "Sign in to continue"}
                </button>
              </>
            )}
          </>
        )}
        {modal.type === "checkout" && user && (
          <Checkout
            {...{
              user,
              cart,
              setCart,
              form,
              busy,
              refresh,
              setModal,
              setNotice,
            }}
          />
        )}
        {modal.type === "invoice" && <Invoice orders={modal.orders} />}
        {modal.type === "sell" && (
          <>
            <h2>Make your next listing.</h2>
            <form
              onSubmit={(e) =>
                form(e, async (d) => {
                  const pictures = Array.from(e.target.elements.pictures.files);
                  const listing = await api("/listings", "POST", {
                    ...d,
                    price: Number(d.price),
                    stock: Number(d.stock),
                    endsAt: d.endsAt ? new Date(d.endsAt).toISOString() : null,
                  });
                  await refresh();
                  setModal(null);
                  try {
                    await uploadPictures(listing.id, pictures);
                    setNotice("Your listing is live in the marketplace.");
                  } catch (err) {
                    setNotice(
                      "Listing saved. Photos failed: " +
                        err.message +
                        ". Open your listing to add pictures.",
                    );
                  }
                })
              }
            >
              <label>
                Title
                <input name="title" maxLength="255" required />
              </label>
              <label>
                Description
                <textarea name="description" maxLength="255" required />
              </label>
              <div className="form-grid">
                <label>
                  Listing type
                  <select
                    name="kind"
                    value={listingKind}
                    onChange={(e) => setListingKind(e.target.value)}
                  >
                    {["SALE", "DIGITAL", "AUCTION", "SERVICE"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Price / starting bid
                  <input
                    name="price"
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step=".01"
                    required
                  />
                </label>
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
              </div>
              <CategoryFields kind={listingKind} />
              <PictureInput />
              <label>
                Auction closes (required for auctions)
                <input name="endsAt" type="datetime-local" />
              </label>
              <button className="dark" disabled={busy}>
                Publish listing
              </button>
            </form>
          </>
        )}
        {modal.type === "topic" && (
          <>
            <h2>Start a topic</h2>
            <form
              onSubmit={(e) =>
                form(e, async (d) => {
                  const files = Array.from(e.target.elements.pictures.files);
                  const topic = await api("/topics", "POST", d);
                  setModal(null);
                  try {
                    await uploadPostPhotos(topic.id, null, files);
                    setNotice("Topic posted.");
                  } catch (err) {
                    setNotice(
                      "Topic posted. Photos could not be uploaded: " +
                        err.message +
                        ". Open your topic and choose Add photos to this post to retry.",
                    );
                  }
                  await refresh();
                })
              }
            >
              <CategoryFields
                forum
                initialCategory={modal.category}
                initialSubcategory={modal.subcategory}
              />
              <label>
                Title
                <input name="title" maxLength="255" required />
              </label>
              <label>
                Your post
                <textarea name="body" maxLength="5000" rows={8} required />
              </label>
              <PhotoPicker />
              <button className="dark" disabled={busy}>
                Post to community
              </button>
            </form>
          </>
        )}
        {modal.type === "thread" && (
          <>
            <span className="eyebrow">{modal.item.author}</span>
            <h2>{modal.item.title}</h2>
            <p className="detail-taxonomy">
              {modal.item.category} / {modal.item.subcategory}
            </p>
            <p>{modal.item.body}</p>
            {replies.map((r) => (
              <div className="reply" key={r.id}>
                <strong>{r.author}</strong>
                <p>{r.body}</p>
              </div>
            ))}
            {user ? (
              <form
                onSubmit={(e) =>
                  form(e, async (d) => {
                    await api(
                      "/topics/" + modal.item.id + "/replies",
                      "POST",
                      d,
                    );
                    setReplies(
                      await api("/topics/" + modal.item.id + "/replies"),
                    );
                    document.getElementById("reply-body").value = "";
                  })
                }
              >
                <label>
                  Your reply
                  <textarea
                    id="reply-body"
                    name="body"
                    maxLength="255"
                    required
                  />
                </label>
                <button className="dark" disabled={busy}>
                  Reply
                </button>
              </form>
            ) : (
              <button onClick={() => open({ type: "login" })}>
                Sign in to join the conversation ↗
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
