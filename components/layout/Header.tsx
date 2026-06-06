import { WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Indicador Modo Offline — siempre visible, prominente */}
      <Badge variant="success" className="gap-1.5 px-3 py-1 text-xs font-medium">
        <WifiOff className="h-3 w-3" />
        Modo Privado · Sin Internet
      </Badge>
    </header>
  );
}
