import { Children, useLayoutEffect, useRef, type ReactNode } from "react";
import styles from "./KitchenDisplay.module.css";

/** Pack unequal tickets while preserving their DOM and keyboard order. */
export function KitchenTicketBoard({ children }: { children: ReactNode }) {
  const boardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = (card: HTMLElement) => {
      const cell = card.parentElement;
      if (!cell) return;
      const span = `span ${Math.ceil(card.getBoundingClientRect().height + 16)}`;
      if (cell.style.gridRowEnd !== span) cell.style.gridRowEnd = span;
    };
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target instanceof HTMLElement) measure(entry.target);
      }
    });
    for (const cell of board.children) {
      const card = cell.firstElementChild;
      if (card instanceof HTMLElement) {
        measure(card);
        observer.observe(card);
      }
    }
    return () => observer.disconnect();
  }, [children]);

  return (
    <div ref={boardRef} className={styles.board}>
      {Children.map(children, (child) => (
        <div className={styles.boardItem}>{child}</div>
      ))}
    </div>
  );
}
