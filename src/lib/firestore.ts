
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
  arrayUnion,
  onSnapshot,
  type Unsubscribe,
  type DocumentData,
  type QuerySnapshot,
  type DocumentSnapshot,
  type FieldValue,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Ticket, TicketMessage, TicketStatus, UserProfile, UserRole, Attachment, Solution } from './types';
import { ticketStatuses } from '@/config/site';

// --- Default Worker Configuration ---
// IMPORTANT: Replace these placeholder values with the actual UID and display name of your default support agent.
const DEFAULT_WORKER_UID = "YNTAZdX8ClcRr3bAgf1WED1dE393"; // Placeholder, REPLACE THIS
const DEFAULT_WORKER_NAME = "John Carlo Limpiada"; // Placeholder, REPLACE THIS (or fetch dynamically)

// User Profile Functions
export const createUserProfile = async (userAuth: any, additionalData = {}): Promise<void> => {
  if (!userAuth) return;
  const userRef = doc(db, `users/${userAuth.uid}`);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { email, displayName, photoURL } = userAuth;
    const createdAt = serverTimestamp();
    try {
      await setDoc(userRef, {
        uid: userAuth.uid,
        email,
        displayName,
        photoURL,
        role: 'user', // Default role
        createdAt,
        ...additionalData,
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = doc(db, `users/${uid}`);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? (userSnap.data() as UserProfile) : null;
};

export const updateUserRole = async (uid: string, newRole: UserRole): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating role for user ${uid} to ${newRole}:`, error);
    throw error;
  }
};

export const getAssignableAgents = (callback: (users: UserProfile[]) => void): Unsubscribe => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', 'in', ['worker', 'admin']), orderBy('displayName'));

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const users = snapshot.docs.map(docSnap => ({
      ...docSnap.data(),
      uid: docSnap.id,
    } as UserProfile));
    callback(users);
  }, (error) => {
    console.error("Error in getAssignableAgents snapshot listener:", error);
    callback([]); // Return empty array on error
  });
};


export const getAllUsers = (callback: (users: UserProfile[]) => void): Unsubscribe => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('displayName', 'asc'));

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const users = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      let createdAtTimestamp = data.createdAt;
      if (createdAtTimestamp && typeof createdAtTimestamp.toDate !== 'function' && createdAtTimestamp.seconds) {
        createdAtTimestamp = new Timestamp(createdAtTimestamp.seconds, createdAtTimestamp.nanoseconds);
      } else if (!createdAtTimestamp) {
        createdAtTimestamp = Timestamp.now(); 
      }

      return {
        ...data,
        uid: docSnap.id,
        createdAt: createdAtTimestamp,
      } as UserProfile;
    });
    callback(users);
  }, (error) => {
    console.error("Error in getAllUsers snapshot listener:", error);
    callback([]); // Return empty array on error
  });
};


// Ticket Functions
export const createTicket = async (
  ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages' | 'createdByName' | 'status' | 'assignedTo' | 'assignedToName' | 'solution'> & { attachments?: Attachment[] },
  createdByProfile: UserProfile
): Promise<string> => {
  const ticketsRef = collection(db, 'tickets');

  let assignedTo: string | undefined = undefined;
  let assignedToName: string | undefined = undefined;
  
  // Check if DEFAULT_WORKER_UID is a placeholder or a real UID
  if (DEFAULT_WORKER_UID && DEFAULT_WORKER_UID !== "REPLACE_WITH_DEFAULT_WORKER_UID") {
    assignedTo = DEFAULT_WORKER_UID;
    assignedToName = DEFAULT_WORKER_NAME; // Consider fetching this dynamically if names change
  }

  const newTicket = {
    title: ticketData.title,
    description: ticketData.description,
    category: ticketData.category,
    priority: ticketData.priority,
    status: 'Open' as TicketStatus, // New tickets are Open, even if auto-assigned
    createdBy: createdByProfile.uid,
    createdByName: createdByProfile.displayName || createdByProfile.email || 'Unknown User',
    assignedTo: assignedTo,
    assignedToName: assignedToName,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    messages: [],
    attachments: ticketData.attachments || [],
    solution: null,
  };
  const docRef = await addDoc(ticketsRef, newTicket);
  return docRef.id;
};

const mapDocToTicket = (docSnap: DocumentSnapshot<DocumentData>): Ticket => {
  const data = docSnap.data() as any; // Use 'any' temporarily for easier data access
  let solutionData = null;
  if (data.solution) {
    solutionData = {
      ...data.solution,
      resolvedAt: data.solution.resolvedAt && typeof data.solution.resolvedAt.toDate === 'function'
        ? data.solution.resolvedAt
        : (data.solution.resolvedAt && data.solution.resolvedAt.seconds ? new Timestamp(data.solution.resolvedAt.seconds, data.solution.resolvedAt.nanoseconds) : Timestamp.now())
    };
  }

  return {
    id: docSnap.id,
    title: data.title || '',
    description: data.description || '',
    status: data.status || 'Open',
    priority: data.priority || 'Medium',
    category: data.category || 'Other',
    createdBy: data.createdBy || '',
    createdByName: data.createdByName || 'Unknown User',
    assignedTo: data.assignedTo,
    assignedToName: data.assignedToName,
    createdAt: data.createdAt, // Keep as Firestore Timestamp
    updatedAt: data.updatedAt, // Keep as Firestore Timestamp
    messages: data.messages?.map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp && typeof msg.timestamp.toDate === 'function' ? msg.timestamp : (msg.timestamp && msg.timestamp.seconds ? new Timestamp(msg.timestamp.seconds, msg.timestamp.nanoseconds) : Timestamp.now())
    })) || [],
    attachments: data.attachments || [],
    solution: solutionData,
  } as Ticket;
};


export const onTicketsUpdate = (
  userProfile: UserProfile,
  callback: (tickets: Ticket[]) => void,
  filters?: { status?: TicketStatus | "all", priority?: Ticket['priority'] | "all" }
): Unsubscribe => {
  const ticketsRef = collection(db, 'tickets');
  let qConstraints: any[] = [orderBy('updatedAt', 'desc')];

  if (userProfile.role === 'admin') {
    if (filters?.status && filters.status !== "all") {
      qConstraints.push(where('status', '==', filters.status));
    }
    if (filters?.priority && filters.priority !== "all") {
      qConstraints.push(where('priority', '==', filters.priority));
    }
  } else if (userProfile.role === 'worker') {
    qConstraints.push(where('assignedTo', '==', userProfile.uid));
    // Workers see all their assigned tickets, sort/filter client-side for active vs resolved/closed for now
    // qConstraints.push(where('status', 'not-in', ['Closed', 'Resolved']));
  } else { // user role
    qConstraints.push(where('createdBy', '==', userProfile.uid));
  }

  const q = query(ticketsRef, ...qConstraints);

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const tickets = snapshot.docs.map(mapDocToTicket);
    callback(tickets);
  }, (error) => {
    console.error("Error in onTicketsUpdate snapshot listener:", error);
  });
};

export const onTicketByIdUpdate = (ticketId: string, callback: (ticket: Ticket | null) => void): Unsubscribe => {
  const ticketRef = doc(db, 'tickets', ticketId);
  return onSnapshot(ticketRef, (docSnap) => {
    callback(docSnap.exists() ? mapDocToTicket(docSnap) : null);
  }, (error) => {
    console.error(`Error in onTicketByIdUpdate snapshot listener for ticket ${ticketId}:`, error);
  });
};

export const updateTicketStatus = async (
  ticketId: string,
  newStatus: TicketStatus,
  currentUserProfile: UserProfile // Added for context if needed for solution clearing logic
): Promise<void> => {
  const ticketRef = doc(db, 'tickets', ticketId);
  const updateData: { status: TicketStatus; updatedAt: FieldValue; solution?: Solution | null } = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  // If moving AWAY from Resolved to an active state (Open or In Progress) by a worker/admin,
  // clear the solution and delete its attachments.
  if ((newStatus === 'Open' || newStatus === 'In Progress')) {
    try {
      const ticketSnap = await getDoc(ticketRef);
      if (ticketSnap.exists()) {
        const ticketData = ticketSnap.data() as Ticket;
        // Only clear solution if the *previous* status was Resolved
        // And if the current user is a worker/admin making this change
        if (ticketData.status === 'Resolved' && ticketData.solution && 
            (currentUserProfile.role === 'admin' || (currentUserProfile.role === 'worker' && ticketData.assignedTo === currentUserProfile.uid))
           ) { 
          console.log(`[UpdateStatus] Ticket ${ticketId} manually moved from Resolved to ${newStatus} by ${currentUserProfile.role}. Attempting to delete ${ticketData.solution.attachments?.length || 0} solution attachments from R2.`);
          if (ticketData.solution.attachments && ticketData.solution.attachments.length > 0) {
            const deletionPromises = ticketData.solution.attachments.map(async (att) => {
              if (att.fileKey) {
                try {
                  const response = await fetch('/api/r2-delete-object', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileKey: att.fileKey }),
                  });
                  const result = await response.json();
                  if (!response.ok || !result.success) {
                    console.warn(`[UpdateStatus] Failed to delete R2 solution attachment ${att.fileKey} for ticket ${ticketId}: ${result.error || result.message}`);
                  } else {
                    console.log(`[UpdateStatus] Successfully deleted R2 solution attachment ${att.fileKey} for ticket ${ticketId}`);
                  }
                } catch (r2Error) {
                  console.error(`[UpdateStatus] Error calling R2 delete API for solution attachment ${att.fileKey}:`, r2Error);
                }
              }
            });
            await Promise.allSettled(deletionPromises);
          }
          updateData.solution = null; // Clear the solution from Firestore
          console.log(`[UpdateStatus] Solution field cleared for ticket ${ticketId}.`);
        }
      }
    } catch (error) {
        console.error(`[UpdateStatus] Error fetching ticket ${ticketId} before potentially clearing solution:`, error);
    }
  }
  
  await updateDoc(ticketRef, updateData);
  console.log(`[UpdateStatus] Ticket ${ticketId} status updated to ${newStatus}. Solution field was ${updateData.solution === null ? 'cleared' : 'not cleared'}.`);
};


export const resolveTicket = async (
  ticketId: string,
  solutionText: string,
  solutionAttachments: Attachment[],
  resolverProfile: UserProfile
): Promise<void> => {
  const ticketRef = doc(db, 'tickets', ticketId);
  const solution: Solution = {
    resolvedByUid: resolverProfile.uid,
    resolvedByName: resolverProfile.displayName || resolverProfile.email || 'Support Agent',
    resolvedAt: Timestamp.now(), 
    text: solutionText,
    attachments: solutionAttachments,
  };
  await updateDoc(ticketRef, {
    status: 'Resolved' as TicketStatus,
    solution: solution,
    updatedAt: serverTimestamp(), 
  });
};


export const assignTicket = async (ticketId: string, workerId: string, workerName: string, assignerProfile: UserProfile): Promise<void> => {
  const ticketRef = doc(db, 'tickets', ticketId);
  await updateDoc(ticketRef, {
    assignedTo: workerId,
    assignedToName: workerName,
    status: 'In Progress', // Assigning a ticket usually means it's being actively looked at.
    updatedAt: serverTimestamp(),
  });
};

export const addMessageToTicket = async (
  ticketId: string,
  messageData: Omit<TicketMessage, 'id' | 'timestamp' | 'senderDisplayName'>,
  senderProfile: UserProfile
): Promise<void> => {
  const ticketRef = doc(db, 'tickets', ticketId);
  const newMessage: TicketMessage = {
    ...messageData,
    id: doc(collection(db, 'tmp')).id, 
    senderDisplayName: senderProfile.displayName || senderProfile.email || 'Unknown User',
    timestamp: Timestamp.now(), 
  };

  const updatePayload: any = {
    messages: arrayUnion(newMessage),
    updatedAt: serverTimestamp(),
  };

  // No automatic status change or solution clearing when a message is added.
  // This is now handled manually by worker/admin via updateTicketStatus.

  await updateDoc(ticketRef, updatePayload);
  console.log(`[AddMessage] Message added to ticket ${ticketId}. Status not automatically changed.`);
};


export const deleteTicket = async (ticketId: string): Promise<void> => {
  const ticketRef = doc(db, 'tickets', ticketId);
  await deleteDoc(ticketRef);
};

    