import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
          <div className="w-full max-w-lg space-y-4">
            <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The interface hit an unexpected error while rendering. Your last action may not
              have completed.
            </p>
            <pre className="max-h-56 overflow-auto rounded-lg border border-border bg-card p-3 text-xs text-red-300">
              {String(this.state.error.message || this.state.error)}
            </pre>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => this.setState({ error: null })}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Try to recover
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-white/[0.05]"
              >
                Reload app
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}