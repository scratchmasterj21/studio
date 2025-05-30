
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import TicketList from '@/components/tickets/TicketList';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { Ticket, TicketStatus, TicketPriority } from '@/lib/types';
import { onTicketsUpdate } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link'; // Changed back to next/link
import { PlusCircle, Filter, Search, Briefcase, Clock, FileText, ArrowDownUp, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ticketPriorities, ticketStatuses } from '@/config/site';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type WorkerSortOption = "updatedAt_desc" | "priority_desc" | "priority_asc" | "createdAt_desc";

const workerSortOptions: { value: WorkerSortOption; label: string }[] = [
  { value: "updatedAt_desc", label: "Last Updated (Newest First)" },
  { value: "priority_desc", label: "Priority (High to Low)" },
  { value: "priority_asc", label: "Priority (Low to High)" },
  { value: "createdAt_desc", label: "Creation Date (Newest First)" },
];

const priorityMap: { [key in TicketPriority]: number } = {
  "Low": 0,
  "Medium": 1,
  "High": 2,
};

export default function DashboardPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  // Admin filters
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Worker filters/sort
  const [workerSortOption, setWorkerSortOption] = useState<WorkerSortOption>("updatedAt_desc");

  useEffect(() => {
    if (userProfile) {
      setIsLoadingTickets(true);
      const adminFilters = userProfile.role === 'admin' ? {
        status: statusFilter === 'all' ? undefined : statusFilter,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
      } : undefined;

      const unsubscribe = onTicketsUpdate(userProfile, (fetchedTickets) => {
        setTickets(fetchedTickets);
        setIsLoadingTickets(false);
      }, adminFilters); // Pass admin specific filters if admin
      return () => unsubscribe();
    }
  }, [userProfile, statusFilter, priorityFilter]); // Admin filters trigger Firestore re-fetch

  const processedTickets = useMemo(() => {
    let displayTickets = [...tickets];

    if (userProfile?.role === 'admin' && searchTerm) {
      displayTickets = displayTickets.filter(ticket =>
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (userProfile?.role === 'worker') {
      displayTickets.sort((a, b) => {
        switch (workerSortOption) {
          case "priority_desc":
            return priorityMap[b.priority] - priorityMap[a.priority];
          case "priority_asc":
            return priorityMap[a.priority] - priorityMap[b.priority];
          case "createdAt_desc":
            return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
          case "updatedAt_desc": // Firestore default for worker is already this
          default:
            return (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0);
        }
      });
    }
    return displayTickets;
  }, [tickets, searchTerm, userProfile?.role, workerSortOption]);

  const workerStats = useMemo(() => {
    if (userProfile?.role !== 'worker' || tickets.length === 0) {
      return { open: 0, inProgress: 0 };
    }
    return {
      open: tickets.filter(t => t.status === 'Open').length,
      inProgress: tickets.filter(t => t.status === 'In Progress').length,
    };
  }, [tickets, userProfile?.role]);

  const userTicketStats = useMemo(() => {
    if (userProfile?.role !== 'user' || tickets.length === 0) {
      return { open: 0, inProgress: 0, resolved: 0 };
    }
    return {
      open: tickets.filter(t => t.status === 'Open').length,
      inProgress: tickets.filter(t => t.status === 'In Progress').length,
      resolved: tickets.filter(t => t.status === 'Resolved').length,
    };
  }, [tickets, userProfile?.role]);


  if (authLoading || !userProfile) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  const getPageTitle = () => {
    if (!userProfile) return 'Tickets';
    switch (userProfile.role) {
      case 'admin': return 'All Tickets Management';
      case 'worker': return 'My Assigned Tickets';
      case 'user': return 'My Submitted Tickets';
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

      {userProfile.role === 'worker' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workerStats.open}</div>
              <p className="text-xs text-muted-foreground">Currently assigned to you</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress Tickets</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workerStats.inProgress}</div>
               <p className="text-xs text-muted-foreground">Currently being worked on</p>
            </CardContent>
          </Card>
        </div>
      )}

      {userProfile.role === 'user' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Open Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userTicketStats.open}</div>
              <p className="text-xs text-muted-foreground">Awaiting agent response</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your In-Progress Tickets</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userTicketStats.inProgress}</div>
               <p className="text-xs text-muted-foreground">Being actively worked on</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Resolved Tickets</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userTicketStats.resolved}</div>
               <p className="text-xs text-muted-foreground">Awaiting your confirmation</p>
            </CardContent>
          </Card>
        </div>
      )}


      {userProfile.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filters & Search</CardTitle>
            <CardDescription>Filter tickets by status, priority, or search by title/description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TicketStatus | "all")}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Filter by Status" />
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
                    <SelectValue placeholder="Filter by Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {ticketPriorities.map(priority => (
                      <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {userProfile.role === 'worker' && (
         <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ArrowDownUp className="h-5 w-5" /> Sort Tickets</CardTitle>
          </CardHeader>
          <CardContent>
             <div>
                <label htmlFor="worker-sort-filter" className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                <Select 
                  value={workerSortOption} 
                  onValueChange={(value) => setWorkerSortOption(value as WorkerSortOption)}
                >
                  <SelectTrigger id="worker-sort-filter">
                    <SelectValue placeholder="Sort tickets" />
                  </SelectTrigger>
                  <SelectContent>
                    {workerSortOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
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
        <TicketList tickets={processedTickets} />
      )}
    </div>
  );
}
