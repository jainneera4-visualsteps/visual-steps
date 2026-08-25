export interface QuizInsightQuestion {
  question?: string;
  type?: string;
  options?: string[];
  correctAnswer?: string;
  correctAnswerIndex?: number;
  correctAnswerIndices?: number[];
}

export interface QuizLearningInsight {
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  strengths: string[];
  reviewNeeds: string[];
  level: 'review' | 'practice' | 'extend';
  recommendation: string;
}

const normalizeText = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase();

export function isQuizResponseCorrect(question: QuizInsightQuestion, response: number[] | number | string | null | undefined): boolean {
  const isWrittenResponse = typeof response === 'string' || question.type === 'fill_in_the_blanks';
  if (isWrittenResponse) {
    const expected = question.correctAnswer ?? question.options?.[0] ?? '';
    return Boolean(normalizeText(response)) && normalizeText(response) === normalizeText(expected);
  }

  const expected = question.correctAnswerIndices?.length
    ? question.correctAnswerIndices
    : Number.isInteger(question.correctAnswerIndex) ? [question.correctAnswerIndex as number] : [];
  const selected = Array.isArray(response) ? response : Number.isInteger(response) ? [response as number] : [];
  return expected.length > 0 && expected.length === selected.length && expected.every(index => selected.includes(index));
}

const questionLabel = (question: QuizInsightQuestion, index: number) => {
  const text = String(question.question || '').replace(/\s+/g, ' ').trim();
  if (!text) return `Question ${index + 1}`;
  return text.length > 105 ? `${text.slice(0, 102).trimEnd()}…` : text;
};

export function buildQuizLearningInsight(
  questions: QuizInsightQuestion[] | null | undefined,
  responses: (number[] | number | string | null | undefined)[] | null | undefined,
  recordedScore?: number,
  recordedTotal?: number,
): QuizLearningInsight | null {
  if (!questions?.length) return null;
  const outcomes = questions.map((question, index) => ({
    label: questionLabel(question, index),
    correct: isQuizResponseCorrect(question, responses?.[index]),
  }));
  const calculatedCorrect = outcomes.filter(item => item.correct).length;
  const totalQuestions = recordedTotal && recordedTotal > 0 ? recordedTotal : questions.length;
  const correctCount = Number.isFinite(recordedScore) ? Math.max(0, Math.min(Number(recordedScore), totalQuestions)) : calculatedCorrect;
  const accuracy = Math.round((correctCount / totalQuestions) * 100);
  const strengths = outcomes.filter(item => item.correct).map(item => item.label);
  const reviewNeeds = outcomes.filter(item => !item.correct).map(item => item.label);

  if (accuracy >= 85) return {
    accuracy, correctCount, totalQuestions, strengths, reviewNeeds, level: 'extend',
    recommendation: 'Review any missed concept briefly, then use the same learning objective with a slightly more demanding example or greater independence.'
  };
  if (accuracy >= 60) return {
    accuracy, correctCount, totalQuestions, strengths, reviewNeeds, level: 'practice',
    recommendation: 'Keep the same level and focus the next short quiz, worksheet, or activity on the questions that need review.'
  };
  return {
    accuracy, correctCount, totalQuestions, strengths, reviewNeeds, level: 'review',
    recommendation: 'Reteach one or two concepts with clearer examples, fewer choices, or a visual activity before assigning another quiz.'
  };
}
