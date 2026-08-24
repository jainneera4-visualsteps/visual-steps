import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startGuestSession } from '../guest/guestSession';

export default function GuestDemo() {
  const navigate = useNavigate();
  useEffect(() => { startGuestSession(); navigate('/dashboard', { replace: true }); }, [navigate]);
  return null;
}
