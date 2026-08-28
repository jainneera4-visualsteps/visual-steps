import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

const slides = [
  { image: '/intro-video/01-busy-day.webp', caption: 'Bring a busy day into one clearer view.', alt: 'A parent organizing schoolwork, exercise items, chores, appointments, and family activities in a busy home' },
  { image: '/intro-video/02-bring-order.webp', caption: 'Turn everyday routines into a calm visual plan.', alt: 'A parent and child arranging a clear visual daily schedule together' },
  { image: '/intro-video/03-parent-planning.webp', caption: 'Add the right support for each meaningful activity.', alt: 'A caregiver and teenager planning a meal activity with a tablet, clock, recipe photograph, ingredients, and three steps' },
  { image: '/intro-video/04-learner-views.webp', caption: 'Focused schedules can support children and adults.', alt: 'A younger autistic learner and an autistic adult independently checking their schedules on different devices' },
  { image: '/intro-video/05-verification.webp', caption: 'Review completed work and recognize genuine effort.', alt: 'A teenager completing a household activity and reviewing the finished work with a parent' },
  { image: '/intro-video/06-learning-resources.webp', caption: 'Shape learning around age, interests, and goals.', alt: 'Younger, teenage, and adult autistic learners using age-appropriate quizzes, worksheets, and a social story' },
  { image: '/intro-video/07-progress.webp', caption: 'Use meaningful progress to decide what comes next.', alt: 'A parent and autistic adult reviewing progress beside meaningful everyday activities' },
  { image: '/intro-video/08-balanced-life.webp', caption: 'Make room for learning, rest, movement, and joy.', alt: 'An autistic adult balancing learning with rest, walking, a creative hobby, and family time' },
  { image: '/intro-video/09-growing-together.webp', caption: 'Plan together while respecting the learner’s voice.', alt: 'An autistic adult, parent, and caregiver calmly planning tomorrow together at home' },
  { image: '/intro-video/10-closing.webp', caption: 'Clearer planning. Clearer next steps.', alt: 'Autistic children and adults walking with family and caregivers along a calm neighborhood path' },
] as const;

export function HomeIllustrationSlideshow() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const slide = slides[slideIndex];

  useEffect(() => {
    if (!playing || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setSlideIndex(current => (current + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [playing]);

  const move = (direction: number) => setSlideIndex(current => (current + direction + slides.length) % slides.length);

  return <figure className="home-illustration-slideshow relative overflow-hidden rounded-3xl border border-white/90 bg-white shadow-lg shadow-slate-300/25" aria-label="How Visual Steps supports everyday life">
    <img key={slide.image} src={slide.image} alt={slide.alt} className="home-illustration-slideshow__image aspect-video h-auto w-full object-contain" width="1600" height="900" fetchPriority={slideIndex === 0 ? 'high' : 'auto'} />
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/45 to-transparent" />
    <figcaption className="home-illustration-slideshow__caption absolute bottom-4 left-4 w-fit text-sm font-extrabold text-white sm:text-base">
      {slide.caption}
    </figcaption>
    <div className="absolute right-3 top-3 flex gap-1.5">
      <button type="button" onClick={() => move(-1)} className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white" aria-label="Show previous illustration"><ChevronLeft className="h-4 w-4" /></button>
      <button type="button" onClick={() => setPlaying(value => !value)} className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white" aria-label={playing ? 'Pause illustration slideshow' : 'Play illustration slideshow'}>{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</button>
      <button type="button" onClick={() => move(1)} className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white" aria-label="Show next illustration"><ChevronRight className="h-4 w-4" /></button>
    </div>
    <div className="absolute bottom-4 right-3 flex gap-1" aria-label={`Illustration ${slideIndex + 1} of ${slides.length}`}>
      {slides.map((item, index) => <button key={item.image} type="button" onClick={() => setSlideIndex(index)} className={`h-2 rounded-full shadow-sm transition-all ${index === slideIndex ? 'w-5 bg-white' : 'w-2 bg-white/55 hover:bg-white/80'}`} aria-label={`Show illustration ${index + 1}`} aria-current={index === slideIndex ? 'true' : undefined} />)}
    </div>
  </figure>;
}
