export function PlanFurniture({ rooms }: { rooms: number }) {
  return (
    <g className="plan-furniture" aria-hidden="true" pointerEvents="none">
      <path
        d="M8 108H126V8M126 155V200M8 155H60"
        fill="none"
        stroke="#f3ede1"
        strokeWidth="5"
      />
      <path
        d="M126 110V132M126 154A22 22 0 0 0 104 132H126"
        fill="none"
        stroke="#b8ad9a"
        strokeWidth="1.5"
      />
      <rect
        x="19"
        y="19"
        width="67"
        height="76"
        rx="3"
        fill="#d1c9b8"
        stroke="#a69f90"
        strokeWidth="2"
      />
      <rect x="23" y="38" width="59" height="52" rx="2" fill="#e6e3d8" />
      <path d="M23 73H82" stroke="#79908a" strokeWidth="12" />
      <rect x="25" y="23" width="24" height="14" rx="4" fill="#f5f0e6" />
      <rect x="55" y="23" width="24" height="14" rx="4" fill="#f5f0e6" />
      <rect
        x="97"
        y="19"
        width="18"
        height="63"
        fill="#b0a18b"
        stroke="#8b806e"
      />
      <path d="M97 39H115M97 60H115" stroke="#ded3bd" />
      <rect
        x="149"
        y="23"
        width="57"
        height="23"
        rx="6"
        fill="#8eaaa2"
        stroke="#68867d"
        strokeWidth="3"
      />
      <rect x="149" y="45" width="17" height="28" rx="4" fill="#8eaaa2" />
      <rect
        x="158"
        y="80"
        width="37"
        height="22"
        rx="10"
        fill="#c2ab88"
        stroke="#a68d6d"
      />
      <rect x="216" y="48" width="8" height="64" rx="2" fill="#67736e" />
      <rect
        x="143"
        y="139"
        width="67"
        height="17"
        fill="#ece6d9"
        stroke="#afa793"
      />
      <rect
        x="198"
        y="154"
        width="12"
        height="39"
        fill="#ece6d9"
        stroke="#afa793"
      />
      <circle cx="158" cy="147" r="4" fill="none" stroke="#6f7773" />
      <circle cx="176" cy="147" r="4" fill="none" stroke="#6f7773" />
      <rect
        x="22"
        y="168"
        width="28"
        height="23"
        rx="4"
        fill="#e4e8e3"
        stroke="#a9b5ac"
      />
      <ellipse
        cx="83"
        cy="181"
        rx="10"
        ry="14"
        fill="#eef0ea"
        stroke="#a9b5ac"
      />
      <circle cx="210" cy="21" r="10" fill="#506d50" />
      <circle cx="207" cy="18" r="7" fill="#759370" />
      {rooms > 2 && (
        <g>
          <rect x="145" y="111" width="34" height="19" rx="3" fill="#b9ae97" />
          <circle cx="162" cy="122" r="8" fill="#e8e1d1" />
        </g>
      )}
    </g>
  );
}
