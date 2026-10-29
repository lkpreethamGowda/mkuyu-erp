import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button, Card } from "../components/ui";

export function ErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "The screen could not be loaded.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f5] px-4">
      <Card className="w-full max-w-lg p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <Button className="mt-5" onClick={() => window.location.assign("/dashboard")}>Back to dashboard</Button>
      </Card>
    </div>
  );
}
