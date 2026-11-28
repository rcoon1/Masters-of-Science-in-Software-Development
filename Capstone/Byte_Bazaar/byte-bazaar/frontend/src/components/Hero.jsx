import React from "react";
export default function Hero() {
  return (
    <section className="hero">
      <div>
        <span className="eyebrow">THE MARKETPLACE FOR WHAT’S NEXT</span>
        <h1>
          Good tech.
          <br />
          Great possibilities.
        </h1>
        <p>
          Discover hardware, digital essentials, and people
          <br className="desktop" /> who can help bring your next big idea to
          life.
        </p>
        <button
          className="dark"
          onClick={() =>
            document
              .getElementById("catalog")
              .scrollIntoView({ behavior: "smooth" })
          }
        >
          Find your next thing <span>↗</span>
        </button>
        <div className="hero-foot">
          <span>↗ Built for the curious.</span>
          <span>Made for the creators.</span>
        </div>
      </div>
      <div className="tech-panel">
        <span className="eyebrow">BYTE BAZAAR / MARKETPLACE</span>
        <h2>
          Your next upgrade
          <br />
          starts here.
        </h2>
        <div className="tech-stat">
          <span>01</span>
          <div>
            <h3>Hardware</h3>
            <p>Build a more capable setup.</p>
          </div>
        </div>
        <div className="tech-stat">
          <span>02</span>
          <div>
            <h3>Digital essentials</h3>
            <p>Tools for your next project.</p>
          </div>
        </div>
        <div className="tech-stat">
          <span>03</span>
          <div>
            <h3>Expert services</h3>
            <p>Connect with skilled creators.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
