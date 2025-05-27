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
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Ticket, TicketMessage, TicketStatus, UserProfile, UserRole } from './types';

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
      // Optionally, add an updatedAt timestamp here if needed for auditing
      // updatedAt: serverTimestamp(), 
    });
  } catch (error) {
    console.error(`Error updating role for user ${uid} to ${newRole}:`, error);
    throw error;
  }
};

export const getAllUsersByRole = (role: UserRole, callback: (users: UserProfile[]) => void): Unsubscribe => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', role), orderBy('displayName'));
  
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const users = snapshot.docs.map(docSnap => ({
      ...docSnap.data(),
      uid: docSnap.id, // ensure uid is part of the returned object
    } as UserProfile));
    callback(users);
  });
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
  const q = query(usersRef, orderBy('displayName', 'asc')); // Order by display name

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const users = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      // Ensure createdAt is handled correctly, Firestore Timestamps are crucial
      let createdAtTimestamp = data.createdAt;
      if (createdAtTimestamp && !(createdAtTimestamp instanceof Timestamp)) {
        // If it's a plain object (e.g. from serverTimestamp() before write completion on client cache), convert
        // This is a fallback, ideally data is always consistent
        createdAtTimestamp = new Timestamp(createdAtTimestamp.seconds, createdAtTimestamp.nanoseconds);
      } else if (!createdAtTimestamp) {
        createdAtTimestamp = Timestamp.now(); // Fallback if missing, though should not happen
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
export const createTicket = async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages' | 'createdByName'>, createdByProfile: UserProfile): Promise<string> => {
  const ticketsRef = collection(db, 'tickets');
  const newTicket = {
    ...ticketData,
    createdBy: createdByProfile.uid,
    createdByName: createdByProfile.displayName || createdByProfile.email || 'Unknown User',
    status: 'Open' as TicketStatus,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    messages: [],
  };
  const docRef = await addDoc(ticketsRef, newTicket);
  return docRef.id;
};

const mapDocToTicket = (docSnap: DocumentSnapshot<DocumentData>): Ticket => {
  const data = docSnap.data() as any; // Use any temporarily for easier mapping
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt, // Assuming createdAt is already a Timestamp
    updatedAt: data.updatedAt, // Assuming updatedAt is already a Timestamp
    messages: data.messages?.map((msg: any) => ({ ...msg, timestamp: msg.timestamp })) || [],
  } as Ticket;
};


export const onTicketsUpdate = (
  userProfile: UserProfile,
  callback: (tickets: Ticket[]) => void,
  filters?: { status?: TicketStatus, priority?: Ticket['priority'] }
): Unsubscribe => {
  const ticketsRef = collection(db, 'tickets');
  let q;

  if (userProfile.role === 'admin') {
    q = query(ticketsRef, orderBy('updatedAt', 'desc'));
  } else if (userProfile.role === 'worker') {
    q = query(ticketsRef, where('assignedTo', '==', userProfile.uid), orderBy('updatedAt', 'desc'));
  } else { // 'user'
    q = query(ticketsRef, where('createdBy', '==', userProfile.uid), orderBy('updatedAt', 'desc'));
  }
  
  // Apply filters if provided (mainly for admin)
  if (filters?.status && userProfile.role === 'admin' && filters.status !== "all") {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters?.priority && userProfile.role === 'admin' && filters.priority !== "all") {
    q = query(q, where('priority', '==', filters.priority));
  }


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
    status: 'In Progress', // Optionally change status on assignment
    updatedAt: serverTimestamp(),
  });
};

export const addMessageToTicket = async (ticketId: string, messageData: Omit<TicketMessage, 'id' | 'timestamp' | 'senderDisplayName'>, senderProfile: UserProfile): Promise<void> => {
  const ticketRef = doc(db, 'tickets', ticketId);
  const newMessage: TicketMessage = {
    ...messageData,
    id: doc(collection(db, 'tmp')).id, // Generate a client-side ID for the message
    senderDisplayName: senderProfile.displayName || senderProfile.email || 'Unknown User',
    timestamp: serverTimestamp() as Timestamp,
  };
  await updateDoc(ticketRef, {
    messages: arrayUnion(newMessage),
    updatedAt: serverTimestamp(),
  });
};
