import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL } from "./api-client";
import { queryKeys } from "./query-keys";
import { useToast } from "../components/common/ui";
import type { User } from "../types";

export function useEventStream(user?: User | null) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const streamUrl = `${API_URL}/events/stream`;
    const es = new EventSource(streamUrl, { withCredentials: true });
    eventSourceRef.current = es;

    const onOrderCreated = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const payload = data.payload || {};
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
        queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });

        if (user.role === "admin") {
          toast(`🔔 New order placed #${(payload.orderId || "").slice(0, 8)}`);
        }
      } catch {
        // ignore JSON parse error
      }
    };

    const onOrderStatusUpdated = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const payload = data.payload || {};
        const orderId = payload.orderId;
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        if (orderId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.admin.order(orderId) });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
        queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });

        if (user.role === "customer") {
          toast(`Order #${(orderId || "").slice(0, 8)} is now: ${payload.status}`);
        } else {
          toast(`Order #${(orderId || "").slice(0, 8)} updated to ${payload.status}`);
        }
      } catch {
        // ignore
      }
    };

    const onBookingCreated = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const payload = data.payload || {};
        queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
        queryClient.invalidateQueries({ queryKey: ["admin", "reservations"] });

        if (user.role === "admin") {
          toast(`🔔 New table reservation: ${payload.partySize || 2} guests`);
        }
      } catch {
        // ignore
      }
    };

    const onBookingStatusUpdated = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const payload = data.payload || {};
        const bookingId = payload.bookingId;
        queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });
        if (bookingId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.reservations.detail(bookingId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.admin.reservation(bookingId) });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
        queryClient.invalidateQueries({ queryKey: ["admin", "reservations"] });

        toast(`Reservation #${(bookingId || "").slice(0, 8)} updated to ${payload.status}`);
      } catch {
        // ignore
      }
    };

    es.addEventListener("order.created", onOrderCreated);
    es.addEventListener("order.status_updated", onOrderStatusUpdated);
    es.addEventListener("booking.created", onBookingCreated);
    es.addEventListener("booking.status_updated", onBookingStatusUpdated);

    es.onerror = () => {
      // EventSource automatically retries on connection loss
    };

    return () => {
      es.removeEventListener("order.created", onOrderCreated);
      es.removeEventListener("order.status_updated", onOrderStatusUpdated);
      es.removeEventListener("booking.created", onBookingCreated);
      es.removeEventListener("booking.status_updated", onBookingStatusUpdated);
      es.close();
      eventSourceRef.current = null;
    };
  }, [user, queryClient, toast]);
}

