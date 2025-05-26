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
import { getAllUsersByRole } from '@/lib/firestore'; // Changed from getAssignableUsers to real-time capable one
import LoadingSpinner from '../common/LoadingSpinner';
import { Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AssignTicketDialogProps {
  ticketId: string;
  currentAssigneeId?: string;
  onAssign: (workerId: string, workerName: string) => Promise<void>;
}

export default function AssignTicketDialog({ ticketId, currentAssigneeId, onAssign }: AssignTicketDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [workers, setWorkers] = useState<UserProfile[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | undefined>(currentAssigneeId);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) { // Only fetch if dialog is open
      setIsLoadingWorkers(true);
      const unsubscribe = getAllUsersByRole('worker', (fetchedWorkers) => {
        setWorkers(fetchedWorkers);
        setIsLoadingWorkers(false);
      });
      return () => unsubscribe(); // Cleanup subscription when dialog closes or component unmounts
    }
  }, [isOpen]);
  
  useEffect(() => {
    // Update selected worker if currentAssigneeId changes from props
    setSelectedWorkerId(currentAssigneeId);
  }, [currentAssigneeId]);


  const handleAssign = async () => {
    if (!selectedWorkerId) {
      toast({ title: "No Worker Selected", description: "Please select a worker to assign the ticket.", variant: "destructive" });
      return;
    }
    const selectedWorker = workers.find(w => w.uid === selectedWorkerId);
    if (!selectedWorker) {
      toast({ title: "Worker Not Found", description: "Selected worker could not be found.", variant: "destructive" });
      return;
    }

    setIsAssigning(true);
    try {
      await onAssign(selectedWorkerId, selectedWorker.displayName || selectedWorker.email || 'Unknown Worker');
      setIsOpen(false); // Close dialog on success
    } catch (error) {
      // Toast for error is handled in the parent component's onAssign typically
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
            Select a worker to assign this ticket to. They will be notified.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="worker-select" className="text-right">
              Worker
            </Label>
            {isLoadingWorkers ? (
              <div className="col-span-3 flex justify-center"> <LoadingSpinner /></div>
            ) : workers.length === 0 ? (
                <p className="col-span-3 text-sm text-muted-foreground">No workers available.</p>
            ) : (
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger id="worker-select" className="col-span-3">
                  <SelectValue placeholder="Select a worker" />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((worker) => (
                    <SelectItem key={worker.uid} value={worker.uid}>
                      {worker.displayName} ({worker.email})
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
          <Button onClick={handleAssign} disabled={isLoadingWorkers || !selectedWorkerId || isAssigning}>
            {isAssigning ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
