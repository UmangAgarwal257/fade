"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Play" },
  { href: "/table", label: "Table" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="flex items-center justify-between border-b border-line pb-4">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        Fade
      </Link>
      <nav className="flex gap-1 text-sm">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-2 ${active ? "bg-card text-foreground" : "text-muted hover:text-foreground"}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
