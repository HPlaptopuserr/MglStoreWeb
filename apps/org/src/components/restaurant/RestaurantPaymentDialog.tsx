"use client";

import type { ComponentProps } from "react";
import { RestaurantDialog } from "./RestaurantDialog";

type RestaurantPaymentDialogProps = Omit<ComponentProps<typeof RestaurantDialog>, "subtitle"> & { tableLabel: string };

export function RestaurantPaymentDialog({ tableLabel, ...props }: RestaurantPaymentDialogProps) {
  return <RestaurantDialog {...props} subtitle={`Ширээ ${tableLabel}`} />;
}
