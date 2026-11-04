import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, ArrowRight, Clock } from "lucide-react";
import { useMyOrders, useOrderDetails } from "./order-hooks";
import {
  Badge,
  EmptyState,
  PageHeader,
  Modal,
} from "../../components/common/ui";
import { dateLabel, money } from "../../utils/format";
import type { Order } from "../../types";
import { OrderSummary } from "../cart/cart-page";
export function OrderDetails({ order }: { order: Order }) {
  return (
    <>
      <div className="details-row">
        <Badge status={order.status} />
        <span>
          {order.type} · {dateLabel(order.date)}
        </span>
      </div>
      <ol className="order-progress" aria-label="Order progress">
        {["Pending", "Confirmed", "Preparing", "Ready", "Completed"].map(
          (s, i) => (
            <li
              className={
                [
                  "Pending",
                  "Confirmed",
                  "Preparing",
                  "Ready",
                  "Completed",
                ].indexOf(order.status) >= i
                  ? "done"
                  : ""
              }
              key={s}
            >
              <span>{i + 1}</span>
              {s}
            </li>
          ),
        )}
      </ol>
      {order.status === "Cancelled" && (
        <p className="field-error">This order was cancelled.</p>
      )}
      <OrderSummary items={order.items} />
      {order.notes && <p className="muted">Your note: {order.notes}</p>}
    </>
  );
}
export function OrdersPage() {
  const query = useMyOrders();
  const [detail, setDetail] = useState<Order | null>(null);
  const orders = query.data?.data ?? [];
  return (
    <div className="shell page">
      <PageHeader
        eyebrow="FROM OUR KITCHEN TO YOU"
        title="Your orders."
        description="See what’s cooking and revisit past favorites."
        action={
          <Link className="button secondary" to="/menu">
            Order something good <ArrowRight size={17} />
          </Link>
        }
      />
      {query.isPending ? <p className="muted" aria-live="polite">Loading your orders…</p> : query.isError ? <EmptyState title="We could not load your orders." description="Please try again." action={<button className="button" onClick={() => query.refetch()}>Retry</button>} /> : !orders.length ? (
        <EmptyState
          title="Your first favorite is out there."
          description="You haven’t placed an order yet."
          action={
            <Link className="button" to="/menu">
              Explore the menu
            </Link>
          }
        />
      ) : (
        ["Active orders", "Previous orders"].map((label, index) => {
          const group = orders.filter(
            (o) =>
              ["Completed", "Cancelled"].includes(o.status) === (index === 1),
          );
          return (
            <section key={label} className="order-group">
              <h2>
                {label} <span className="count">{group.length}</span>
              </h2>
              {group.length ? (
                group.map((o) => (
                  <article key={o.id} className="panel order-card">
                    <div className="order-card-top">
                      <div>
                        <strong>{o.id}</strong>
                        <p className="muted">
                          {dateLabel(o.date)} · {o.type}
                        </p>
                      </div>
                      <Badge status={o.status} />
                    </div>
                    <p>
                      {o.items
                        .map((i) => `${i.quantity} × ${i.item.name}`)
                        .join(" · ")}
                    </p>
                    <div className="order-card-bottom">
                      <strong>{money(o.total)}</strong>
                      <button
                        className="text-link"
                        onClick={() => setDetail(o)}
                      >
                        View details <ArrowRight size={17} />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="muted">
                  {index
                    ? "Your previous meals will appear here."
                    : "Nothing cooking right now. Ready when you are."}
                </p>
              )}
            </section>
          );
        })
      )}
      {detail && (
        <Modal title={`Order ${detail.id}`} onClose={() => setDetail(null)}>
          <OrderDetails order={detail} />
        </Modal>
      )}
    </div>
  );
}
export function OrderConfirmation() {
  const { orderId } = useParams();
  const query = useOrderDetails(orderId);
  const order = query.data;
  if (query.isPending) return <div className="shell page" aria-live="polite">Loading your order…</div>;
  if (!order)
    return (
      <EmptyState
        title="Order not found"
        description="Find your latest meals in My orders."
        action={
          <Link className="button" to="/my-orders">
            My orders
          </Link>
        }
      />
    );
  return (
    <div className="shell page confirmation">
      <span className="success-icon">
        <Check size={32} />
      </span>
      <p className="eyebrow">ORDER {order.id}</p>
      <h1>Good things are cooking.</h1>
      <p className="muted">
        Thanks, {order.customer.split(" ")[0]}. Your order is with our kitchen.
      </p>
      <div className="confirmation-meta">
        <Clock size={18} /> Estimated preparation: 20–35 minutes
      </div>
      <OrderDetails order={order} />
      <div className="button-row">
        <Link className="button" to="/my-orders">
          View my orders <ArrowRight size={17} />
        </Link>
        <Link className="button secondary" to="/menu">
          Back to menu
        </Link>
      </div>
    </div>
  );
}
