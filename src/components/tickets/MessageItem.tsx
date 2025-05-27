
import type { TicketMessage } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserCircle } from 'lucide-react'; // Using UserCircle for sender role icon

interface MessageItemProps {
  message: TicketMessage;
  currentUserId: string;
}

export default function MessageItem({ message, currentUserId }: MessageItemProps) {
  const isCurrentUser = message.senderId === currentUserId;
  const initials = message.senderDisplayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className={cn("flex gap-3", isCurrentUser ? "justify-end" : "justify-start")}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 border">
          {/* Placeholder for sender avatar - in a real app, fetch sender's photoURL */}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      )}
      <Card className={cn(
        "max-w-[75%] sm:max-w-[60%] shadow-sm",
        isCurrentUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-muted-foreground rounded-bl-none"
      )}>
        <CardHeader className="p-2 pb-1">
           <div className="flex items-center gap-1.5 text-xs">
            {!isCurrentUser && <UserCircle className="h-3.5 w-3.5" />}
            <span className={cn("font-semibold", isCurrentUser ? "text-primary-foreground/90" : "text-foreground/80")}>
              {message.senderDisplayName} ({message.senderRole})
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
        </CardContent>
        <CardFooter className="p-2 pt-1 text-xs opacity-80">
          {message.timestamp && typeof message.timestamp.toDate === 'function' ? formatDistanceToNowStrict(message.timestamp.toDate()) + ' ago' : 'Sending...'}
        </CardFooter>
      </Card>
       {isCurrentUser && (
        <Avatar className="h-8 w-8 border">
          {/* Placeholder for current user avatar */}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
