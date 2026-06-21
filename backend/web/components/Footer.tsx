import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            Track Steam price history and get notified the moment a game drops below your target.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Built for gamers who refuse to pay full price.</p>
          <p className="mt-1 text-xs">
            Prices are tracked periodically and may differ from the live store. Not affiliated with Valve or Steam.
          </p>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Game Signal
        </div>
      </div>
    </footer>
  );
}
