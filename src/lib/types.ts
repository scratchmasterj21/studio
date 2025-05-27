
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
  senderDisplayName: string;
  senderRole: UserRole;
  message: string;
  timestamp: Timestamp;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  fileKey: string;
}

export interface Solution {
  resolvedByUid: string;
  resolvedByName: string;
  resolvedAt: Timestamp;
  text: string;
  attachments?: Attachment[];
}

export interface Ticket {
  id:string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  messages: TicketMessage[];
  attachments?: Attachment[];
  solution?: Solution; // Added solution field
}
