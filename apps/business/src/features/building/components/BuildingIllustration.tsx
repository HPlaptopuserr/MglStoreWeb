export function BuildingIllustration() {
  return (
    <div className="building-illustration" aria-hidden="true">
      <div className="illustration-orbit" />
      <div className="illustration-ground" />
      <div className="tower tower-back">
        {Array.from({ length: 20 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="tower tower-front">
        {Array.from({ length: 24 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="tower tower-side">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <span className="illustration-caption">SPACE FOR YOUR NEXT CHAPTER</span>
    </div>
  );
}
