
"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import type { Ticket, UserProfile, TicketStatus } from '@/lib/types'; // Removed TicketMessage as it's not directly used here
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
import { MessageSquare, Send, Edit3 } from 'lucide-react'; // Removed unused icons like Clock, User, Paperclip, CheckCircle, Users
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

  const getTicketLink = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/dashboard/tickets/${ticket.id}`;
    }
    return `/dashboard/tickets/${ticket.id}`; // Fallback
  };
  
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

      let recipients: { email: string, name?: string }[] = [];
      
      if (ticket.createdBy !== currentUserProfile.uid) { 
        const creatorProfile = await getUserProfile(ticket.createdBy); 
        if (creatorProfile?.email) {
          recipients.push({ email: creatorProfile.email, name: creatorProfile.displayName || ticket.createdByName || 'User' });
        }
      }
      if (ticket.assignedTo && ticket.assignedTo !== currentUserProfile.uid) {
        const workerProfile = await getUserProfile(ticket.assignedTo); 
        if (workerProfile?.email) {
          recipients.push({ email: workerProfile.email, name: workerProfile.displayName || ticket.assignedToName || 'Agent' });
        }
      }
      recipients = recipients.filter((r, index, self) =>
        index === self.findIndex((t) => t.email === r.email && r.email != null)
      );
      
      if (recipients.length > 0) {
         const emailSent = await sendEmailViaBrevo({
           to: recipients,
           subject: `New Reply on FireDesk Ticket: ${ticket.title} (#${ticket.id.substring(0,8)})`,
           htmlContent: `
             <p>A new reply has been added to FireDesk ticket <strong>${ticket.title}</strong> (#${ticket.id.substring(0,8)}) by <strong>${currentUserProfile.displayName || currentUserProfile.email} (${currentUserProfile.role})</strong>.</p>
             <p><strong>Message:</strong></p>
             <div style="padding: 10px; border-left: 3px solid #eee; margin: 10px 0; background-color: #f9f9f9;">
               <p style="margin:0;">${values.message.replace(/\n/g, '<br>')}</p>
             </div>
             <p>You can view the ticket and reply by clicking the link below.</p>
             ${getStandardFooter()}
           `,
         });
         if(!emailSent.success){
            console.warn("[EmailDebug] Failed to send 'new reply' email notification(s):", emailSent.message, emailSent.error);
         }
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
      const shortTicketId = ticket.id.substring(0,8);

      if (newStatus === 'Resolved') {
        emailSubject = `Update: Your FireDesk Ticket '${ticket.title}' (#${shortTicketId}) Has Been Resolved`;
        emailHtmlContent = `
          <p>Dear ${ticketCreatorName},</p>
          <p>We've marked your ticket <strong>${ticket.title}</strong> (#${shortTicketId}) as <strong>Resolved</strong>.</p>
          <p>If you feel the issue isn't fully addressed, please reply to the ticket by visiting the link below. Otherwise, no further action is needed from your side.</p>
          ${getStandardFooter()}
        `;
      } else if (newStatus === 'Closed') {
        emailSubject = `Your FireDesk Ticket '${ticket.title}' (#${shortTicketId}) Has Been Closed`;
        emailHtmlContent = `
          <p>Dear ${ticketCreatorName},</p>
          <p>Your ticket <strong>${ticket.title}</strong> (#${shortTicketId}) has been <strong>Closed</strong>.</p>
          <p>We hope your issue was resolved to your satisfaction. If you have any further questions, please feel free to submit a new ticket.</p>
          ${getStandardFooter()}
        `;
      } else { 
        emailSubject = `FireDesk Ticket Status Updated: ${ticket.title} (#${shortTicketId}) to ${newStatus}`;
        emailHtmlContent = `
          <p>Dear ${ticketCreatorName},</p>
          <p>The status of your ticket <strong>${ticket.title}</strong> (#${shortTicketId}) has been updated to <strong>${newStatus}</strong>.</p>
          ${getStandardFooter()}
        `;
      }

      console.log(`[EmailDebug] Initiating status change email. Ticket ID: ${ticket.id}, New Status: ${newStatus}, Creator: ${ticket.createdBy}, Current User: ${currentUserProfile.uid}`);
      if (ticket.createdBy !== currentUserProfile.uid) {
        console.log(`[EmailDebug] Actor is NOT creator. Proceeding to fetch creator profile for UID: ${ticket.createdBy}.`);
        const creatorProfile = await getUserProfile(ticket.createdBy);
        if (creatorProfile?.email) {
          console.log(`[EmailDebug] Found creator profile for ${ticket.createdBy} with email ${creatorProfile.email}. Proceeding to send status update email.`);
          const emailResult = await sendEmailViaBrevo({
            to: [{ email: creatorProfile.email, name: creatorProfile.displayName || ticket.createdByName || 'User' }],
            subject: emailSubject,
            htmlContent: emailHtmlContent,
          });
          if (!emailResult.success) {
            console.warn(`[EmailDebug] Brevo reported an issue sending status update email for ticket ${ticket.id} to creator ${creatorProfile.email}: ${emailResult.message}`, emailResult.error);
          } else {
            console.log(`[EmailDebug] Status update email for ticket ${ticket.id} to creator ${creatorProfile.email} successfully dispatched via Brevo.`);
          }
        } else {
          if (!creatorProfile) {
            console.warn(`[EmailDebug] Could not send status update email for ticket ${ticket.id}: Creator profile not found for UID ${ticket.createdBy}. Email not sent.`);
          } else {
            console.warn(`[EmailDebug] Could not send status update email for ticket ${ticket.id}: Creator profile for UID ${ticket.createdBy} found, but no email address. Email not sent.`);
          }
        }
      } else {
        console.log(`[EmailDebug] Status update email for ticket ${ticket.id} (new status: ${newStatus}) not sent to creator because current user ${currentUserProfile.uid} IS the creator.`);
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
      const shortTicketId = ticket.id.substring(0,8);

      const workerProfile = await getUserProfile(workerId);
      if (workerProfile?.email) {
        await sendEmailViaBrevo({
          to: [{ email: workerProfile.email, name: workerProfile.displayName || workerName }],
          subject: `New Ticket Assignment: ${ticket.title} (#${shortTicketId})`,
          htmlContent: `
            <p>Hello ${workerProfile.displayName || workerName},</p>
            <p>You have been assigned a new ticket: <strong>${ticket.title}</strong> (#${shortTicketId}).</p>
            <p>Please review the ticket details and take appropriate action.</p>
            ${getStandardFooter()}
          `,
        });
      }
       if (ticket.createdBy !== currentUserProfile.uid) {
        const creatorProfile = await getUserProfile(ticket.createdBy);
        if (creatorProfile?.email) {
          await sendEmailViaBrevo({
            to: [{ email: creatorProfile.email, name: creatorProfile.displayName || ticket.createdByName || 'User' }],
            subject: `FireDesk Ticket Assigned: ${ticket.title} (#${shortTicketId}) to ${workerName}`,
            htmlContent: `
              <p>Dear ${creatorProfile.displayName || ticket.createdByName || 'User'},</p>
              <p>Your ticket <strong>${ticket.title}</strong> (#${shortTicketId}) has been assigned to <strong>${workerName}</strong>.</p>
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
  const lastUpdatedText = ticket.updatedAt && typeof ticket.updatedAt.toDate === 'function' 
    ? format(ticket.updatedAt.toDate(), 'PPpp') 
    : 'N/A';
  const createdAtDate = ticket.createdAt && typeof ticket.createdAt.toDate === 'function' 
    ? format(ticket.createdAt.toDate(), 'PPpp')
    : 'N/A';
  const createdAtFormatted = ticket.createdAt && typeof ticket.createdAt.toDate === 'function' 
    ? format(ticket.createdAt.toDate(), 'MMM d, yyyy')
    : 'N/A';


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
              Submitted by {ticket.createdByName || 'Unknown User'} on {createdAtDate}
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
            Last updated: {lastUpdatedText}
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
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <TicketStatusBadge status={ticket.status} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Priority:</span>
              <span className="font-medium flex items-center">
                <TicketPriorityIcon priority={ticket.priority} className="mr-1.5" />{ticket.priority}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Category:</span>
              <span className="font-medium">{ticket.category}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Created By:</span>
              <span className="font-medium truncate" title={ticket.createdByName || 'Unknown User'}>{ticket.createdByName || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Created At:</span>
              <span className="font-medium">{createdAtFormatted}</span>
            </div>
             <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Assigned To:</span>
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
