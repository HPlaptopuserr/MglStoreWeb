/** Lightweight vector animation: no image download is needed during startup. */
export function DigitalLoadingContent() {
  return (
    <div className="digital-loading-content">
      <div className="digital-circuit" aria-hidden="true">
        <svg viewBox="0 0 240 180" fill="none">
          <g className="digital-circuit-traces">
            <path d="M92 70H64V35H28M92 90H18M92 110H64V145H28M148 70H176V35H212M148 90H222M148 110H176V145H212M110 60V18M130 120V162" />
          </g>
          <g className="digital-circuit-signals">
            <path
              pathLength="100"
              d="M28 35H64V70H92M18 90H92M28 145H64V110H92M212 35H176V70H148M222 90H148M212 145H176V110H148M110 18V60M130 162V120"
            />
          </g>
          <g className="digital-circuit-nodes">
            <circle cx="28" cy="35" r="4" />
            <circle cx="18" cy="90" r="4" />
            <circle cx="28" cy="145" r="4" />
            <circle cx="212" cy="35" r="4" />
            <circle cx="222" cy="90" r="4" />
            <circle cx="212" cy="145" r="4" />
            <circle cx="110" cy="18" r="4" />
            <circle cx="130" cy="162" r="4" />
          </g>
          <rect
            className="digital-chip-glow"
            x="82"
            y="52"
            width="76"
            height="76"
            rx="21"
          />
          <rect
            className="digital-chip"
            x="91"
            y="61"
            width="58"
            height="58"
            rx="14"
          />
          <path
            className="digital-chip-mark"
            d="M104 100V80L120 93L136 80V100"
          />
        </svg>
      </div>
      <strong>
        MGL <span>Business</span>
      </strong>
      <p>Таны цахим ажлын орчин</p>
      <div className="digital-loading-progress" aria-hidden="true">
        <span />
      </div>
      <span className="digital-loading-label">Ачаалж байна…</span>
    </div>
  );
}
