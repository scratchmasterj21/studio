
"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Ticket, UserProfile, TicketStatus, Attachment, Solution } from '@/lib/types';
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
import { addMessageToTicket, updateTicketStatus, assignTicket, getUserProfile, deleteTicket } from '@/lib/firestore';
import TicketStatusBadge from './TicketStatusBadge';
import TicketPriorityIcon from './TicketPriorityIcon';
import { MessageSquare, Send, Edit3, Languages, Paperclip, Download, Image as ImageIcon, Video as VideoIcon, FileText as FileTextIcon, AlertTriangle, Trash2, CheckCircle2, Info } from 'lucide-react'; // Renamed FileText to FileTextIcon
import LoadingSpinner from '../common/LoadingSpinner';
import StatusSelector from './StatusSelector';
import AssignTicketDialog from './AssignTicketDialog';
import MessageItem from './MessageItem';
import { sendEmailViaBrevo } from '@/lib/brevo';
import { translateText, type TranslateTextInput } from '@/ai/flows/translate-text-flow';
import NextImage from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';
import ResolveTicketDialog from './ResolveTicketDialog';

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
  const router = useRouter();
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);

  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
  const [isTranslatingDescription, setIsTranslatingDescription] = useState(false);
  const [showOriginalDescription, setShowOriginalDescription] = useState(true);

  const [translatedSolutionText, setTranslatedSolutionText] = useState<string | null>(null);
  const [isTranslatingSolution, setIsTranslatingSolution] = useState(false);
  const [showOriginalSolution, setShowOriginalSolution] = useState(true);

  const [attachmentLoadErrorOccurred, setAttachmentLoadErrorOccurred] = useState(false);


  useEffect(() => {
    if (ticket.attachments && ticket.attachments.length > 0) {
      console.log('[TicketDetailView] Attachments found for ticket:', ticket.id, ticket.attachments);
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
    // Fallback for server-side rendering, though it's less critical for email content generation
    // that mostly happens on client actions. Consider if a more robust SSR base URL is needed.
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
      let creatorProfile: UserProfile | null = null;
      let workerProfile: UserProfile | null = null;

      if (ticket.createdBy !== currentUserProfile.uid) {
        creatorProfile = await getUserProfile(ticket.createdBy);
        if (creatorProfile?.email) {
          recipients.push({ email: creatorProfile.email, name: creatorProfile.displayName || ticket.createdByName || 'User' });
        }
      }
      if (ticket.assignedTo && ticket.assignedTo !== currentUserProfile.uid) {
        workerProfile = await getUserProfile(ticket.assignedTo);
        if (workerProfile?.email) {
          recipients.push({ email: workerProfile.email, name: workerProfile.displayName || ticket.assignedToName || 'Agent' });
        }
      }
      // Ensure unique recipients
      recipients = recipients.filter((r, index, self) =>
        index === self.findIndex((t) => t.email === r.email && r.email != null)
      );

      if (recipients.length > 0) {
         const emailSent = await sendEmailViaBrevo({
           to: recipients,
           subject: `New Reply on FireDesk Ticket: ${ticket.title} (#${ticket.id.substring(0,8)})`,
           htmlContent: `<p>A new reply has been added to FireDesk ticket <strong>${ticket.title}</strong> (#${ticket.id.substring(0,8)}) by <strong>${currentUserProfile.displayName || currentUserProfile.email} (${currentUserProfile.role})</strong>.</p><p><strong>Message:</strong></p><div style="padding: 10px; border-left: 3px solid #eee; margin: 10px 0; background-color: #f9f9f9;"><p style="margin:0;">${values.message.replace(/\n/g, '<br>')}</p></div><p>You can view the ticket and reply by clicking the link below.</p>${getStandardFooter()}`,
         });
         if(!emailSent.success){
            console.warn("[EmailDebug] Failed to send 'new reply' email notification(s):", emailSent.message, emailSent.error);
         } else {
            console.log("[EmailDebug] 'New reply' email notification attempt successful for recipients:", recipients.map(r => r.email));
         }
      } else {
        console.log("[EmailDebug] No recipients for 'new reply' email notification.");
      }

    } catch (error) {
      console.error("Error adding message:", error);
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (newStatus === 'Resolved' && (currentUserProfile.role === 'worker' || currentUserProfile.role === 'admin') && currentUserProfile.uid !== ticket.createdBy) {
      setShowResolveDialog(true);
      return; 
    }

    setIsUpdatingStatus(true);
    try {
      await updateTicketStatus(ticket.id, newStatus);
      toast({ title: "Status Updated", description: `Ticket status changed to ${newStatus}.` });

      let emailSubject = '';
      let emailHtmlContent = '';
      const ticketCreatorName = ticket.createdByName || 'User';
      const shortTicketId = ticket.id.substring(0,8);

      console.log(`[EmailDebug] Attempting status change email. Current User: ${currentUserProfile.displayName} (${currentUserProfile.uid}), Ticket Creator: ${ticket.createdByName} (${ticket.createdBy}), New Status: ${newStatus}`);

      if (newStatus === 'Closed') {
        emailSubject = `Your FireDesk Ticket '${ticket.title}' (#${shortTicketId}) Has Been Closed`;
        emailHtmlContent = `<p>Dear ${ticketCreatorName},</p><p>Your ticket <strong>${ticket.title}</strong> (#${shortTicketId}) has been <strong>Closed</strong> by ${currentUserProfile.displayName || 'Support'}.</p><p>We hope your issue was resolved to your satisfaction. If you have any further questions, please feel free to submit a new ticket.</p>${getStandardFooter()}`;
      } else if (newStatus === 'Resolved') {
        // This path is now primarily for when a user themselves mark their own 'Resolved' ticket to 'Resolved' again (which shouldn't happen via UI)
        // or if an admin/worker directly changes status to Resolved without solution dialog (less common now).
        // The main "Resolved" email (with solution) is handled by onTicketResolved.
        emailSubject = `FireDesk Ticket Status Updated: ${ticket.title} (#${shortTicketId}) is Now Resolved`;
        emailHtmlContent = `<p>Dear ${ticketCreatorName},</p><p>The status of your ticket <strong>${ticket.title}</strong> (#${shortTicketId}) has been updated to <strong>Resolved</strong> by ${currentUserProfile.displayName || 'Support'}.</p><p>Please review the solution provided. If the issue persists, you can reply to the ticket to re-open it.</p>${getStandardFooter()}`;
      } else { 
        emailSubject = `FireDesk Ticket Status Updated: ${ticket.title} (#${shortTicketId}) to ${newStatus}`;
        emailHtmlContent = `<p>Dear ${ticketCreatorName},</p><p>The status of your ticket <strong>${ticket.title}</strong> (#${shortTicketId}) has been updated to <strong>${newStatus}</strong> by ${currentUserProfile.displayName || 'Support'}.</p>${getStandardFooter()}`;
      }

      // Only send if the ticket creator is not the one making the change,
      // and it's a 'Closed' status change, or a direct 'Resolved' not via dialog.
      if (ticket.createdBy !== currentUserProfile.uid && (newStatus === 'Closed' || (newStatus === 'Resolved' && !showResolveDialog) )) {
        const creatorProfile = await getUserProfile(ticket.createdBy);
        if (creatorProfile?.email) {
           console.log(`[EmailDebug] Creator profile found for status change email: ${creatorProfile.email}. Sending status change email.`);
          const emailResult = await sendEmailViaBrevo({
            to: [{ email: creatorProfile.email, name: creatorProfile.displayName || ticket.createdByName || 'User' }],
            subject: emailSubject,
            htmlContent: emailHtmlContent,
          });
          if(!emailResult.success){
            console.warn("[EmailDebug] Brevo reported an issue sending 'status change' email:", emailResult.message, emailResult.error);
          } else {
            console.log(`[EmailDebug] 'Status change to ${newStatus}' email notification attempt successful for creator: ${creatorProfile.email}`);
          }
        } else {
           console.log("[EmailDebug] Creator profile or email not found. Skipping status change email.");
        }
      } else {
        console.log("[EmailDebug] Email condition not met for direct status change notification (or user is self-notifying). Skipping email.");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleTicketResolved = async (solutionText: string, solutionAttachments: Attachment[]) => {
    const ticketCreatorName = ticket.createdByName || 'User';
    const shortTicketId = ticket.id.substring(0,8);
    const resolverName = currentUserProfile.displayName || currentUserProfile.email || 'Support Agent';

    let attachmentsHtml = '';
    if (solutionAttachments.length > 0) {
      attachmentsHtml = '<p><strong>Solution Attachments:</strong></p><ul>';
      solutionAttachments.forEach(att => {
        attachmentsHtml += `<li><a href="${att.url}" target="_blank" rel="noopener noreferrer">${att.name}</a> (${(att.size / 1024 / 1024).toFixed(2)} MB)</li>`;
      });
      attachmentsHtml += '</ul>';
    }

    const emailSubject = `Your FireDesk Ticket Resolved: ${ticket.title} (#${shortTicketId})`;
    const emailHtmlContent = `
      <p>Dear ${ticketCreatorName},</p>
      <p>Your ticket <strong>${ticket.title}</strong> (#${shortTicketId}) has been marked as <strong>Resolved</strong>.</p>
      <p><strong>Solution provided by ${resolverName}:</strong></p>
      <div style="padding: 10px; border-left: 3px solid #eee; margin: 10px 0; background-color: #f9f9f9;">
        <p style="margin:0;">${solutionText.replace(/\n/g, '<br>')}</p>
      </div>
      ${attachmentsHtml}
      <p>If you feel the issue isn't fully addressed, please reply to the ticket by visiting the link below. Otherwise, no further action is needed from your side.</p>
      ${getStandardFooter()}
    `;

    if (ticket.createdBy !== currentUserProfile.uid) {
      const creatorProfile = await getUserProfile(ticket.createdBy);
      if (creatorProfile?.email) {
        console.log(`[EmailDebug] Creator profile found for 'ticket resolved' email: ${creatorProfile.email}. Sending email.`);
        const emailResult = await sendEmailViaBrevo({
          to: [{ email: creatorProfile.email, name: creatorProfile.displayName || ticket.createdByName || 'User' }],
          subject: emailSubject,
          htmlContent: emailHtmlContent,
        });
        if (!emailResult.success) {
          console.warn(`[EmailDebug] Brevo reported an issue sending 'ticket resolved' email for ticket ${ticket.id} to creator ${creatorProfile.email}: ${emailResult.message}`, emailResult.error);
          toast({ title: "Notification Error", description: "Failed to send resolution email to user.", variant: "destructive" });
        } else {
           console.log(`[EmailDebug] 'Ticket resolved' email notification attempt successful for creator: ${creatorProfile.email}`);
        }
      } else {
        console.log("[EmailDebug] Creator profile or email not found. Skipping 'ticket resolved' email.");
      }
    } else {
      console.log("[EmailDebug] User resolved their own ticket. Skipping 'ticket resolved' email notification.");
    }
  };


  const handleAssignTicket = async (workerId: string, workerName: string) => {
    try {
      await assignTicket(ticket.id, workerId, workerName);
      toast({ title: "Ticket Assigned", description: `Ticket assigned to ${workerName}.` });
      const shortTicketId = ticket.id.substring(0,8);

      // Notify the assigned worker
      const workerProfile = await getUserProfile(workerId);
      if (workerProfile?.email) {
        console.log(`[EmailDebug] Worker profile found for assignment email: ${workerProfile.email}. Sending email.`);
        await sendEmailViaBrevo({
          to: [{ email: workerProfile.email, name: workerProfile.displayName || workerName }],
          subject: `New Ticket Assignment: ${ticket.title} (#${shortTicketId})`,
          htmlContent: `<p>Hello ${workerProfile.displayName || workerName},</p><p>You have been assigned a new ticket: <strong>${ticket.title}</strong> (#${shortTicketId}).</p><p>Please review the ticket details and take appropriate action.</p>${getStandardFooter()}`,
        });
      } else {
         console.log(`[EmailDebug] Worker profile or email not found for ${workerId}. Skipping assignment email to worker.`);
      }

      // Notify the ticket creator (if they are not the one assigning and not the one being assigned)
       if (ticket.createdBy !== currentUserProfile.uid && ticket.createdBy !== workerId) {
        const creatorProfile = await getUserProfile(ticket.createdBy);
        if (creatorProfile?.email) {
          console.log(`[EmailDebug] Creator profile found for assignment notification: ${creatorProfile.email}. Sending email.`);
          await sendEmailViaBrevo({
            to: [{ email: creatorProfile.email, name: creatorProfile.displayName || ticket.createdByName || 'User' }],
            subject: `FireDesk Ticket Assigned: ${ticket.title} (#${shortTicketId}) to ${workerName}`,
            htmlContent: `<p>Dear ${creatorProfile.displayName || ticket.createdByName || 'User'},</p><p>Your ticket <strong>${ticket.title}</strong> (#${shortTicketId}) has been assigned to <strong>${workerName}</strong>.</p><p>They will be looking into your issue shortly.</p>${getStandardFooter()}`,
          });
        } else {
          console.log(`[EmailDebug] Creator profile or email not found for ticket creator ${ticket.createdBy}. Skipping assignment notification to creator.`);
        }
      } else {
         console.log(`[EmailDebug] Conditions not met for notifying creator about assignment (creator is assigner or assignee).`);
      }

    } catch (error) {
      console.error("Error assigning ticket:", error);
      toast({ title: "Error", description: "Failed to assign ticket.", variant: "destructive" });
    }
  };

  const handleDeleteTicket = async () => {
    setIsDeletingTicket(true);
    try {
      // Attempt to delete main ticket attachments from R2
      if (ticket.attachments && ticket.attachments.length > 0) {
        console.log(`[TicketDelete] Deleting ${ticket.attachments.length} R2 attachments for ticket ${ticket.id}`);
        const deletionPromises = ticket.attachments.map(async (att) => {
          if (att.fileKey) {
            try {
              const response = await fetch('/api/r2-delete-object', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileKey: att.fileKey }),
              });
              const result = await response.json();
              if (!response.ok || !result.success) {
                const errorMessage = result.error || result.message || 'Unknown R2 deletion error';
                console.warn(`[TicketDelete] Failed to delete R2 attachment ${att.fileKey} (name: ${att.name}) for ticket ${ticket.id}: ${errorMessage}`);
                toast({
                  title: `R2 Attachment Deletion Failed`,
                  description: `Could not delete '${att.name}' from storage. Details: ${errorMessage}`,
                  variant: "destructive",
                  duration: 7000,
                });
              } else {
                console.log(`[TicketDelete] Successfully deleted R2 attachment ${att.fileKey} (name: ${att.name}) for ticket ${ticket.id}`);
              }
            } catch (r2Error) {
              console.error(`[TicketDelete] Network or other error calling R2 delete API for ${att.fileKey} (name: ${att.name}):`, r2Error);
              toast({
                title: `R2 Attachment Deletion Error`,
                description: `Error trying to delete '${att.name}' from storage. Check console.`,
                variant: "destructive",
                duration: 7000,
              });
            }
          } else {
            console.warn(`[TicketDelete] Attachment '${att.name}' for ticket ${ticket.id} is missing a fileKey. Cannot delete from R2.`);
          }
        });
        await Promise.allSettled(deletionPromises);
      }

      // Attempt to delete solution attachments from R2
      if (ticket.solution?.attachments && ticket.solution.attachments.length > 0) {
        console.log(`[TicketDelete] Deleting ${ticket.solution.attachments.length} R2 solution attachments for ticket ${ticket.id}`);
        const solutionDeletionPromises = ticket.solution.attachments.map(async (att) => {
          if (att.fileKey) {
             try {
              const response = await fetch('/api/r2-delete-object', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileKey: att.fileKey }),
              });
              const result = await response.json();
              if (!response.ok || !result.success) {
                console.warn(`[TicketDelete] Failed to delete R2 solution attachment ${att.fileKey} (name: ${att.name}) for ticket ${ticket.id}: ${result.error || result.message}`);
              } else {
                 console.log(`[TicketDelete] Successfully deleted R2 solution attachment ${att.fileKey} (name: ${att.name}) for ticket ${ticket.id}`);
              }
            } catch (r2Error) {
               console.error(`[TicketDelete] Network or other error calling R2 delete API for solution attachment ${att.fileKey} (name: ${att.name}):`, r2Error);
            }
          }
        });
        await Promise.allSettled(solutionDeletionPromises);
      }


      console.log(`[TicketDelete] Proceeding to delete Firestore document for ticket ${ticket.id}`);
      await deleteTicket(ticket.id);
      toast({ title: "Ticket Deleted", description: `Ticket "${ticket.title}" has been successfully deleted. Associated attachments were also attempted to be removed from storage.` });
      router.push('/dashboard');
    } catch (error) {
      console.error("Error during the overall ticket deletion process:", error);
      toast({ title: "Ticket Deletion Error", description: "Failed to delete the ticket from Firestore. Please try again or check server logs.", variant: "destructive" });
      setIsDeletingTicket(false); // Only reset if Firestore deletion itself fails
    }
    // No finally here, as navigation should happen on success
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

  const handleTranslateSolution = async () => {
    if (!ticket.solution?.text) return;

    if (!showOriginalSolution) {
        setShowOriginalSolution(true);
        return;
    }

    setIsTranslatingSolution(true);
    // Basic language detection
    const isLikelyJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(ticket.solution.text);
    const targetLanguage = isLikelyJapanese ? "English" : "Japanese";
    const sourceLanguage = isLikelyJapanese ? "Japanese" : "English";
    
    try {
      const input: TranslateTextInput = {
        textToTranslate: ticket.solution.text,
        targetLanguage: targetLanguage,
        sourceLanguage: sourceLanguage,
      };
      const result = await translateText(input);
      setTranslatedSolutionText(result.translatedText);
      setShowOriginalSolution(false); // Show the new translation
    } catch (error) {
      console.error("Error translating solution:", error);
      toast({ title: "Translation Error", description: "Could not translate the solution text.", variant: "destructive" });
      setTranslatedSolutionText(null);
      setShowOriginalSolution(true);
    } finally {
      setIsTranslatingSolution(false);
    }
  };


  const displayedDescriptionText = showOriginalDescription || !translatedDescription ? ticket.description : translatedDescription;
  const displayedSolutionText = !ticket.solution?.text ? '' : (showOriginalSolution || !translatedSolutionText ? ticket.solution.text : translatedSolutionText);


  let translateDescriptionButtonText = "Translate";
  if (isTranslatingDescription) {
    translateDescriptionButtonText = "Translating...";
  } else if (showOriginalDescription) {
    const isLikelyJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(ticket.description || "");
    translateDescriptionButtonText = isLikelyJapanese ? "To English" : "To Japanese";
  } else {
    translateDescriptionButtonText = "Show Original";
  }

  let translateSolutionButtonText = "Translate";
  if (ticket.solution?.text) {
    if (isTranslatingSolution) {
        translateSolutionButtonText = "Translating...";
    } else if (showOriginalSolution) {
        const isLikelyJapaneseSolution = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(ticket.solution.text);
        translateSolutionButtonText = isLikelyJapaneseSolution ? "To English" : "To Japanese";
    } else {
        translateSolutionButtonText = "Show Original";
    }
  }


  const canManageTicket = currentUserProfile.role === 'admin' || (currentUserProfile.role === 'worker' && ticket.assignedTo === currentUserProfile.uid);
  const isTicketCreator = currentUserProfile.uid === ticket.createdBy;

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
    if (type === 'application/pdf') return <FileTextIcon className="h-5 w-5 text-red-500" />;
    return <FileTextIcon className="h-5 w-5 text-muted-foreground" />;
  };

  const renderAttachments = (attachments: Attachment[], title: string) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="mt-6 pt-4 border-t">
        <h3 className="text-md font-semibold mb-3 flex items-center">
          <Paperclip className="h-5 w-5 mr-2 text-muted-foreground" />
          {title} ({attachments.length})
        </h3>
        {attachmentLoadErrorOccurred && (
          <Alert variant="destructive" className="mb-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Attachment Loading Error</AlertTitle>
            <AlertDescription>
              One or more attachments could not be loaded. An "Invalid Argument Authorization" or 403 Forbidden error for an attachment URL typically means the R2 object is private. Please ensure objects in your R2 bucket are set to **publicly readable** in Cloudflare R2 settings (Bucket Settings -&gt; Public access -&gt; Allow). Also, verify your R2 bucket's CORS policy allows GET requests from this application's origin.
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-3">
          {attachments.map((att) => (
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
                    unoptimized={true} // Set to true if R2 isn't configured for Next/Image optimization or to bypass potential issues
                    onError={(e) => {
                      setAttachmentLoadErrorOccurred(true);
                      console.error(`[TicketDetailView] Failed to load image: ${att.url}.`);
                      toast({
                        title: "Image Load Error",
                        description: `Could not load image: ${att.name}. An "Invalid Argument Authorization" or 403 Forbidden error for the URL typically means the R2 object is private. Please check R2 public access permissions.`,
                        variant: "destructive",
                        duration: 10000,
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
                    type={att.type}
                    onError={(e) => {
                      setAttachmentLoadErrorOccurred(true);
                      const errorTarget = e.target as HTMLVideoElement;
                      const errorCode = errorTarget.error?.code;
                      let errorMessage = errorTarget.error?.message || "Unknown video error";
                      console.error(`[TicketDetailView] Failed to load video: ${att.url}. Error code: ${errorCode}, Message: ${errorMessage}`);

                      let toastDescription = `Could not load video: ${att.name}.`;
                      if (errorCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) { 
                        toastDescription = `Video format or codec for "${att.name}" is not supported by your browser, or the file might be corrupted. Please try a different video format (e.g., common MP4 H.264). Also ensure the R2 object is publicly readable and the content type is correct (e.g., 'video/mp4').`;
                      } else if (errorMessage.toLowerCase().includes("authorization") || (errorTarget.error && !errorCode)) {
                        // This condition might be hit if the browser gets a generic network error due to CORS/Permissions before specific media error codes
                        toastDescription = `Could not load video: ${att.name}. This often indicates an "Invalid Argument Authorization" or similar access error, meaning the R2 object is private. Please check R2 public access permissions and ensure objects are publicly readable.`;
                      } else {
                        toastDescription += ` Browser error: ${errorMessage} (Code: ${errorCode}). Ensure the R2 object is publicly readable and the content type is correctly set in R2.`;
                      }
                      toast({
                        title: "Video Load Error",
                        description: toastDescription,
                        variant: "destructive",
                        duration: 10000,
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
      </div>
    );
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-2xl font-bold">{ticket.title || "Untitled Ticket"}</CardTitle>
              <TicketStatusBadge status={ticket.status} className="text-sm px-3 py-1"/>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              Submitted by {ticket.createdByName || 'Unknown User'} on {createdAtDate}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <Label className="text-xs text-muted-foreground mb-1">Description</Label>
              <p className="whitespace-pre-wrap text-foreground leading-relaxed flex-grow">{displayedDescriptionText || "No description provided."}</p>
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
                      {isTranslatingDescription && <LoadingSpinner size="sm" className="sm:hidden ml-0" />}
                      {!isTranslatingDescription && <span className="sm:hidden"><Languages className="h-4 w-4" /></span>}
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2">{ticket.category || "N/A"}</Badge>
                 Category
              </div>
              <div className="flex items-center">
                <TicketPriorityIcon priority={ticket.priority} className="mr-1.5" />
                {ticket.priority || "N/A"} Priority
              </div>
            </div>
            
            {renderAttachments(ticket.attachments || [], 'Ticket Attachments')}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground border-t pt-4">
             Last updated: {lastUpdatedText}
          </CardFooter>
        </Card>

        {ticket.solution && (
          <Card className="shadow-md border-green-500 border-2">
            <CardHeader className="bg-green-50 dark:bg-green-900/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <CardTitle className="text-xl text-green-700 dark:text-green-400">Ticket Resolved</CardTitle>
              </div>
              <CardDescription className="text-sm text-green-600 dark:text-green-500 pt-1">
                Resolved by {ticket.solution.resolvedByName || 'Support Agent'} on {ticket.solution.resolvedAt && typeof ticket.solution.resolvedAt.toDate === 'function' ? format(ticket.solution.resolvedAt.toDate(), 'PPpp') : 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col">
                <Label className="text-xs text-muted-foreground mb-1">Solution Provided:</Label>
                <p className="whitespace-pre-wrap text-foreground leading-relaxed flex-grow">{displayedSolutionText}</p>
                 {ticket.solution.text && (
                    <div className="mt-2 self-start">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTranslateSolution}
                        disabled={isTranslatingSolution}
                        title={translateSolutionButtonText}
                    >
                        <Languages className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">{translateSolutionButtonText}</span>
                        {isTranslatingSolution && <LoadingSpinner size="sm" className="sm:hidden ml-0" />}
                        {!isTranslatingSolution && <span className="sm:hidden"><Languages className="h-4 w-4" /></span>}
                    </Button>
                    </div>
                )}
              </div>
              {renderAttachments(ticket.solution.attachments || [], 'Solution Attachments')}
            </CardContent>
          </Card>
        )}

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center"><MessageSquare className="mr-2 h-5 w-5" /> Communication History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticket.messages && ticket.messages.length > 0 ? (
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

        {ticket.status !== 'Closed' && !(ticket.status === 'Resolved' && isTicketCreator) && (
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
         {ticket.status === 'Resolved' && isTicketCreator && (
            <Card className="shadow-md border-blue-500 border-2">
                <CardHeader className="bg-blue-50 dark:bg-blue-900/30">
                    <div className="flex items-center gap-2">
                        <Info className="h-6 w-6 text-blue-600" />
                        <CardTitle className="text-xl text-blue-700 dark:text-blue-400">Action Required: Issue Resolved?</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <p className="text-sm text-foreground">
                        This ticket has been marked as resolved. Please review the solution provided above.
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>If the solution addresses your issue, please click the button below to close your ticket.</li>
                        <li>If you are still experiencing problems, add a reply to this ticket (using the reply box above if available, or by creating a new one if not), and the ticket status will be automatically re-opened for further assistance.</li>
                    </ul>
                    <Button 
                        onClick={() => handleStatusChange('Closed')} 
                        disabled={isUpdatingStatus}
                        className="w-full bg-primary hover:bg-primary/90"
                    >
                        {isUpdatingStatus ? <LoadingSpinner size="sm" className="mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                        Yes, Close My Ticket
                    </Button>
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
                <TicketPriorityIcon priority={ticket.priority} className="mr-1.5" />{ticket.priority || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Category:</span>
              <span className="font-medium">{ticket.category || "N/A"}</span>
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
                  disabled={isUpdatingStatus || showResolveDialog || ticket.status === 'Closed'}
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

        {currentUserProfile.role === 'admin' && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Admin Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" disabled={isDeletingTicket}>
                    {isDeletingTicket ? <LoadingSpinner size="sm" className="mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete Ticket & Attachments
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the ticket
                      titled "{ticket.title || "this ticket"}" and all of its associated data,
                      including messages and attempts to remove attachments from storage.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingTicket}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteTicket}
                      disabled={isDeletingTicket}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isDeletingTicket ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                      Yes, delete ticket & attachments
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </div>
      {showResolveDialog && (
        <ResolveTicketDialog
          isOpen={showResolveDialog}
          onOpenChange={setShowResolveDialog}
          ticketId={ticket.id}
          ticketTitle={ticket.title}
          currentUserProfile={currentUserProfile}
          onTicketResolved={handleTicketResolved}
        />
      )}
    </div>
  );
}
