import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

interface ProjectLandingHeroProps {
  title: string;
  eyebrow: string;
  description: string | null;
  image: string | null;
  imageAlt: string;
  location: string;
  chooseHref: string;
  detailsHref: string;
}

export function ProjectLandingHero({
  title,
  eyebrow,
  description,
  image,
  imageAlt,
  location,
  chooseHref,
  detailsHref,
}: ProjectLandingHeroProps) {
  return (
    <section
      className={`project-landing-hero${image ? "" : " project-landing-hero-empty"}`}
      aria-labelledby="project-landing-title"
    >
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
      <div className="project-landing-shade" />
      <div className="project-landing-content">
        {eyebrow !== title && (
          <p className="project-landing-eyebrow">{eyebrow}</p>
        )}
        <h1 id="project-landing-title">{title}</h1>
        {description && description !== title && (
          <p className="project-landing-description">{description}</p>
        )}
        <div className="project-landing-actions">
          <Link href={chooseHref} className="project-landing-primary">
            Байр сонгох <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <Link href={detailsHref} className="project-landing-secondary">
            Төслийн тухай
          </Link>
        </div>
      </div>
      <div className="project-landing-bottom">
        {location && (
          <span>
            <MapPin size={14} aria-hidden="true" />
            {location}
          </span>
        )}
        <span>Таны шинэ орон зай</span>
      </div>
    </section>
  );
}
