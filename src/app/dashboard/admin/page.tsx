
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { TicketStats } from '@/lib/types';
import { onTicketStatsUpdate } from '@/lib/firestore';
import { BarChart3, CheckCircle2, Clock, FolderArchive, FolderOpen, ListChecks } from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onTicketStatsUpdate((fetchedStats) => {
      setStats(fetchedStats);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statItems = [
    { title: 'Total Tickets', value: stats.totalTickets, icon: <BarChart3 className="h-6 w-6 text-primary" />, color: "text-primary" },
    { title: 'Open Tickets', value: stats.openTickets, icon: <FolderOpen className="h-6 w-6 text-blue-500" />, color: "text-blue-500" },
    { title: 'In Progress', value: stats.inProgressTickets, icon: <Clock className="h-6 w-6 text-yellow-500" />, color: "text-yellow-500" },
    { title: 'Resolved Tickets', value: stats.resolvedTickets, icon: <CheckCircle2 className="h-6 w-6 text-green-500" />, color: "text-green-500" },
    { title: 'Closed Tickets', value: stats.closedTickets, icon: <FolderArchive className="h-6 w-6 text-gray-500" />, color: "text-gray-500" },
  ];

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ListChecks className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">Admin Dashboard Overview</CardTitle>
          </div>
          <CardDescription>A quick glance at the current state of support tickets.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statItems.map((item) => (
          <Card key={item.title} className="shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${item.color}`}>{item.title}</CardTitle>
              {item.icon}
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${item.color}`}>{item.value}</div>
              {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
            </CardContent>
          </Card>
        ))}
      </div>

       {/* Placeholder for future charts or more detailed stats */}
       {/*
       <Card className="shadow-lg">
         <CardHeader>
           <CardTitle>Ticket Trends (Placeholder)</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="h-64 flex items-center justify-center text-muted-foreground bg-muted/30 rounded-md">
             Chart will be here
           </div>
         </CardContent>
       </Card>
       */}
    </div>
  );
}
