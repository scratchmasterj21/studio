
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
} from 'firebase/firestore';
import { db } from './firebase';
import type { Ticket, TicketMessage, TicketStatus, UserProfile, UserRole, Attachment } from './types';
import { ticketStatuses } from '@/config/site';

// --- Default Worker Configuration ---
// IMPORTANT: Replace these placeholder values with the actual UID and display name of your default support agent.
const DEFAULT_WORKER_UID = "REPLACE_WITH_DEFAULT_WORKER_UID";
const DEFAULT_WORKER_NAME = "Default Support Agent"; // Or the actual name

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
        createdAtTimestamp = Timestamp.now(); // Fallback if createdAt is missing
      }

      return {
        ...data,
        uid: docSnap.id,
        createdAt: createdAtTimestamp,
      } as UserProfile;
    });
    callback(users);
  });
};


// Ticket Functions
export const createTicket = async (
  ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages' | 'createdByName' | 'status' | 'assignedTo' | 'assignedToName'> & { attachments?: Attachment[] },
  createdByProfile: UserProfile
): Promise<string> => {
  const ticketsRef = collection(db, 'tickets');
  
  let assignedTo: string | undefined = undefined;
  let assignedToName: string | undefined = undefined;
  let status: TicketStatus = 'Open';

  if (DEFAULT_WORKER_UID && DEFAULT_WORKER_UID !== "REPLACE_WITH_DEFAULT_WORKER_UID") {
    assignedTo = DEFAULT_WORKER_UID;
    assignedToName = DEFAULT_WORKER_NAME;
    status = 'In Progress'; // Set to In Progress if assigned
  }

  const newTicket = {
    title: ticketData.title,
    description: ticketData.description,
    category: ticketData.category,
    priority: ticketData.priority,
    status: status,
    createdBy: createdByProfile.uid,
    createdByName: createdByProfile.displayName || createdByProfile.email || 'Unknown User',
    assignedTo: assignedTo,
    assignedToName: assignedToName,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    messages: [],
    attachments: ticketData.attachments || [],
  };
  const docRef = await addDoc(ticketsRef, newTicket);
  return docRef.id;
};

const mapDocToTicket = (docSnap: DocumentSnapshot<DocumentData>): Ticket => {
  const data = docSnap.data() as any; // Cast to any to handle potential undefined fields gracefully
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
    createdAt: data.createdAt, // Assume these are Timestamps or handled by onSnapshot
    updatedAt: data.updatedAt,
    messages: data.messages?.map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp && typeof msg.timestamp.toDate === 'function' ? msg.timestamp : (msg.timestamp && msg.timestamp.seconds ? new Timestamp(msg.timestamp.seconds, msg.timestamp.nanoseconds) : Timestamp.now())
    })) || [],
    attachments: data.attachments || [],
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
  } else { 
    qConstraints.push(where('createdBy', '==', userProfile.uid));
  }

  const q = query(ticketsRef, ...qConstraints);

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const tickets = snapshot.docs.map(mapDocToTicket);
    callback(tickets);
  });
};

export const onTicketByIdUpdate = (ticketId: string, callback: (ticket: Ticket | null) => void): Unsubscribe => {
  const ticketRef = doc(db, 'tickets', ticketId);
  return onSnapshot(ticketRef, (docSnap) => {
    callback(docSnap.exists() ? mapDocToTicket(docSnap) : null);
  });
};

export const updateTicketStatus = async (ticketId: string, status: TicketStatus): Promise<void> => {
  const ticketRef = doc(db, 'tickets', ticketId);
  await updateDoc(ticketRef, {
    status,
    updatedAt: serverTimestamp(),
  });
};

export const assignTicket = async (ticketId: string, workerId: string, workerName: string): Promise<void> => {
  const ticketRef = doc(db, 'tickets', ticketId);
  await updateDoc(ticketRef, {
    assignedTo: workerId,
    assignedToName: workerName,
    status: 'In Progress', // Automatically set to In Progress when assigned
    updatedAt: serverTimestamp(),
  });
};

export const addMessageToTicket = async (ticketId: string, messageData: Omit<TicketMessage, 'id' | 'timestamp' | 'senderDisplayName'>, senderProfile: UserProfile): Promise<void> => {
  const ticketRef = doc(db, 'tickets', ticketId);
  const newMessage: TicketMessage = {
    ...messageData,
    id: doc(collection(db, 'tmp')).id, 
    senderDisplayName: senderProfile.displayName || senderProfile.email || 'Unknown User',
    timestamp: Timestamp.now(),
  };
  await updateDoc(ticketRef, {
    messages: arrayUnion(newMessage),
    updatedAt: serverTimestamp(),
  });
};

export const deleteTicket = async (ticketId: string): Promise<void> => {
  const ticketRef = doc(db, 'tickets', ticketId);
  await deleteDoc(ticketRef);
};
