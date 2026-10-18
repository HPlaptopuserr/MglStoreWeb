/** Circulation furnishings are schematic and never participate in unit hit testing. */
export function PlanCommonAreas() {
  return <g pointerEvents="none">
    <path d="M670 538H828V590H905V614H943V581L905 540H828V538H670Z M1009 614H1050V581L1092 540H1172V538H1329V590H1092V614Z" fill="#b8c5c5" stroke="#d8e1de" strokeWidth="2" />
    {[765, 1173].map((x) => <g key={x}>
      <rect x={x} y="390" width="57" height="148" fill="#becaca" stroke="#f3f5ee" strokeWidth="4" />
      {Array.from({ length:12 }, (_, index) => <path key={index} d={`M${x + 7} ${410 + index * 8}h43`} stroke="#76868a" strokeWidth="2" />)}
      <path d={`M${x + 29} 410v92`} stroke="#eef4ee" strokeWidth="3" />
    </g>)}
    {[674,719,1240,1285].map((x) => <g key={x}><rect x={x} y="487" width="39" height="49" rx="2" fill="#859596" stroke="#e5ece7" strokeWidth="3" /><path d={`M${x + 19} 493v37`} stroke="#4f676c" strokeWidth="1.5" /></g>)}
  </g>;
}
