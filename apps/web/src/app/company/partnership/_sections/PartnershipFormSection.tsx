import { PartnershipForm } from "../../../../components/organisms/partnership/PartnershipForm";

export default function PartnershipFormSection() {
  return (
    <section
      id="partnership-form"
      className="w-full bg-white py-6 sm:py-8 md:py-10 lg:py-12"
    >
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <aside className="lg:sticky lg:top-28">
          <PartnershipForm />
        </aside>
      </div>
    </section>
  );
}