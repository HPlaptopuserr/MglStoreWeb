"use client";
export default function CommunityError({ reset }: { reset: () => void }) {
  return (
    <section
      role="alert"
      style={{ padding: "60px 24px", textAlign: "center", color: "#102b50" }}
    >
      <h1>Мэдээллийг ачаалж чадсангүй</h1>
      <p style={{ margin: "16px 0" }}>Холболтоо шалгаад дахин оролдоорой.</p>
      <button
        onClick={reset}
        style={{
          minHeight: 48,
          padding: "12px 24px",
          background: "#103974",
          color: "white",
          borderRadius: 14,
        }}
      >
        Дахин оролдох
      </button>
    </section>
  );
}
