import Link from "next/link";
export default function CompanySiteNotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fff",
        padding: "80px 24px",
        textAlign: "center",
      }}
    >
      <h1>Байгууллагын танилцуулга олдсонгүй.</h1>
      <Link href="/">MGL Business рүү буцах</Link>
    </main>
  );
}
