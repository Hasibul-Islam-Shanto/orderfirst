import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { useCurrentUser, isUnauthenticated } from "../features/auth/auth-hooks";
import { CustomerLayout } from "../layouts/customer-layout";
import { AdminLayout } from "../layouts/admin-layout";
import { HomePage } from "../features/menu/home-page";
import { MenuPage, MenuDetail } from "../features/menu/menu-page";
import { CartPage } from "../features/cart/cart-page";
import { CheckoutPage } from "../features/checkout/checkout-page";
import { AuthPage } from "../features/auth/auth-page";
import { VerifyEmailPage } from "../features/auth/verify-email-page";
import { OrdersPage, OrderConfirmation } from "../features/orders/orders-page";
import { ReservationPage } from "../features/reservations/reservation-page";
import {
  ReservationsPage,
  ReservationConfirmation,
} from "../features/reservations/reservations-page";
import { ProfilePage } from "../features/profile/profile-page";
import { EmptyState, Skeleton } from "../components/common/ui";
import type { UserRole } from "../types";
const DashboardPage = lazy(() =>
  import("../features/admin/dashboard-page").then((m) => ({
    default: m.DashboardPage,
  })),
);
const MenuManagementPage = lazy(() =>
  import("../features/admin/menu-management-page").then((m) => ({
    default: m.MenuManagementPage,
  })),
);
const OrderManagementPage = lazy(() =>
  import("../features/admin/order-management-page").then((m) => ({
    default: m.OrderManagementPage,
  })),
);
const ReservationManagementPage = lazy(() =>
  import("../features/admin/reservation-management-page").then((m) => ({
    default: m.ReservationManagementPage,
  })),
);
const TableManagementPage = lazy(() =>
  import("../features/admin/table-management-page").then((m) => ({
    default: m.TableManagementPage,
  })),
);
function Protected({
  allowedRole,
  children,
}: {
  allowedRole: UserRole;
  children: React.ReactNode;
}) {
  const { data: user, isPending, error } = useCurrentUser();
  const location = useLocation();
  if (isPending) return <Skeleton />;
  if (error && !isUnauthenticated(error))
    return (
      <EmptyState
        title="Unable to verify your session"
        description="Please refresh and try again."
      />
    );
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (user.role !== allowedRole)
    return (
      <EmptyState
        title="This space belongs to another role."
        description={`You’re signed in as ${user.role}. Use a ${allowedRole} demo account to continue.`}
        action={
          <Link className="button" to="/login">
            Switch account
          </Link>
        }
      />
    );
  if (!user.emailVerifiedAt)
    return (
      <Navigate
        to="/verify-email"
        state={{ from: location.pathname }}
        replace
      />
    );
  return <>{children}</>;
}
export function AppRouter() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="menu/:menuItemId" element={<MenuDetail />} />
          <Route path="cart" element={<CartPage />} />
          <Route
            path="checkout"
            element={
              <Protected allowedRole="customer">
                <CheckoutPage />
              </Protected>
            }
          />
          <Route path="login" element={<AuthPage key="login" />} />
          <Route
            path="register"
            element={<AuthPage registerMode key="register" />}
          />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="reservations/new" element={<ReservationPage />} />
          <Route
            path="my-orders"
            element={
              <Protected allowedRole="customer">
                <OrdersPage />
              </Protected>
            }
          />
          <Route
            path="order-confirmation/:orderId"
            element={
              <Protected allowedRole="customer">
                <OrderConfirmation />
              </Protected>
            }
          />
          <Route
            path="my-reservations"
            element={
              <Protected allowedRole="customer">
                <ReservationsPage />
              </Protected>
            }
          />
          <Route
            path="reservation-confirmation/:reservationId"
            element={
              <Protected allowedRole="customer">
                <ReservationConfirmation />
              </Protected>
            }
          />
          <Route
            path="account"
            element={
              <Protected allowedRole="customer">
                <ProfilePage />
              </Protected>
            }
          />
          <Route
            path="*"
            element={
              <EmptyState
                title="This table seems to be missing."
                description="We couldn’t find that page. There’s plenty of good food back home."
                action={
                  <Link className="button" to="/">
                    Back to home
                  </Link>
                }
              />
            }
          />
        </Route>
        <Route
          path="admin"
          element={
            <Protected allowedRole="admin">
              <AdminLayout />
            </Protected>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<DashboardPage />} />
          <Route path="menu" element={<MenuManagementPage />} />
          <Route path="orders" element={<OrderManagementPage />} />
          <Route path="reservations" element={<ReservationManagementPage />} />
          <Route path="tables" element={<TableManagementPage />} />
          <Route
            path="*"
            element={
              <EmptyState
                title="Workspace page not found"
                description="Return to your overview to find what you need."
                action={
                  <Link className="button" to="/admin/overview">
                    Overview
                  </Link>
                }
              />
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
