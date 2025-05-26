import type { TicketPriority } from "@/lib/types";
import { ChevronUp, Minus, ChevronDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketPriorityIconProps {
  priority: TicketPriority;
  className?: string;
  size?: number;
}

export default function TicketPriorityIcon({ priority, className, size = 16 }: TicketPriorityIconProps) {
  const iconProps = { width: size, height: size };

  switch (priority) {
    case "High":
      return <ChevronUp {...iconProps} className={cn("text-destructive", className)} />;
    case "Medium":
      return <Minus {...iconProps} className={cn("text-yellow-500", className)} />; // Using a direct color for medium as theme doesn't have a direct yellow
    case "Low":
      return <ChevronDown {...iconProps} className={cn("text-green-500", className)} />; // Using direct color for low
    default:
      return <AlertCircle {...iconProps} className={cn("text-muted-foreground", className)} />;
  }
}
