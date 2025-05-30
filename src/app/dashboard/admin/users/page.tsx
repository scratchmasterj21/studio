
"use client";

import { useEffect, useState } from 'react';
import type { UserProfile, UserRole } from '@/lib/types';
import { getAllUsers, updateUserRole } from '@/lib/firestore';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users as UsersIcon } from 'lucide-react'; 
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/useTranslations'; 

const availableRoles: UserRole[] = ['user', 'worker', 'admin'];

export default function ManageUsersPage() {
  const { userProfile: currentAdminProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const { toast } = useToast();
  const { t, isLoadingTranslations } = useTranslations('adminUsersPage'); 
  const { t: tValues } = useTranslations('ticketValues');

  useEffect(() => {
    setIsLoadingUsers(true);
    const unsubscribe = getAllUsers((fetchedUsers) => {
      setUsers(fetchedUsers);
      setIsLoadingUsers(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userId === currentAdminProfile?.uid) {
      toast({
        title: t('toast.actionDenied.title'),
        description: t('toast.actionDenied.description'),
        variant: "destructive",
      });
      return;
    }
    setUpdatingRoleId(userId);
    try {
      await updateUserRole(userId, newRole);
      toast({
        title: t('toast.roleUpdated.title'),
        description: t('toast.roleUpdated.description', { newRole: newRole }),
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.description'),
        variant: "destructive",
      });
    } finally {
      setUpdatingRoleId(null);
    }
  };
  
  const toKey = (str: string) => str.toLowerCase().replace(/\s+/g, '');

  if (isLoadingUsers || !currentAdminProfile || isLoadingTranslations || (tValues && !tValues('roles.user'))) {
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
          <CardTitle className="text-3xl font-bold">{t('title')}</CardTitle>
        </div>
        <CardDescription className="mt-1">{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">{t('noUsersFound')}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableCaption className="py-4">{t('tableCaption')}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] sm:w-[120px]">{t('uidHeader')}</TableHead>
                  <TableHead>{t('displayNameHeader')}</TableHead>
                  <TableHead>{t('emailHeader')}</TableHead>
                  <TableHead className="text-center">{t('currentRoleHeader')}</TableHead>
                  <TableHead className="w-[180px]">{t('changeRoleHeader')}</TableHead>
                  <TableHead className="text-right">{t('createdAtHeader')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid} className="hover:bg-muted/50">
                    <TableCell 
                      className="font-mono text-xs truncate" 
                      title={user.uid}
                    >
                      {user.uid.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={
                          user.role === 'admin' ? 'destructive' : 
                          user.role === 'worker' ? 'default' :
                          'secondary'
                        }
                        className="capitalize"
                      >
                        {tValues(`roles.${toKey(user.role)}`, user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.uid === currentAdminProfile.uid ? (
                        <span className="text-sm text-muted-foreground italic">{t('cannotChangeOwnRole')}</span>
                      ) : (
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => handleRoleChange(user.uid, newRole as UserRole)}
                          disabled={updatingRoleId === user.uid}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={t('roleSelectPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map(role => (
                              <SelectItem key={role} value={role} className="capitalize">
                                {tValues(`roles.${toKey(role)}`, role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {updatingRoleId === user.uid && <LoadingSpinner size="sm" className="ml-2 inline-block" />}
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

