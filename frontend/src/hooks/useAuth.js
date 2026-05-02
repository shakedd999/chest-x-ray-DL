import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase.js';

export function useAuth() {
  const [user, setUser] = useState(() => auth.currentUser);
  const [loading, setLoading] = useState(() => auth.currentUser == null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, loading };
}
