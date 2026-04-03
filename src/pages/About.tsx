import { Card, CardContent } from '../components/Card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 pb-12">
      <div className="mb-6 no-print">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">About Visual Steps</h1>
            <p className="mt-2 text-lg text-slate-500 font-medium">Empowering children through visual learning and personalized engagement.</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-none ring-1 ring-slate-200">
        <CardContent className="p-8 md:p-12 space-y-10">
          <div className="prose prose-slate max-w-none space-y-8">
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-blue-900">A Supportive Companion for Growth</h2>
              <p className="text-slate-600 leading-relaxed text-justify">
                Visual Steps is designed as a supportive companion for families navigating the unique journey of childhood development. 
                It is important to understand that this website is not a replacement for professional therapies, licensed therapists, dedicated teachers, or the essential role of parents. 
                Instead, our platform serves as a specialized tool to help parents organize their children's daily activities more effectively. 
                By providing a structured environment, we aim to encourage and motivate kids to learn at their own pace and in their own way. 
                Our mission is to complement existing support systems by offering a digital space where progress and engagement go hand in hand. 
                We believe that with the right organization, every child can find new paths to success and confidence.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-blue-900">Purposeful Engagement Made Simple</h2>
              <p className="text-slate-600 leading-relaxed text-justify">
                Many parents find themselves spending countless hours searching for ways to keep their children purposefully engaged throughout the day. 
                Often, a significant portion of that time is consumed by the tedious task of collecting physical materials and preparing manual activities. 
                Visual Steps was created to alleviate this burden by streamlining the creation and management of educational content. 
                We provide a centralized hub where parents can quickly find or generate meaningful tasks without the usual logistical stress. 
                This efficiency allows families to spend more quality time interacting and less time on administrative preparation. 
                Our goal is to ensure that purposeful engagement is always just a few clicks away for every busy household.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-blue-900">Bridging the Gaps in Daily Life</h2>
              <p className="text-slate-600 leading-relaxed text-justify">
                There are inevitably days when regular routines are disrupted, such as when schools are closed or therapists are unavailable. 
                During these times, parents may find it challenging to be constantly present while also managing other household or work responsibilities. 
                Kids often need something they can engage with independently that is both safe and constructive for their development. 
                Visual Steps fills these gaps by providing a reliable resource that children can access whenever the need arises. 
                Whether it is a weekend, a holiday, or a quiet afternoon at home, our platform ensures that learning never has to stop. 
                We provide the continuity that families need to maintain progress even when external support systems are temporarily out of reach.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-blue-900">A Comprehensive Digital Toolset</h2>
              <p className="text-slate-600 leading-relaxed text-justify">
                Our platform gives parents a wide array of tools to teach and engage their children in diverse and exciting ways. 
                From interactive quizzes and educational worksheets to engaging games and visual social stories, there is something for every learning style. 
                Parents can leverage advanced AI to generate new content instantly or take full control by creating their own custom activities. 
                Every resource can be easily modified to fit a child's specific needs, saved for future use, or printed for offline practice. 
                This flexibility ensures that the educational experience remains fresh, relevant, and perfectly tailored to each individual user. 
                By combining digital innovation with practical utility, we provide a holistic approach to modern home-based learning.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-blue-900">The Power of Visual Learning</h2>
              <p className="text-slate-600 leading-relaxed text-justify">
                Visual Steps is built on the fundamental assumption that many children, particularly those with autism, are significantly more responsive to visual instructions. 
                Verbal directions can often be overwhelming or confusing, leading children to get lost or frustrated during simple transitions. 
                By translating complex tasks into clear, visual steps, we provide a roadmap that is much easier for them to follow and understand. 
                This visual-first approach reduces anxiety and fosters a sense of independence as children learn to navigate their day with clarity. 
                We prioritize high-contrast imagery and simple layouts to ensure that the message is always the primary focus of the experience. 
                Harnessing the power of sight allows us to unlock potential that might otherwise be hindered by traditional communication barriers.
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
