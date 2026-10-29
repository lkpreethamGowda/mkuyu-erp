import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Sales workspace crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f4f6f5] px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200">
            <h1 className="text-lg font-semibold text-slate-900">The workspace stopped unexpectedly</h1>
            <p className="mt-2 text-sm text-slate-600">{this.state.error.message}</p>
            <Button className="mt-5" onClick={() => window.location.reload()}>Reload</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
