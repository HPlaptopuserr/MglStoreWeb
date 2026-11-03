"use client";
import type { ReactNode } from "react";
import { PosDialog } from "./PosDialog";

export function PosSettingsDialog({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <PosDialog
      title="Кассын тохиргоо"
      description="Кассын үйлдэл болон холболтоо эндээс удирдана."
      onClose={onClose}
    >
      {children}
    </PosDialog>
  );
}
