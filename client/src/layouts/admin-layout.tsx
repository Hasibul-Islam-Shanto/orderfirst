import { useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  CalendarDays,
  Armchair,
  ArrowUpRight,
  LogOut,
  Menu,
} from "lucide-react";
import { Logo, ThemeToggle, Modal } from "../components/common/ui";
import { useCurrentUser, useLogout } from "../features/auth/auth-hooks";
import { useEventStream } from "../lib/use-event-stream";
const links = [
  { path: "overview", label: "Overview", icon: LayoutDashboard },
  { path: "menu", label: "Menu", icon: UtensilsCrossed },
  { path: "orders", label: "Orders", icon: ShoppingBag },
  { path: "reservations", label: "Reservations", icon: CalendarDays },
  { path: "tables", label: "Tables", icon: Armchair },
];
export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { data: user } = useCurrentUser();
  useEventStream(user);
  const logout = useLogout();
  const navigate = useNavigate();
  const navigation = (
    <nav aria-label="Admin navigation">
      {links.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={`/admin/${path}`}
          onClick={() => setOpen(false)}
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
  return (
    <div className="admin-app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="admin-sidebar">
        <Logo />
        <span className="admin-eyebrow">RESTAURANT WORKSPACE</span>
        {navigation}
        <div className="sidebar-bottom">
          <div className="restaurant-status">
            <span /> Kitchen is open<small>Every day, 12 PM – 10 PM</small>
          </div>
          <Link to="/">
            View restaurant <ArrowUpRight size={17} />
          </Link>
        </div>
      </aside>
      <div className="admin-body">
        <header className="admin-header">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Open admin navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="muted">Your restaurant, at a glance.</span>
          </div>
          <div className="header-actions">
            <ThemeToggle />
            <details className="user-dropdown">
              <summary>
                <span className="mini-avatar">
                  {user?.name
                    ? user.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "AD"}
                </span>
                <span>
                  {user?.name}
                  <small>Administrator</small>
                </span>
              </summary>
              <div className="dropdown-panel">
                <Link to="/">View restaurant</Link>
                <button
                  onClick={() => {
                    logout.mutate(undefined, { onSuccess: () => navigate("/login") });
                  }}
                >
                  <LogOut size={16} /> Log out
                </button>
              </div>
            </details>
          </div>
        </header>
        {open && (
          <Modal title="Restaurant workspace" onClose={() => setOpen(false)}>
            <div className="admin-mobile-nav">{navigation}</div>
          </Modal>
        )}
        <main id="main" tabIndex={-1} className="admin-main">
          <Outlet />
        </main>
        <footer className="admin-footer">
          OrderFirst workspace <span>Live restaurant data</span>
        </footer>
      </div>
    </div>
  );
}
