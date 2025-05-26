import { Badge } from "@/components/ui/badge";
import type { TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TicketStatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export default function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary"; // Default for Open
  let statusText = status;

  switch (status) {
    case "Open":
      variant = "secondary"; // Blueish/Grayish based on theme
      break;
    case "In Progress":
      // For in progress, we might want a more active color.
      // Using default (primary) for this, assuming primary is a noticeable color.
      variant = "default"; 
      break;
    case "Resolved":
      // Using custom class for accent color (green)
      return <Badge className={cn("bg-accent text-accent-foreground hover:bg-accent/90", className)}>{statusText}</Badge>;
    case "Closed":
      variant = "destructive";
      break;
    default:
      variant = "outline";
  }

  return (
    <Badge variant={variant} className={cn(className)}>
      {statusText}
    </Badge>
  );
}
