import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError, configureApi } from "@mkuyu/api";
import { AuthProvider } from "@mkuyu/core";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import { router } from "./router/router";
import "./index.css";

const env = import.meta.env;

configureApi({
  baseUrl: env.VITE_API_BASE_URL ?? "",
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) => (error instanceof ApiError && error.status < 500 ? false : count < 1),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
