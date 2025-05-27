
import Link from 'next/link';
import type { Ticket } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Clock, MessageSquare, User } from 'lucide-react';
import TicketStatusBadge from './TicketStatusBadge';
import TicketPriorityIcon from './TicketPriorityIcon';
import { formatDistanceToNowStrict } from 'date-fns';

interface TicketListItemProps {
  ticket: Ticket;
}

export default function TicketListItem({ ticket }: TicketListItemProps) {
  return (
    <Link href={`/dashboard/tickets/${ticket.id}`} passHref>
      <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer bg-card">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold leading-tight hover:text-primary transition-colors">
              {ticket.title}
            </CardTitle>
            <TicketStatusBadge status={ticket.status} />
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Ticket ID: {ticket.id.substring(0, 8)}...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground line-clamp-2">
            {ticket.description}
          </p>
          <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">{ticket.category}</Badge>
            <div className="flex items-center gap-1">
              <TicketPriorityIcon priority={ticket.priority} />
              <span>{ticket.priority} Priority</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-muted-foreground pt-4 border-t">
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
             <div className="flex items-center" title={`Created by ${ticket.createdByName}`}>
              <User className="h-3.5 w-3.5 mr-1" />
              <span>{ticket.createdByName}</span>
            </div>
            {ticket.assignedToName && (
              <div className="flex items-center" title={`Assigned to ${ticket.assignedToName}`}>
                <ArrowRight className="h-3.5 w-3.5 mr-1 text-primary" />
                <User className="h-3.5 w-3.5 mr-1 text-primary" />
                <span className="text-primary">{ticket.assignedToName}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-x-4 gap-y-1">
            <div className="flex items-center" title="Last updated">
              <Clock className="h-3.5 w-3.5 mr-1" />
              {ticket.updatedAt && typeof ticket.updatedAt.toDate === 'function' ? formatDistanceToNowStrict(ticket.updatedAt.toDate()) + ' ago' : 'Processing...'}
            </div>
            <div className="flex items-center" title={`${ticket.messages.length} messages`}>
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                {ticket.messages.length}
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
