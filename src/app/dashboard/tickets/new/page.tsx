"use client";

import TicketForm from '@/components/tickets/TicketForm';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function NewTicketPage() {
  const { userProfile, loading } = useAuth();

  if (loading || !userProfile) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }
  
  // Ensure only users and admins can create tickets
  if (userProfile.role !== 'user' && userProfile.role !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You do not have permission to create new tickets.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create New Support Ticket</CardTitle>
          <CardDescription>
            Fill out the form below to submit a new support ticket. We'll get back to you as soon as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TicketForm userProfile={userProfile} />
        </CardContent>
      </Card>
    </div>
  );
}
