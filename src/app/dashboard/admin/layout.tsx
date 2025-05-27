
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!userProfile) {
        // Should be caught by DashboardLayout, but as a safeguard
        router.replace('/login'); 
      } else if (userProfile.role !== 'admin') {
        router.replace('/dashboard?error=unauthorized_admin_access');
      }
    }
  }, [userProfile, authLoading, router]);

  if (authLoading || !userProfile) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (userProfile.role !== 'admin') {
    // This part is mostly a fallback UI, as the useEffect should redirect.
    return (
      <div className="container mx-auto py-10">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive text-xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">You do not have permission to view this administrative area.</p>
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is admin, render the children (the admin page)
  return <div className="space-y-6">{children}</div>;
}
