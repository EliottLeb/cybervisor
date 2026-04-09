'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SyncButton({ className }: { className?: string }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (!res.ok) {
        if (res.status === 409) {
          alert('Une synchronisation est déjà en cours.');
        } else {
          alert("Erreur serveur lors de la synchronisation.");
        }
      }
      // Force refresh UI data
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Impossible de joindre le service de synchronisation.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button 
      title="Forcer la collecte immédiate"
      onClick={handleSync}
      disabled={isSyncing}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        isSyncing 
          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' 
          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-sm'
      } ${className || ''}`}
    >
      <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
      <span className="hidden sm:inline">{isSyncing ? 'Synchro en cours...' : 'Synchroniser'}</span>
    </button>
  );
}
