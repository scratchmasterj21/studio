
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ListChecks } from 'lucide-react';

export default function AdminDashboardPage() {
  // Removed state and useEffect for fetching ticket stats

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ListChecks className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">Admin Dashboard</CardTitle>
          </div>
          <CardDescription>Welcome to the admin area. More features coming soon!</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ticket statistics have been temporarily removed. You can manage users from the "Manage Users" link in the header.
          </p>
        </CardContent>
      </Card>

      {/* Placeholder for future content or simplified stats if desired */}
      {/* 
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Feature Area 1</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Details about feature area 1...</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Feature Area 2</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Details about feature area 2...</p>
          </CardContent>
        </Card>
      </div>
      */}
    </div>
  );
}
