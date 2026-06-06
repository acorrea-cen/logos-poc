"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  Search,
  ListOrdered,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ServiceStatus } from "./ServiceStatus";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/videos",
    label: "Videos",
    icon: Video,
  },
  {
    href: "/search",
    label: "Búsqueda",
    icon: Search,
  },
  {
    href: "/queue",
    label: "Cola",
    icon: ListOrdered,
  },
  {
    href: "/transcripts",
    label: "Transcripciones",
    icon: FileText,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">λ</span>
        </div>
        <div>
          <p className="text-sm font-bold tracking-wider text-foreground">LOGOS</p>
          <p className="text-[10px] text-muted-foreground">Conocimiento Audiovisual</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer del sidebar — estado de servicios */}
      <div className="border-t border-border p-4 space-y-3">
        <ServiceStatus />
        <p className="text-[10px] text-muted-foreground text-center">LOGOS v0.1.0-poc</p>
      </div>
    </aside>
  );
}
