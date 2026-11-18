import Link from "next/link";
import type { MglClubMember } from "@mgl/types";
import { CompanyLogo } from "./CompanyLogo";
import { ClubHeader } from "./ClubHeader";
import { ClubFooter } from "./ClubFooter";
import { ClubAdminContent } from "./ClubAdminAccess";
import styles from "./company-listing.module.css";

export function CompanyListingDetail({ member }: { member: MglClubMember }) {
  const sections = [
    { title: "Бидний тухай", text: member.description },
    { title: "Бүтээгдэхүүн, үйлчилгээ", text: member.offers },
    { title: "Хамтын ажиллагааны хэрэгцээ", text: member.needs },
  ];
  return (
    <>
      <ClubHeader joining={false} />
      <article className={styles.post}>
        <Link href="/mgl-club#club-directory">← Гишүүдийн жагсаалт</Link>
        <header className={styles.heading}>
          <div className={styles.logo}>
            <CompanyLogo name={member.businessName} url={member.logoUrl} />
          </div>
          <div>
            <p>
              {member.sector} · {member.city}
            </p>
            <h1>{member.businessName}</h1>
          </div>
        </header>
        {sections
          .filter((section) => section.text)
          .map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </section>
          ))}
        <section>
          <h2>Холбоо барих</h2>
          <dl>
            <div>
              <dt>Холбогдох хүн</dt>
              <dd>{member.name}</dd>
            </div>
            <div>
              <dt>Утас</dt>
              <dd>
                <a href={`tel:${member.phone}`}>{member.phone}</a>
              </dd>
            </div>
            <div>
              <dt>Байршил</dt>
              <dd>{member.address || member.city}</dd>
            </div>
            {member.workingHours && (
              <div>
                <dt>Ажиллах цаг</dt>
                <dd>{member.workingHours}</dd>
              </div>
            )}
            {member.serviceArea && (
              <div>
                <dt>Үйлчилгээний бүс</dt>
                <dd>{member.serviceArea}</dd>
              </div>
            )}
            {member.website && (
              <div>
                <dt>Вэб / сошиал хуудас</dt>
                <dd>
                  <a
                    href={member.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {member.website} ↗
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </section>
        <ClubAdminContent>
          <Link href="/mgl-club/manage">Байгууллагын мэдээлэл засах ↗</Link>
        </ClubAdminContent>
      </article>
      <ClubFooter />
    </>
  );
}
