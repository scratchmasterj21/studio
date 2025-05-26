"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignInButton } from '@/components/auth/SignInButton';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { siteConfig } from '@/config/site';
import { Ticket } from 'lucide-react'; // Using Ticket icon as a generic helpdesk icon

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || (!loading && user)) {
    // Show loader or nothing if redirecting
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
         {/* You can add a LoadingSpinner here if desired */}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Ticket size={32} />
          </div>
          <CardTitle className="text-3xl font-bold">{siteConfig.name}</CardTitle>
          <CardDescription className="text-lg">
            Sign in to access the help desk.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 p-8">
          <SignInButton />
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our terms of service.
          </p>
        </CardContent>
      </Card>
       <footer className="mt-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </footer>
    </div>
  );
}
