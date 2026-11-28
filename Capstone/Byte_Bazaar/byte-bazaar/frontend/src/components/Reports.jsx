import React, { useState } from "react";
import { api } from "../lib/api";
import { money } from "../lib/format";

export default function Reports() {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState("revenue");
  const [from, setFrom] = useState(today.slice(0, 7) + "-01");
  const [to, setTo] = useState(today);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const path = () =>
    "/admin/reports?" + new URLSearchParams({ type, from, to });
  async function load(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setReport(null);
    try {
      setReport(await api(path()));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function download(format) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api" + path() + "&format=" + format, {
        credentials: "same-origin",
      });
      if (!res.ok) throw Error((await res.json()).message || "Export failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `byte-bazaar-${type}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function reset(setter, value) {
    setter(value);
    setReport(null);
  }
  const total = report?.rows.reduce((sum, row) => sum + Number(row[2]), 0) || 0;
  const orders =
    report?.rows.reduce((sum, row) => sum + Number(row[1]), 0) || 0;
  return (
    <section className="reports">
      <h2>Reports and revenue analytics</h2>
      <p>
        All amounts are USD. Orders are demonstration records: collected revenue
        is $0. Auction winning bids are unpaid commitments and are excluded from
        order totals. Date ranges use UTC.
      </p>
      <form onSubmit={load} className="report-controls">
        <label>
          Report
          <select value={type} onChange={(e) => reset(setType, e.target.value)}>
            <option value="revenue">Revenue analytics (demo orders)</option>
            <option value="sales">Sales orders</option>
            <option value="auctions">Auction results</option>
            <option value="audit">Administrator audit</option>
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={from}
            required
            onChange={(e) => reset(setFrom, e.target.value)}
          />
        </label>
        <label>
          Through
          <input
            type="date"
            value={to}
            min={from}
            required
            onChange={(e) => reset(setTo, e.target.value)}
          />
        </label>
        <button disabled={busy}>Generate report</button>
      </form>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      {report && (
        <>
          <div className="report-controls">
            <button disabled={busy} onClick={() => window.print()}>
              Print report
            </button>
            <button disabled={busy} onClick={() => download("csv")}>
              Export CSV
            </button>
            <button disabled={busy} onClick={() => download("pdf")}>
              Export PDF
            </button>
          </div>
          <div className="print-report">
            <h2>{report.title}</h2>
            <p>
              {report.from} through {report.to} (UTC)
            </p>
            {type === "revenue" && (
              <>
                <div className="analytics-summary">
                  <strong>Demo order total: {money(total)}</strong>
                  <strong>Orders: {orders}</strong>
                  <strong>Average: {money(orders ? total / orders : 0)}</strong>
                  <strong>Collected revenue: $0.00</strong>
                </div>
                <div
                  className="revenue-chart"
                  aria-label="Daily demo order totals"
                >
                  {report.rows.map((row) => (
                    <div key={row[0]}>
                      <span>{row[0]}</span>
                      <meter
                        min="0"
                        max={Math.max(
                          1,
                          ...report.rows.map((x) => Number(x[2])),
                        )}
                        value={Number(row[2])}
                      />
                      <span>{money(row[2])}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="report-table">
              <table>
                <thead>
                  <tr>
                    {report.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((value, j) => (
                        <td key={j}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!report.rows.length && <p>No records in this range.</p>}
          </div>
        </>
      )}
    </section>
  );
}
