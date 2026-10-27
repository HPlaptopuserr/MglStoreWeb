export default function ManagementLoading() {
  return (
    <section
      aria-busy="true"
      role="status"
      className="management-route-loading"
    >
      <p>Хуудас ачаалж байна…</p>
      <div aria-hidden="true" />
      <div aria-hidden="true" />
      <div aria-hidden="true" />
    </section>
  );
}
