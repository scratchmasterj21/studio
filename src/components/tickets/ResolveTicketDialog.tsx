
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useEffect, useState, useRef } from "react";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from "@/components/ui/progress";
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, Attachment } from '@/lib/types';
import { resolveTicket } from '@/lib/firestore';
import LoadingSpinner from '../common/LoadingSpinner';
import { UploadCloud, FileText, Image as ImageIcon, Video, Trash2, AlertCircle, Send } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from "@/lib/utils";

const MAX_FILES = 3;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const solutionFormSchema = z.object({
  solutionText: z.string().min(10, "Solution description must be at least 10 characters.").max(2000, "Solution description must be 2000 characters or less."),
});
type SolutionFormValues = z.infer<typeof solutionFormSchema>;

interface UploadableFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadedAttachment?: Attachment;
}

interface ResolveTicketDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketTitle: string;
  currentUserProfile: UserProfile;
  onTicketResolved: (solutionText: string, attachments: Attachment[]) => void; // Callback to trigger email
}

export default function ResolveTicketDialog({
  isOpen,
  onOpenChange,
  ticketId,
  ticketTitle,
  currentUserProfile,
  onTicketResolved,
}: ResolveTicketDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadableFiles, setUploadableFiles] = useState<UploadableFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SolutionFormValues>({
    resolver: zodResolver(solutionFormSchema),
    defaultValues: {
      solutionText: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setUploadableFiles([]);
      setIsSubmitting(false);
    }
  }, [isOpen, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (uploadableFiles.length + files.length > MAX_FILES) {
      toast({
        title: "Too many files",
        description: `You can upload a maximum of ${MAX_FILES} files.`,
        variant: "destructive",
      });
      return;
    }

    const newUploadableFiles: UploadableFile[] = files.map(file => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`,
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
            console.log(`[ResolveDialogUpload] Skipped upload for ${file.name}: Status is ${uf.status}.`);
            return uf;
          }
          return { ...uf, status: 'uploading', progress: 0, error: undefined };
        }
        return uf;
      })
    );

    try {
      const contentType = file.type || 'application/octet-stream';
      const presignedUrlResponse = await fetch(`/api/upload/presigned-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(contentType)}&userId=${encodeURIComponent(currentUserProfile.uid)}`);

      if (!presignedUrlResponse.ok) {
        const errorBody = await presignedUrlResponse.json();
        throw new Error(errorBody.error || `Failed to get presigned URL. Status: ${presignedUrlResponse.status}`);
      }
      const { presignedUrl, fileKey, publicUrl } = await presignedUrlResponse.json();

      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': contentType },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload to storage failed for ${file.name}. Status: ${uploadResponse.status}. Message: ${errorText || 'No additional error message.'}`);
      }

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
      setUploadableFiles(prev => prev.map(uf => uf.id === fileId ? { ...uf, status: 'error', error: error.message } : uf));
      toast({
        title: `Upload Error: ${file.name}`,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  async function onSubmit(values: SolutionFormValues) {
    setIsSubmitting(true);
    const successfulUploads = uploadableFiles
      .filter(uf => uf.status === 'success' && uf.uploadedAttachment)
      .map(uf => uf.uploadedAttachment!);

    try {
      await resolveTicket(ticketId, values.solutionText, successfulUploads, currentUserProfile);
      toast({
        title: "Ticket Resolved",
        description: `Ticket "${ticketTitle}" has been marked as resolved.`,
      });
      onTicketResolved(values.solutionText, successfulUploads); // Trigger email notification
      onOpenChange(false); // Close dialog
    } catch (error) {
      console.error("Error resolving ticket:", error);
      toast({
        title: "Error",
        description: "Failed to resolve ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-primary" />;
    if (fileType.startsWith("video/")) return <Video className="h-5 w-5 text-primary" />;
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  const isUploadingAnyFile = uploadableFiles.some(f => f.status === 'uploading');
  const hasUploadErrors = uploadableFiles.some(f => f.status === 'error');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resolve Ticket: {ticketTitle}</DialogTitle>
          <DialogDescription>
            Provide a solution and optionally attach files as proof. This will mark the ticket as "Resolved".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="solutionText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solution Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the solution provided..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Attach Proof (Optional)</FormLabel>
              <FormControl>
                <div className="flex flex-col gap-4 rounded-lg border border-dashed border-input p-4">
                  <div
                    className="flex flex-col items-center justify-center text-center cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to select files or drag & drop.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Up to {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each.
                    </p>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={uploadableFiles.length >= MAX_FILES || isSubmitting}
                    />
                  </div>
                </div>
              </FormControl>
              <FormDescription>
                 Attach screenshots, documents, or videos as proof of solution.
              </FormDescription>
              <FormMessage />
            </FormItem>

            {uploadableFiles.length > 0 && (
              <div className="space-y-2 rounded-md border p-3">
                <h4 className="text-xs font-medium text-muted-foreground">Selected Files:</h4>
                {uploadableFiles.map(uf => (
                  <div key={uf.id} className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-muted/50 text-sm">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {getFileIcon(uf.file.type)}
                      <span className="truncate" title={uf.file.name}>{uf.file.name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        ({(uf.file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {uf.status === 'uploading' && (
                        <div className="w-16">
                           <Progress value={uf.progress} className="h-1.5" />
                        </div>
                      )}
                      {uf.status === 'success' && <span className="text-xs text-green-600">Uploaded</span>}
                      {uf.status === 'error' && (
                        <div className="flex items-center gap-1 text-xs text-destructive" title={uf.error}>
                          <AlertCircle className="h-3.5 w-3.5"/> Error
                        </div>
                      )}
                      {(uf.status === 'pending' || uf.status === 'error') && (
                         <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleFileUpload(uf)}
                          disabled={uf.status === 'uploading'}
                          title="Retry Upload"
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveFile(uf.id)}
                        disabled={uf.status === 'uploading' && uf.progress > 0 && uf.progress < 100}
                        title="Remove File"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || isUploadingAnyFile || hasUploadErrors}>
                {isSubmitting || isUploadingAnyFile ? <LoadingSpinner size="sm" className="mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                {isUploadingAnyFile ? "Uploading..." : isSubmitting ? "Submitting..." : "Resolve Ticket"}
              </Button>
            </DialogFooter>
             {hasUploadErrors && <p className="text-sm text-destructive text-center mt-2">Some files failed to upload. Please remove them or retry.</p>}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
