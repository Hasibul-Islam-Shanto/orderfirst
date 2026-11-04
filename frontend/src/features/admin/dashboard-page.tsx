import { Link } from "react-router-dom";
import { DollarSign, ShoppingBag, CalendarDays, Armchair, ArrowUpRight } from "lucide-react";
import { Badge, EmptyState, PageHeader } from "../../components/common/ui";
import { money, localDate, dateLabel } from "../../utils/format";
import { mapOrder } from "../../lib/api-types";
import { useAdminDashboard } from "./admin-hooks";

export function DashboardPage() {
  const query = useAdminDashboard();
  if (query.isPending) return <div aria-live="polite"><PageHeader eyebrow="RESTAURANT WORKSPACE" title="Loading your overview…" /></div>;
  if (query.isError) return <EmptyState title="Unable to load the dashboard." description="Please try again." action={<button className="button" onClick={() => query.refetch()}>Retry</button>} />;
  const summary = query.data;
  const recent = summary.recentOrders.map(mapOrder);
  const stats = [
    { label: "Today's revenue", value: money(Number(summary.todayRevenue)), note: "From completed orders", icon: DollarSign },
    { label: "Today's orders", value: summary.todayOrders, note: "Orders received today", icon: ShoppingBag },
    { label: "Upcoming reservations", value: summary.upcomingReservations, note: "Guests to welcome", icon: CalendarDays },
    { label: "Available tables", value: summary.availableTables, note: "Enabled for reservations", icon: Armchair },
  ];
  return <>
    <PageHeader eyebrow="LET’S MAKE IT A GOOD DAY" title="Restaurant overview." description="Here’s what’s happening at your restaurant." action={<span className="date-pill"><CalendarDays size={16} />{dateLabel(localDate())}</span>} />
    <div className="stats-grid">{stats.map(({ label, value, note, icon: Icon }) => <div className="panel stat-card" key={label}><div><span>{label}</span><Icon size={19} /></div><strong>{value}</strong><small>{note}</small></div>)}</div>
    <div className="dashboard-bottom">
      <section className="panel"><div className="section-heading"><h2>Fresh off the order pad.</h2><Link className="text-link" to="/admin/orders">All orders <ArrowUpRight size={16} /></Link></div><div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead><tbody>{recent.map((order) => <tr key={order.id}><td><strong>{order.id}</strong></td><td>{order.customer}<small>{order.type}</small></td><td><Badge status={order.status} /></td><td>{money(order.total)}</td></tr>)}</tbody></table></div>{!recent.length && <p className="muted">No orders yet.</p>}</section>
      <section className="panel"><div className="section-heading"><h2>Guest favorites</h2><span className="muted small-text">By dishes ordered</span></div>{summary.popularMenuItems.map((entry, index) => entry.menuItem && <div className="popular-row" key={entry.menuItem.id}><span className="rank">0{index + 1}</span><img src={entry.menuItem.imageUrl} alt="" /><span><strong>{entry.menuItem.name}</strong><small>{entry.quantity} ordered</small></span></div>)}{!summary.popularMenuItems.length && <p className="muted">Popular dishes will appear here.</p>}</section>
    </div>
  </>;
}
