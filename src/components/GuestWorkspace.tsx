import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { endGuestSession, isGuestSession, onGuestSessionChange } from '../guest/guestSession';

// Guest guidance now lives in the standard Dashboard Quick Start. This small
// workspace indicator only explains temporary persistence and provides Exit.
export function GuestWorkspace() {
  const [active, setActive] = useState(isGuestSession());

  useEffect(() => onGuestSessionChange(() => setActive(isGuestSession())), []);
  if (!active) return null;

  const leave = () => {
    endGuestSession();
    window.location.assign('/');
  };

  return <div className="fixed bottom-4 left-3 z-[90] flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 shadow-lg sm:left-4">
    <Sparkles className="h-4 w-4 text-amber-600" />
    Guest · Changes are temporary
    <button type="button" onClick={leave} className="ml-1 underline underline-offset-2">Exit</button>
  </div>;
}
