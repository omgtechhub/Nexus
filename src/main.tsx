import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
      /**
       * Retry a transient failure, but never one the server meant.
       *
       * This was a flat `retry: false`, so a single dropped packet or a
       * momentary restart of the API turned into a hard error state the user
       * had to reload out of. Retrying everything is the opposite mistake: a
       * 401, 403 or 404 is a settled answer, and hammering it three times
       * delays the real outcome and multiplies the load — on the auth
       * endpoints it also burns the rate limit the user is about to need.
       *
       * So: retry twice on a network failure (status 0), a timeout (408) or a
       * 5xx; give up immediately on anything else.
       */
      retry: (failureCount, error: any) => {
        if (failureCount >= 2) return false;

        const status = error?.status;
        if (typeof status !== 'number') return false;

        return status === 0 || status === 408 || status >= 500;
      },
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000),
    },
    mutations: {
      // Never automatic. A retried mutation is a second checkout, a second
      // payout or a second order — the caller decides.
      retry: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
