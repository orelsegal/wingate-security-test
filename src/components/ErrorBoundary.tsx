/**
 * ErrorBoundary — catches unhandled React render errors and shows a
 * friendly Hebrew error screen instead of a blank white page.
 *
 * Usage:
 *   Wrap any subtree:  <ErrorBoundary><MyPage /></ErrorBoundary>
 *   Or page-level:     wrap <Outlet /> in AppLayout
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional fallback to render instead of the default error screen */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console so it's visible in Vercel function logs / browser devtools
    console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const msg = this.state.error?.message ?? "שגיאה לא ידועה";

    return (
      <div
        className="min-h-[50vh] flex flex-col items-center justify-center gap-5 px-6 py-12 text-center"
        dir="rtl"
      >
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-destructive" strokeWidth={1.5} />
        </div>

        <div className="space-y-2 max-w-sm">
          <h2 className="text-[16px] font-semibold text-foreground">משהו השתבש</h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            אירעה שגיאה בטעינת הדף. ניתן לנסות שוב או לחזור לדף הבית.
          </p>
          <pre className="mt-3 text-[10px] text-destructive/80 bg-destructive/5 border border-destructive/15 rounded-lg p-3 text-start overflow-auto max-h-40 w-full max-w-sm">
            {msg}
          </pre>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium transition-all hover:opacity-90 active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
            נסה שוב
          </button>
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-[13px] font-medium text-foreground transition-all hover:bg-accent active:scale-95"
          >
            <Home className="h-3.5 w-3.5" strokeWidth={1.5} />
            דף הבית
          </a>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
