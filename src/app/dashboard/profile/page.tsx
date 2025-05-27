
"use client";

import { useAuth } from '@/components/auth/AuthProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle } from 'lucide-react';

export default function ProfilePage() {
  const { userProfile, loading } = useAuth();

  if (loading || !userProfile) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <UserCircle className="h-12 w-12 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold">My Profile</CardTitle>
              <CardDescription>View your FireDesk account details.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="border-b pb-3">
            <p className="text-sm font-medium text-muted-foreground">Display Name</p>
            <p className="text-lg">{userProfile.displayName || 'Not Set'}</p>
          </div>
          <div className="border-b pb-3">
            <p className="text-sm font-medium text-muted-foreground">Email Address</p>
            <p className="text-lg">{userProfile.email || 'Not Set'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Role</p>
            <p className="text-lg capitalize">{userProfile.role}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
