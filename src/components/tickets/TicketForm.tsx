
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
import type { TicketCategory, TicketPriority, UserProfile } from "@/lib/types";
import { ticketCategories, ticketPriorities } from "@/config/site";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LoadingSpinner from "../common/LoadingSpinner";
import { sendEmailViaBrevo } from "@/lib/brevo";

const ticketFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title must be 100 characters or less."),
  description: z.string().min(10, "Description must be at least 10 characters.").max(1000, "Description must be 1000 characters or less."),
  category: z.enum(ticketCategories as [TicketCategory, ...TicketCategory[]]),
  priority: z.enum(ticketPriorities as [TicketPriority, ...TicketPriority[]]),
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

interface TicketFormProps {
  userProfile: UserProfile;
}

export default function TicketForm({ userProfile }: TicketFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: ticketCategories[0],
      priority: ticketPriorities[1], // Default to Medium
    },
  });

  async function onSubmit(values: TicketFormValues) {
    setIsSubmitting(true);
    try {
      const ticketData = {
        ...values,
        createdBy: userProfile.uid,
      };
      
      const ticketId = await createTicket(ticketData, userProfile);
      toast({
        title: "Ticket Created!",
        description: `Your ticket "${values.title}" has been submitted.`,
      });

      const ticketLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/tickets/${ticketId}`;
      const standardFooter = `
        <p style="font-size: 0.9em; color: #555555; margin-top: 20px; border-top: 1px solid #eeeeee; padding-top: 10px;">
          This is an automated notification from FireDesk. Please do not reply directly to this email unless instructed.
          <br>
          You can view the ticket <a href="${ticketLink}">here</a>.
        </p>
      `;

      // Send email notification to user
      if (userProfile.email) {
         await sendEmailViaBrevo({
           to: [{ email: userProfile.email, name: userProfile.displayName || userProfile.email }],
           subject: `FireDesk Ticket Created: ${values.title} (#${ticketId})`,
           htmlContent: `
             <h1>Ticket Created: ${values.title}</h1>
             <p>Dear ${userProfile.displayName || 'User'},</p>
             <p>Your support ticket has been successfully created with ID: <strong>#${ticketId}</strong>.</p>
             <p><strong>Title:</strong> ${values.title}</p>
             <p><strong>Description:</strong> ${values.description.replace(/\n/g, '<br>')}</p>
             <p><strong>Category:</strong> ${values.category}</p>
             <p><strong>Priority:</strong> ${values.priority}</p>
             <p>We will get back to you as soon as possible.</p>
             ${standardFooter}
           `,
         });
      }
      
      // Send email notification to admin
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL_NOTIFICATIONS;
      if (adminEmail) {
        await sendEmailViaBrevo({
          to: [{ email: adminEmail }],
          subject: `New FireDesk Ticket: ${values.title} by ${userProfile.displayName || userProfile.email} (#${ticketId})`,
          htmlContent: `
            <h1>New Ticket Submission</h1>
            <p>A new support ticket has been created by <strong>${userProfile.displayName || userProfile.email}</strong> (User ID: ${userProfile.uid}).</p>
            <p><strong>Ticket ID:</strong> #${ticketId}</p>
            <p><strong>Title:</strong> ${values.title}</p>
            <p><strong>Description:</strong></p>
            <div style="padding: 10px; border-left: 3px solid #eee; margin: 10px 0;">
              <p style="margin:0;">${values.description.replace(/\n/g, '<br>')}</p>
            </div>
            <p><strong>Category:</strong> ${values.category}</p>
            <p><strong>Priority:</strong> ${values.priority}</p>
            ${standardFooter}
          `,
        });
      }

      router.push(`/dashboard/tickets/${ticketId}`);
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., App not loading on startup" {...field} />
              </FormControl>
              <FormDescription>
                A brief summary of your issue.
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please describe the issue in detail..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide as much detail as possible, including steps to reproduce the issue if applicable.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
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
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a priority level" />
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
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? <LoadingSpinner size="sm" className="mr-2" /> : null}
          Submit Ticket
        </Button>
      </form>
    </Form>
  );
}
