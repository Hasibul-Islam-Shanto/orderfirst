import { useState } from "react";
import { useAdminOrderDetails, useAdminOrders, useUpdateOrderStatus } from "./admin-hooks";
import { orderStatuses, type Order, type OrderStatus } from "../../types";
import {
  PageHeader,
  Badge,
  SearchInput,
  Modal,
  ConfirmDialog,
  EmptyState,
  useToast,
} from "../../components/common/ui";
import { OrderDetails } from "../orders/orders-page";
import { money, dateLabel } from "../../utils/format";
import { useDebouncedValue } from "../../lib/use-debounced-value";
export function OrderManagementPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const query = useAdminOrders({ page, status: status === "all" ? undefined : status, search: debouncedSearch || undefined });
  const updateStatus = useUpdateOrderStatus();
  const [detail, setDetail] = useState<string | null>(null);
  const detailQuery = useAdminOrderDetails(detail ?? undefined);
  const [cancel, setCancel] = useState<Order | null>(null);
  const toast = useToast();
  const orders = query.data?.data ?? [];
  const selected = detailQuery.data;
  const change = (order: Order, next: OrderStatus) => {
    if (next === "Cancelled") {
      setCancel(order);
      return;
    }
    updateStatus.mutate({ id: order.id, status: next }, { onSuccess: () => toast(`${order.id} marked ${next.toLowerCase()}`), onError: (error) => toast(error.message) });
  };
  return (
    <>
      <PageHeader
        eyebrow="KEEP THE GOOD FOOD FLOWING"
        title="Every order, in order."
        description="From the first craving to the last happy bite."
      />
      <div className="menu-toolbar">
        <SearchInput
          value={search}
          onChange={(value) => { setSearch(value); setPage(1); }}
          placeholder="Search order number or customer…"
        />
        <select
          aria-label="Filter order status"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="all">All statuses</option>
          {orderStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="panel table-panel">
        {query.isPending ? <p className="muted" aria-live="polite">Loading orders…</p> : query.isError ? <EmptyState title="Unable to load orders" description="Please try again." action={<button className="button" onClick={() => query.refetch()}>Retry</button>} /> : orders.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Update status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => setDetail(o.id)}
                      >
                        {o.id}
                      </button>
                      <small>{dateLabel(o.date)}</small>
                    </td>
                    <td>
                      <strong>{o.customer}</strong>
                      <small>{o.type}</small>
                    </td>
                    <td>{o.items.reduce((n, i) => n + i.quantity, 0)} items</td>
                    <td>{money(o.total)}</td>
                    <td>
                      <Badge status={o.status} />
                    </td>
                    <td>
                      <select
                        aria-label={`Status for ${o.id}`}
                        value={o.status}
                        onChange={(e) =>
                          change(o, e.target.value as OrderStatus)
                        }
                      >
                        {orderStatuses.map((s) => (
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
            title="No orders match"
            description="Try another name, order number, or status."
          />
        )}
      </div>
      {query.data && query.data.pagination.totalPages > 1 && <div className="dialog-actions"><button className="button secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button><span>Page {page} of {query.data.pagination.totalPages}</span><button className="button secondary" disabled={page >= query.data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button></div>}
      {selected && (
        <Modal title={`Order ${selected.id}`} onClose={() => setDetail(null)}>
          <p>
            <strong>{selected.customer}</strong> · {selected.phone}
          </p>
          <OrderDetails order={selected} />
        </Modal>
      )}
      {cancel && (
        <ConfirmDialog
          title="Cancel order?"
          description={`Cancel ${cancel.id} for ${cancel.customer}? This will remove it from the active kitchen queue.`}
          onClose={() => setCancel(null)}
          onConfirm={() => updateStatus.mutate({ id: cancel.id, status: "Cancelled" }, { onSuccess: () => toast("Order cancelled"), onError: (error) => toast(error.message) })}
        />
      )}
    </>
  );
}
