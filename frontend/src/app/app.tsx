import { useEffect, useSyncExternalStore } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { AppRouter } from "./router";
import { useTheme } from "../store/theme-store";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/query-client";
import { queryKeys } from "../lib/query-keys";
import { ErrorBoundary } from "../components/common/error-boundary";
import { ToastProvider, Skeleton } from "../components/common/ui";
const subscribe = () => () => {};
function Effects() {
  const theme = useTheme((s) => s.theme);
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    const unauthorized = () =>
      queryClient.setQueryData(queryKeys.auth.current, null);
    const emailNotVerified = () => {
      if (pathname !== "/verify-email")
        navigate("/verify-email", { state: { from: pathname } });
    };
    window.addEventListener("orderfirst:unauthorized", unauthorized);
    window.addEventListener("orderfirst:email-not-verified", emailNotVerified);
    return () => {
      window.removeEventListener("orderfirst:unauthorized", unauthorized);
      window.removeEventListener(
        "orderfirst:email-not-verified",
        emailNotVerified,
      );
    };
  }, [navigate, pathname]);
  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() =>
        document.getElementById(hash.slice(1))?.scrollIntoView(),
      );
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("main")?.focus({ preventScroll: true });
    }
  }, [pathname, hash]);
  return null;
}
export function App() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <Skeleton />;
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <Effects />
            <AppRouter />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
