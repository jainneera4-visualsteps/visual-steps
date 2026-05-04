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
              <h2 className="text-2xl font-bold text-black font-['Arial']">Parental Planning Tools</h2>
              <p className="text-black leading-relaxed text-justify font-['Arial']">
                Empower parents with intuitive tools to plan daily activities and manage schedules effectively. 
                Take total control over organizing every detail of your child's day with ease and precision. Our platform provides a comprehensive calendar and task management suite designed specifically for busy families. Parents can quickly map out routines, track commitments, and ensure every day is structured for success. This clarity reduces stress for both parents and children, creating a harmonious environment in the home.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black font-['Arial']">Visual Step-by-Step Learning</h2>
              <p className="text-black leading-relaxed text-justify font-['Arial']">
                Make it easy for kids to follow activities visually with clear links, images, and broken-down tasks. 
                Every activity is divided into the smallest, most manageable steps for absolute clarity. This approach simplifies complex instructions, allowing children to understand what is expected in each phase. By breaking down goals into achievable parts, we foster confidence and reduce frustration during learning. It turns potentially overwhelming tasks into engaging, structured movements, helping kids navigate their day with confidence.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black font-['Arial']">Flexible Scheduling & History</h2>
              <p className="text-black leading-relaxed text-justify font-['Arial']">
                Set up recurring activities that adapt to your routine and can be updated at any moment. 
                Completed tasks move to history, giving parents a clear view of long-term development over time. This dynamic scheduling system understands that routines fluctuate; therefore, it allows for easy adjustments without disrupting progress. Parents can easily review past activities to identify patterns and refine the structure of future days. Seeing this historical data helps families celebrate growth and maintain a record of significant achievements.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black font-['Arial']">Engagement & Progress Tracking</h2>
              <p className="text-black leading-relaxed text-justify font-['Arial']">
                Keep your children motivated through an interactive environment crafted specifically for high engagement levels. 
                Real-time tracking ensures you always have a window into their daily achievements and effort. When kids see their immediate progress, it builds a sense of accomplishment that carries them forward to the next task. Parents get immediate feedback, enabling them to provide timely praise for every step of success. This continuous feedback loop is essential for maintaining momentum and keeping the learning journey vibrant and active.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black font-['Arial']">Positive Behavioral Support & Rewards</h2>
              <p className="text-black leading-relaxed text-justify font-['Arial']">
                Boost development by rewarding positive behaviors while purposefully ignoring negative ones, 
                turning tracked behaviors into earned rewards. Kids can "buy" reward items available there as choices by trading their earned stickers / tokens. This system focuses heavily on encouraging good choices, teaching kids that hard work and perseverance lead to tangible results. By celebrating achievements, we create a positive reinforcement cycle that consistently encourages more desirable interactions. This method shifts the focus away from friction and places it firmly on shared success and enjoyment.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black font-['Arial']">Clarity, Certainty & Motivation</h2>
              <p className="text-black leading-relaxed text-justify font-['Arial']">
                Provide the structure and certainty kids need to feel confident and ready to tackle completely new concepts. 
                Foster a genuine drive for learning through clear-cut goals and consistent, motivating reinforcement. When children know exactly what to anticipate, their anxiety decreases, allowing their minds to open up to new opportunities. Certainty in their daily path is a foundational element that supports their ability to absorb new information efficiently. This environment of clarity naturally leads to increased motivation and a stronger desire to explore the world around them.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black font-['Arial']">AI-Powered Personalization</h2>
              <p className="text-black leading-relaxed text-justify font-['Arial']">
                Instantly generate custom quizzes, social stories, and worksheets using advanced, smart AI technology. 
                Parents can easily edit and customize every single resource to perfectly match their child's specific, personalized needs. Because no two learners are exactly the same, this flexibility allows for learning materials that truly resonate with individual interests. AI takes the heavy lifting out of creating content, ensuring that it is tailored to fit the precise skill level of the child. This ensures every educational tool provided is effective, relevant, and directly supportive of their unique development path.
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
