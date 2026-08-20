import confetti from 'canvas-confetti';

export const prefersReducedMotion = (): boolean => (
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
);

export const celebrate = (kind: 'small' | 'achievement' = 'small'): void => {
  if (prefersReducedMotion()) return;
  confetti({
    particleCount: kind === 'achievement' ? 150 : 42,
    spread: kind === 'achievement' ? 95 : 55,
    startVelocity: kind === 'achievement' ? 40 : 24,
    origin: { y: 0.62 },
    colors: ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6'],
    disableForReducedMotion: true,
  });
};
