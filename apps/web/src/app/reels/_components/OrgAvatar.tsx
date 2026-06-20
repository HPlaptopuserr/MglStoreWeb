import Link from "next/link";
import Image from "next/image";

type OrgAvatarProps = {
  name: string;
  logoUrl?: string;
  sizeClass: string;
};

type OrgIdentityProps = {
  name: string;
  logoUrl?: string;
  slug?: string | null;
};

export function OrgAvatar({ name, logoUrl, sizeClass }: OrgAvatarProps) {
  const letter = name.trim().charAt(0).toUpperCase() || "M";

  return (
    <span
      className={`${sizeClass} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-black text-black ring-1 ring-white/25`}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          fill
          sizes="48px"
          className="object-cover"
        />
      ) : (
        letter
      )}
    </span>
  );
}

export function OrgIdentity({ name, logoUrl, slug }: OrgIdentityProps) {
  const content = (
    <>
      <OrgAvatar
        name={name}
        logoUrl={logoUrl}
        sizeClass="h-8 w-8 sm:h-9 sm:w-9"
      />
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-black text-white sm:text-xs">
          {name}
        </span>
        <span className="block truncate text-[9px] font-bold text-white/58 sm:text-[10px]">
          MGL Store creator
        </span>
      </span>
      <span className="ml-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-black sm:px-3 sm:py-1.5 sm:text-[11px]">
        Дагах
      </span>
    </>
  );
  const className =
    "flex min-w-0 max-w-[calc(100%-48px)] items-center gap-1.5 rounded-full bg-black/34 py-1 pl-1 pr-1.5 ring-1 ring-white/10 backdrop-blur-xl sm:max-w-[calc(100%-52px)] sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-2";

  if (slug) {
    return (
      <Link href={`/store/${slug}`} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
