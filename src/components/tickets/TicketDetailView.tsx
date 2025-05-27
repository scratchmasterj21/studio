
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
import { Label } from "@/components/ui/label";
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

  const getTicketLink = () => `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/tickets/${ticket.id}`;
  
  const getStandardFooter = () => `
    <p style="font-size: 0.9em; color: #555555; margin-top: 20px; border-top: 1px solid #eeeeee; padding-top: 10px;">
      This is an automated notification from FireDesk. Please do not reply directly to this email unless instructed.
      <br>
      You can view the ticket <a href="${getTicketLink()}">here</a>.
    </p>
  `;

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
      
      if (ticket.createdBy !== currentUserProfile.uid && ticket.createdByName) { 
        const creatorProfile = await getUserProfile(ticket.createdBy); 
        if (creatorProfile?.email) recipients.push({ email: creatorProfile.email, name: creatorProfile.displayName || ticket.createdByName });
      }
      if (ticket.assignedTo && ticket.assignedTo !== currentUserProfile.uid && ticket.assignedToName) {
        const workerProfile = await getUserProfile(ticket.assignedTo); 
        if (workerProfile?.email) recipients.push({ email: workerProfile.email, name: workerProfile.displayName || ticket.assignedToName });
      }
      recipients = recipients.filter((r, index, self) =>
        index === self.findIndex((t) => t.email === r.email && r.email != null)
      );
      
      if (recipients.length > 0) {
         await sendEmailViaBrevo({
           to: recipients,
           subject: `New Reply on FireDesk Ticket: ${ticket.title} (#${ticket.id})`,
           htmlContent: `
             <p>A new reply has been added to FireDesk ticket <strong>${ticket.title}</strong> (#${ticket.id}) by <strong>${currentUserProfile.displayName || currentUserProfile.email} (${currentUserProfile.role})</strong>.</p>
             <p><strong>Message:</strong></p>
             <div style="padding: 10px; border-left: 3px solid #eee; margin: 10px 0; background-color: #f9f9f9;">
               <p style="margin:0;">${values.message.replace(/\n/g, '<br>')}</p>
             </div>
             <p>You can view the ticket and reply by clicking the link below.</p>
             ${getStandardFooter()}
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

      let emailSubject = '';
      let emailHtmlContent = '';
      const ticketCreatorName = ticket.createdByName || 'User';

      if (newStatus === 'Resolved') {
        emailSubject = `Update: Your FireDesk Ticket '${ticket.title}' (#${ticket.id}) Has Been Resolved`;
        emailHtmlContent = `
          <p>Dear ${ticketCreatorName},</p>
          <p>We've marked your ticket <strong>${ticket.title}</strong> (#${ticket.id}) as <strong>Resolved</strong>.</p>
          <p>If you feel the issue isn't fully addressed, please reply to the ticket by visiting the link below. Otherwise, no further action is needed from your side.</p>
          ${getStandardFooter()}
        `;
      } else if (newStatus === 'Closed') {
        emailSubject = `Your FireDesk Ticket '${ticket.title}' (#${ticket.id}) Has Been Closed`;
        emailHtmlContent = `
          <p>Dear ${ticketCreatorName},</p>
          <p>Your ticket <strong>${ticket.title}</strong> (#${ticket.id}) has been <strong>Closed</strong>.</p>
          <p>We hope your issue was resolved to your satisfaction. If you have any further questions, please feel free to submit a new ticket.</p>
          ${getStandardFooter()}
        `;
      } else {
        emailSubject = `FireDesk Ticket Status Updated: ${ticket.title} (#${ticket.id}) to ${newStatus}`;
        emailHtmlContent = `
          <p>Dear ${ticketCreatorName},</p>
          <p>The status of your ticket <strong>${ticket.title}</strong> (#${ticket.id}) has been updated to <strong>${newStatus}</strong>.</p>
          ${getStandardFooter()}
        `;
      }

      if (ticket.createdBy !== currentUserProfile.uid) {
        const creatorProfile = await getUserProfile(ticket.createdBy);
        if (creatorProfile?.email) {
          await sendEmailViaBrevo({
            to: [{ email: creatorProfile.email, name: creatorProfile.displayName || ticket.createdByName }],
            subject: emailSubject,
            htmlContent: emailHtmlContent,
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
          subject: `New Ticket Assignment: ${ticket.title} (#${ticket.id})`,
          htmlContent: `
            <p>Hello ${workerProfile.displayName || workerName},</p>
            <p>You have been assigned a new ticket: <strong>${ticket.title}</strong> (#${ticket.id}).</p>
            <p>Please review the ticket details and take appropriate action.</p>
            ${getStandardFooter()}
          `,
        });
      }
       if (ticket.createdBy !== currentUserProfile.uid && ticket.createdByName) {
        const creatorProfile = await getUserProfile(ticket.createdBy);
        if (creatorProfile?.email) {
          await sendEmailViaBrevo({
            to: [{ email: creatorProfile.email, name: creatorProfile.displayName || ticket.createdByName }],
            subject: `FireDesk Ticket Assigned: ${ticket.title} (#${ticket.id}) to ${workerName}`,
            htmlContent: `
              <p>Dear ${creatorProfile.displayName || ticket.createdByName},</p>
              <p>Your ticket <strong>${ticket.title}</strong> (#${ticket.id}) has been assigned to <strong>${workerName}</strong>.</p>
              <p>They will be looking into your issue shortly.</p>
              ${getStandardFooter()}
            `,
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
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-2xl font-bold">{ticket.title}</CardTitle>
              <TicketStatusBadge status={ticket.status} className="text-sm px-3 py-1"/>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              Submitted by {ticket.createdByName} on {ticket.createdAt && typeof ticket.createdAt.toDate === 'function' ? format(ticket.createdAt.toDate(), 'PPpp') : 'Processing...'}
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
            Last updated: {ticket.updatedAt && typeof ticket.updatedAt.toDate === 'function' ? format(ticket.updatedAt.toDate(), 'PPpp') : 'Processing...'}
          </CardFooter>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center"><MessageSquare className="mr-2 h-5 w-5" /> Communication History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticket.messages.length > 0 ? (
              ticket.messages.sort((a,b) => {
                const aTimestamp = a.timestamp && typeof a.timestamp.toMillis === 'function' ? a.timestamp.toMillis() : 0;
                const bTimestamp = b.timestamp && typeof b.timestamp.toMillis === 'function' ? b.timestamp.toMillis() : 0;
                return aTimestamp - bTimestamp;
              }).map((msg) => (
                <MessageItem key={msg.id} message={msg} currentUserId={currentUserProfile.uid} />
              ))
            ) : (
              <p className="text-muted-foreground italic">No messages yet.</p>
            )}
          </CardContent>
        </Card>

        {ticket.status !== 'Closed' && (
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
              <span className="font-medium">{ticket.createdAt && typeof ticket.createdAt.toDate === 'function' ? format(ticket.createdAt.toDate(), 'MMM d, yyyy') : 'Processing...'}</span>
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
                  disabled={isUpdatingStatus || ticket.status === 'Closed'}
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
      </div>
    </div>
  );
}
