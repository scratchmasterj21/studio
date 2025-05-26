# **App Name**: FireDesk

## Core Features:

- Google Sign-In: Enable Google Sign-In for user authentication.
- Ticket Submission: Allow users to submit support tickets with title, description, category, and priority.
- Ticket Assignment: Enable admins to view and filter all tickets by status/priority, and assign tickets to workers.
- Ticket Resolution: Enable workers to view assigned tickets, reply, and change the ticket status.
- Firestore Integration: Use Firestore to store ticket data including status, priority, category, createdBy, assignedTo, createdAt, updatedAt, and messages.
- Email Notifications: Trigger email notifications for ticket updates and assignments via Brevo SMTP API directly from the frontend.
- Realtime Updates: Implement Firestore real-time capabilities to auto-refresh ticket dashboards and sync updates.

## Style Guidelines:

- Primary color: Soft blue (#64B5F6) to convey trust and reliability, fitting for a help desk application. This hue suggests calmness and professionalism.
- Background color: Light gray (#F0F4F7), a subtle, desaturated tone from the same hue as the primary color, providing a neutral backdrop that ensures readability and reduces eye strain.
- Accent color: Pale green (#A5D6A7), analogous to blue, to signal positive actions such as ticket resolution.
- Use clear, readable sans-serif font for ticket details and communications.
- Employ simple, intuitive icons to represent ticket status, priority, and category.
- Design a clean, organized layout with clear separation of sections for ticket lists, details, and communication threads.