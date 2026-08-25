import { ArrowUpRight, BookOpenCheck, CheckCircle2, Focus } from 'lucide-react';
import { buildQuizLearningInsight } from '../utils/quizInsights';

interface QuizLearningInsightsProps {
  result: {
    questions?: any[];
    responses?: (number[] | number | string | null)[];
    score?: number;
    total_questions?: number;
  };
  learnerName?: string;
}

export function QuizLearningInsights({ result, learnerName = 'The learner' }: QuizLearningInsightsProps) {
  const insight = buildQuizLearningInsight(result.questions, result.responses, result.score, result.total_questions);
  if (!insight) return null;

  const nextStep = insight.level === 'extend' ? 'Increase challenge carefully' : insight.level === 'practice' ? 'Practice at the same level' : 'Review with more support';
  const tone = insight.level === 'extend' ? 'border-emerald-200 bg-emerald-50' : insight.level === 'practice' ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50';

  return <section className={`rounded-2xl border p-5 ${tone}`} aria-labelledby="quiz-learning-insights-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">Planning support</p>
        <h2 id="quiz-learning-insights-title" className="mt-1 text-xl font-black text-slate-950">Learning insights and next step</h2>
      </div>
      <span className="rounded-full bg-white px-3 py-1.5 text-sm font-black text-slate-800 shadow-sm">{insight.accuracy}% accuracy</span>
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-white/80 bg-white/75 p-4">
        <h3 className="flex items-center gap-2 font-black text-emerald-800"><CheckCircle2 className="h-5 w-5" />Demonstrated understanding</h3>
        {insight.strengths.length ? <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">{insight.strengths.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}</ul> : <p className="mt-3 text-sm leading-6 text-slate-600">No question was answered correctly yet. Begin with one familiar example and recognize effort while rebuilding understanding.</p>}
      </div>
      <div className="rounded-xl border border-white/80 bg-white/75 p-4">
        <h3 className="flex items-center gap-2 font-black text-amber-800"><Focus className="h-5 w-5" />Concepts to review</h3>
        {insight.reviewNeeds.length ? <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">{insight.reviewNeeds.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}</ul> : <p className="mt-3 text-sm leading-6 text-slate-600">No missed questions in this attempt. Use a new example to check whether the skill transfers beyond the original questions.</p>}
      </div>
    </div>

    <div className="mt-4 rounded-xl border border-white/80 bg-white/85 p-4">
      <h3 className="flex items-center gap-2 font-black text-slate-900"><BookOpenCheck className="h-5 w-5 text-brand-700" />Recommended next step: {nextStep}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-700">{learnerName} answered {insight.correctCount} of {insight.totalQuestions} questions correctly. {insight.recommendation}</p>
      <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-500"><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0" />This is a planning suggestion based only on this quiz attempt. Consider attention, communication, access needs, and what you observed before choosing the next activity.</p>
    </div>
  </section>;
}
