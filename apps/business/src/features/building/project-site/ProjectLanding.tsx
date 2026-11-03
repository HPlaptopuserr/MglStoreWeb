import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProjectNavigation } from "./ProjectNavigation";
import { ProjectHero } from "./ProjectHero";
import { ProjectAbout } from "./ProjectAbout";
import { ApartmentTypes } from "./ApartmentTypes";
import { ProjectFloorChooser } from "./ProjectFloorChooser";
import { ProjectQuestions } from "./ProjectQuestions";
import "./project.css";
export function ProjectLanding() {
  return (
    <div className="residence">
      <ProjectNavigation />
      <main>
        <ProjectHero />
        <ProjectAbout />
        <ApartmentTypes />
        <ProjectFloorChooser />
        <ProjectQuestions />
        <section className="residence-final-cta">
          <p className="residence-eyebrow">ТАНЫ СОНГОЛТ ЭНДЭЭС ЭХЭЛНЭ</p>
          <h2>
            Өөрийн орон зайг <em>олоорой.</em>
          </h2>
          <a href="#choose-floor" className="residence-button">
            Байраа сонгох
            <ArrowUpRight size={18} />
          </a>
        </section>
      </main>
      <footer className="residence-footer">
        <Link href="/building/demo">
          ӨРГӨӨ <b>16</b>
        </Link>
        <span>MGL Business · Жишээ төсөл</span>
        <Link href="/building/manage">Удирдлагын хэсэг ↗</Link>
      </footer>
    </div>
  );
}
