import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X, LayoutDashboard, ShieldCheck, LogOut, User } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocalAuth } from "@/components/auth-provider";
import { AUTH0_ENABLED } from "@/lib/auth-config";

const links = [
  { to: "/", label: "Home" },
  { to: "/destinations", label: "Destinations" },
  { to: "/packages", label: "Packages" },
  { to: "/offers", label: "Offers" },
  { to: "/services", label: "Services" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 w-full border-b px-4 py-3 transition-all duration-300 md:px-6 ${
        scrolled
          ? "border-border bg-[#f7f4ef]/92 shadow-[0_16px_50px_rgba(14,23,38,0.08)] backdrop-blur-2xl"
          : "border-border/70 bg-[#f7f4ef]/88 backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link to="/" className="group flex items-center gap-3 rounded-full focus-ring">
          <div className="grid size-11 place-items-center rounded-full bg-[#070a0e] text-[11px] font-black text-white transition-transform group-hover:scale-105">
            JM
          </div>
          <span className="flex flex-col leading-none">
            <span className="text-base font-extrabold uppercase tracking-normal md:text-lg">
              JourneyMakers
            </span>
            <span className="mt-1 hidden text-sm font-semibold normal-case text-foreground/72 sm:block">
              Crafting unforgettable journeys
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-full text-sm font-semibold lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-4 py-2 text-foreground/70 transition-colors hover:bg-white/70 hover:text-foreground focus-ring"
              activeProps={{
                className: "bg-white text-foreground shadow-[0_8px_24px_rgba(14,23,38,0.1)]",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <UserMenu />
          <Link
            to="/booking"
            className="group inline-flex items-center gap-2 rounded-full bg-[#070a0e] px-5 py-3 text-xs font-extrabold uppercase tracking-normal text-white shadow-[0_14px_36px_rgba(14,23,38,0.18)] transition-all hover:-translate-y-0.5 hover:bg-accent hover:shadow-[0_16px_42px_rgba(199,107,47,0.28)] focus-ring"
          >
            Inquire Now{" "}
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="ml-1 grid size-11 place-items-center rounded-full border border-border bg-white/30 focus-ring lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {open && (
          <div className="absolute inset-x-0 top-full flex flex-col gap-2 border-b border-border bg-background/96 px-6 py-6 shadow-xl backdrop-blur-2xl lg:hidden">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-base font-bold hover:bg-secondary"
              >
                {l.label}
              </Link>
            ))}
            <MobileUserLinks onClose={() => setOpen(false)} />
          </div>
        )}
      </div>
    </nav>
  );
}

// ── Desktop user menu (avatar + dropdown) ─────────────────────────────────────

function UserMenu() {
  const { localUser, localLogout } = useLocalAuth();
  // AUTH0_ENABLED is a build-time constant — hook order is stable across renders
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth0 = AUTH0_ENABLED ? useAuth0() : null;
  const [dropOpen, setDropOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isAuth0Authed = auth0?.isAuthenticated ?? false;
  const isLoggedIn = !!localUser || isAuth0Authed;
  const isAdmin = localUser?.role === "admin";
  const displayName = localUser?.name ?? auth0?.user?.name ?? auth0?.user?.email ?? "You";
  const initials = displayName.slice(0, 2).toUpperCase();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    localLogout();
    if (isAuth0Authed) auth0?.logout({ logoutParams: { returnTo: window.location.origin } });
    setDropOpen(false);
  };

  if (!isLoggedIn) {
    return (
      <Link
        to="/signin"
        search={{ mode: "login" }}
        className="hidden rounded-full px-3 py-2 text-sm font-semibold hover:text-accent focus-ring md:inline"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        onClick={() => setDropOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-white/40 px-3 py-1.5 text-sm font-bold transition-all hover:bg-white/70"
      >
        <span
          className={`grid size-7 place-items-center rounded-full text-[11px] font-black text-background ${isAdmin ? "bg-[#c76b2f]" : "bg-foreground"}`}
        >
          {initials}
        </span>
        <span className="max-w-[100px] truncate">{displayName.split(" ")[0]}</span>
        {isAdmin && (
          <span className="rounded-full bg-[#c76b2f]/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#c76b2f]">
            Admin
          </span>
        )}
      </button>

      {dropOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
          {/* User info header */}
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-bold text-muted-foreground">Signed in as</p>
            <p className="truncate text-sm font-extrabold">{displayName}</p>
            {isAdmin && <p className="text-xs font-semibold text-[#c76b2f]">Administrator</p>}
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            <DropItem
              to="/dashboard"
              icon={<LayoutDashboard className="size-4" />}
              label="Dashboard"
              onClick={() => setDropOpen(false)}
            />

            {isAdmin && (
              <DropItem
                to="/admin"
                icon={<ShieldCheck className="size-4 text-[#c76b2f]" />}
                label="Admin Panel"
                highlight
                onClick={() => setDropOpen(false)}
              />
            )}

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DropItem({
  to,
  icon,
  label,
  highlight = false,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary ${highlight ? "text-[#c76b2f]" : ""}`}
    >
      {icon} {label}
    </Link>
  );
}

// ── Mobile user links (inside hamburger menu) ─────────────────────────────────

function MobileUserLinks({ onClose }: { onClose: () => void }) {
  const { localUser, localLogout } = useLocalAuth();
  // AUTH0_ENABLED is a build-time constant — hook order is stable across renders
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth0 = AUTH0_ENABLED ? useAuth0() : null;

  const isAuth0Authed = auth0?.isAuthenticated ?? false;
  const isLoggedIn = !!localUser || isAuth0Authed;
  const isAdmin = localUser?.role === "admin";

  const handleLogout = () => {
    localLogout();
    if (isAuth0Authed) auth0?.logout({ logoutParams: { returnTo: window.location.origin } });
    onClose();
  };

  if (!isLoggedIn) {
    return (
      <Link
        to="/signin"
        search={{ mode: "login" }}
        onClick={onClose}
        className="rounded-xl px-4 py-3 text-base font-bold hover:bg-secondary flex items-center gap-3"
      >
        <User className="size-4" /> Sign in
      </Link>
    );
  }

  return (
    <>
      <div className="my-2 border-t border-border" />
      <Link
        to="/dashboard"
        onClick={onClose}
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-bold hover:bg-secondary"
      >
        <LayoutDashboard className="size-4" /> Dashboard
      </Link>
      {isAdmin && (
        <Link
          to="/admin"
          onClick={onClose}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-bold text-[#c76b2f] hover:bg-secondary"
        >
          <ShieldCheck className="size-4" /> Admin Panel
        </Link>
      )}
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-bold text-red-500 hover:bg-red-50"
      >
        <LogOut className="size-4" /> Sign out
      </button>
    </>
  );
}
