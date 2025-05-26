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
import { createTicket } from "@/lib/firestore";
import type { TicketCategory, TicketPriority, UserProfile } from "@/lib/types";
import { ticketCategories, ticketPriorities } from "@/config/site";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LoadingSpinner from "../common/LoadingSpinner";
import { sendEmailViaBrevo } from "@/lib/brevo";

const ticketFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title must be 100 characters or less."),
  description: z.string().min(10, "Description must be at least 10 characters.").max(1000, "Description must be 1000 characters or less."),
  category: z.enum(ticketCategories as [TicketCategory, ...TicketCategory[]]), // Cast to satisfy Zod's non-empty array requirement
  priority: z.enum(ticketPriorities as [TicketPriority, ...TicketPriority[]]),
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

interface TicketFormProps {
  userProfile: UserProfile; // To set createdBy
  // ticket?: Ticket; // For editing existing tickets (optional feature)
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
        // createdByName will be set in createTicket based on userProfile
      };
      
      const ticketId = await createTicket(ticketData, userProfile);
      toast({
        title: "Ticket Created!",
        description: `Your ticket "${values.title}" has been submitted.`,
      });

      // Send email notification (client-side - see warning in brevo.ts)
      if (userProfile.email) {
         await sendEmailViaBrevo({
           to: [{ email: userProfile.email, name: userProfile.displayName || userProfile.email }],
           subject: `FireDesk Ticket Created: ${values.title}`,
           htmlContent: `<h1>Ticket Created: ${values.title}</h1><p>Your ticket has been successfully created with ID: ${ticketId}. You can view it <a href="${window.location.origin}/dashboard/tickets/${ticketId}">here</a>.</p>`,
         });
      }
      // Notify admin (example - this should be a configurable admin email)
      // This is just illustrative and would need a proper admin email configuration.
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL_NOTIFICATIONS;
      if (adminEmail) {
        await sendEmailViaBrevo({
          to: [{ email: adminEmail }],
          subject: `New FireDesk Ticket: ${values.title}`,
          htmlContent: `<h1>New Ticket Created: ${values.title}</h1><p>A new ticket has been created by ${userProfile.displayName} (${userProfile.email}). Ticket ID: ${ticketId}.</p><p>Details: ${values.description}</p>`,
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
