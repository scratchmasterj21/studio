
import type { TicketMessage } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Removed AvatarImage as it wasn't used
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserCircle, Briefcase, ShieldCheck } from 'lucide-react'; // Added Briefcase, ShieldCheck

interface MessageItemProps {
  message: TicketMessage;
  currentUserId: string;
}

export default function MessageItem({ message, currentUserId }: MessageItemProps) {
  const isCurrentUser = message.senderId === currentUserId;
  const initials = message.senderDisplayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const SenderIcon = () => {
    if (isCurrentUser) return null; // No icon for current user, avatar implies sender
    switch (message.senderRole) {
      case 'user':
        return <UserCircle className="h-4 w-4 text-muted-foreground" />;
      case 'worker':
        return <Briefcase className="h-4 w-4 text-muted-foreground" />;
      case 'admin':
        return <ShieldCheck className="h-4 w-4 text-muted-foreground" />;
      default:
        return <UserCircle className="h-4 w-4 text-muted-foreground" />; // Fallback
    }
  };

  return (
    <div className={cn("flex gap-3", isCurrentUser ? "justify-end" : "justify-start")}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 border">
          {/* Avatar for non-current user */}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      )}
      <Card className={cn(
        "max-w-[75%] sm:max-w-[60%] shadow-sm",
        isCurrentUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card text-card-foreground border rounded-bl-none" // Adjusted non-current user card style
      )}>
        <CardHeader className="p-2 pb-1">
           <div className="flex items-center gap-1.5 text-xs">
            {!isCurrentUser && <SenderIcon />}
            <span className={cn(
              "font-semibold", 
              isCurrentUser ? "text-primary-foreground/90" : "text-foreground"
            )}>
              {message.senderDisplayName || 'Unknown User'}
            </span>
            {!isCurrentUser && (
              <span className="text-muted-foreground/80">
                ({message.senderRole})
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
        </CardContent>
        <CardFooter className={cn(
          "p-2 pt-1 text-xs opacity-80",
           isCurrentUser ? "text-primary-foreground/80" : "text-muted-foreground"
        )}>
          {message.timestamp && typeof message.timestamp.toDate === 'function' ? formatDistanceToNowStrict(message.timestamp.toDate()) + ' ago' : 'Sending...'}
        </CardFooter>
      </Card>
       {isCurrentUser && (
        <Avatar className="h-8 w-8 border">
          {/* Avatar for current user */}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
