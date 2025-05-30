
"use client";

import TicketForm from '@/components/tickets/TicketForm';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useTranslations } from '@/hooks/useTranslations'; // Import useTranslations

export default function NewTicketPage() {
  const { userProfile, loading } = useAuth();
  const { t, isLoadingTranslations } = useTranslations('newTicketPage'); // Use translations

  if (loading || !userProfile || isLoadingTranslations) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }
  
  // Ensure only users and admins can create tickets
  if (userProfile.role !== 'user' && userProfile.role !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('accessDeniedTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('accessDeniedMessage')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TicketForm userProfile={userProfile} />
        </CardContent>
      </Card>
    </div>
  );
}
