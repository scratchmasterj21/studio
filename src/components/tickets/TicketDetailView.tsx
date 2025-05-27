
"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Ticket, UserProfile, TicketStatus, Attachment } from '@/lib/types';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addMessageToTicket, updateTicketStatus, assignTicket, getUserProfile } from '@/lib/firestore';
import TicketStatusBadge from './TicketStatusBadge';
import TicketPriorityIcon from './TicketPriorityIcon';
import { MessageSquare, Send, Edit3, Languages, Paperclip, Download, Image as ImageIcon, Video as VideoIcon, FileText, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusSelector from './StatusSelector';
import AssignTicketDialog from './AssignTicketDialog';
import MessageItem from './MessageItem';
import { sendEmailViaBrevo } from '@/lib/brevo';
import { translateText, type TranslateTextInput } from '@/ai/flows/translate-text-flow';
import NextImage from 'next/image';


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
  
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
  const [isTranslatingDescription, setIsTranslatingDescription] = useState(false);
  const [showOriginalDescription, setShowOriginalDescription] = useState(true);

  useEffect(() => {
    if (ticket.attachments && ticket.attachments.length > 0) {
      console.log('[TicketDetailView] Attachments found for ticket:', ticket.id, ticket.attachments);
      ticket.attachments.forEach(att => {
        console.log(`[TicketDetailView] Attachment - Name: ${att.name}, URL: ${att.url}, Type: ${att.type}, Size: ${att.size}, Key: ${att.fileKey}`);
        // Attempt to load the URL directly to see if it's accessible
        // This is for debugging in development; remove for production if too noisy
        if (process.env.NODE_ENV === 'development') {
          fetch(att.url, { method: 'HEAD' })
            .then(res => console.log(`[TicketDetailView] HEAD request to ${att.url} status: ${res.status}`))
            .catch(err => console.error(`[TicketDetailView] HEAD request to ${att.url} failed:`, err));
        }
      });
    }
  }, [ticket.attachments, ticket.id]);

  const messageForm = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: { message: "" },
  });

  const getTicketLink = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/dashboard/tickets/${ticket.id}`;
    }
    return `/dashboard/tickets/${ticket.id}`; 
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

      console.log(`[EmailDebug] Status Change: Attempting to notify creator for ticket ${ticket.id}. Creator UID: ${ticket.createdBy}, Current User UID: ${currentUserProfile.uid}`);
      if (ticket.createdBy !== currentUserProfile.uid) {
        console.log(`[EmailDebug] Status Change: Current user is NOT the creator. Fetching creator profile.`);
        const creatorProfile = await getUserProfile(ticket.createdBy);
        if (creatorProfile?.email) {
          console.log(`[EmailDebug] Status Change: Creator profile found with email ${creatorProfile.email}. Sending email.`);
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
            console.warn(`[EmailDebug] Status Change: Could not send email. Creator profile NOT FOUND for UID ${ticket.createdBy}.`);
          } else {
            console.warn(`[EmailDebug] Status Change: Could not send email. Creator profile found for UID ${ticket.createdBy}, but NO EMAIL address.`);
          }
        }
      } else {
        console.log(`[EmailDebug] Status Change: Email NOT sent to creator because current user IS the creator.`);
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
       if (ticket.createdBy !== currentUserProfile.uid && ticket.createdBy !== workerId) { 
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

  const handleTranslateDescription = async () => {
    if (!ticket.description) return;

    if (!showOriginalDescription) { 
      setShowOriginalDescription(true);
      return;
    }

    setIsTranslatingDescription(true);
    const isLikelyJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(ticket.description);
    const targetLanguage = isLikelyJapanese ? "English" : "Japanese";
    const sourceLanguage = isLikelyJapanese ? "Japanese" : "English";

    try {
      const input: TranslateTextInput = {
        textToTranslate: ticket.description,
        targetLanguage: targetLanguage,
        sourceLanguage: sourceLanguage,
      };
      const result = await translateText(input);
      setTranslatedDescription(result.translatedText);
      setShowOriginalDescription(false); 
    } catch (error) {
      console.error("Error translating description:", error);
      toast({ title: "Translation Error", description: "Could not translate the description.", variant: "destructive" });
      setTranslatedDescription(null); 
      setShowOriginalDescription(true); 
    } finally {
      setIsTranslatingDescription(false);
    }
  };

  const displayedDescriptionText = showOriginalDescription || !translatedDescription ? ticket.description : translatedDescription;
  
  let translateDescriptionButtonText = "Translate";
  if (isTranslatingDescription) {
    translateDescriptionButtonText = "Translating...";
  } else if (showOriginalDescription) {
    const isLikelyJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(ticket.description);
    translateDescriptionButtonText = isLikelyJapanese ? "To English" : "To Japanese";
  } else {
    translateDescriptionButtonText = "Show Original";
  }


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

  const getAttachmentIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-primary" />;
    if (type.startsWith('video/')) return <VideoIcon className="h-5 w-5 text-primary" />;
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };


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
            <div className="flex flex-col">
              <Label className="text-xs text-muted-foreground mb-1">Description</Label>
              <p className="whitespace-pre-wrap text-foreground leading-relaxed flex-grow">{displayedDescriptionText}</p>
              {ticket.description && (
                <div className="mt-2 self-start">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTranslateDescription}
                      disabled={isTranslatingDescription}
                      title={translateDescriptionButtonText}
                  >
                      <Languages className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">{translateDescriptionButtonText}</span>
                      <span className="sm:hidden">{isTranslatingDescription ? "..." : <Languages className="h-4 w-4" />}</span>
                  </Button>
                  {isTranslatingDescription && <LoadingSpinner size="sm" className="ml-2 inline-block" />}
                </div>
              )}
            </div>
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

            {/* Attachments Section */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-md font-semibold mb-3 flex items-center">
                  <Paperclip className="h-5 w-5 mr-2 text-muted-foreground" />
                  Attachments ({ticket.attachments.length})
                </h3>
                <div className="space-y-3">
                  {ticket.attachments.map((att) => (
                    <Card key={att.id} className="p-3 shadow-sm bg-muted/30">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {getAttachmentIcon(att.type)}
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate" title={att.name}>
                              {att.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({(att.size / 1024 / 1024).toFixed(2)} MB) - {att.type}
                            </span>
                          </div>
                        </div>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.name}
                          className="shrink-0"
                        >
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </a>
                      </div>
                      {att.type.startsWith('image/') && (
                        <div className="mt-3 rounded-md overflow-hidden border max-w-xs mx-auto sm:mx-0">
                           <NextImage
                            src={att.url}
                            alt={`Attachment: ${att.name}`}
                            width={300}
                            height={200}
                            className="object-contain w-full h-auto max-h-60"
                            unoptimized={true} 
                            onError={(e) => {
                              console.error(`[TicketDetailView] Failed to load image: ${att.url}`, e.target['error'] || 'Unknown error');
                              toast({
                                title: "Image Load Error",
                                description: `Could not load image: ${att.name}. URL might be invalid or object not public.`,
                                variant: "destructive"
                              });
                            }}
                          />
                        </div>
                      )}
                      {att.type.startsWith('video/') && (
                        <div className="mt-3 rounded-md overflow-hidden border max-w-md mx-auto sm:mx-0">
                          <video 
                            controls 
                            className="w-full max-h-80" 
                            preload="metadata"
                            src={att.url}
                            onError={(e) => {
                              console.error(`[TicketDetailView] Failed to load video: ${att.url}`, e.target['error'] || 'Unknown error');
                              toast({
                                title: "Video Load Error",
                                description: `Could not load video: ${att.name}. URL might be invalid or object not public.`,
                                variant: "destructive"
                              });
                            }}
                          >
                            Your browser does not support the video tag for type {att.type}. URL: <a href={att.url} target="_blank" rel="noopener noreferrer">{att.url}</a>
                          </video>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
                 <div className="mt-3 text-xs text-muted-foreground flex items-start gap-1.5 p-2 border border-dashed rounded-md">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                        If attachments are not displaying correctly, please ensure objects in your R2 bucket ('uploads/' prefix) are set to **publicly readable**. 
                        Also, verify your R2 bucket's CORS policy allows GET requests from this application's origin.
                    </span>
                </div>
              </div>
            )}


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
    

    