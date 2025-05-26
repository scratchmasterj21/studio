import type { TicketCategory, TicketPriority, TicketStatus } from '@/lib/types';

export const siteConfig = {
  name: "FireDesk",
  description: "A Help Desk Ticketing System built with Next.js and Firebase.",
};

export const ticketCategories: TicketCategory[] = [
  "Bug Report",
  "Feature Request",
  "General Inquiry",
  "Billing",
  "Other",
];

export const ticketPriorities: TicketPriority[] = [
  "Low",
  "Medium",
  "High",
];

export const ticketStatuses: TicketStatus[] = [
  "Open",
  "In Progress",
  "Resolved",
  "Closed",
];
