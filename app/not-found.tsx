import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4 max-w-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
          <span className="text-2xl font-bold text-primary">λ</span>
        </div>
        <h1 className="text-2xl font-bold">Página no encontrada</h1>
        <p className="text-sm text-muted-foreground">
          Esta sección no existe o el video fue eliminado.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
