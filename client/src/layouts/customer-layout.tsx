import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  ArrowUpRight,
  ShoppingBag,
  Menu,
  MapPin,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Logo, ThemeToggle, Modal } from "../components/common/ui";
import { useCurrentUser } from "../features/auth/auth-hooks";
import { useCart } from "../store/cart-store";
import { useEventStream } from "../lib/use-event-stream";
const links = [
  ["/", "Home"],
  ["/menu", "Our menu"],
  ["/reservations/new", "Reservations"],
];
export function CustomerLayout() {
  const [mobile, setMobile] = useState(false);
  const { data: user } = useCurrentUser();
  useEventStream(user);
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const nav = (
    <>
      {links.map(([to, label]) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={() => setMobile(false)}
        >
          {label}
        </NavLink>
      ))}
      <Link to="/#our-story" onClick={() => setMobile(false)}>
        Our story
      </Link>
    </>
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        Good food. Great company. A little something for everyone.{" "}
        <span>
          Made fresh, always <span aria-hidden>↗</span>
        </span>
      </div>
      <header className="customer-header">
        <div className="shell header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Main navigation">
            {nav}
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <Link
              to="/cart"
              className="cart-link"
              aria-label={`Cart, ${count} items`}
            >
              <ShoppingBag size={20} />
              <span className="cart-count">{count}</span>
            </Link>
            <Link
              className="login-link"
              to={
                user
                  ? !user.emailVerifiedAt
                    ? "/verify-email"
                    : user.role === "admin"
                      ? "/admin/overview"
                      : "/account"
                  : "/login"
              }
            >
              {user && !user.emailVerifiedAt
                ? "Verify email"
                : user
                  ? user.name.split(" ")[0]
                  : "Log in"}
            </Link>
            <Link
              className="button small header-reserve"
              to="/reservations/new"
            >
              Book a table <ArrowUpRight size={16} />
            </Link>
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>
      {mobile && (
        <Modal title="Explore OrderFirst" onClose={() => setMobile(false)}>
          <nav className="mobile-links" aria-label="Mobile navigation">
            {nav}
            <Link to="/my-orders" onClick={() => setMobile(false)}>
              My orders
            </Link>
            <Link to="/my-reservations" onClick={() => setMobile(false)}>
              My reservations
            </Link>
            <Link to="/account" onClick={() => setMobile(false)}>
              My account
            </Link>
          </nav>
        </Modal>
      )}
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="shell footer-grid">
          <div>
            <Logo />
            <p>
              Thoughtfully made. Happily shared.
              <br />
              Your next favorite meal starts here.
            </p>
          </div>
          <div>
            <h3>Make yourself at home</h3>
            <Link to="/menu">
              Explore our menu <ArrowUpRight size={14} />
            </Link>
            <Link to="/reservations/new">Reserve a table</Link>
            <Link to="/my-orders">My orders</Link>
            <Link to="/my-reservations">My reservations</Link>
          </div>
          <div>
            <h3>Come say hello</h3>
            <p>
              <MapPin size={15} /> 24 Garden Street, Brooklyn, NY
            </p>
            <p>
              <Clock size={15} /> Every day · 12:00 PM – 10:00 PM
            </p>
            <a href="tel:+17185550142">+1 (718) 555-0142</a>
          </div>
        </div>
        <div className="shell footer-bottom">
          <span>
            © {new Date().getFullYear()} OrderFirst. Made with good taste.
          </span>
          <Link to="/login?role=admin">
            Restaurant team <ArrowRight size={14} />
          </Link>
        </div>
      </footer>
      {count > 0 && (
        <Link className="mobile-cart button" to="/cart">
          <ShoppingBag size={18} /> View your cart <span>{count} items</span>
          <ArrowRight size={18} />
        </Link>
      )}
    </>
  );
}
