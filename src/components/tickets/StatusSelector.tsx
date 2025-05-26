"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TicketStatus } from "@/lib/types";
import { ticketStatuses } from "@/config/site";

interface StatusSelectorProps {
  currentStatus: TicketStatus;
  onStatusChange: (newStatus: TicketStatus) => void;
  disabled?: boolean;
}

export default function StatusSelector({ currentStatus, onStatusChange, disabled }: StatusSelectorProps) {
  return (
    <Select
      value={currentStatus}
      onValueChange={(value) => onStatusChange(value as TicketStatus)}
      disabled={disabled}
    >
      <SelectTrigger id="status-selector" className="w-full">
        <SelectValue placeholder="Change status" />
      </SelectTrigger>
      <SelectContent>
        {ticketStatuses.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
