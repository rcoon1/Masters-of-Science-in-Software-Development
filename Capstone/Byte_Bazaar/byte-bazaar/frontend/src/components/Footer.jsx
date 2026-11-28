import React from "react";
export default function Footer({ onExplore }) {
  return (
    <footer>
      <a className="brand" href="#" onClick={() => onExplore()}>
        byte bazaar.
      </a>
      <span>Tech finds its people.</span>
      <small>
        Prototype marketplace · Demo orders only · No payment collected
      </small>
    </footer>
  );
}
