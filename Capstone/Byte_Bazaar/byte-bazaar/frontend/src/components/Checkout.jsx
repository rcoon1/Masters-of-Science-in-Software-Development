import React, { useState } from "react";
import { api } from "../lib/api";
import { money } from "../lib/format";
export function AddressFields({ prefix = "", address = "" }) {
  return (
    <>
      <label className="wide">
        Street address
        <input
          name={prefix + "street"}
          autoComplete="address-line1"
          required
          maxLength={200}
          defaultValue={address}
        />
      </label>
      <label className="wide">
        Apartment / suite (optional)
        <input
          name={prefix + "unit"}
          autoComplete="address-line2"
          maxLength={100}
        />
      </label>
      <label>
        City
        <input
          name={prefix + "city"}
          autoComplete="address-level2"
          required
          maxLength={100}
        />
      </label>
      <label>
        State / region
        <input
          name={prefix + "region"}
          autoComplete="address-level1"
          required
          maxLength={100}
        />
      </label>
      <label>
        Postal code
        <input
          name={prefix + "postal"}
          autoComplete="postal-code"
          required
          maxLength={20}
        />
      </label>
      <label>
        Country
        <input
          name={prefix + "country"}
          autoComplete="country-name"
          required
          defaultValue="United States"
          maxLength={100}
        />
      </label>
    </>
  );
}
export const addressText = (d, p = "") =>
  ["street", "unit", "city", "region", "postal", "country"]
    .map((k) => d[p + k])
    .filter(Boolean)
    .join(", ");
export default function Checkout({
  user,
  cart,
  setCart,
  form,
  busy,
  refresh,
  setModal,
  setNotice,
}) {
  const [method, setMethod] = useState("STANDARD"),
    [same, setSame] = useState(true);
  const subtotal = cart.reduce((s, i) => s + Number(i.price), 0),
    physical = cart.some((i) => i.kind === "SALE"),
    shipping = physical ? (method === "EXPRESS" ? 19.99 : 7.99) : 0;
  return (
    <>
      <span className="eyebrow">CHECKOUT</span>
      <h2>Complete your order</h2>
      <form
        onSubmit={(e) =>
          form(e, async (d) => {
            const result = await api("/orders", "POST", {
              listingIds: cart.map((i) => i.id),
              recipientName: d.firstName + " " + d.lastName,
              email: d.email,
              phone: d.phone,
              shippingAddress: addressText(d),
              billingAddress: same ? addressText(d) : addressText(d, "billing"),
              shippingMethod: method,
            });
            setCart([]);
            await refresh();
            setModal({ type: "invoice", orders: result });
            setNotice("Order created. You can print your invoice.");
          })
        }
      >
        <div className="checkout-layout">
          <div>
            <h3>1. Contact details</h3>
            <div className="form-grid">
              <label>
                First name
                <input
                  name="firstName"
                  defaultValue={user.firstName}
                  autoComplete="given-name"
                  required
                  maxLength={50}
                />
              </label>
              <label>
                Last name
                <input
                  name="lastName"
                  defaultValue={user.lastName}
                  autoComplete="family-name"
                  required
                  maxLength={50}
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Phone
                <input
                  name="phone"
                  type="tel"
                  defaultValue={user.phone}
                  autoComplete="tel"
                  required
                  pattern={"[+0-9() .\\-]{7,40}"}
                />
              </label>
            </div>
            <h3>2. Shipping address</h3>
            <div className="form-grid">
              <AddressFields address={user.shippingAddress} />
            </div>
            <h3>3. Delivery</h3>
            {physical ? (
              <label>
                Shipping method
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="STANDARD">
                    Standard · 5–7 business days · $7.99
                  </option>
                  <option value="EXPRESS">
                    Express · 2–3 business days · $19.99
                  </option>
                </select>
              </label>
            ) : (
              <p>Digital items — no shipping charge.</p>
            )}
            <h3>4. Billing address</h3>
            <label className="checkline">
              <input
                type="checkbox"
                checked={same}
                onChange={(e) => setSame(e.target.checked)}
              />
              Same as shipping address
            </label>
            {!same && (
              <div className="form-grid">
                <AddressFields prefix="billing" />
              </div>
            )}
            <h3>5. Review and place order</h3>
            <p className="checkout-note">
              Demo checkout. No payment is collected. Delivery options are
              estimates; this project does not fulfill shipments. Tax is not
              calculated.
            </p>
          </div>
          <aside className="order-summary">
            <h3>Order summary</h3>
            {cart.map((i) => (
              <div className="row" key={i.id}>
                <span>
                  {i.title}
                  <small>Quantity 1</small>
                </span>
                <strong>{money(i.price)}</strong>
              </div>
            ))}
            <div className="row">
              <span>Subtotal</span>
              <b>{money(subtotal)}</b>
            </div>
            <div className="row">
              <span>Shipping</span>
              <b>{money(shipping)}</b>
            </div>
            <div className="row">
              <span>Tax</span>
              <span>Not calculated</span>
            </div>
            <div className="row grand-total">
              <span>Total</span>
              <b>{money(subtotal + shipping)}</b>
            </div>
            <button className="dark" disabled={busy || !cart.length}>
              {busy ? "Creating order…" : "Place demo order"}
            </button>
            <button type="button" onClick={() => setModal({ type: "cart" })}>
              Back to bag
            </button>
          </aside>
        </div>
      </form>
    </>
  );
}
export function Invoice({ orders }) {
  const first = orders[0],
    total = orders.reduce((s, o) => s + Number(o.total), 0),
    shipping = orders.reduce((s, o) => s + Number(o.shippingCost || 0), 0);
  return (
    <article className="invoice">
      <div className="invoice-head">
        <div>
          <span className="eyebrow">BYTE BAZAAR</span>
          <h2>Invoice</h2>
        </div>
        <div>
          <b>{first.checkoutId || `BB-${first.id}`}</b>
          <p>{new Date(first.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      <p>Demo order · Unpaid · No payment collected</p>
      <div className="form-grid">
        <section>
          <h3>Ship to</h3>
          <p>{first.recipientName}</p>
          <p>
            {first.shippingAddress || "Address unavailable for legacy order"}
          </p>
          <p>{first.email}</p>
          <p>{first.phone}</p>
        </section>
        <section>
          <h3>Bill to</h3>
          <p>{first.recipientName}</p>
          <p>{first.billingAddress || "Address unavailable"}</p>
          <p>{first.shippingMethod}</p>
        </section>
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.title}</td>
              <td>1</td>
              <td>{money(Number(o.total) - Number(o.shippingCost || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Subtotal: {money(total - shipping)}</p>
      <p>Shipping: {money(shipping)}</p>
      <p>Tax: Not calculated</p>
      <h3>Total: {money(total)}</h3>
      <button className="dark no-print" onClick={() => window.print()}>
        Print invoice / Save as PDF
      </button>
    </article>
  );
}
