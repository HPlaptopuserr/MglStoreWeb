"use client";

import { useCallback, useEffect, useState } from "react";
import {
  assignOnlineOrderDelivery,
  fetchDeliveryAssignmentOptions,
} from "./online-order.api";
import type { DeliveryAssignmentPartnership } from "./online-order.types";

export function useDeliveryAssignment(onAssigned: () => Promise<void>) {
  const [partnerships, setPartnerships] = useState<
    DeliveryAssignmentPartnership[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setPartnerships(await fetchDeliveryAssignmentOptions());
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Хүргэлтийн сонголт авахад алдаа гарлаа",
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const assign = useCallback(
    async (orderId: string, partnershipId: string, courierId: string) => {
      setAssigning(true);
      setError("");
      try {
        await assignOnlineOrderDelivery(orderId, partnershipId, courierId);
        await onAssigned();
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Хүргэлт хуваарилахад алдаа гарлаа";
        setError(message);
        throw requestError;
      } finally {
        setAssigning(false);
      }
    },
    [onAssigned],
  );

  return { partnerships, loading, assigning, error, setError, assign };
}
