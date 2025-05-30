
"use client";

import Link from 'next/link'; // Changed back to next/link
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/auth/AuthProvider';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { LayoutGrid, PlusCircle, Ticket as TicketIcon, UserCircle, Users as UsersIcon, ShieldCheck } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

interface NavLink {
  href: string;
  label: string; // Changed from translationKey
  icon: React.ReactNode;
  roles?: UserProfile['role'][];
}

export function AppHeader() {
  const { user, userProfile } = useAuth();

  const navLinks: NavLink[] = [
    { href: '/dashboard', label: 'My Tickets', icon: <LayoutGrid className="h-4 w-4" />, roles: ['user', 'worker', 'admin'] },
    { href: '/dashboard/tickets/new', label: 'New Ticket', icon: <PlusCircle className="h-4 w-4" />, roles: ['user', 'admin'] },
    { href: '/dashboard/admin', label: 'Admin Overview', icon: <ShieldCheck className="h-4 w-4" />, roles: ['admin'] },
    { href: '/dashboard/admin/users', label: 'Manage Users', icon: <UsersIcon className="h-4 w-4" />, roles: ['admin'] },
  ];

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  const filteredNavLinks = navLinks.filter(link => 
    !link.roles || (userProfile && link.roles.includes(userProfile.role))
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-primary">
          <TicketIcon className="h-7 w-7" />
          <span>FireDesk</span>
        </Link>
        
        <div className="flex items-center space-x-1 md:space-x-2">
          <nav className="hidden md:flex items-center space-x-2">
            {filteredNavLinks.map(link => (
              <Button key={link.href} variant="ghost" asChild>
                <Link href={link.href} className="flex items-center gap-1.5">
                  {link.icon}
                  {link.label}
                </Link>
              </Button>
            ))}
          </nav>

          {/* LanguageSwitcher removed */}

          {user && userProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={userProfile.photoURL ?? undefined} alt={userProfile.displayName ?? 'User'} />
                    <AvatarFallback>{getInitials(userProfile.displayName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userProfile.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userProfile.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile">
                      <UserCircle className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {userProfile.role === 'admin' && (
                    <>
                      <DropdownMenuItem asChild>
                         <Link href="/dashboard/admin">
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Admin Overview
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                         <Link href="/dashboard/admin/users">
                          <UsersIcon className="mr-2 h-4 w-4" />
                          Manage Users
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <SignOutButton asDropdownItem />
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
