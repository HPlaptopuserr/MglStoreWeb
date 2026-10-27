import Link from "next/link";
import { Layers3 } from "lucide-react";
export function IntroBrand() {
  return (
    <Link href="/" className="intro-brand" aria-label="MGL Business нүүр">
      <span className="brand-icon">
        <Layers3 size={20} aria-hidden="true" />
      </span>
      <span>
        MGL<span className="brand-light">Business</span>
      </span>
    </Link>
  );
}
