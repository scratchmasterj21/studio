
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createTicket, getUserProfile } from "@/lib/firestore";
import type { TicketCategory, TicketPriority, UserProfile, Attachment } from "@/lib/types";
import { ticketCategories, ticketPriorities } from "@/config/site";
import { useRouter } from 'next/navigation';
import { useState, useRef } from "react";
import LoadingSpinner from "../common/LoadingSpinner";
import { sendEmailViaBrevo } from "@/lib/brevo";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, FileText, Image as ImageIcon, Video, Trash2, AlertCircle } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { useTranslations } from "@/hooks/useTranslations"; // Import useTranslations

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 25; 
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ticketFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title must be 100 characters or less."),
  description: z.string().min(10, "Description must be at least 10 characters.").max(1000, "Description must be 1000 characters or less."),
  category: z.enum(ticketCategories as [TicketCategory, ...TicketCategory[]]),
  priority: z.enum(ticketPriorities as [TicketPriority, ...TicketPriority[]]),
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

interface UploadableFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadedAttachment?: Attachment; 
}

interface TicketFormProps {
  userProfile: UserProfile;
}

const DEFAULT_WORKER_UID = "YNTAZdX8ClcRr3bAgf1WED1dE393"; 

export default function TicketForm({ userProfile }: TicketFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmittingMainForm, setIsSubmittingMainForm] = useState(false);
  const [uploadableFiles, setUploadableFiles] = useState<UploadableFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, isLoadingTranslations } = useTranslations('ticketForm'); 

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: ticketCategories[0],
      priority: ticketPriorities[1], 
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (uploadableFiles.length + files.length > MAX_FILES) {
      toast({
        title: t('uploadErrorTitle', { fileName: ''}).replace(': {fileName}', ''), // Generic title
        description: t('attachmentsLimits', { maxFiles: MAX_FILES, maxFileSizeMB: MAX_FILE_SIZE_MB }),
        variant: "destructive",
      });
      return;
    }

    const newUploadableFiles: UploadableFile[] = files.map(file => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: t('uploadErrorTitle', { fileName: file.name }),
          description: `${file.name} ${t('exceedsSizeLimit', { maxFileSizeMB: MAX_FILE_SIZE_MB })}`, // You'd add 'exceedsSizeLimit' to locales
          variant: "destructive",
        });
        return null; 
      }
      return {
        id: uuidv4(),
        file,
        progress: 0,
        status: 'pending' as const,
      };
    }).filter(Boolean) as UploadableFile[];

    setUploadableFiles(prev => [...prev, ...newUploadableFiles]);
    newUploadableFiles.forEach(uf => handleFileUpload(uf));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadableFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleFileUpload = async (fileEntry: UploadableFile) => {
    const { file, id: fileId } = fileEntry;
  
    setUploadableFiles(prevFiles =>
      prevFiles.map(uf => {
        if (uf.id === fileId) {
          if (uf.status === 'uploading' || uf.status === 'success') {
            console.log(`[FileUpload] Skipped upload for ${file.name}: Status is ${uf.status}.`);
            return uf;
          }
          return { ...uf, status: 'uploading', progress: 0, error: undefined };
        }
        return uf;
      })
    );
    
    console.log(`[FileUpload] Starting upload for: ${file.name}, Type: ${file.type}, Size: ${file.size}`);

    try {
      const contentType = file.type || 'application/octet-stream';
      console.log(`[FileUpload] Fetching presigned URL for ${file.name} with contentType: ${contentType} and userId: ${userProfile.uid}`);
      const presignedUrlResponse = await fetch(`/api/upload/presigned-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(contentType)}&userId=${encodeURIComponent(userProfile.uid)}`);
      
      console.log(`[FileUpload] Presigned URL response status for ${file.name}: ${presignedUrlResponse.status}`);

      if (!presignedUrlResponse.ok) {
        const errorBody = await presignedUrlResponse.json();
        console.error(`[FileUpload] Failed to get presigned URL for ${file.name}. Status: ${presignedUrlResponse.status}, Body:`, errorBody);
        throw new Error(errorBody.error || `Failed to get presigned URL. Status: ${presignedUrlResponse.status}`);
      }
      const { presignedUrl, fileKey, publicUrl } = await presignedUrlResponse.json();
      console.log(`[FileUpload] Got presigned URL for ${file.name}: ${presignedUrl}`);

      console.log(`[FileUpload] Starting PUT to R2 for ${file.name} with Content-Type: ${contentType}`);
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType,
        },
      });

      console.log(`[FileUpload] R2 PUT response status for ${file.name}: ${uploadResponse.status}`);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`[FileUpload] R2 Upload failed for ${file.name}. Status: ${uploadResponse.status}, Body: ${errorText}`);
        throw new Error(`Upload to storage failed for ${file.name}. Status: ${uploadResponse.status}. Message: ${errorText || 'No additional error message from storage provider.'}`);
      }
      
      console.log(`[FileUpload] Successfully uploaded ${file.name} to R2. File key: ${fileKey}, Public URL: ${publicUrl}`);
      setUploadableFiles(prev => prev.map(uf => uf.id === fileId ? { 
        ...uf, 
        progress: 100, 
        status: 'success',
        uploadedAttachment: {
          id: uuidv4(),
          name: file.name,
          url: publicUrl,
          type: contentType,
          size: file.size,
          fileKey: fileKey,
        }
      } : uf));

    } catch (error: any) {
      console.error(`[FileUpload] Error during upload process for ${file.name}:`, error);
      let detailedErrorMessage = t('uploadErrorGeneric'); // Add 'uploadErrorGeneric' to locales
      if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
        detailedErrorMessage = t('uploadFailedFetchError', { fileName: file.name });
      } else if (error.message) {
        detailedErrorMessage = error.message;
      }

      setUploadableFiles(prev => prev.map(uf => uf.id === fileId ? { ...uf, status: 'error', error: detailedErrorMessage } : uf));
      toast({
        title: t('uploadErrorTitle', { fileName: file.name }),
        description: detailedErrorMessage + " " + t('checkNetworkAndCors'), // Add 'checkNetworkAndCors'
        variant: "destructive",
      });
    }
  };

  async function onSubmit(values: TicketFormValues) {
    setIsSubmittingMainForm(true);

    const successfulUploads = uploadableFiles
      .filter(uf => uf.status === 'success' && uf.uploadedAttachment)
      .map(uf => uf.uploadedAttachment!);

    try {
      const ticketDataForCreation = {
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
        attachments: successfulUploads,
      };
      
      const ticketId = await createTicket(ticketDataForCreation, userProfile);
      toast({
        title: t('ticketCreatedToast.title'),
        description: t('ticketCreatedToast.description', { ticketTitle: values.title }),
      });

      const ticketLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/tickets/${ticketId}`;
      const shortTicketId = ticketId.substring(0,8);
      const standardFooter = `
        <p style="font-size: 0.9em; color: #555555; margin-top: 20px; border-top: 1px solid #eeeeee; padding-top: 10px;">
          ${t('email.footer.automatedNotification')}<br>
          ${t('email.footer.viewTicketHere', { ticketLink: ticketLink })}
        </p>
      `;

      if (userProfile.email) {
         await sendEmailViaBrevo({
           to: [{ email: userProfile.email, name: userProfile.displayName || userProfile.email }],
           subject: t('email.creator.newTicket.subject', { ticketTitle: values.title, shortTicketId: shortTicketId }),
           htmlContent: `
             <h1>${t('email.creator.newTicket.heading', { ticketTitle: values.title })}</h1>
             <p>${t('email.creator.newTicket.dearUser', { userName: userProfile.displayName || 'User' })}</p>
             <p>${t('email.creator.newTicket.body', { shortTicketId: shortTicketId })}</p>
             <p><strong>${t('email.creator.newTicket.titleLabel')}:</strong> ${values.title}</p>
             <p><strong>${t('email.creator.newTicket.descriptionLabel')}:</strong> ${values.description.replace(/\n/g, '<br>')}</p>
             <p><strong>${t('email.creator.newTicket.categoryLabel')}:</strong> ${values.category}</p>
             <p><strong>${t('email.creator.newTicket.priorityLabel')}:</strong> ${values.priority}</p>
             <p>${t('email.creator.newTicket.statusNote')}</p>
             ${successfulUploads.length > 0 ? `<p><strong>${t('email.creator.newTicket.attachmentsLabel')}:</strong> ${successfulUploads.map(att => att.name).join(', ')}</p>` : ''}
             <p>${t('email.creator.newTicket.followUp')}</p>
             ${standardFooter}
           `,
         });
      }
      
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL_NOTIFICATIONS;
      if (adminEmail) {
        await sendEmailViaBrevo({
          to: [{ email: adminEmail }],
          subject: t('email.admin.newTicket.subject', { ticketTitle: values.title, creatorName: userProfile.displayName || userProfile.email || "Unknown", shortTicketId: shortTicketId }),
          htmlContent: `
            <h1>${t('email.admin.newTicket.heading')}</h1>
            <p>${t('email.admin.newTicket.body', { creatorName: userProfile.displayName || userProfile.email || "Unknown", userId: userProfile.uid})}</p>
            <p><strong>${t('email.admin.newTicket.ticketIdLabel')}:</strong> #${shortTicketId}</p>
            <p><strong>${t('email.admin.newTicket.titleLabel')}:</strong> ${values.title}</p>
            <p><strong>${t('email.admin.newTicket.descriptionLabel')}:</strong></p>
            <div style="padding: 10px; border-left: 3px solid #eee; margin: 10px 0;">
              <p style="margin:0;">${values.description.replace(/\n/g, '<br>')}</p>
            </div>
            <p><strong>${t('email.admin.newTicket.categoryLabel')}:</strong> ${values.category}</p>
            <p><strong>${t('email.admin.newTicket.priorityLabel')}:</strong> ${values.priority}</p>
            <p><strong>${t('email.admin.newTicket.statusNote')}</strong></p>
            ${successfulUploads.length > 0 ? `<p><strong>${t('email.admin.newTicket.attachmentsLabel')}:</strong> ${successfulUploads.map(att => `<a href="${att.url}">${att.name}</a>`).join(', ')}</p>` : ''}
            ${standardFooter}
          `,
        });
      }

      if (DEFAULT_WORKER_UID && DEFAULT_WORKER_UID !== "REPLACE_WITH_DEFAULT_WORKER_UID") {
        const workerProfile = await getUserProfile(DEFAULT_WORKER_UID);
        if (workerProfile?.email && workerProfile.email !== userProfile.email && workerProfile.email !== adminEmail) {
            await sendEmailViaBrevo({
                to: [{ email: workerProfile.email, name: workerProfile.displayName || t('email.worker.defaultAgentName') }],
                subject: t('email.worker.newTicketAssigned.subject', { ticketTitle: values.title, shortTicketId: shortTicketId }),
                htmlContent: `
                    <p>${t('email.worker.newTicketAssigned.greeting', { workerName: workerProfile.displayName || t('email.worker.defaultAgentName') })}</p>
                    <p>${t('email.worker.newTicketAssigned.body')}</p>
                    <p><strong>${t('email.worker.newTicketAssigned.ticketIdLabel')}:</strong> #${shortTicketId}</p>
                    <p><strong>${t('email.worker.newTicketAssigned.titleLabel')}:</strong> ${values.title}</p>
                    <p><strong>${t('email.worker.newTicketAssigned.createdByLabel')}:</strong> ${userProfile.displayName || userProfile.email}</p>
                    <p><strong>${t('email.worker.newTicketAssigned.descriptionLabel')}:</strong></p>
                    <div style="padding: 10px; border-left: 3px solid #eee; margin: 10px 0;">
                        <p style="margin:0;">${values.description.replace(/\n/g, '<br>')}</p>
                    </div>
                    <p>${t('email.worker.newTicketAssigned.statusNote')}</p>
                    ${successfulUploads.length > 0 ? `<p><strong>${t('email.worker.newTicketAssigned.attachmentsLabel')}:</strong> ${successfulUploads.map(att => `<a href="${att.url}">${att.name}</a>`).join(', ')}</p>` : ''}
                    ${standardFooter}
                `,
            });
        }
      }

      router.push(`/dashboard/tickets/${ticketId}`);
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({
        title: t('errorCreatingTicket.title'),
        description: t('errorCreatingTicket.description'),
        variant: "destructive",
      });
    } finally {
      setIsSubmittingMainForm(false);
    }
  }
  
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-primary" />;
    if (fileType.startsWith("video/")) return <Video className="h-5 w-5 text-primary" />;
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  const isUploadingAnyFile = uploadableFiles.some(f => f.status === 'uploading');
  const hasUploadErrors = uploadableFiles.some(f => f.status === 'error');

  if (isLoadingTranslations) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('titleLabel')}</FormLabel>
              <FormControl>
                <Input placeholder={t('titlePlaceholder')} {...field} />
              </FormControl>
              <FormDescription>
                {t('titleDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('descriptionLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('descriptionPlaceholder')}
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t('descriptionDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>{t('attachmentsLabel')}</FormLabel>
          <FormControl>
            <div className="flex flex-col gap-4 rounded-lg border border-dashed border-input p-6">
              <div 
                className="flex flex-col items-center justify-center text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t('attachmentsDragDrop')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('attachmentsLimits', { maxFiles: MAX_FILES, maxFileSizeMB: MAX_FILE_SIZE_MB })}
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploadableFiles.length >= MAX_FILES || isSubmittingMainForm}
                />
              </div>
            </div>
          </FormControl>
           <FormDescription>
             {t('attachmentsDescription')}
           </FormDescription>
          <FormMessage />
        </FormItem>
        
        {uploadableFiles.length > 0 && (
          <div className="space-y-3 rounded-md border p-4">
            <h4 className="text-sm font-medium">{t('selectedFiles')}</h4>
            {uploadableFiles.map(uf => (
              <div key={uf.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50">
                <div className="flex items-center gap-2 overflow-hidden">
                  {getFileIcon(uf.file.type)}
                  <span className="text-sm truncate" title={uf.file.name}>{uf.file.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    ({(uf.file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {uf.status === 'uploading' && (
                    <div className="w-20">
                       <Progress value={uf.progress} className="h-2" />
                    </div>
                  )}
                  {uf.status === 'success' && <span className="text-xs text-green-600">{t('uploadStatus.success')}</span>}
                  {uf.status === 'error' && (
                    <div className="flex items-center gap-1 text-xs text-destructive" title={uf.error}>
                      <AlertCircle className="h-4 w-4"/> {t('uploadStatus.error')}
                    </div>
                  )}
                  {(uf.status === 'pending' || uf.status === 'error') && (
                     <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleFileUpload(uf)} 
                      disabled={uf.status === 'uploading'}
                      title={t('retryUpload')}
                    >
                      <UploadCloud className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveFile(uf.id)}
                    disabled={uf.status === 'uploading' && uf.progress > 0 && uf.progress < 100}
                    title={t('removeFile')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('categoryLabel')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmittingMainForm || isUploadingAnyFile}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('categoryPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ticketCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('priorityLabel')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmittingMainForm || isUploadingAnyFile}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('priorityPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ticketPriorities.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button 
          type="submit" 
          disabled={isSubmittingMainForm || isUploadingAnyFile || hasUploadErrors} 
          className="w-full sm:w-auto"
        >
          {(isSubmittingMainForm || isUploadingAnyFile) && <LoadingSpinner size="sm" className="mr-2" />}
          {isUploadingAnyFile ? t('uploadingButton') : isSubmittingMainForm ? t('submittingButton') : t('submitButton')}
        </Button>
        {hasUploadErrors && <p className="text-sm text-destructive">{t('uploadErrorsMessage')}</p>}
      </form>
    </Form>
  );
}

