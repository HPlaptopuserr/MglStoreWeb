import {
  ArrowUpRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  MapPinned,
  MessageCircle,
  Package,
  ShoppingBag,
  ScanBarcode,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { BusinessService } from "../content/intro-content";

const serviceIcons: Record<BusinessService["id"], LucideIcon> = {
  team: Users,
  attendance: Clock3,
  tasks: ClipboardList,
  sales: MapPinned,
  pos: ScanBarcode,
  inventory: Package,
  orders: ShoppingBag,
  delivery: Truck,
  quality: ClipboardCheck,
  communication: MessageCircle,
};
interface ServiceCardProps {
  service: BusinessService;
  number: number;
}
export function ServiceCard({ service, number }: ServiceCardProps) {
  const Icon = serviceIcons[service.id];
  return (
    <article className="service-card" id={`service-${service.id}`}>
      <div className="service-top">
        <Icon size={24} aria-hidden="true" />
        <span>{String(number).padStart(2, "0")}</span>
      </div>
      <p className="service-audience">{service.audience}</p>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <details>
        <summary>
          Боломжуудыг харах <ArrowUpRight size={17} aria-hidden="true" />
        </summary>
        <ul>
          {service.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}
