import { Link } from "@tanstack/react-router";
import { Sparkles, UserRound } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <Sparkles className="size-5 text-accent" />
          <span>
            AV <span className="text-primary">Collectr</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link
            to="/"
            className="rounded-md px-3 py-2 transition-colors hover:bg-secondary"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-primary" }}
          >
            Início
          </Link>
          <Link
            to="/colecoes"
            className="rounded-md px-3 py-2 transition-colors hover:bg-secondary"
            activeProps={{ className: "text-primary" }}
          >
            Coleções
          </Link>
          <Link
            to="/admin"
            aria-label="Painel Admin"
            title="Painel Admin"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <UserRound className="size-5" />
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
