
"use client";

import { useEffect, useState } from 'react';
import type { UserProfile } from '@/lib/types';
import { getAllUsers } from '@/lib/firestore';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users as UsersIcon } from 'lucide-react'; // Renamed to avoid conflict if Users component is ever made

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  useEffect(() => {
    setIsLoadingUsers(true);
    const unsubscribe = getAllUsers((fetchedUsers) => {
      setUsers(fetchedUsers);
      setIsLoadingUsers(false);
    });
    return () => unsubscribe(); // Cleanup subscription on component unmount
  }, []);

  if (isLoadingUsers) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <UsersIcon className="h-8 w-8 text-primary" />
          <CardTitle className="text-3xl font-bold">User Management</CardTitle>
        </div>
        <CardDescription className="mt-1">View and manage all users registered in the system.</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">No users found in the system.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableCaption className="py-4">A list of all registered users.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px] sm:w-[150px]">UID</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Role</TableHead>
                  <TableHead className="text-right">Created At</TableHead>
                  {/* TODO: Add Actions column for future role changes, etc. */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid} className="hover:bg-muted/50">
                    <TableCell 
                      className="font-mono text-xs truncate" 
                      title={user.uid}
                    >
                      {user.uid.substring(0, 10)}...
                    </TableCell>
                    <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={
                          user.role === 'admin' ? 'destructive' : 
                          user.role === 'worker' ? 'default' : // Using 'default' for primary color for worker
                          'secondary' // Using 'secondary' for user
                        }
                        className="capitalize"
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.createdAt ? format(user.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
