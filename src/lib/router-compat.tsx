import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";

/**
 * Thin react-router-dom-compatible shim on top of TanStack Router.
 * Lets the ported pages/components keep their original API surface.
 */

export function useLocation() {
  const loc = useRouterState({ select: (s) => s.location });
  return {
    pathname: loc.pathname,
    hash: loc.hash ? (loc.hash.startsWith("#") ? loc.hash : `#${loc.hash}`) : "",
    search: loc.searchStr ?? "",
    state: loc.state as unknown,
    key: loc.href,
  };
}

export function useSearchParams(): [URLSearchParams, (next: URLSearchParams) => void] {
  const router = useRouter();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr ?? "" });
  const params = new URLSearchParams(searchStr);
  const setParams = (next: URLSearchParams) => {
    const qs = next.toString();
    router.navigate({ href: `${window.location.pathname}${qs ? `?${qs}` : ""}` } as never);
  };
  return [params, setParams];
}

export function useNavigate() {
  const router = useRouter();
  return (to: string | number, opts?: { replace?: boolean }) => {
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }
    router.navigate({ href: to, replace: opts?.replace } as never);
  };
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  replace?: boolean;
  children?: ReactNode;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, onClick, children, ...rest },
  ref,
) {
  const navigate = useNavigate();
  return (
    <a
      ref={ref}
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to, { replace });
      }}
      {...rest}
    >
      {children}
    </a>
  );
});

type NavLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "style"> & {
  to: string;
  end?: boolean;
  replace?: boolean;
  className?: string | ((props: { isActive: boolean }) => string);
  style?: React.CSSProperties | ((props: { isActive: boolean }) => React.CSSProperties);
  children?: ReactNode | ((props: { isActive: boolean }) => ReactNode);
};

export function NavLink({ to, end, replace, className, style, children, onClick, ...rest }: NavLinkProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const target = to.split("#")[0].split("?")[0];
  const isActive = end
    ? pathname === target || pathname === `${target}/`
    : pathname === target || pathname.startsWith(`${target.replace(/\/$/, "")}/`);

  return (
    <a
      href={to}
      className={typeof className === "function" ? className({ isActive }) : className}
      style={typeof style === "function" ? style({ isActive }) : style}
      aria-current={isActive ? "page" : undefined}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to, { replace });
      }}
      {...rest}
    >
      {typeof children === "function" ? children({ isActive }) : children}
    </a>
  );
}
