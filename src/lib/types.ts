
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'user' | 'admin' | 'worker';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: Timestamp;
}

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High';
export type TicketCategory = 'Bug Report' | 'Feature Request' | 'General Inquiry' | 'Billing' | 'Other';

export interface TicketMessage {
  id: string;
  senderId: string;
  senderDisplayName: string; // Added for easier display
  senderRole: UserRole;
  message: string;
  timestamp: Timestamp;
}

export interface Attachment {
  id: string; // A unique ID for the attachment, e.g., uuid
  name: string;
  url: string; // Publicly accessible URL from R2
  type: string; // MIME type
  size: number; // Size in bytes
  fileKey: string; // Key in the R2 bucket
}

export interface Ticket {
  id:string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  createdBy: string; // User UID
  createdByName: string; // Denormalized for display
  assignedTo?: string; // Worker UID
  assignedToName?: string; // Denormalized for display
  createdAt: Timestamp;
  updatedAt: Timestamp;
  messages: TicketMessage[];
  attachments?: Attachment[]; // Added for file uploads
}

// Removed TicketStats as per previous request
// export interface TicketStats {
//   totalTickets: number;
//   openTickets: number;
//   inProgressTickets: number;
//   resolvedTickets: number;
//   closedTickets: number;
// }
