import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ComingSoonProvider } from "@/components/ComingSoonModal";
import { initLenis, getLenis, scrollToHash } from "@/lib/lenis";
import SiteBackground from "@/components/SiteBackground";
import { TenderWalletProvider } from "@/lib/wallet/wallet-context";
import PreloaderGate from "@/components/PreloaderGate";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#FFFFFF" },
      { title: "TENDER: Get paid in the assets you'd rather hold" },
      {
        name: "description",
        content:
          "TENDER is the receive-side RWA settlement rail on Solana. Get paid in the assets you'd rather hold.",
      },
      { property: "og:title", content: "TENDER: Get paid in the assets you'd rather hold" },
      {
        property: "og:description",
        content: "The receive-side RWA settlement rail on Solana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** Lenis smooth scroll, synced with GSAP's ticker + ScrollTrigger. */
function useSmoothScroll() {
  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = initLenis();
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      cleanup = () => gsap.ticker.remove(tick);
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);
}

/** Handles hash navigation after route changes (e.g. /#work, /dashboard/claim). */
function useHashScroll() {
  const location = useRouterState({ select: (s) => s.location });
  useEffect(() => {
    if (location.hash) {
      const t = setTimeout(() => scrollToHash(location.hash, true), 60);
      return () => clearTimeout(t);
    }
    getLenis()?.scrollTo(0, { immediate: true });
    return;
  }, [location.pathname, location.hash]);
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useSmoothScroll();
  useHashScroll();

  return (
    <QueryClientProvider client={queryClient}>
      <TenderWalletProvider>
        <ComingSoonProvider>
          <PreloaderGate />
          {/* Landing page stays pure white + rule grid; static wash elsewhere. */}
          {pathname !== "/" && <SiteBackground />}
          <div className="relative z-10 min-h-[100dvh] text-ink flex flex-col">
            <Navbar />
            <main className="flex-1 pt-20">
              {/* Required: nested routes render here. */}
              <Outlet />
            </main>
            <Footer />
          </div>
        </ComingSoonProvider>
      </TenderWalletProvider>
    </QueryClientProvider>
  );
}
