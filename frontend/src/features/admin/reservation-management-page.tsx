import { useState } from "react";
import { useAdminReservationDetails, useAdminReservations, useUpdateReservationStatus } from "./admin-hooks";
import {
  reservationStatuses,
  type Reservation,
  type ReservationStatus,
} from "../../types";
import { isUpcoming } from "../../lib/reservation-availability";
import {
  PageHeader,
  Badge,
  SearchInput,
  ConfirmDialog,
  EmptyState,
  Modal,
  useToast,
} from "../../components/common/ui";
import { ReservationDetails } from "../reservations/reservations-page";
import { dateLabel, timeLabel } from "../../utils/format";
export function ReservationManagementPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const query = useAdminReservations({ page, status: status === "all" ? undefined : status, date: date || undefined });
  const updateStatus = useUpdateReservationStatus();
  const [search, setSearch] = useState("");
  const [upcoming, setUpcoming] = useState(true);
  const [cancel, setCancel] = useState<Reservation | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const detailQuery = useAdminReservationDetails(detail ?? undefined);
  const toast = useToast();
  const rows = (query.data?.data ?? []).filter(
    (r) =>
      `${r.id} ${r.customer}`.toLowerCase().includes(search.toLowerCase()) &&
      (status === "all" || r.status === status) &&
      (!upcoming || isUpcoming(r)),
  );
  const selected = detailQuery.data;
  const change = (r: Reservation, next: ReservationStatus) => {
    if (next === "Cancelled") {
      setCancel(r);
      return;
    }
    updateStatus.mutate({ id: r.id, status: next }, { onSuccess: () => toast(`Reservation ${next.toLowerCase()}`), onError: (error) => toast(error.message) });
  };
  return (
    <>
      <PageHeader
        eyebrow="MAKE EVERY WELCOME COUNT"
        title="A place for every guest."
        description="See who’s joining you and get their table ready."
      />
      <div className="menu-toolbar">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search guest or reservation…"
        />
        <select
          aria-label="Reservation status filter"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="all">All statuses</option>
          {reservationStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input type="date" aria-label="Filter reservation date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} />
        <label className="check-label">
          <input
            type="checkbox"
            checked={upcoming}
            onChange={(e) => setUpcoming(e.target.checked)}
          />
          Upcoming only
        </label>
      </div>
      <div className="panel table-panel">
        {query.isPending ? <p className="muted" aria-live="polite">Loading reservations…</p> : query.isError ? <EmptyState title="Unable to load reservations" description="Please try again." action={<button className="button" onClick={() => query.refetch()}>Retry</button>} /> : rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Date & time</th>
                  <th>Party</th>
                  <th>Table</th>
                  <th>Status</th>
                  <th>Update status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => setDetail(r.id)}
                      >
                        {r.customer}
                      </button>
                      <small>{r.id}</small>
                    </td>
                    <td>
                      {dateLabel(r.date)}
                      <small>{timeLabel(r.time)}</small>
                    </td>
                    <td>{r.guests} guests</td>
                    <td>
                      Table{" "}
                      {r.tableNumber ?? "—"}
                    </td>
                    <td>
                      <Badge status={r.status} />
                    </td>
                    <td>
                      <select
                        aria-label={`Status for ${r.id}`}
                        value={r.status}
                        onChange={(e) =>
                          change(r, e.target.value as ReservationStatus)
                        }
                      >
                        {reservationStatuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No reservations match"
            description="Try another filter, or turn off Upcoming only to see previous visits."
          />
        )}
      </div>
      {query.data && query.data.pagination.totalPages > 1 && <div className="dialog-actions"><button className="button secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button><span>Page {page} of {query.data.pagination.totalPages}</span><button className="button secondary" disabled={page >= query.data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button></div>}
      {selected && (
        <Modal title={selected.customer} onClose={() => setDetail(null)}>
          <Badge status={selected.status} />
          <ReservationDetails reservation={selected} />
        </Modal>
      )}
      {cancel && (
        <ConfirmDialog
          title="Cancel reservation?"
          description={`Release the table booked for ${cancel.customer} on ${dateLabel(cancel.date)}?`}
          onClose={() => setCancel(null)}
          onConfirm={() => updateStatus.mutate({ id: cancel.id, status: "Cancelled" }, { onSuccess: () => toast("Reservation cancelled"), onError: (error) => toast(error.message) })}
        />
      )}
    </>
  );
}
