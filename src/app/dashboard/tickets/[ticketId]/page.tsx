"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import TicketDetailView from '@/components/tickets/TicketDetailView';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { Ticket } from '@/lib/types';
import { onTicketByIdUpdate } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TicketDetailPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const ticketId = params.ticketId as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticketId && userProfile) { // Ensure userProfile is available before subscribing
      setIsLoadingTicket(true);
      setError(null);
      const unsubscribe = onTicketByIdUpdate(ticketId, (fetchedTicket) => {
        if (fetchedTicket) {
          // Authorization: Check if the user is allowed to view this ticket
          const { role, uid } = userProfile;
          if (role === 'admin' || 
              (role === 'worker' && fetchedTicket.assignedTo === uid) || 
              (role === 'user' && fetchedTicket.createdBy === uid)) {
            setTicket(fetchedTicket);
          } else {
            setError("You don't have permission to view this ticket.");
            setTicket(null); // Or redirect
            // router.replace('/dashboard?error=unauthorized'); // Alternative
          }
        } else {
          setError("Ticket not found.");
          setTicket(null);
        }
        setIsLoadingTicket(false);
      });
      return () => unsubscribe();
    } else if (!authLoading && !userProfile) {
      // If auth is done loading and there's no user profile, means user is not logged in or profile fetch failed
      setIsLoadingTicket(false);
      setError("Authentication required or user profile not found.");
    }
  }, [ticketId, userProfile, authLoading, router]);

  if (authLoading || isLoadingTicket) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <button onClick={() => router.push('/dashboard')} className="mt-4 text-primary hover:underline">
            Go to Dashboard
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!ticket) {
     // This case should ideally be covered by error state, but as a fallback.
    return <p>Ticket not found or loading...</p>;
  }

  return <TicketDetailView ticket={ticket} currentUserProfile={userProfile!} />;
}
