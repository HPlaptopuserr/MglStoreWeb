import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

interface ProjectHeroProps {
  title: ReactNode;
  eyebrow: string;
  description?: ReactNode;
  image?: string | null;
  imageAlt: string;
  location: string;
  chooseHref?: string;
  detailsHref?: string;
}
export function ProjectHero({
  title,
  eyebrow,
  description,
  image,
  imageAlt,
  location,
  chooseHref = "#choose-block",
  detailsHref = "#about",
}: ProjectHeroProps) {
  return (
    <section className={`euro-hero${image ? "" : " euro-hero-without-image"}`}>
      {image && (
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          unoptimized={image.startsWith("data:") || image.startsWith("http")}
        />
      )}
      <div className="euro-hero-shade" />
      <div className="euro-hero-copy">
        <p className="euro-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        <a className="euro-button" href={chooseHref}>
          Өөрийн байраа сонгох <ArrowUpRight size={20} />
        </a>
      </div>
      <div className="euro-hero-bottom">
        <span>{location}</span>
        <a href={detailsHref}>
          Төслийг нээх{" "}
          {detailsHref.startsWith("#") ? (
            <ArrowDown size={16} />
          ) : (
            <ArrowUpRight size={16} />
          )}
        </a>
      </div>
    </section>
  );
}
