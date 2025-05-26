"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import TicketList from '@/components/tickets/TicketList';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { Ticket, TicketStatus, TicketPriority } from '@/lib/types';
import { onTicketsUpdate } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ticketPriorities, ticketStatuses, siteConfig } from '@/config/site';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';


export default function DashboardPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");

  useEffect(() => {
    if (userProfile) {
      setIsLoadingTickets(true);
      const filters = userProfile.role === 'admin' ? {
        status: statusFilter === 'all' ? undefined : statusFilter,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
      } : undefined;

      const unsubscribe = onTicketsUpdate(userProfile, (fetchedTickets) => {
        setTickets(fetchedTickets);
        setIsLoadingTickets(false);
      }, filters);
      return () => unsubscribe();
    }
  }, [userProfile, statusFilter, priorityFilter]);

  if (authLoading || !userProfile) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  const getPageTitle = () => {
    switch (userProfile.role) {
      case 'admin': return 'All Tickets';
      case 'worker': return 'Assigned Tickets';
      case 'user': return 'My Tickets';
      default: return 'Tickets';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{getPageTitle()}</h1>
        {(userProfile.role === 'user' || userProfile.role === 'admin') && (
          <Button asChild>
            <Link href="/dashboard/tickets/new">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Ticket
            </Link>
          </Button>
        )}
      </div>

      {userProfile.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filters</CardTitle>
            <CardDescription>Filter tickets by status or priority.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TicketStatus | "all")}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {ticketStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as TicketPriority | "all")}>
                <SelectTrigger id="priority-filter">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {ticketPriorities.map(priority => (
                    <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoadingTickets ? (
        <div className="flex justify-center items-center py-10">
          <LoadingSpinner />
        </div>
      ) : (
        <TicketList tickets={tickets} />
      )}
    </div>
  );
}
