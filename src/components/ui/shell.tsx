// Kerangka halaman mobile: TopBar (back + judul), Page (scroll area + safe area), BottomNav (PRD P3 v2.1 D-P3-01:
// Home · Requests · Bills · Facilities · Akun; Inbox = ikon lonceng di header; Tamu, Paket, Parkir dari quick action Home),
// StickyFooter. Label tab lama dipertahankan sampai penyelarasan label setelah P5 (ADJ-05).
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bell, CalendarDays, ChevronLeft, CircleUserRound, Home, ListChecks, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { useAuth } from "@/app/auth";
import { cn } from "@/lib/utils";

export function Page({ children, className, bottomNav = false, bg }: { children: ReactNode; className?: string; bottomNav?: boolean; bg?: string }) {
  return (
    <div className={cn("app-shell flex min-h-dvh flex-col", bg)}>
      <div className={cn("flex-1", bottomNav && "pb-[calc(var(--safe-bottom)+72px)]", className)}>{children}</div>
      {bottomNav && <BottomNav />}
    </div>
  );
}

export function TopBar({ title, onBack, right, className, transparent, center = true }: { title?: ReactNode; onBack?: (() => void) | false; right?: ReactNode; className?: string; transparent?: boolean; center?: boolean }) {
  const nav = useNavigate();
  const back = onBack === false ? null : (onBack ?? (() => nav(-1)));
  return (
    <header className={cn("pt-safe sticky top-0 z-30", !transparent && "border-b border-border bg-card", className)}>
      <div className="flex h-14 items-center px-2">
        {back ? (
          <button type="button" onClick={back} aria-label="Kembali" className="tap flex h-10 w-10 items-center justify-center rounded-full">
            <ChevronLeft size={26} strokeWidth={2.5} />
          </button>
        ) : (
          <span className="w-10" />
        )}
        <div className={cn("flex-1 truncate text-[17px] font-bold", center ? "text-center" : "text-left")}>{title}</div>
        <div className="flex w-10 items-center justify-end">{right}</div>
      </div>
    </header>
  );
}

export function StickyFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("sticky bottom-0 z-20 bg-background/95 px-4 pb-[calc(var(--safe-bottom)+16px)] pt-3 backdrop-blur", className)}>{children}</div>;
}

const tabs = [
  { to: "/", label: "Home", icon: Home, end: true, cap: null },
  { to: "/requests", label: "Requests", icon: ListChecks, cap: null },
  { to: "/bills", label: "Bills", icon: Wallet, cap: "billing" },
  { to: "/facilities", label: "Facilities", icon: CalendarDays, cap: "facility_booking" },
  { to: "/account", label: "Akun", icon: CircleUserRound, cap: null },
];

/** Root tiap tab (tombol back Android di sini keluar aplikasi). */
export const TAB_ROOTS = tabs.map((t) => t.to);

export function useUnread() {
  const { user } = useAuth();
  // akun berpassword sementara: server menolak selain /tenant/me (403 PASSWORD_CHANGE_REQUIRED) → jangan poll
  return useQuery({ queryKey: ["unread"], queryFn: () => api().unreadCount(), enabled: !!user && !user.must_change_password, refetchInterval: 30_000 });
}

/** Modul hanya tampil bila capability property aktif (enforcement tetap server-side). */
export function hasCap(user: { capabilities?: string[] } | null | undefined, cap: string | null) {
  if (!cap) return true;
  const caps = user?.capabilities;
  return !caps || caps.length === 0 || caps.includes(cap);
}

export function BottomNav() {
  const { user } = useAuth();
  const visible = tabs.filter((t) => hasCap(user, t.cap));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-border bg-card pb-safe">
      <div className="grid h-[64px]" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}>
        {visible.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => cn("tap flex flex-col items-center justify-center gap-1 text-[11px] font-semibold", isActive ? "text-brand-600" : "text-neutral-400")}>
            {({ isActive }) => (
              <>
                <t.icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                {t.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Tombol Inbox (lonceng + badge belum dibaca) untuk header tab (D-P3-01; Akun kini tab sendiri). */
export function HeaderActions({ light }: { light?: boolean }) {
  const nav = useNavigate();
  const { data: unread } = useUnread();
  const cls = cn("tap relative flex h-10 w-10 items-center justify-center rounded-full", light ? "bg-white/20 text-white" : "bg-card text-neutral-700 shadow-card");
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={unread ? `Inbox, ${unread} belum dibaca` : "Inbox"} className={cls} onClick={() => nav("/inbox")}>
        <Bell size={20} />
        {!!unread && <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-critical px-1 text-center text-[10px] font-bold leading-[18px] text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
    </div>
  );
}

/** Header tab (judul + lonceng Inbox) — dipakai Requests/Facilities/Bills/Akun. */
export function TabHeader({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children?: ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-30 bg-background">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-bold">{title}</h1>
          {subtitle && <p className="truncate text-[12px] text-neutral-500">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          <HeaderActions />
        </div>
      </div>
      {children}
    </header>
  );
}

export function SectionTitle({ title, subtitle, action, onAction }: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 px-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[20px] font-bold">{title}</h2>
        {action && (
          <button type="button" onClick={onAction} className="text-[15px] font-semibold text-brand-500">
            {action}
          </button>
        )}
      </div>
      {subtitle && <p className="mt-0.5 text-[13px] text-neutral-text">{subtitle}</p>}
    </div>
  );
}
