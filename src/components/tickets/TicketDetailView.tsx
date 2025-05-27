
"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import type { Ticket, UserProfile, TicketStatus, TicketMessage } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label"; // Added import
import { useToast } from '@/hooks/use-toast';
import { addMessageToTicket, updateTicketStatus, assignTicket, getUserProfile } from '@/lib/firestore';
import TicketStatusBadge from './TicketStatusBadge';
import TicketPriorityIcon from './TicketPriorityIcon';
import { Clock, User, MessageSquare, Paperclip, Send, Edit3, Users, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusSelector from './StatusSelector';
import AssignTicketDialog from './AssignTicketDialog';
import MessageItem from './MessageItem';
import { sendEmailViaBrevo } from '@/lib/brevo';


const messageFormSchema = z.object({
  message: z.string().min(1, "Message cannot be empty.").max(1000, "Message is too long."),
});
type MessageFormValues = z.infer<typeof messageFormSchema>;

interface TicketDetailViewProps {
  ticket: Ticket;
  currentUserProfile: UserProfile;
}

export default function TicketDetailView({ ticket, currentUserProfile }: TicketDetailViewProps) {
  const { toast } = useToast();
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const messageForm = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: { message: "" },
  });

  const handleAddMessage = async (values: MessageFormValues) => {
    setIsSubmittingMessage(true);
    try {
      const messageData = {
        senderId: currentUserProfile.uid,
        senderRole: currentUserProfile.role,
        message: values.message,
      };
      await addMessageToTicket(ticket.id, messageData, currentUserProfile);
      messageForm.reset();
      toast({ title: "Message Sent", description: "Your reply has been added to the ticket." });

      // Email Notification Logic
      let recipients: { email: string, name?: string }[] = [];
      
      // Notify ticket creator if not the current user
      if (ticket.createdBy !== currentUserProfile.uid && ticket.createdByName) { 
        const creatorProfile = await getUserProfile(ticket.createdBy); 
        if (creatorProfile?.email) recipients.push({ email: creatorProfile.email, name: creatorProfile.displayName || ticket.createdByName });
      }
      // Notify assigned worker if not the current user
      if (ticket.assignedTo && ticket.assignedTo !== currentUserProfile.uid && ticket.assignedToName) {
        const workerProfile = await getUserProfile(ticket.assignedTo); 
        if (workerProfile?.email) recipients.push({ email: workerProfile.email, name: workerProfile.displayName || ticket.assignedToName });
      }
      // Deduplicate recipients based on email
      recipients = recipients.filter((r, index, self) =>
        index === self.findIndex((t) => t.email === r.email && r.email != null) // Ensure email is not null
      );
      
      if (recipients.length > 0) {
         await sendEmailViaBrevo({
           to: recipients,
           subject: `Update on Ticket: ${ticket.title}`,
           htmlContent: `
             <p>There's a new reply on ticket <strong>${ticket.title}</strong> (ID: ${ticket.id})</p>
             <p><strong>${currentUserProfile.displayName || currentUserProfile.email || 'User'}</strong> said: ${values.message}</p>
             <p>View the ticket <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/tickets/${ticket.id}">here</a>.</p>
           `,
         });
      }

    } catch (error) {
      console.error("Error adding message:", error);
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    } finally {
      setIsSubmittingMessage(false);
    }
  };
  

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setIsUpdatingStatus(true);
    try {
      await updateTicketStatus(ticket.id, newStatus);
      toast({ title: "Status Updated", description: `Ticket status changed to ${newStatus}.` });

      // Email Notification Logic
      if (ticket.createdBy !== currentUserProfile.uid && ticket.createdByName) {
        const creatorProfile = await getUserProfile(ticket.createdBy);
        if (creatorProfile?.email) {
          await sendEmailViaBrevo({
            to: [{ email: creatorProfile.email, name: creatorProfile.displayName || ticket.createdByName }],
            subject: `Ticket Status Updated: ${ticket.title}`,
            htmlContent: `<p>The status of your ticket <strong>${ticket.title}</strong> has been updated to <strong>${newStatus}</strong>.</p><p>View the ticket <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/tickets/${ticket.id}">here</a>.</p>`,
          });
        }
      }

    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const handleAssignTicket = async (workerId: string, workerName: string) => {
    try {
      await assignTicket(ticket.id, workerId, workerName);
      toast({ title: "Ticket Assigned", description: `Ticket assigned to ${workerName}.` });

      // Email Notification Logic for assignment
      const workerProfile = await getUserProfile(workerId);
      if (workerProfile?.email) {
        await sendEmailViaBrevo({
          to: [{ email: workerProfile.email, name: workerProfile.displayName || workerName }],
          subject: `New Ticket Assigned to You: ${ticket.title}`,
          htmlContent: `<p>You have been assigned a new ticket: <strong>${ticket.title}</strong> (ID: ${ticket.id}).</p><p>View the ticket <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/tickets/${ticket.id}">here</a>.</p>`,
        });
      }
      // Also notify ticket creator
       if (ticket.createdBy !== currentUserProfile.uid && ticket.createdByName) {
        const creatorProfile = await getUserProfile(ticket.createdBy);
        if (creatorProfile?.email) {
          await sendEmailViaBrevo({
            to: [{ email: creatorProfile.email, name: creatorProfile.displayName || ticket.createdByName }],
            subject: `Ticket Assigned: ${ticket.title}`,
            htmlContent: `<p>Your ticket <strong>${ticket.title}</strong> has been assigned to ${workerName}.</p><p>View the ticket <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/tickets/${ticket.id}">here</a>.</p>`,
          });
        }
      }

    } catch (error) {
      console.error("Error assigning ticket:", error);
      toast({ title: "Error", description: "Failed to assign ticket.", variant: "destructive" });
    }
  };


  const canManageTicket = currentUserProfile.role === 'admin' || (currentUserProfile.role === 'worker' && ticket.assignedTo === currentUserProfile.uid);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Ticket Main Info Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-2xl font-bold">{ticket.title}</CardTitle>
              <TicketStatusBadge status={ticket.status} className="text-sm px-3 py-1"/>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              Submitted by {ticket.createdByName} on {format(ticket.createdAt.toDate(), 'PPpp')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-foreground leading-relaxed">{ticket.description}</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2">{ticket.category}</Badge>
                 Category
              </div>
              <div className="flex items-center">
                <TicketPriorityIcon priority={ticket.priority} className="mr-1.5" />
                {ticket.priority} Priority
              </div>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground border-t pt-4">
            Last updated: {format(ticket.updatedAt.toDate(), 'PPpp')}
          </CardFooter>
        </Card>

        {/* Messages Section */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center"><MessageSquare className="mr-2 h-5 w-5" /> Communication History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticket.messages.length > 0 ? (
              ticket.messages.sort((a,b) => a.timestamp.toMillis() - b.timestamp.toMillis()).map((msg) => (
                <MessageItem key={msg.id} message={msg} currentUserId={currentUserProfile.uid} />
              ))
            ) : (
              <p className="text-muted-foreground italic">No messages yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Add Reply Form */}
        {ticket.status !== 'Closed' && ticket.status !== 'Resolved' && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-xl flex items-center"><Edit3 className="mr-2 h-5 w-5" /> Add Your Reply</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...messageForm}>
                <form onSubmit={messageForm.handleSubmit(handleAddMessage)} className="space-y-4">
                  <FormField
                    control={messageForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="message-input" className="sr-only">Your Message</FormLabel>
                        <FormControl>
                          <Textarea id="message-input" placeholder="Type your message here..." {...field} rows={4} className="min-h-[100px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSubmittingMessage}>
                    {isSubmittingMessage ? <LoadingSpinner size="sm" className="mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                    Send Reply
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar for Actions and Info */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Ticket Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <TicketStatusBadge status={ticket.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Priority:</span>
              <span className="font-medium flex items-center"><TicketPriorityIcon priority={ticket.priority} className="mr-1.5" />{ticket.priority}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-medium">{ticket.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created By:</span>
              <span className="font-medium truncate" title={ticket.createdByName}>{ticket.createdByName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created At:</span>
              <span className="font-medium">{format(ticket.createdAt.toDate(), 'MMM d, yyyy')}</span>
            </div>
             <div className="flex justify-between">
              <span className="text-muted-foreground">Assigned To:</span>
              <span className="font-medium truncate" title={ticket.assignedToName || 'Unassigned'}>{ticket.assignedToName || 'Unassigned'}</span>
            </div>
          </CardContent>
        </Card>
        
        {canManageTicket && ticket.status !== 'Closed' && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Manage Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status-selector" className="text-sm font-medium mb-1 block">Change Status</Label>
                <StatusSelector
                  currentStatus={ticket.status}
                  onStatusChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                />
                 {isUpdatingStatus && <LoadingSpinner size="sm" className="mt-2"/>}
              </div>

              {currentUserProfile.role === 'admin' && (
                <div>
                  <Label className="text-sm font-medium mb-1 block">Assign Ticket</Label>
                  <AssignTicketDialog 
                    ticketId={ticket.id} 
                    currentAssigneeId={ticket.assignedTo}
                    onAssign={handleAssignTicket}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* Optional: File attachments can be listed here */}
      </div>
    </div>
  );
}


      