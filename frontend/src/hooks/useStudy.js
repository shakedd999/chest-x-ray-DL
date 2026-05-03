import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

export function useStudy(uid, studyId) {
  const [study, setStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid || !studyId) {
      setStudy(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, 'users', uid, 'studies', studyId),
      (snap) => {
        if (snap.exists()) {
          setStudy({ id: snap.id, ...snap.data() });
        } else {
          setStudy(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[useStudy] snapshot error', err);
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [uid, studyId]);

  return { study, loading, error };
}
