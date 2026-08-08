"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The dashboard tab bar. Client-side only because it needs the current path to
// mark the active tab — everything it renders is passed in from the layout.
export default function DashboardNav({
  showReview,
  coins,
}: {
  showReview: boolean;
  coins: number;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: "/dashboard", label: "My Projects" },
    { href: "/dashboard/explore", label: "Explore" },
    ...(showReview ? [{ href: "/dashboard/review", label: "Review" }] : []),
    { href: "/dashboard/shop", label: "Shop" },
    { href: "/dashboard/settings", label: "Settings" },
  ];

  // "/dashboard" would prefix-match every tab, so it only counts as active on
  // an exact hit; the others stay lit on their sub-pages (a project detail
  // page keeps My Projects highlighted).
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname.startsWith("/dashboard/projects")
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex items-center justify-between border-b border-zinc-200">
      <div className="-mb-px flex gap-6 text-sm">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive(tab.href) ? "page" : undefined}
            className={`border-b-2 pb-4 transition-colors ${
              isActive(tab.href)
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <Link
        href="/dashboard/settings"
        className="pb-4 text-sm text-zinc-900 hover:text-zinc-600"
        title="Coins earned so far"
      >
        {coins} coins
      </Link>
    </nav>
  );
}
