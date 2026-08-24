import { useState } from 'react';
import { CheckCircle2, Eye, RefreshCcw, Trophy, X, XCircle } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { normalizeImageSource } from '../utils/imageSource';

export interface LearnerPreviewQuiz {
  title: string;
  description: string;
  learningObjective: string;
  questionType?: string;
  questionScore?: number;
  questions: {
    question: string;
    options: string[];
    correctAnswerIndices: number[];
    explanation: string;
    imageUrl?: string;
  }[];
}

export function LearnerQuizPreview({ quiz, learnerName, onClose }: { quiz: LearnerPreviewQuiz; learnerName?: string; onClose: () => void }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const question = quiz.questions[questionIndex];

  const isCorrect = () => {
    if (quiz.questionType === 'Fill in the Blanks') {
      return typedAnswer.trim().toLowerCase() === (question.options[0] || '').trim().toLowerCase();
    }
    const correct = question.correctAnswerIndices || [];
    return selectedAnswers.length === correct.length
      && selectedAnswers.every(index => correct.includes(index));
  };

  const resetAnswer = () => {
    setSelectedAnswers([]);
    setTypedAnswer('');
    setChecked(false);
  };

  const checkAnswer = () => {
    if (checked || (quiz.questionType === 'Fill in the Blanks' ? !typedAnswer.trim() : selectedAnswers.length === 0)) return;
    if (isCorrect()) setScore(value => value + 1);
    setChecked(true);
  };

  const next = () => {
    if (questionIndex < quiz.questions.length - 1) {
      setQuestionIndex(value => value + 1);
      resetAnswer();
    } else {
      setFinished(true);
    }
  };

  const restart = () => {
    setQuestionIndex(0);
    setScore(0);
    setFinished(false);
    resetAnswer();
  };

  const selectAnswer = (index: number) => {
    if (checked) return;
    const multiple = question.correctAnswerIndices.length > 1;
    setSelectedAnswers(current => multiple
      ? (current.includes(index) ? current.filter(value => value !== index) : [...current, index])
      : [index]);
  };

  return (
    <div className="child-theme fixed inset-0 z-[120] overflow-y-auto bg-slate-950/70 p-2 backdrop-blur-sm sm:p-4">
      <div role="dialog" aria-modal="true" aria-label="Learner quiz preview" className="child-page mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl shadow-2xl sm:min-h-[calc(100vh-2rem)]">
        <header className="child-header sticky top-0 z-10 flex min-h-16 items-center gap-3 px-4 py-3 text-white">
          <Eye className="h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Parent preview · Nothing will be saved</p>
            <h2 className="truncate text-lg font-black">{quiz.title}</h2>
          </div>
          {!finished && <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{questionIndex + 1} / {quiz.questions.length}</span>}
          <button onClick={onClose} aria-label="Close learner preview" className="rounded-full p-2 hover:bg-white/20"><X className="h-5 w-5" /></button>
        </header>

        {finished ? (
          <main className="flex flex-1 items-center justify-center p-5">
            <div className="child-surface w-full max-w-lg rounded-3xl p-8 text-center shadow-xl">
              <Trophy className="mx-auto h-20 w-20 text-amber-400" />
              <p className="mt-4 text-xs font-black uppercase tracking-widest text-violet-600">Learner preview complete</p>
              <h3 className="mt-2 text-3xl font-black text-slate-900">{learnerName ? `${learnerName}'s preview` : 'Quiz preview'}</h3>
              <p className="mt-3 text-lg font-bold text-slate-600">Preview score: {score} of {quiz.questions.length}</p>
              <p className="mt-2 text-sm text-slate-500">This result was not recorded and no rewards were changed.</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <Button variant="outline" onClick={restart}><RefreshCcw className="mr-2 h-4 w-4" />Preview again</Button>
                <Button onClick={onClose}>Return to parent review</Button>
              </div>
            </div>
          </main>
        ) : (
          <main className="grid flex-1 grid-cols-1 md:grid-cols-4">
            <section className="space-y-5 bg-white/90 p-4 md:col-span-3 md:p-8">
              <p className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-900"><span className="font-black">Today’s goal:</span> {quiz.learningObjective}</p>
              <div>
                <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-violet-700">Question</span>
                <h3 className="mt-2 text-xl font-black leading-tight text-slate-900 md:text-2xl">{question.question}</h3>
              </div>
              {question.imageUrl && (
                <div className="flex max-h-[38vh] min-h-48 items-center justify-center rounded-3xl border-2 border-white bg-gradient-to-br from-sky-50 to-violet-50 p-3 shadow-sm">
                  <img src={normalizeImageSource(question.imageUrl)} alt="Learner preview illustration" className="max-h-[34vh] max-w-full object-contain" referrerPolicy="no-referrer" />
                </div>
              )}
              {quiz.questionType === 'Fill in the Blanks' ? (
                <Input aria-label="Preview answer" value={typedAnswer} onChange={event => setTypedAnswer(event.target.value)} disabled={checked} placeholder="Type your answer here..." className="h-12 max-w-xl text-lg font-bold" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.options.map((option, index) => {
                    const selected = selectedAnswers.includes(index);
                    const correct = question.correctAnswerIndices.includes(index);
                    const stateClass = checked
                      ? (correct ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : selected ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-slate-100 bg-white text-slate-400')
                      : (selected ? 'border-violet-500 bg-violet-50 text-violet-950 ring-4 ring-violet-100' : 'border-indigo-100 bg-white text-slate-700 hover:border-sky-300');
                    return <button key={`${option}-${index}`} onClick={() => selectAnswer(index)} disabled={checked} className={`child-answer flex min-h-16 items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left text-lg font-extrabold transition ${stateClass}`}>
                      <span>{option}</span>
                      {checked && correct && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
                      {checked && selected && !correct && <XCircle className="h-5 w-5 shrink-0 text-rose-500" />}
                    </button>;
                  })}
                </div>
              )}
            </section>

            <aside className="border-t border-indigo-100 bg-gradient-to-b from-violet-50 to-sky-50 p-4 md:border-l md:border-t-0 md:p-6">
              {!checked ? (
                <Button onClick={checkAnswer} disabled={quiz.questionType === 'Fill in the Blanks' ? !typedAnswer.trim() : selectedAnswers.length === 0} className="child-primary-action h-12 w-full font-black">Check Answer</Button>
              ) : (
                <Button onClick={next} className="h-12 w-full bg-slate-900 font-black hover:bg-black">{questionIndex < quiz.questions.length - 1 ? 'Next Question' : 'View Results'}</Button>
              )}
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex justify-between text-xs font-black uppercase tracking-wider text-slate-500"><span>Progress</span><span>{Math.round((questionIndex / quiz.questions.length) * 100)}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(questionIndex / quiz.questions.length) * 100}%` }} /></div>
                <p className="mt-4 text-sm font-bold text-slate-600">Preview score <span className="float-right text-xl text-slate-900">{score}</span></p>
              </div>
              {checked && (
                <div aria-live="polite" className={`mt-4 rounded-2xl border-2 p-4 ${isCorrect() ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'}`}>
                  <p className={`font-black ${isCorrect() ? 'text-emerald-700' : 'text-rose-700'}`}>{isCorrect() ? 'Correct!' : 'Let’s learn from this one'}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{question.explanation}</p>
                </div>
              )}
            </aside>
          </main>
        )}
      </div>
    </div>
  );
}
