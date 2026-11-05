import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, CalendarDays, LogOut, ArrowRight } from "lucide-react";
import { useCurrentUser, useLogout } from "../auth/auth-hooks";
import { useMyOrders } from "../orders/order-hooks";
import { useMyReservations } from "../reservations/reservation-hooks";
import { isUpcoming } from "../../lib/reservation-availability";
import { PageHeader, Badge } from "../../components/common/ui";
import { dateLabel, money } from "../../utils/format";
export function ProfilePage() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const orderQuery = useMyOrders();
  const reservationQuery = useMyReservations();
  const navigate = useNavigate();
  if (!user) return null;
  const orders = orderQuery.data?.data ?? [];
  const upcoming = (reservationQuery.data?.data ?? []).filter(isUpcoming);
  return (
    <div className="shell page">
      <PageHeader
        eyebrow="YOUR CORNER OF ORDERFIRST"
        title={`Hello, ${user.name.split(" ")[0]}.`}
        description="Your favorites, your plans, all in one place."
      />
      <div className="two-column">
        <div className="panel profile-card">
          <div className="profile-avatar">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <h2>{user.name}</h2>
          <p className="muted">{user.email}</p>
          <Badge status={user.role} />
          <div className="summary-divider" />
          <button
            className="button secondary"
            onClick={() => {
              logout.mutate(undefined, { onSuccess: () => navigate("/") });
            }}
          >
            <LogOut size={17} /> Log out
          </button>
        </div>
        <div className="profile-sections">
          <div className="panel">
            <div className="section-heading">
              <h2>
                <ShoppingBag size={21} /> Recent orders
              </h2>
              <Link className="text-link" to="/my-orders">
                View all <ArrowRight size={16} />
              </Link>
            </div>
            {orders.length ? (
              orders.slice(0, 3).map((o) => (
                <div className="summary-line" key={o.id}>
                  <span>
                    {o.id}
                    <small className="muted">{dateLabel(o.date)}</small>
                  </span>
                  <Badge status={o.status} />
                  <strong>{money(o.total)}</strong>
                </div>
              ))
            ) : (
              <p className="muted">
                Your first great meal is just a few clicks away.
              </p>
            )}
          </div>
          <div className="panel">
            <h2>
              <CalendarDays size={21} /> Your next gathering
            </h2>
            {upcoming.length ? (
              <p>
                {dateLabel(upcoming[0].date)} · {upcoming[0].guests} guests{" "}
                <Badge status={upcoming[0].status} />
              </p>
            ) : (
              <p className="muted">No upcoming plans yet. Let’s change that.</p>
            )}
            <Link
              className="text-link"
              to={upcoming.length ? "/my-reservations" : "/reservations/new"}
            >
              {upcoming.length ? "Manage reservations" : "Find your table"}{" "}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
