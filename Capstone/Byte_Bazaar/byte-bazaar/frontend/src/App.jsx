import ListingPhotos from "./components/ListingPhotos";
import Profile from "./components/Profile";
import AdminDashboard from "./components/AdminDashboard";
import MarketplaceDialog from "./components/MarketplaceDialog";
import Catalog from "./components/Catalog";
import Community from "./components/Community";
import Footer from "./components/Footer";
import React, { useEffect, useState } from "react";
import { api } from "./lib/api";
import { money } from "./lib/format";
export default function App() {
  const [page, setPage] = useState("Shop"),
    [items, setItems] = useState([]),
    [topics, setTopics] = useState([]),
    [user, setUser] = useState(null),
    [cart, setCart] = useState([]),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [subcategory, setSubcategory] = useState("All"),
    [modal, setModal] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [orders, setOrders] = useState([]),
    [bookings, setBookings] = useState([]),
    [replies, setReplies] = useState([]),
    [busy, setBusy] = useState(false);
  async function refresh() {
    const [i, t] = await Promise.all([api("/listings"), api("/topics")]);
    setItems(i);
    setTopics(t);
  }
  useEffect(() => {
    refresh().catch((e) =>
      setError(
        "Cannot connect to the API. Start the Spring Boot API in VS Code, then reload.",
      ),
    );
    api("/auth/me")
      .then(setUser)
      .catch(() => {});
  }, []);
  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function open(m) {
    setError("");
    setModal(m);
  }
  async function dashboard() {
    setPage("Dashboard");
    if (user)
      await run(async () => {
        const [o, b] = await Promise.all([api("/orders"), api("/bookings")]);
        setOrders(o);
        setBookings(b);
      });
  }
  function form(event, fn) {
    event.preventDefault();
    const d = Object.fromEntries(new FormData(event.currentTarget));
    run(() => fn(d));
  }
  return (
    <>
      <div className="utility-strip">
        <span>BYTE BAZAAR · THE TECHNOLOGY MARKETPLACE</span>
        <button onClick={dashboard}>Orders & invoices</button>
      </div>
      <header className="retail-header">
        <button
          className="brand"
          onClick={() => {
            setPage("Shop");
            setCategory("All");
            setSubcategory("All");
            setQuery("");
          }}
        >
          <span className="logo">BB</span>
          <span>
            byte<span className="brand-accent">bazaar</span>
            <small>YOUR NEXT UPGRADE</small>
          </span>
        </button>
        <form
          className="global-search"
          onSubmit={(e) => {
            e.preventDefault();
            if (!["Shop", "Auctions", "Services"].includes(page))
              setPage("Shop");
          }}
        >
          <select
            aria-label="Search section"
            value={
              ["Shop", "Auctions", "Services"].includes(page) ? page : "Shop"
            }
            onChange={(e) => {
              setPage(e.target.value);
              setCategory("All");
              setSubcategory("All");
            }}
          >
            <option>Shop</option>
            <option>Auctions</option>
            <option>Services</option>
          </select>
          <input
            aria-label="Search marketplace"
            placeholder="Search products, model numbers and more"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button aria-label="Search" type="submit">
            ⌕
          </button>
        </form>
        <div className="retail-account">
          <button
            onClick={() => (user ? dashboard() : open({ type: "login" }))}
          >
            <small>
              {user ? `Hello, ${user.name.split(" ")[0]}` : "Welcome, sign in"}
            </small>
            <b>Account & orders</b>
          </button>
          <button
            className="cart-button"
            onClick={() => open({ type: "cart" })}
          >
            Cart <b>{cart.length}</b>
          </button>
        </div>
      </header>
      <nav className="retail-nav" aria-label="Main navigation">
        <div>
          {["Shop", "Auctions", "Services", "Community"].map((x) => (
            <button
              key={x}
              className={page === x ? "active" : ""}
              onClick={() => {
                setPage(x);
                setCategory("All");
                setSubcategory("All");
                setQuery("");
              }}
            >
              {x === "Shop" ? "Items for sale" : x}
            </button>
          ))}
        </div>
        <div>
          <button onClick={() => open({ type: user ? "sell" : "login" })}>
            Sell on Byte Bazaar
          </button>
          <button
            onClick={() => {
              setError("");
              setPage("Admin");
            }}
          >
            {user?.admin ? "Admin dashboard" : "Admin sign-in"}
          </button>
        </div>
      </nav>
      <main className={page === "Community" ? "community-main" : ""}>
        {page === "Admin" && (
          <AdminDashboard user={user} onUser={setUser} refresh={refresh} />
        )}
        {error && (
          <div role="alert" className="alert">
            {error}
            <button onClick={() => setError("")}>Dismiss</button>
          </div>
        )}
        {notice && (
          <div role="status" className="notice">
            {notice}
            <button onClick={() => setNotice("")}>Dismiss</button>
          </div>
        )}
        {["Shop", "Auctions", "Services"].includes(page) && (
          <Catalog
            {...{
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
            }}
          />
        )}
        {page === "Community" && (
          <Community {...{ topics, user, open, run, refresh, busy }} />
        )}
        {page === "Dashboard" && !user && (
          <section className="account-signin">
            <h1>Your account</h1>
            <p>Sign in to view orders, invoices and service requests.</p>
            <button className="dark" onClick={() => open({ type: "login" })}>
              Sign in
            </button>
          </section>
        )}
        {page === "Dashboard" && user && (
          <section>
            <span className="eyebrow">YOUR BYTE BAZAAR</span>
            <h1>Hello, {user?.name}.</h1>
            <button
              onClick={() =>
                run(async () => {
                  await api("/auth/logout", "POST");
                  setUser(null);
                  setPage("Shop");
                  setModal(null);
                })
              }
            >
              Sign out
            </button>
            <Profile {...{ user, setUser, refresh }} />
            <h2>Your orders</h2>
            {!orders.length && (
              <p>No orders yet. Your next discovery is waiting.</p>
            )}
            {orders.map((o) => (
              <div className="row" key={o.id}>
                <span>
                  #{o.id} · {o.title}
                </span>
                <strong>{money(o.total)}</strong>
                <small>{o.status}</small>
                <button
                  onClick={() =>
                    open({
                      type: "invoice",
                      orders: orders.filter((x) =>
                        o.checkoutId
                          ? x.checkoutId === o.checkoutId
                          : x.id === o.id,
                      ),
                    })
                  }
                >
                  Print invoice
                </button>
              </div>
            ))}
            <h2>Service requests</h2>
            {!bookings.length && <p>No service requests yet.</p>}
            {bookings.map((b) => (
              <div className="row" key={b.id}>
                <span>{items.find((i) => i.id === b.listingId)?.title}</span>
                <span>{b.scheduledDate}</span>
                <small>{b.status}</small>
              </div>
            ))}
            <h2>Your listings</h2>
            {items
              .filter((i) => i.sellerId === user?.id)
              .map((i) => (
                <div className="row" key={i.id}>
                  {i.title}
                  <span>
                    {money(i.price)} · {i.stock} in stock
                  </span>
                </div>
              ))}
          </section>
        )}
        <section className="banner">
          <div>
            <span className="eyebrow">HAVE SOMETHING WORTH SHARING?</span>
            <h2>Your next customer is here.</h2>
            <p>Turn your tech, talent, and ideas into new possibilities.</p>
          </div>
          <button onClick={() => open({ type: user ? "sell" : "login" })}>
            Open your storefront ↗
          </button>
        </section>
      </main>
      <Footer onExplore={() => setPage("Shop")} />
      {modal && (
        <MarketplaceDialog
          modal={modal}
          setModal={setModal}
          error={error}
          user={user}
          cart={cart}
          setCart={setCart}
          run={run}
          form={form}
          setUser={setUser}
          setNotice={setNotice}
          refresh={refresh}
          setReplies={setReplies}
          replies={replies}
          busy={busy}
          open={open}
        />
      )}
    </>
  );
}
