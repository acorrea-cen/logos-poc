"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  Search,
  ListOrdered,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ServiceStatus } from "./ServiceStatus";
import { ThemeToggle } from "./ThemeToggle";

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
  {
    href: "/config",
    label: "Configuración",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="dark flex h-full w-60 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 flex-col items-center justify-center gap-1 border-b border-border px-4">
        <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
        <p className="text-[10px] text-muted-foreground">Conocimiento Audiovisual</p>
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
      <div className="border-t border-border p-4 space-y-2">
        <ThemeToggle />
        <ServiceStatus />
        <p className="text-[10px] text-muted-foreground text-center">LOGOS v0.1.0-poc</p>
      </div>
    </aside>
  );
}
