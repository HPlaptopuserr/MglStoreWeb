import { ClubAdminContent } from "../ClubAdminAccess";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Building2,
  ChevronRight,
  FileText,
  Handshake,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { clubRoutes } from "../club-routes";
import styles from "./club-profile.module.css";

interface ProfileAction {
  href: (typeof clubRoutes)[keyof typeof clubRoutes];
  title: string;
  description: string;
  icon: LucideIcon;
}

const exploreActions: readonly ProfileAction[] = [
  {
    href: clubRoutes.directory,
    title: "Гишүүдтэй холбогдох",
    description: "Аймаг, үйлчилгээний чиглэлээр хайх",
    icon: UsersRound,
  },
  {
    href: clubRoutes.needs,
    title: "Хамтын ажиллагааны хэрэгцээ",
    description: "Таны үйлчилгээг хайж буй бизнесүүд",
    icon: Handshake,
  },
];
const informationActions: readonly ProfileAction[] = [
  {
    href: clubRoutes.introduction,
    title: "Клубийн танилцуулга",
    description: "Зорилго, боломж, уулзалтын хөтөлбөр",
    icon: FileText,
  },
  {
    href: clubRoutes.principles,
    title: "Клубийн зарчим",
    description: "Итгэлцэлд суурилсан хамтын ажиллагаа",
    icon: ShieldCheck,
  },
];

export function ClubProfileActions() {
  return (
    <>
      <section
        className={styles.business}
        aria-labelledby="club-business-title"
      >
        <span className={styles.businessIcon}>
          <Building2 size={23} aria-hidden="true" />
        </span>
        <div>
          <span className={styles.eyebrow}>ТАНЫ БИЗНЕС · ТАНЫ БОЛОМЖ</span>
          <h2 id="club-business-title">Бизнесээ клубт таниулаарай</h2>
          <p>
            Нэр, лого, үйлчилгээ, утас болон хамтран ажиллах хэрэгцээгээ
            гишүүдийн жагсаалтад пост болгон нэмнэ.
          </p>
        </div>
        <ClubAdminContent>
          <Link className={styles.businessLink} href={clubRoutes.join}>
            Байгууллагын пост нэмэх{" "}
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </ClubAdminContent>
      </section>
      <section className={styles.business}>
        <div>
          <h2>Байгууллагын мэдээлэл</h2>
          <p>
            Систем админ байгууллагын нэр, лого, холбоо барих мэдээлэл, вэб
            танилцуулга, мэдээг эндээс удирдана.
          </p>
        </div>
        <ClubAdminContent>
          <Link className={styles.businessLink} href="/mgl-club/manage">
            Байгууллага удирдах <ArrowUpRight size={17} />
          </Link>
        </ClubAdminContent>
      </section>
      <ClubAdminContent>
        <section className={styles.business}>
          <div>
            <h2>Алтан гишүүний танилцуулгын вэб</h2>
            <p>
              Байгууллагуудын жагсаалтаас сонгож, загварын дагуу зураг,
              мэдээллийг нь оруулна. Төлбөр нь баталгаажсан Алтан гишүүнд
              нээлттэй.
            </p>
          </div>
          <Link className={styles.businessLink} href="/mgl-club/manage#website">
            Байгууллага сонгож вэб үүсгэх <ArrowUpRight size={17} />
          </Link>
        </section>
      </ClubAdminContent>
      <ProfileActionSection title="Клуб дотор" actions={exploreActions} />
      <ProfileActionSection
        title="Клубийн тухай"
        actions={informationActions}
      />
    </>
  );
}

interface ProfileActionSectionProps {
  title: string;
  actions: readonly ProfileAction[];
}

function ProfileActionSection({ title, actions }: ProfileActionSectionProps) {
  return (
    <section className={styles.actionSection} aria-label={title}>
      <h2>{title}</h2>
      <div className={styles.actionList}>
        {actions.map(
          ({ href, title: actionTitle, description, icon: Icon }) => (
            <Link key={href} href={href} className={styles.actionRow}>
              <span className={styles.actionIcon}>
                <Icon size={21} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className={styles.actionCopy}>
                <strong>{actionTitle}</strong>
                <small>{description}</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ),
        )}
      </div>
    </section>
  );
}
