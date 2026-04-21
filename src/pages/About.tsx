import { Card, CardContent } from '../components/Card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 pb-12 w-full">
      <div className="mb-6 no-print">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">About Visual Steps</h1>
            <p className="mt-2 text-lg text-slate-500 font-medium">Empowering parents and children with autism through meaningful daily engagement and motivation.</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-none ring-1 ring-slate-200">
        <CardContent className="p-8 md:p-12 space-y-10">
          <div className="prose prose-slate max-w-none space-y-8">
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-blue-900">A Supportive Companion for Growth</h2>
              <p className="text-slate-600 leading-relaxed text-justify">
                Visual Steps is born from a deep understanding of the unique journey families navigate during childhood development, particularly for those with autism. 
                Our platform is dedicated to being a supportive companion, offering a structured digital environment where children can thrive. 
                Every effort is made to help parents and children bridge the gap between clinical support and daily home life. 
                By providing a clear roadmap for learning, we aim to empower every child to discover their potential at their own pace.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-blue-900">Purposeful Engagement Made Simple</h2>
              <p className="text-slate-600 leading-relaxed text-justify">
                We know that parents spend countless hours searching for meaningful ways to keep their children engaged throughout the entire day. 
                Visual Steps alleviates the burden of manual preparation by streamlining the creation and management of educational content. 
                Our centralized hub allows you to quickly generate personalized tasks, from customizable quizzes to visual stories, ensuring your child stays productive and motivated. 
                This efficiency means less time on administration and more quality time spent interacting and celebrating milestones together.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-blue-900">The Power of Visual Learning</h2>
              <p className="text-slate-600 leading-relaxed text-justify">
                At the heart of Visual Steps is the belief that visual communication is a powerful key to unlocking understanding. 
                For many children, verbal directions can be overwhelming; by translating complex tasks into clear, visual steps, we reduce anxiety and foster independence. 
                Our visual-first approach provides a predictable and safe environment where children can navigate their day with clarity and confidence. 
                We prioritize high-contrast imagery and intuitive layouts to ensure that every interaction is constructive and accessible.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-blue-900">A Comprehensive Digital Toolset</h2>
              <p className="text-slate-600 leading-relaxed text-justify">
                Our platform offers a diverse array of tools tailored to various learning styles, focusing on making learning fun and motivating. 
                Whether it's interactive quizzes, educational worksheets, or personalized social stories, Visual Steps provides a holistic approach to home-based learning. 
                Parents have the flexibility to create and manage customizable content that fits their child's unique needs while keeping them excited about their progress. 
                With direct messaging, progress reports, and location-based rewards, every resource is designed to be fresh, relevant, and perfectly tailored to each child's specific journey.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-blue-900">Our Commitment to Privacy and Safety</h2>
              <p className="text-slate-600 leading-relaxed text-justify">
                We believe that a safe learning environment is non-negotiable. 
                Visual Steps is built with industry-standard security to ensure that your family's data and privacy are always protected. 
                We provide a secure digital space where children can explore and learn without external distractions or risks. 
                Your trust is our most valuable asset, and we are committed to maintaining the highest standards of safety as we grow together.
              </p>
            </section>
          </div>

          <footer className="pt-8 border-t border-slate-100 text-center">
            <button 
              onClick={() => navigate('/')} 
              className="inline-flex items-center justify-center rounded-lg font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 h-12 px-8 text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              Get Started Today
            </button>
          </footer>
        </CardContent>
      </Card>
    </div>
  );
}
