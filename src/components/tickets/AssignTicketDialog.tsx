
"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { UserProfile } from '@/lib/types';
import { getAssignableAgents } from '@/lib/firestore'; 
import LoadingSpinner from '../common/LoadingSpinner';
import { Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AssignTicketDialogProps {
  ticketId: string;
  currentAssigneeId?: string;
  onAssign: (agentId: string, agentName: string) => Promise<void>;
}

export default function AssignTicketDialog({ ticketId, currentAssigneeId, onAssign }: AssignTicketDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [assignableAgents, setAssignableAgents] = useState<UserProfile[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(currentAssigneeId);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) { 
      setIsLoadingAgents(true);
      const unsubscribe = getAssignableAgents((fetchedAgents) => {
        setAssignableAgents(fetchedAgents);
        setIsLoadingAgents(false);
      });
      return () => unsubscribe(); 
    }
  }, [isOpen]);
  
  useEffect(() => {
    setSelectedAgentId(currentAssigneeId);
  }, [currentAssigneeId]);


  const handleAssign = async () => {
    if (!selectedAgentId) {
      toast({ title: "No Agent Selected", description: "Please select an agent to assign the ticket.", variant: "destructive" });
      return;
    }
    const selectedAgent = assignableAgents.find(w => w.uid === selectedAgentId);
    if (!selectedAgent) {
      toast({ title: "Agent Not Found", description: "Selected agent could not be found.", variant: "destructive" });
      return;
    }

    setIsAssigning(true);
    try {
      await onAssign(selectedAgentId, selectedAgent.displayName || selectedAgent.email || 'Unknown Agent');
      setIsOpen(false); 
    } catch (error) {
      console.error("Assignment failed from dialog:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Users className="mr-2 h-4 w-4" />
          {currentAssigneeId ? 'Reassign Ticket' : 'Assign Ticket'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Ticket</DialogTitle>
          <DialogDescription>
            Select an agent (worker or admin) to assign this ticket to. They will be notified.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="agent-select" className="text-right">
              Agent
            </Label>
            {isLoadingAgents ? (
              <div className="col-span-3 flex justify-center"> <LoadingSpinner /></div>
            ) : assignableAgents.length === 0 ? (
                <p className="col-span-3 text-sm text-muted-foreground">No agents available.</p>
            ) : (
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger id="agent-select" className="col-span-3">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {assignableAgents.map((agent) => (
                    <SelectItem key={agent.uid} value={agent.uid}>
                      {agent.displayName || agent.email} ({agent.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isAssigning}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleAssign} disabled={isLoadingAgents || !selectedAgentId || isAssigning}>
            {isAssigning ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
