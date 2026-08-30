import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import Preloader from "@/components/Preloader";

/**
 * Runs the brand preloader on first site load, and again whenever the user
 * enters the dashboard from outside it.
 */
export default function PreloaderGate() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [run, setRun] = useState<{ key: string; label: string } | null>({
    key: "boot",
    label: "TENDER",
  });
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const wasDash = prevPath.current?.startsWith("/dashboard") ?? false;
    const isDash = pathname.startsWith("/dashboard");
    if (prevPath.current !== null && isDash && !wasDash) {
      setRun({ key: `dash-${Date.now()}`, label: "TENDER TERMINAL" });
    }
    prevPath.current = pathname;
  }, [pathname]);

  if (!run) return null;

  return (
    <Preloader
      runKey={run.key}
      label={run.label}
      duration={run.key === "boot" ? 2000 : 1400}
      onDone={() => setRun(null)}
    />
  );
}
