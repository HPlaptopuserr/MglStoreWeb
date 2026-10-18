import { ApartmentLayouts } from "./ApartmentLayouts";
import { ProjectContact } from "./ProjectContact";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectOverview } from "./ProjectOverview";
import "./euro-plaza.css";

export function EuroPlazaLanding() {
  return (
    <div className="euro-plaza">
      <a href="#about" className="euro-skip">
        Үндсэн агуулга руу
      </a>
      <ProjectHeader />
      <main>
        <ProjectOverview />
        <ApartmentLayouts />
        <ProjectContact />
      </main>
    </div>
  );
}
