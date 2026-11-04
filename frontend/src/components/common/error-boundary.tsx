import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="empty-state">
        <h1>Something didn’t go as planned.</h1>
        <p>Your saved cart is still here. Reload to try again.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Reload OrderFirst
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
