import { apiFetch } from '../utils/api';
import { generateContent, generateImage, modelNames, type ImageGenerationAllowance } from '../lib/gemini';
import { normalizeImageSource } from '../utils/imageSource';
import { isAuthError } from '../utils/auth';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { ArrowLeft, Sparkles, Loader2, Gamepad2, Save, CheckCircle2, HelpCircle, ImageIcon, Pencil, ShieldCheck, AlertTriangle, Eye } from 'lucide-react';
import { Tooltip } from '../components/ui/Tooltip';
import { buildQuizGenerationPrompt, clampQuizQuestionCount, reviewQuizQuestions, type QuizLearnerProfile } from '../utils/quizGeneration';
import { LearnerQuizPreview } from '../components/LearnerQuizPreview';
import { LearningMaterialAllowance, formatAllowanceReset, useLearningMaterialAllowance } from '../components/LearningMaterialAllowance';

interface QuizContent {
  title: string;
  description: string;
  learningObjective: string;
  questionType?: string;
  questionScore?: number;
  generationSettings?: {
    learningPurpose: string;
    supportLevel: string;
    readingLevel: string;
    curriculumAlignment: string;
    includeIllustrations: boolean;
  };
  questions: {
    question: string;
    options: string[];
    correctAnswerIndices: number[];
    explanation: string;
    imageUrl?: string;
  }[];
}

export default function QuizGenerator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [topic, setTopic] = useState('');
  const [learningObjective, setLearningObjective] = useState('');
  const [challengeLevel, setChallengeLevel] = useState('Moderate');
  const [subject, setSubject] = useState('General Knowledge');
  const [learningPurpose, setLearningPurpose] = useState('Practice');
  const [supportLevel, setSupportLevel] = useState('Balanced');
  const [readingLevel, setReadingLevel] = useState('');
  const [curriculumAlignment, setCurriculumAlignment] = useState('No formal standard');
  const [customInstructions, setCustomInstructions] = useState('');
  const [questionType, setQuestionType] = useState('Multiple Choice');
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionScore, setQuestionScore] = useState(1);
  const [includeIllustrations, setIncludeIllustrations] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState<Record<number, boolean>>({});
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quiz, setQuiz] = useState<QuizContent | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isLearnerPreviewOpen, setIsLearnerPreviewOpen] = useState(false);
  const [kids, setKids] = useState<{ id: string; name: string }[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string>('');
  const [kidProfile, setKidProfile] = useState<QuizLearnerProfile | null>(null);
  const [isKidProfileLoading, setIsKidProfileLoading] = useState(false);
  const [kidProfileError, setKidProfileError] = useState('');
  const [imageAllowance, setImageAllowance] = useState<ImageGenerationAllowance | null>(null);
  const { allowance: learningAllowance, setAllowance: setLearningAllowance, loading: isLearningAllowanceLoading } = useLearningMaterialAllowance();

  const refreshImageAllowance = async () => {
    try {
      const response = await apiFetch('/api/image-generation/usage');
      if (response.ok) {
        const data = await response.json();
        if (data.allowance) setImageAllowance(data.allowance);
      }
    } catch {
      // Quiz generation remains available when the informational counter cannot load.
    }
  };

  useEffect(() => {
    const fetchKids = async () => {
      try {
        const res = await apiFetch('/api/kids');
        if (res.ok) {
          const data = await res.json();
          const kidList = data.kids || [];
          setKids(kidList);
        }
      } catch (err) {
        console.error('Failed to fetch kids:', err);
      }
    };
    fetchKids();
    refreshImageAllowance();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const kidParam = params.get('student_id');
    const subjectParam = params.get('subject');
    const topicParam = params.get('topic');
    const difficultyParam = params.get('difficulty');
    const questionsParam = params.get('questions');

    if (kidParam) setSelectedKidId(kidParam);
    if (subjectParam) setSubject(subjectParam);
    if (topicParam) setTopic(topicParam);
    if (difficultyParam) {
      const challengeAliases: Record<string, string> = { 'very easy': 'Foundation', easy: 'Developing', medium: 'Moderate', hard: 'Advanced' };
      setChallengeLevel(challengeAliases[difficultyParam.toLowerCase()] || difficultyParam);
    }
    if (questionsParam) {
      const num = parseInt(questionsParam, 10);
      if (!isNaN(num)) setNumQuestions(num);
    }
  }, [location.search]);

  useEffect(() => {
    if (selectedKidId) {
      const fetchKidProfile = async () => {
        setKidProfile(null);
        setKidProfileError('');
        setIsKidProfileLoading(true);
        try {
          const res = await apiFetch(`/api/kids/${encodeURIComponent(selectedKidId)}`);
          if (res.ok) {
            const data = await res.json();
            setKidProfile(data.kid);
          } else {
            setKidProfileError('The selected profile could not be loaded. Please select it again.');
          }
        } catch (err) {
          console.error('Failed to fetch kid profile:', err);
          setKidProfileError('The selected profile could not be loaded. Check your connection and try again.');
        } finally {
          setIsKidProfileLoading(false);
        }
      };
      fetchKidProfile();
    } else {
      setKidProfile(null);
      setKidProfileError('');
      setIsKidProfileLoading(false);
    }
  }, [selectedKidId]);

  const handleGenerate = async () => {
    if (learningAllowance?.remaining === 0) {
      alert(`Today’s AI learning-material allowance has been used. You can create another quiz, worksheet, or social story ${formatAllowanceReset(learningAllowance.resetsAt)}.`);
      return;
    }
    if (!selectedKidId) {
      alert('Please select the child / adult profile this quiz is for.');
      return;
    }
    if (isKidProfileLoading) {
      alert('The selected profile is still loading. Please wait a moment and try again.');
      return;
    }
    if (!kidProfile) {
      alert(kidProfileError || 'The selected profile could not be loaded. Please select it again.');
      return;
    }
    if (!topic.trim()) {
      alert('Please enter the learning goal or topic.');
      return;
    }
    if (!learningObjective.trim()) {
      alert('Please enter what the learner should be able to demonstrate after the quiz.');
      return;
    }

    const safeQuestionCount = clampQuizQuestionCount(numQuestions);
    if (safeQuestionCount !== numQuestions) setNumQuestions(safeQuestionCount);
    if (includeIllustrations) {
      if (imageAllowance && imageAllowance.remaining < safeQuestionCount) {
        alert(`This quiz requests ${safeQuestionCount} illustrations, but only ${imageAllowance.remaining} remain today. Turn off automatic illustrations, generate the quiz, and add selected illustrations individually.`);
        return;
      }
      const confirmed = window.confirm(`Generate up to ${safeQuestionCount} illustrations? This will use ${safeQuestionCount} of your ${imageAllowance?.remaining ?? 10} remaining daily illustrations. The quiz can also be created without illustrations.`);
      if (!confirmed) return;
    }

    setIsGenerating(true);
    setQuiz(null);

    const withRetry = async <T,>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
      try {
        return await fn();
      } catch (error: any) {
        const errString = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
        if (error?.allowance || errString.toLowerCase().includes('learning-material allowance')) throw error;
        if (errString.toLowerCase().includes('quota') || errString.toLowerCase().includes('billing')) {
          throw new Error('The creation service is temporarily unavailable or today’s allowance has been reached. Please try again later.');
        }
        if (retries > 0) {
          console.warn(`Retrying after error: ${errString}. Retries left: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return withRetry(fn, retries - 1, delay * 1.5);
        }
        throw error;
      }
    };

    try {
      const response = await withRetry(async () => {
        return await generateContent({
          model: modelNames.flash,
          generationPurpose: 'quiz',
          onAllowance: setLearningAllowance,
          prompt: buildQuizGenerationPrompt({
            topic,
            learningObjective,
            subject,
            questionType,
            questionCount: safeQuestionCount,
            challengeLevel,
            learningPurpose,
            supportLevel,
            readingLevel,
            curriculumAlignment,
            customInstructions,
            includeIllustrations,
            profile: kidProfile,
          }),
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: "The title of the quiz" },
              description: { type: "STRING", description: "A short description of the quiz" },
              questions: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    question: { type: "STRING", description: "The question text" },
                    options: { 
                      type: "ARRAY", 
                      items: { type: "STRING" },
                      description: "For Multiple Choice: 3-5 options. For True/False: ['True', 'False']. For Fill in the Blanks: 1 option (the correct answer)."
                    },
                    correctAnswerIndices: { 
                      type: "ARRAY", 
                      items: { type: "INTEGER" }, 
                      description: "The indices of the correct options (0-based). For Multiple Choice, can have one or more indices. For True/False/Fill in the Blanks, will have exactly one index." 
                    },
                    explanation: { type: "STRING", description: "A brief explanation of why the answer is correct" },
                    visualPrompt: { type: "STRING", description: "A description for an illustration related to this question (in English)" }
                  },
                  required: ["question", "options", "correctAnswerIndices", "explanation", "visualPrompt"]
                }
              }
            },
            required: ["title", "description", "questions"]
          }
        });
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from AI model');
      }

      let cleanedJson = responseText.trim();
      if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }

      const data = JSON.parse(cleanedJson);
      data.questionScore = questionScore;
      data.questionType = questionType;
      data.learningObjective = learningObjective.trim();
      data.generationSettings = { learningPurpose, supportLevel, readingLevel, curriculumAlignment, includeIllustrations };
      setQuiz(data);

      if (includeIllustrations) {
        void generateAllImagesWithData(data);
      }
    } catch (error: any) {
      console.error('Failed to generate quiz:', error);
      if (error?.allowance) setLearningAllowance(error.allowance);
      if (isAuthError(error)) return; // Auth utility handles this
      
      const errorMessage = error.message || "Unknown error";
      if (errorMessage.includes("today’s allowance has been reached")) {
        alert(errorMessage);
      } else if (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE") || errorMessage.includes("high demand")) {
        alert("The AI service is currently experiencing high demand. Please wait a moment and try again.");
      } else if (errorMessage.includes("500") || errorMessage.includes("Rpc failed")) {
        alert("The AI service is currently busy or experiencing a temporary issue. Please wait a moment and try again.");
      } else {
        alert(`Failed to generate quiz: ${errorMessage}${/[.!?]$/.test(errorMessage) ? '' : '.'} Please try again.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAllImagesWithData = async (quizData: QuizContent) => {
    setIsGeneratingAllImages(true);
    try {
      const updatedQuestions = [...quizData.questions];
      for (let i = 0; i < updatedQuestions.length; i++) {
        const question = updatedQuestions[i];
        const visualPrompt = (question as any).visualPrompt || question.question;

        const illustratorPrompt = `Create an accessible, age-respectful illustration for an autistic child / adult at ${readingLevel || kidProfile?.grade_level || 'their recorded learning level'}. Show only this question context: "${visualPrompt}". Relevant interests: ${kidProfile?.interests || 'not provided'}. Do not show the solution, correct answer, hint, or explanation. Use a simple high-contrast composition, minimal visual clutter, thick clean lines, and large readable labels only when essential.`;
        
        if (question.imageUrl) continue;
        const imageUrl = await generateImage(illustratorPrompt, setImageAllowance);
        if (imageUrl) {
          updatedQuestions[i] = { ...updatedQuestions[i], imageUrl };
        }
      }
      setQuiz({ ...quizData, questions: updatedQuestions });
    } catch (error) {
      console.error('Failed to generate quiz illustrations', error);
      alert(error instanceof Error ? error.message : 'The remaining illustrations could not be generated. Your quiz is still available for review.');
      await refreshImageAllowance();
    } finally {
      setIsGeneratingAllImages(false);
    }
  };

  const generateQuestionImage = async (index: number) => {
    if (!quiz || !quiz.questions[index]) return;
    const question = quiz.questions[index];
    const visualPrompt = (question as any).visualPrompt || question.question;

    setIsGeneratingImages((prev) => ({ ...prev, [index]: true }));
    try {
      // Act as a technical diagrammer. 
      // Illustration must ONLY depict the specific scenario, elements, or objects mentioned in the question text.
      // ABSOLUTELY DO NOT show any solutions, correct answers, hints that reveal the final answer, or explanations.
      // Use VERY LARGE, BOLD, READABLE labels if essential.
      // HIGH-CONTRAST BLACK AND WHITE LINE ART ONLY. 
      // No shading, no gray, no colors, thick clean lines on a pure white background.
      // Illustration should be a helpful clue, not the answer.
      const illustratorPrompt = `Create an accessible, age-respectful illustration for an autistic child / adult. Show only this question context: "${visualPrompt}". Do not show the solution, correct answer, hint, or explanation. Use a simple high-contrast composition, minimal visual clutter, thick clean lines, and large readable labels only when essential.`;
      
      const imageUrl = await generateImage(illustratorPrompt, setImageAllowance);
      if (imageUrl) {
        const updatedQuestions = [...quiz.questions];
        updatedQuestions[index] = { ...updatedQuestions[index], imageUrl };
        setQuiz({ ...quiz, questions: updatedQuestions });
      }
    } catch (error) {
      console.error('Failed to generate image', error);
      alert(error instanceof Error ? error.message : 'The illustration could not be generated.');
      refreshImageAllowance();
    } finally {
      setIsGeneratingImages((prev) => ({ ...prev, [index]: false }));
    }
  };

  const generateAllImages = async () => {
    if (!quiz) return;
    const missingCount = quiz.questions.filter(question => !question.imageUrl).length;
    if (missingCount === 0) return;
    if (imageAllowance && imageAllowance.remaining < missingCount) {
      alert(`Only ${imageAllowance.remaining} illustrations remain today. Add illustrations individually to the questions where they will help most.`);
      return;
    }
    if (!window.confirm(`Generate ${missingCount} illustrations? This will use ${missingCount} of your ${imageAllowance?.remaining ?? 10} remaining daily illustrations.`)) return;
    await generateAllImagesWithData(quiz);
  };

  const handleSave = async () => {
    if (!quiz) return;
    const reviewIssues = reviewQuizQuestions(quiz.questions, quiz.questionType || questionType, numQuestions);
    if (reviewIssues.length > 0) {
      setIsReviewing(true);
      alert('Please review the highlighted quiz issues before saving.');
      return;
    }
    setIsSaving(true);
    
    try {
      const res = await apiFetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kidId: selectedKidId,
          title: quiz.title,
          learningObjective: quiz.learningObjective,
          topic,
          subject,
          difficulty: challengeLevel,
          gradeLevel: readingLevel || kidProfile?.grade_level || null,
          noOfQuestions: clampQuizQuestionCount(numQuestions),
          questionType,
          questionScore,
          content: quiz
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Server error saving quiz:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to save quiz');
      }
      
      alert('Quiz saved successfully!');
      navigate('/saved-quizzes');
    } catch (err: any) {
      console.error('Save error:', err);
      alert(`Failed to save quiz: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateQuizQuestion = (questionIndex: number, patch: Partial<QuizContent['questions'][number]>) => {
    if (!quiz) return;
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((question, index) => index === questionIndex ? { ...question, ...patch } : question),
    });
  };

  const updateQuizOption = (questionIndex: number, optionIndex: number, value: string) => {
    if (!quiz) return;
    const options = [...quiz.questions[questionIndex].options];
    options[optionIndex] = value;
    updateQuizQuestion(questionIndex, { options });
  };

  const chooseCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    if (!quiz) return;
    const current = quiz.questions[questionIndex].correctAnswerIndices || [];
    const next = questionType === 'Multiple Choice'
      ? (current.includes(optionIndex) ? current.filter(index => index !== optionIndex) : [...current, optionIndex])
      : [optionIndex];
    updateQuizQuestion(questionIndex, { correctAnswerIndices: next });
  };

  const challengeLevels = ['Foundation', 'Developing', 'Moderate', 'Advanced'];
  const subjects = ['General Knowledge', 'Math', 'Science', 'Reading', 'History', 'Geography', 'Art', 'Music', 'Life Skills', 'Social Communication', 'Daily Living', 'Workplace Skills'];
  const questionTypes = ['Multiple Choice', 'True/False', 'Fill in the Blanks'];
  const learningPurposes = ['Learn', 'Practice', 'Review', 'Check understanding'];
  const supportLevels = ['More clues', 'Balanced', 'Independent'];
  const selectClassName = 'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="space-y-4 w-full">
      <div className="mb-6">
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">Quiz Generator</h1>
            <p className="text-lg font-normal text-slate-500 mt-3">Create a personalized, age-respectful learning check</p>
          </div>
          <Link to="/saved-quizzes">
            <Button variant="outline" size="xs" className="h-7 text-[12px]">
              <Gamepad2 className="mr-1 h-3 w-3" />
              Saved Quizzes
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-none ring-1 ring-slate-200 shadow-sm">
        <CardContent className="p-5 space-y-5">
          <LearningMaterialAllowance allowance={learningAllowance} loading={isLearningAllowanceLoading} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label htmlFor="quiz-profile" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Child / adult profile *</label>
                <Tooltip content="Required. The profile supplies age, learning level, interests, strengths, and support context." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <select 
                id="quiz-profile"
                name="kidId"
                className={selectClassName}
                value={selectedKidId}
                onChange={(e) => setSelectedKidId(e.target.value)}
              >
                <option value="">Select a profile</option>
                {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                <Tooltip content="Choose an academic subject, daily living area, communication goal, or workplace skill." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <select 
                className={selectClassName}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label htmlFor="quiz-topic" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Learning goal or topic *</label>
                <Tooltip content="Be specific about what the quiz should teach or check, such as 'addition within 20' or 'reading a bus timetable'." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <Input 
                id="quiz-topic"
                placeholder="e.g., Reading a bus timetable"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5 text-left md:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-1">
                <label htmlFor="quiz-objective" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Learning objective *</label>
                <Tooltip content="Describe what the child / adult should be able to demonstrate after the quiz. Keep it observable and specific." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <Input id="quiz-objective" value={learningObjective} onChange={(event) => setLearningObjective(event.target.value)} placeholder="e.g., Identify at least four common workplace safety signs" maxLength={240} className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Learning purpose</label>
                <Tooltip content="Choose whether this quiz introduces, practices, reviews, or checks understanding of the topic." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <select className={selectClassName} value={learningPurpose} onChange={(e) => setLearningPurpose(e.target.value)}>
                {learningPurposes.map(purpose => <option key={purpose} value={purpose}>{purpose}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Question Type</label>
                <Tooltip content="Pick the format for the questions (e.g., Multiple Choice)." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <select 
                className={selectClassName}
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
              >
                {questionTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Challenge level</label>
                <Tooltip content="Choose the thinking challenge independently from the person's reading level." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <select className={selectClassName} value={challengeLevel} onChange={(e) => setChallengeLevel(e.target.value)}>
                {challengeLevels.map(level => <option key={level} value={level}>{level}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">No. of questions</label>
                <Tooltip content="Choose 3–20 questions to keep the quiz focused and manageable." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <Input type="number" min={3} max={20} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} onBlur={() => setNumQuestions(clampQuizQuestionCount(numQuestions))} className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Score / Question</label>
                <Tooltip content="Set how many points each correct answer is worth toward their progress." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <Input 
                type="number"
                min={1}
                max={100}
                value={questionScore}
                onChange={(e) => setQuestionScore(Number(e.target.value))}
                className="h-10 text-sm"
              />
            </div>
          </div>

          {kidProfile && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700">
              <p className="font-bold text-slate-800">Personalizing for {kidProfile.name}</p>
              <p className="mt-1">Using recorded level: {kidProfile.grade_level || 'not provided'} · Interests: {kidProfile.interests || 'not provided'} · Strengths: {kidProfile.strengths || 'not provided'}</p>
            </div>
          )}

          <details className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <summary className="cursor-pointer font-bold text-slate-700">Optional learning and accessibility settings</summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Support level</label>
                <select className={selectClassName} value={supportLevel} onChange={(e) => setSupportLevel(e.target.value)}>
                  {supportLevels.map(level => <option key={level} value={level}>{level}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reading level override</label>
                <Input value={readingLevel} onChange={(e) => setReadingLevel(e.target.value)} placeholder={kidProfile?.grade_level || 'Use profile level'} className="h-10 text-sm" />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Curriculum alignment</label>
                <select className={selectClassName} value={curriculumAlignment} onChange={(e) => setCurriculumAlignment(e.target.value)}>
                  <option value="No formal standard">No formal standard</option>
                  <option value="Common Core">Common Core</option>
                </select>
              </div>
              <div className="space-y-1.5 text-left md:col-span-2 lg:col-span-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Instructions for this quiz</label>
                <Textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder="Optional: Use familiar cooking examples; avoid figurative language; focus on safety signs..." className="min-h-20 text-sm" maxLength={500} />
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 md:col-span-2 lg:col-span-3">
                <input type="checkbox" checked={includeIllustrations} onChange={(e) => setIncludeIllustrations(e.target.checked)} className="mt-1 h-4 w-4 accent-blue-600" />
                <span><span className="block font-bold text-slate-700">Generate helpful illustrations</span><span className="text-xs text-slate-500">Optional. This creates an image only when it can improve understanding and may take additional time.</span></span>
              </label>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900 md:col-span-2 lg:col-span-3">
                <p className="font-bold">Daily illustration allowance: {imageAllowance ? `${imageAllowance.remaining} of ${imageAllowance.dailyLimit} remaining` : 'loading…'}</p>
                <p className="mt-1 text-xs text-violet-700">Each generated illustration uses one allowance. Previewing, reviewing, and reusing an existing illustration use none.</p>
              </div>
            </div>
          </details>

          <div className="flex flex-col items-end gap-2">
            <Button 
              size="sm"
              className="px-6 h-10 font-bold"
              onClick={handleGenerate}
              disabled={isGenerating || learningAllowance?.remaining === 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Quiz
                </>
              )}
            </Button>
            {!selectedKidId && <p className="text-xs text-amber-700">Select a child / adult profile before generating the quiz.</p>}
            {selectedKidId && isKidProfileLoading && <p className="text-xs text-blue-700">Loading the selected profile…</p>}
            {kidProfileError && <p className="text-xs text-red-700">{kidProfileError}</p>}
          </div>
        </CardContent>
      </Card>

      {quiz && quiz.questions && (
        <div className="space-y-4">
          {(() => {
            const issues = reviewQuizQuestions(quiz.questions, quiz.questionType || questionType, numQuestions);
            return (
              <div className={`rounded-xl border px-4 py-3 ${issues.length ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
                <div className="flex items-center gap-2 font-bold">
                  {issues.length ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  {issues.length ? `${issues.length} review ${issues.length === 1 ? 'item' : 'items'} to fix before saving` : 'Quiz quality check passed'}
                </div>
                {issues.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {issues.map((issue, index) => <li key={`${issue.message}-${index}`}>{issue.message}</li>)}
                  </ul>
                )}
              </div>
            );
          })()}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLearnerPreviewOpen(true)}
              className="h-8 text-[12px] font-bold border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Preview as Learner
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReviewing(value => !value)}
              className="h-8 text-[12px] font-bold"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {isReviewing ? 'Finish Review' : 'Review & Edit'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateAllImages}
              disabled={isGeneratingAllImages}
              className="h-8 text-[12px] font-bold border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              {isGeneratingAllImages ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="mr-1.5 h-3.5 w-3.5" />}
              Generate All Icons
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSave}
              disabled={isSaving || reviewQuizQuestions(quiz.questions, quiz.questionType || questionType, numQuestions).length > 0}
              className="h-8 text-[12px]"
            >
              {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save Quiz
            </Button>
          </div>

          <Card className="border-none ring-1 ring-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {isReviewing ? <Input aria-label="Quiz title" value={quiz.title} onChange={(event) => setQuiz({ ...quiz, title: event.target.value })} className="h-9 max-w-xl font-bold" /> : quiz.title}
                    {kidProfile?.grade_level && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                        {kidProfile.grade_level}
                      </span>
                    )}
                  </CardTitle>
                  {isReviewing ? <Textarea aria-label="Quiz description" value={quiz.description} onChange={(event) => setQuiz({ ...quiz, description: event.target.value })} className="mt-2 min-h-16 max-w-2xl text-sm" /> : <p className="text-sm text-slate-500 mt-1">{quiz.description}</p>}
                  <p className="mt-2 max-w-2xl rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-900"><span className="font-black">Learning objective:</span> {quiz.learningObjective}</p>
                </div>
                <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                  {quiz.questions.length} Qs • {quiz.questionScore} pts/Q
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {(quiz.questions || []).map((q, idx) => (
                <div key={idx} className="space-y-4 border-b border-slate-100 last:border-0 pb-8 last:pb-0">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Container */}
                    {q.imageUrl && (
                      <div className="lg:w-1/3 flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 shadow-inner">
                        <img 
                          src={normalizeImageSource(q.imageUrl)}
                          alt="Question illustration"
                          className="max-h-72 w-full object-contain p-2"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                        {isReviewing ? (
                          <div className="flex-1 space-y-1">
                            <label className="text-xs font-bold text-slate-500">Question {idx + 1}</label>
                            <Textarea aria-label={`Question ${idx + 1} text`} value={q.question} onChange={(event) => updateQuizQuestion(idx, { question: event.target.value })} className="min-h-20 font-semibold" />
                          </div>
                        ) : <h3 className="font-bold text-slate-800 text-lg">{idx + 1}. {q.question}</h3>}
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold"
                          onClick={() => generateQuestionImage(idx)}
                          disabled={isGeneratingImages[idx]}
                        >
                          {isGeneratingImages[idx] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                          AI Art
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        {isReviewing ? (
                          (q.options || []).map((opt, optIdx) => (
                            <label key={optIdx} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                              <input
                                aria-label={`Question ${idx + 1} correct answer ${optIdx + 1}`}
                                type={questionType === 'Multiple Choice' ? 'checkbox' : 'radio'}
                                name={`correct-answer-${idx}`}
                                checked={(q.correctAnswerIndices || []).includes(optIdx)}
                                onChange={() => chooseCorrectAnswer(idx, optIdx)}
                                className="h-4 w-4 accent-emerald-600"
                              />
                              <Input aria-label={`Question ${idx + 1} option ${optIdx + 1}`} value={opt} onChange={(event) => updateQuizOption(idx, optIdx, event.target.value)} className="h-9" />
                            </label>
                          ))
                        ) : quiz.questionType === 'Fill in the Blanks' ? (
                          <div className="p-3 rounded-lg border border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm flex items-center gap-3">
                            <div className="h-5 w-5 rounded-full border border-emerald-500 bg-emerald-500 flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="font-bold">Correct Answer: {(q.options || [])[0]}</span>
                          </div>
                        ) : (
                          (q.options || []).map((opt, optIdx) => {
                            const isCorrect = (q.correctAnswerIndices || []).includes(optIdx);
                            return (
                              <div 
                                key={optIdx} 
                                className={`p-3 rounded-lg border flex items-center gap-3 transition-colors ${isCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700'}`}
                              >
                                <div className={`h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-slate-50'}`}>
                                  {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                </div>
                                <span className={isCorrect ? 'font-bold' : ''}>{opt}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                      {isReviewing ? (
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">Helpful explanation</label>
                          <Textarea aria-label={`Question ${idx + 1} explanation`} value={q.explanation} onChange={(event) => updateQuizQuestion(idx, { explanation: event.target.value })} className="min-h-20" />
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600">
                          <span className="font-bold text-slate-700">Explanation:</span> {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {!quiz && !isGenerating && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
          <div className="bg-slate-50 p-6 rounded-full mb-4">
            <Gamepad2 className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-bold text-slate-600">No Quiz Generated Yet</h3>
          <p className="max-w-xs text-sm">Enter a topic above and click generate to create an interactive quiz.</p>
        </div>
      )}
      {quiz && isLearnerPreviewOpen && (
        <LearnerQuizPreview quiz={quiz} learnerName={kidProfile?.name} onClose={() => setIsLearnerPreviewOpen(false)} />
      )}
    </div>
  );
}
