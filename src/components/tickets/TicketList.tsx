import type { Ticket } from '@/lib/types';
import TicketListItem from './TicketListItem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Inbox } from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
}

export default function TicketList({ tickets }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <Card className="shadow-lg border-dashed border-2">
        <CardHeader>
           <CardTitle className="text-center text-xl font-medium">No Tickets Found</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Inbox className="h-20 w-20 text-muted-foreground mb-6" />
          <p className="text-muted-foreground">
            There are no tickets to display at the moment.
          </p>
          {/* TODO: Add a conditional button to create a new ticket if applicable based on role */}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <TicketListItem key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}
