import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  Users,
  Armchair,
  ArrowRight,
  Check,
} from "lucide-react";
import { useCancelReservation, useMyReservations, useReservationDetails } from "./reservation-hooks";
import { isUpcoming } from "../../lib/reservation-availability";
import {
  PageHeader,
  Badge,
  EmptyState,
  ConfirmDialog,
  Modal,
  useToast,
} from "../../components/common/ui";
import { dateLabel, timeLabel } from "../../utils/format";
import type { Reservation } from "../../types";
export function ReservationDetails({
  reservation: r,
}: {
  reservation: Reservation;
}) {
  return (
    <>
      <div className="reservation-details">
        <p>
          <CalendarDays size={20} />
          <span>
            <small>Date</small>
            <strong>{dateLabel(r.date)}</strong>
          </span>
        </p>
        <p>
          <Clock size={20} />
          <span>
            <small>Time</small>
            <strong>{timeLabel(r.time)}</strong>
          </span>
        </p>
        <p>
          <Users size={20} />
          <span>
            <small>Party size</small>
            <strong>{r.guests} guests</strong>
          </span>
        </p>
        <p>
          <Armchair size={20} />
          <span>
            <small>Table</small>
            <strong>
              {r.tableNumber
                ? `${r.tableNumber} · Dining room`
                : "Previously assigned table"}
            </strong>
          </span>
        </p>
      </div>
      {r.request && <div className="info-box">Your request: {r.request}</div>}
    </>
  );
}
export function ReservationsPage() {
  const query = useMyReservations();
  const cancelMutation = useCancelReservation();
  const [tab, setTab] = useState("Upcoming");
  const [cancel, setCancel] = useState<Reservation | null>(null);
  const [detail, setDetail] = useState<Reservation | null>(null);
  const toast = useToast();
  const reservations = (query.data?.data ?? []).filter(
    (r) =>
      (tab === "Cancelled"
        ? r.status === "Cancelled"
        : tab === "Upcoming"
          ? isUpcoming(r)
          : !isUpcoming(r) && r.status !== "Cancelled"),
  );
  return (
    <div className="shell page">
      <PageHeader
        eyebrow="THINGS TO LOOK FORWARD TO"
        title="Your reservations."
        description="Good company, great food, and a table with your name on it."
        action={
          <Link className="button" to="/reservations/new">
            Reserve a table <ArrowRight size={17} />
          </Link>
        }
      />
      <div className="category-tabs">
        {["Upcoming", "Previous", "Cancelled"].map((t) => (
          <button
            className={t === tab ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {query.isPending ? <p className="muted" aria-live="polite">Loading your reservations…</p> : query.isError ? <EmptyState title="We could not load your reservations." description="Please try again." action={<button className="button" onClick={() => query.refetch()}>Retry</button>} /> : !reservations.length ? (
        <EmptyState
          title={`No ${tab.toLowerCase()} reservations.`}
          description={
            tab === "Upcoming"
              ? "There’s always room for another good memory."
              : "Your reservations will appear here."
          }
          action={
            <Link className="button secondary" to="/reservations/new">
              Find a table
            </Link>
          }
        />
      ) : (
        <div className="grid-2">
          {reservations.map((r) => (
            <article className="panel reservation-card" key={r.id}>
              <div className="order-card-top">
                <strong>{r.id}</strong>
                <Badge status={r.status} />
              </div>
              <ReservationDetails reservation={r} />
              <div className="order-card-bottom">
                <button className="text-link" onClick={() => setDetail(r)}>
                  View details <ArrowRight size={16} />
                </button>
                {isUpcoming(r) && (
                  <button
                    className="text-link danger-text"
                    onClick={() => setCancel(r)}
                  >
                    Cancel reservation
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {detail && (
        <Modal
          title={`Reservation ${detail.id}`}
          onClose={() => setDetail(null)}
        >
          <Badge status={detail.status} />
          <ReservationDetails reservation={detail} />
          <p className="muted">
            24 Garden Street, Brooklyn, NY. Your table is reserved for 90
            minutes.
          </p>
        </Modal>
      )}
      {cancel && (
        <ConfirmDialog
          title="Cancel reservation?"
          description={`Release your table for ${dateLabel(cancel.date)} at ${timeLabel(cancel.time)}? You can always book another visit.`}
          onClose={() => setCancel(null)}
          onConfirm={() => cancelMutation.mutate(cancel.id, { onSuccess: () => toast("Reservation cancelled. See you another time.") })}
        />
      )}
    </div>
  );
}
export function ReservationConfirmation() {
  const { reservationId } = useParams();
  const query = useReservationDetails(reservationId);
  const r = query.data;
  if (query.isPending) return <div className="shell page" aria-live="polite">Loading your reservation…</div>;
  if (!r)
    return (
      <EmptyState
        title="Reservation not found"
        description="Your visits are listed in My reservations."
        action={
          <Link className="button" to="/my-reservations">
            My reservations
          </Link>
        }
      />
    );
  return (
    <div className="shell page confirmation">
      <span className="success-icon">
        <Check size={32} />
      </span>
      <p className="eyebrow">RESERVATION {r.id}</p>
      <h1>A good time is on the calendar.</h1>
      <p className="muted">
        Your request is saved, {r.customer.split(" ")[0]}. Our team will confirm
        your visit.
      </p>
      <Badge status={r.status} />
      <div className="panel">
        <ReservationDetails reservation={r} />
      </div>
      <p className="muted">
        24 Garden Street, Brooklyn, NY · Please arrive on time for your
        90-minute visit.
      </p>
      <div className="button-row">
        <Link className="button" to="/my-reservations">
          View my reservations <ArrowRight size={17} />
        </Link>
        <Link className="button secondary" to="/menu">
          Explore the menu
        </Link>
      </div>
    </div>
  );
}
