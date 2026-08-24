export interface QuizLearnerProfile {
  name?: string;
  dob?: string;
  grade_level?: string;
  interests?: string;
  strengths?: string;
  weaknesses?: string;
  sensory_issues?: string;
  behavioral_issues?: string;
  therapies?: string;
}

export interface QuizGenerationSettings {
  topic: string;
  learningObjective: string;
  subject: string;
  questionType: string;
  questionCount: number;
  challengeLevel: string;
  learningPurpose: string;
  supportLevel: string;
  readingLevel?: string;
  curriculumAlignment: string;
  customInstructions?: string;
  includeIllustrations: boolean;
  profile: QuizLearnerProfile;
}

export interface QuizQuestionForReview {
  question: string;
  options: string[];
  correctAnswerIndices: number[];
  explanation: string;
}

export interface QuizReviewIssue {
  questionIndex?: number;
  message: string;
}

export const reviewQuizQuestions = (
  questions: QuizQuestionForReview[],
  questionType: string,
  expectedCount: number,
): QuizReviewIssue[] => {
  const issues: QuizReviewIssue[] = [];
  if (questions.length !== clampQuizQuestionCount(expectedCount)) {
    issues.push({ message: `The quiz should contain ${clampQuizQuestionCount(expectedCount)} questions, but it contains ${questions.length}.` });
  }

  const seenQuestions = new Map<string, number>();
  questions.forEach((question, questionIndex) => {
    const label = `Question ${questionIndex + 1}`;
    const normalizedQuestion = question.question.trim().toLowerCase();
    if (!normalizedQuestion) issues.push({ questionIndex, message: `${label} needs question text.` });
    if (!question.explanation.trim()) issues.push({ questionIndex, message: `${label} needs a helpful explanation.` });

    if (normalizedQuestion) {
      const firstIndex = seenQuestions.get(normalizedQuestion);
      if (firstIndex !== undefined) {
        issues.push({ questionIndex, message: `${label} repeats Question ${firstIndex + 1}.` });
      } else {
        seenQuestions.set(normalizedQuestion, questionIndex);
      }
    }

    const options = question.options.map(option => option.trim());
    if (options.some(option => !option)) issues.push({ questionIndex, message: `${label} has an empty answer choice.` });
    const normalizedOptions = options.filter(Boolean).map(option => option.toLowerCase());
    if (new Set(normalizedOptions).size !== normalizedOptions.length) {
      issues.push({ questionIndex, message: `${label} has duplicate answer choices.` });
    }
    const validCorrectAnswers = question.correctAnswerIndices.length > 0
      && question.correctAnswerIndices.every(index => Number.isInteger(index) && index >= 0 && index < options.length);
    if (!validCorrectAnswers) issues.push({ questionIndex, message: `${label} needs at least one valid correct answer.` });

    if (questionType === 'Multiple Choice' && (options.length < 3 || options.length > 5)) {
      issues.push({ questionIndex, message: `${label} must have 3–5 answer choices.` });
    }
    if (questionType === 'True/False') {
      const isTrueFalse = options.length === 2 && options[0].toLowerCase() === 'true' && options[1].toLowerCase() === 'false';
      if (!isTrueFalse) issues.push({ questionIndex, message: `${label} must use the choices True and False.` });
      if (question.correctAnswerIndices.length !== 1) issues.push({ questionIndex, message: `${label} must have one correct answer.` });
    }
    if (questionType === 'Fill in the Blanks') {
      if (!question.question.includes('____')) issues.push({ questionIndex, message: `${label} must include a blank shown as ____.` });
      if (options.length !== 1 || question.correctAnswerIndices.length !== 1 || question.correctAnswerIndices[0] !== 0) {
        issues.push({ questionIndex, message: `${label} must have one correct word or short phrase.` });
      }
    }
  });

  return issues;
};

export const clampQuizQuestionCount = (value: number) => {
  if (!Number.isFinite(value)) return 5;
  return Math.min(20, Math.max(3, Math.round(value)));
};

export const calculateProfileAge = (dob?: string, now = new Date()) => {
  if (!dob) return null;
  const birthDate = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birthDate.getTime()) || birthDate > now) return null;
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDifference = now.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < birthDate.getDate())) age -= 1;
  return age;
};

const profileValue = (value?: string) => value?.trim() || 'Not provided';

export const buildQuizGenerationPrompt = (settings: QuizGenerationSettings) => {
  const questionCount = clampQuizQuestionCount(settings.questionCount);
  const age = calculateProfileAge(settings.profile.dob);
  const effectiveReadingLevel = settings.readingLevel?.trim() || settings.profile.grade_level?.trim() || 'Use profile-appropriate language';
  const standardsInstruction = settings.curriculumAlignment === 'Common Core'
    ? 'Align academic content with relevant Common Core expectations for the selected reading or grade level.'
    : 'Do not assume a school curriculum or Common Core alignment; focus on the stated practical learning goal.';
  const illustrationInstruction = settings.includeIllustrations
    ? 'Provide a visualPrompt when a simple illustration would materially improve comprehension. Never reveal the answer in the illustration.'
    : 'Return an empty visualPrompt for every question because illustrations were not requested.';

  return `Create an accessible ${settings.questionType} quiz for the selected autistic child / adult.

LEARNING PLAN
- Learning goal or topic: ${settings.topic.trim()}
- Measurable learning objective: ${settings.learningObjective.trim()}
- Subject or life area: ${settings.subject}
- Purpose: ${settings.learningPurpose}
- Challenge level: ${settings.challengeLevel}
- Reading/comprehension level: ${effectiveReadingLevel}
- Support level: ${settings.supportLevel}
- Curriculum preference: ${settings.curriculumAlignment}
- Number of questions: exactly ${questionCount}
- Parent/caregiver instructions: ${profileValue(settings.customInstructions)}

LEARNER CONTEXT
- Name: ${profileValue(settings.profile.name)}
- Age: ${age ?? 'Not provided'}
- Recorded grade/learning level: ${profileValue(settings.profile.grade_level)}
- Interests: ${profileValue(settings.profile.interests)}
- Strengths: ${profileValue(settings.profile.strengths)}
- Areas needing support: ${profileValue(settings.profile.weaknesses)}
- Sensory considerations: ${profileValue(settings.profile.sensory_issues)}
- Behavioral/support context: ${profileValue(settings.profile.behavioral_issues)}
- Therapies or support approaches: ${profileValue(settings.profile.therapies)}

QUALITY AND ACCESSIBILITY REQUIREMENTS
- Use respectful, age-appropriate language. Never make an autistic teenager or adult sound like a young child.
- Test the stated learning goal directly. Avoid trivia, trick questions, ambiguity, repeated questions, and culturally narrow assumptions.
- Every question must provide evidence about the measurable learning objective; omit unrelated background trivia.
- Keep instructions concrete and concise. Match vocabulary and sentence length to the selected reading/comprehension level.
- Apply the selected support level consistently: More clues should reduce language load and add clear context; Balanced should offer moderate support; Independent should avoid unnecessary clues.
- Use the learner's interests only where they naturally clarify or motivate the learning goal. Do not force the same interest into every question.
- Give a short, supportive explanation after each answer that teaches the underlying idea without shame or exaggerated praise.
- ${standardsInstruction}
- ${illustrationInstruction}

QUESTION FORMAT REQUIREMENTS
- Every one of the ${questionCount} questions must use ${settings.questionType}; do not mix formats.
- Multiple Choice: provide 3–5 distinct options and one or more valid indices in correctAnswerIndices.
- True/False: provide exactly ["True", "False"] and exactly one correct index.
- Fill in the Blanks: include ____ in the question and exactly one correct word or short phrase in options, with correctAnswerIndices [0].
- Ensure correctAnswerIndices always references existing options and the explanation agrees with the marked answer.

Return exactly ${questionCount} useful, varied questions.`;
};
