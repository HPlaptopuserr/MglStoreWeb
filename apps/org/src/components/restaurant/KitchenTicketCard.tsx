import { Check, ChefHat, Clock3, Loader2, Play } from "lucide-react";
import { isKitchenQueueStatus } from "@mgl/types";
import type { RestaurantKitchenTicket } from "@/lib/restaurant-pos-api";
import { formatRestaurantOrderNumber } from "@/lib/restaurant-order-number";
import styles from "./KitchenDisplay.module.css";

export type KitchenStationFilter =
  | "ALL"
  | "HOT_KITCHEN"
  | "COLD_KITCHEN"
  | "BAR";

interface KitchenTicketCardProps {
  ticket: RestaurantKitchenTicket;
  now: number;
  stationFilter: KitchenStationFilter;
  busy: boolean;
  onAdvance: () => void;
}

const orderModes = {
  DINE_IN: "Энд хэрэглэх",
  TO_GO: "Авч явах",
  DELIVERY: "Хүргэлт",
} as const;

export function KitchenTicketCard({
  ticket,
  now,
  stationFilter,
  busy,
  onAdvance,
}: KitchenTicketCardProps) {
  if (!isKitchenQueueStatus(ticket.status)) return null;
  const sentAt = Date.parse(ticket.sentAt);
  const elapsed = Number.isFinite(sentAt)
    ? Math.max(0, Math.floor((now - sentAt) / 60_000))
    : 0;
  const target = Math.max(
    0,
    ...ticket.items.map((item) => item.preparationMinutes || 0),
  );
  const overdue = target > 0 && elapsed >= target;
  const preparing = ticket.status === "PREPARING";
  const items =
    stationFilter === "ALL"
      ? ticket.items
      : ticket.items.filter((item) => item.kitchenStation === stationFilter);
  const number = formatRestaurantOrderNumber(
    ticket.restaurantTicket.ticketNo,
    ticket.restaurantTicket.id,
  );

  return (
    <article className={styles.ticket} aria-label={`Захиалга ${number}`}>
      <header className={styles.ticketHeader}>
        <div className={styles.ticketTopLine}>
          <span
            className={preparing ? styles.preparingStatus : styles.newStatus}
          >
            <span aria-hidden="true" />
            {preparing ? "Бэлтгэж байна" : "Хүлээгдэж байна"}
          </span>
          <span
            className={overdue ? styles.overdueTime : styles.elapsedTime}
            title={target ? `Бэлтгэх зорилт ${target} минут` : undefined}
          >
            <Clock3 size={14} aria-hidden="true" />
            {elapsed} мин
          </span>
        </div>
        <div className={styles.ticketIdentity}>
          <h2>
            <span className={styles.numberPrefix}>№</span>
            {number}
          </h2>
          <span className={styles.orderMode}>
            {orderModes[ticket.restaurantTicket.orderMode]}
          </span>
        </div>
        {ticket.restaurantTicket.table ? (
          <p className={styles.tableLabel}>
            Ширээ ·{" "}
            {ticket.restaurantTicket.table.label ||
              ticket.restaurantTicket.table.code}
          </p>
        ) : null}
      </header>
      <ul className={styles.items}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <span className={styles.quantity}>
              <span className={styles.quantityTimes}>×</span>
              {item.qty}
            </span>
            <div className={styles.itemContent}>
              <p className={styles.itemName}>{item.name}</p>
              {item.note ? (
                <p className={styles.itemNote}>{item.note}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <footer className={styles.ticketFooter}>
        <span className={styles.itemCount}>
          <ChefHat size={14} aria-hidden="true" />
          {items.reduce((sum, item) => sum + item.qty, 0)} бүтээгдэхүүн
        </span>
        <button
          type="button"
          onClick={onAdvance}
          disabled={busy}
          className={preparing ? styles.completeButton : styles.startButton}
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : preparing ? (
            <Check size={16} />
          ) : (
            <Play size={14} />
          )}
          {busy
            ? "Хадгалж байна…"
            : preparing
              ? "Бэлэн болсон"
              : "Бэлтгэж эхлэх"}
        </button>
      </footer>
    </article>
  );
}
