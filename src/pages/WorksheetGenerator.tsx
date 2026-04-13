import { apiFetch } from '../utils/api';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { ArrowLeft, Printer, Sparkles, Loader2, FileText, CheckCircle2, Save, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WorksheetContent {
  title: string;
  instructions: string;
  imageUrl?: string;
  sections: {
    type: 'multiple_choice' | 'fill_in_the_blank' | 'short_answer' | 'word_search' | 'coloring' | 'dot_to_dot' | 'puzzle' | 'matching' | 'reading_comprehension' | 'drawing';
    title: string;
    readingPassage?: string;
    drawingPrompt?: string;
    questions?: {
      question: string;
      options?: string[];
      answer: string;
    }[];
    wordSearch?: {
      grid: string[][];
      words: string[];
    };
    matching?: {
      pairs: { left: string; right: string }[];
      shuffledRight: string[];
    };
    puzzleContent?: string;
  }[];
}

export default function WorksheetGenerator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('General');
  const [gradeLevel, setGradeLevel] = useState('Grade 3');
  const [worksheetType, setWorksheetType] = useState('Mixed');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numWorksheets, setNumWorksheets] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isViewingSaved, setIsViewingSaved] = useState(false);
  const [worksheetId, setWorksheetId] = useState<string | null>(null);
  const [worksheet, setWorksheet] = useState<WorksheetContent | null>(null);
  const [generatedWorksheets, setGeneratedWorksheets] = useState<WorksheetContent[]>([]);
  const [currentWorksheetIndex, setCurrentWorksheetIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const updateWorksheet = (updates: Partial<WorksheetContent>) => {
    if (!worksheet) return;
    setWorksheet({ ...worksheet, ...updates });
  };

  const updateSection = (index: number, updates: any) => {
    if (!worksheet) return;
    const newSections = [...worksheet.sections];
    newSections[index] = { ...newSections[index], ...updates };
    setWorksheet({ ...worksheet, sections: newSections });
  };

  const updateQuestion = (sectionIdx: number, questionIdx: number, updates: any) => {
    if (!worksheet) return;
    const newSections = [...worksheet.sections];
    const newQuestions = [...(newSections[sectionIdx].questions || [])];
    newQuestions[questionIdx] = { ...newQuestions[questionIdx], ...updates };
    newSections[sectionIdx] = { ...newSections[sectionIdx], questions: newQuestions };
    setWorksheet({ ...worksheet, sections: newSections });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const isEdit = params.get('edit') === 'true';
    if (id) {
      fetchWorksheet(id, isEdit);
    }
  }, [location.search]);

  const fetchWorksheet = async (id: string, isEdit: boolean) => {
    try {
      const res = await apiFetch(`/api/worksheets/${id}`);
      if (!res.ok) throw new Error('Failed to fetch worksheet');
      const data = await res.json();
      const content = typeof data.worksheet.content === 'string' ? JSON.parse(data.worksheet.content) : data.worksheet.content;
      setWorksheet(content);
      setWorksheetId(id);
      setTopic(data.worksheet.topic || '');
      setSubject(data.worksheet.subject || 'General');
      setGradeLevel(data.worksheet.grade_level || 'Grade 3');
      setWorksheetType(data.worksheet.worksheet_type || 'Mixed');
      setIsViewingSaved(!isEdit);
      setShowGenerator(false);
    } catch (err) {
      console.error(err);
      alert('Failed to load worksheet');
    }
  };

  const handleSave = async () => {
    if (!worksheet) return;
    setIsSaving(true);
    
    const titleToSave = worksheet.title || `${topic} Worksheet`;
    
    try {
      console.log('Saving worksheet:', {
        id: worksheetId,
        title: titleToSave,
        topic,
        subject,
        gradeLevel,
        worksheetType
      });

      const url = worksheetId ? `/api/worksheets/${worksheetId}` : '/api/worksheets';
      const method = worksheetId ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleToSave,
          topic,
          subject,
          gradeLevel,
          worksheetType,
          content: { ...worksheet, title: titleToSave }
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save worksheet');
      }
      
      alert('Worksheet saved successfully!');
      navigate('/saved-worksheets');
    } catch (err: any) {
      console.error('Save error:', err);
      alert(`Failed to save worksheet: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const subjects = ['General', 'Math', 'Science', 'English', 'History', 'Geography', 'Social Studies', 'Art', 'Music', 'Physical Education'];
  const worksheetTypes = ['Mixed', 'One-choice', 'Multiple-choice', 'Fill in the blanks', 'Word Search', 'Reading Comprehension', 'Drawing', 'Coloring Page', 'Connect the Dots', 'Puzzle', 'Matching Puzzle'];
  const difficulties = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];
  const gradeLevels = ['Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'High School', 'Adult Basic Education'];

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    setGeneratedWorksheets([]);
    setWorksheet(null);
    setWorksheetId(null);
    setCurrentWorksheetIndex(0);

    const withRetry = async <T,>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
      try {
        return await fn();
      } catch (error: any) {
        const errString = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
        if (errString.toLowerCase().includes('quota') || errString.toLowerCase().includes('billing')) {
          throw new Error('You have exceeded your AI service quota. Please try again later or check your API key billing details.');
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
      let typeInstruction = '';
      let includeInstruction = '';

      if (worksheetType === 'One-choice') {
        typeInstruction = 'The worksheet should consist ONLY of Multiple Choice questions with exactly one correct answer.';
        includeInstruction = 'Include: 1. A catchy title. 2. Clear instructions. 3. 15-20 high-quality questions to ensure the worksheet is substantial (2 pages). 4. An answer key.';
      } else if (worksheetType === 'Multiple-choice') {
        typeInstruction = 'The worksheet should consist ONLY of Multiple Choice questions (some may have more than one correct answer).';
        includeInstruction = 'Include: 1. A catchy title. 2. Clear instructions. 3. 15-20 high-quality questions to ensure the worksheet is substantial (2 pages). 4. An answer key.';
      } else if (worksheetType === 'Fill in the blanks') {
        typeInstruction = 'The worksheet should consist ONLY of Fill in the Blanks questions.';
        includeInstruction = 'Include: 1. A catchy title. 2. Clear instructions. 3. 15-20 high-quality questions to ensure the worksheet is substantial (2 pages). 4. An answer key.';
      } else if (worksheetType === 'Word Search') {
        typeInstruction = 'The worksheet should consist ONLY of a Word Search puzzle. Provide a 15x15 grid of characters and a list of 15-20 thematic words to find.';
        includeInstruction = 'Include: 1. A catchy title. 2. Clear instructions. 3. The word search puzzle data (grid and words). 4. An answer key.';
      } else if (worksheetType === 'Coloring Page') {
        typeInstruction = 'The worksheet should be a Coloring Page. Provide a title, instructions, and a highly descriptive prompt for an AI image generator to create a black and white line art coloring page for kids. CRITICAL: DO NOT include any questions, multiple choice, or text-based exercises. The "sections" array should contain exactly one section of type "coloring".';
        includeInstruction = 'Include: 1. A catchy title. 2. Clear instructions. 3. A highly descriptive "imagePrompt" for an AI image generator.';
      } else if (worksheetType === 'Connect the Dots') {
        typeInstruction = 'The worksheet should be a Connect the Dots activity. Provide a title, instructions, and a highly descriptive prompt for an AI image generator to create a simple dot-to-dot style line art image for kids. CRITICAL: DO NOT include any questions, multiple choice, or text-based exercises. The "sections" array should contain exactly one section of type "dot_to_dot".';
        includeInstruction = 'Include: 1. A catchy title. 2. Clear instructions. 3. A highly descriptive "imagePrompt" for an AI image generator.';
      } else if (worksheetType === 'Puzzle') {
        typeInstruction = 'The worksheet should be a Puzzle (like a logic puzzle, simple crossword, or brain teaser). Provide the puzzle content and an answer key.';
        includeInstruction = 'Include: 1. A catchy title. 2. Clear instructions. 3. The puzzle content (make it substantial). 4. An answer key.';
      } else if (worksheetType === 'Matching Puzzle') {
        typeInstruction = 'The worksheet should consist ONLY of a Matching Puzzle. Provide a list of pairs (left item and its matching right item).';
        includeInstruction = 'Include: 1. A catchy title. 2. Clear instructions. 3. 12-15 pairs of items to match. 4. A shuffled list of the right-side items for the student to match against. 5. An answer key.';
      } else if (worksheetType === 'Reading Comprehension') {
        // Calculate dynamic word count based on age and difficulty
        let baseWords = 400;
        
        if (gradeLevel === 'Pre-K' || gradeLevel === 'Kindergarten') baseWords = 80;
        else if (gradeLevel === 'Grade 1' || gradeLevel === 'Grade 2') baseWords = 150;
        else if (gradeLevel === 'Grade 3' || gradeLevel === 'Grade 4') baseWords = 350;
        else if (gradeLevel === 'Grade 5' || gradeLevel === 'Grade 6') baseWords = 600;
        else baseWords = 800;

        let diffMultiplier = 1;
        if (difficulty === 'Very Easy') diffMultiplier = 0.6;
        else if (difficulty === 'Easy') diffMultiplier = 0.8;
        else if (difficulty === 'Hard') diffMultiplier = 1.2;
        else if (difficulty === 'Very Hard') diffMultiplier = 1.5;

        const targetWords = Math.round(baseWords * diffMultiplier);
        const minWords = Math.round(targetWords * 0.8);
        const maxWords = Math.round(targetWords * 1.2);

        typeInstruction = `The worksheet should consist of a Reading Comprehension passage followed by 10-12 questions (mix of multiple choice and short answer) based on the passage.`;
        includeInstruction = `Include: 1. A catchy title. 2. Clear instructions. 3. An engaging reading passage (${minWords}-${maxWords} words). 4. 10-12 comprehension questions. 5. An answer key.`;
      } else if (worksheetType === 'Drawing') {
        typeInstruction = 'The worksheet should be a Drawing activity. Provide a creative drawing prompt or a scene for the student to draw.';
        includeInstruction = 'Include: 1. A catchy title. 2. Clear instructions. 3. A creative "drawingPrompt" that describes what the student should draw.';
      } else {
        typeInstruction = 'The worksheet should be a mix of Multiple Choice, Fill in the Blanks, and Short Answer questions.';
        includeInstruction = 'Include: 1. A catchy title. 2. Clear instructions. 3. 15-20 high-quality questions across different formats to ensure the worksheet is substantial (2 pages). 4. An answer key.';
      }

      const newWorksheets: WorksheetContent[] = [];
      let hasError = false;

      let skipImages = false;

      for (let i = 0; i < numWorksheets; i++) {
        try {
          const data = await withRetry(async () => {
            const res = await apiFetch('/api/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: "gemini-3.1-flash-lite-preview",
                contents: `Generate a highly refined, professional-grade printable worksheet at a ${gradeLevel} reading/comprehension level for the subject ${subject} on the topic: "${topic}". 
              
              CRITICAL CRITERIA:
              - Grade Level: ${gradeLevel} (Ensure vocabulary, concepts, and reading complexity are perfectly aligned with this grade level).
              - Subject: ${subject}
              - Topic: ${topic}
              - Difficulty Level: ${difficulty} (Adjust the complexity of questions and depth of knowledge required accordingly).
              
              ${typeInstruction}
              
              The worksheet should be educational, engaging, and comprehensive enough to span 1-2 pages when printed.
              
              ${includeInstruction}
              
              IMPORTANT: Return ONLY valid JSON. Do not include comments, markdown formatting, or any text outside the JSON object.
              
              Format the response as a JSON object matching this schema:
              {
                "title": "string",
                "instructions": "string",
                "imagePrompt": "string" (only for coloring/dot_to_dot),
                "sections": [
                  {
                    "type": "multiple_choice" | "fill_in_the_blank" | "short_answer" | "word_search" | "coloring" | "dot_to_dot" | "puzzle" | "matching" | "reading_comprehension" | "drawing",
                    "title": "string",
                    "readingPassage": "string" (only for reading_comprehension),
                    "drawingPrompt": "string" (only for drawing),
                    "questions": [
                      {
                        "question": "string",
                        "options": ["string"] (only for multiple_choice),
                        "answer": "string"
                      }
                    ] (optional),
                    "wordSearch": {
                      "grid": [["string"]] (15x15),
                      "words": ["string"]
                    } (optional),
                    "matching": {
                      "pairs": [{"left": "string", "right": "string"}],
                      "shuffledRight": ["string"]
                    } (optional),
                    "puzzleContent": "string" (optional)
                  }
                ]
              }`,
                config: {
                  maxOutputTokens: 8192,
                  responseMimeType: "application/json"
                }
              })
            });
            
            if (!res.ok) {
              const errorData = await res.json();
              console.error('API Error:', errorData);
              const message = errorData.details || errorData.error || 'Failed to generate content';
              throw new Error(message);
            }
            const response = await res.json();

            let responseText = response.text;
            if (!responseText) throw new Error('Empty response from AI model');

            let cleanedJson = responseText.trim();
            if (cleanedJson.startsWith('```')) {
              cleanedJson = cleanedJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
            }

            if (!cleanedJson.startsWith('{')) {
              const firstOpen = cleanedJson.indexOf('{');
              const lastClose = cleanedJson.lastIndexOf('}');
              if (firstOpen !== -1 && lastClose !== -1) {
                cleanedJson = cleanedJson.substring(firstOpen, lastClose + 1);
              }
            }
            
            return JSON.parse(cleanedJson);
          });
          
          // Handle image generation if needed
          if (!skipImages && (worksheetType === 'Coloring Page' || worksheetType === 'Connect the Dots') && data.imagePrompt) {
            try {
              console.log(`Generating image for worksheet ${i + 1}...`);
              // Add delay if not the first worksheet to respect rate limits
              if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }

              const imageResponse = await withRetry(async () => {
                const res = await apiFetch('/api/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                      parts: [
                        {
                          text: `${data.imagePrompt}. Black and white line art, coloring book style, clean white background, high contrast, simple for kids.`,
                        },
                      ],
                    },
                  })
                });
                if (!res.ok) {
                  const errorData = await res.json();
                  throw new Error(errorData.error || 'Failed to generate image');
                }
                return await res.json();
              }, 2, 4000);

              let imageUrl = '';
              for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                  imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                  break;
                }
              }
              
              if (imageUrl) {
                data.imageUrl = imageUrl;
                if (!data.sections || data.sections.length === 0) {
                  data.sections = [{
                    type: worksheetType === 'Coloring Page' ? 'coloring' : 'dot_to_dot',
                    title: data.title
                  }];
                }
              }
            } catch (imgErr: any) {
              const errString = imgErr instanceof Error ? imgErr.message : (typeof imgErr === 'string' ? imgErr : JSON.stringify(imgErr));
              console.warn(`Image generation failed for worksheet ${i + 1}:`, errString);
              if (errString.includes('429') || errString.includes('RESOURCE_EXHAUSTED') || errString.includes('quota')) {
                console.warn("Quota exceeded for images, skipping remaining images.");
                skipImages = true;
              }
            }
          }

          newWorksheets.push(data);
          // Update state incrementally so user sees progress
          setGeneratedWorksheets([...newWorksheets]);
          
          // Increased delay between worksheets to avoid rate limits/RPC errors
          if (i < numWorksheets - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } catch (error: any) {
          console.error(`Failed to generate worksheet ${i + 1}:`, error);
          const errString = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
          if (errString.toLowerCase().includes('quota') || errString.includes('429')) {
            throw error; // Rethrow quota errors immediately
          }
          hasError = true;
        }
      }

      if (newWorksheets.length > 0) {
        setWorksheet(newWorksheets[0]);
        setCurrentWorksheetIndex(0);
        setShowGenerator(false);
        
        if (hasError) {
          alert(`Generated ${newWorksheets.length} worksheet(s), but some could not be created due to network errors.`);
        }
      } else {
        throw new Error('Could not generate any worksheets. Please check your connection and try again.');
      }

    } catch (error: any) {
      console.error('Failed to generate worksheets:', error);
      const errorMessage = error.message || "Unknown error";
      if (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE") || errorMessage.includes("high demand")) {
        alert("The AI service is currently experiencing high demand. Please wait a moment and try again.");
      } else if (errorMessage.includes("500") || errorMessage.includes("Rpc failed")) {
        alert("The AI service is currently busy or experiencing a temporary issue. Please wait a moment and try again.");
      } else {
        alert(`Failed to generate worksheets: ${errorMessage}. Please try again.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleNextWorksheet = () => {
    if (currentWorksheetIndex < generatedWorksheets.length - 1) {
      const nextIndex = currentWorksheetIndex + 1;
      setCurrentWorksheetIndex(nextIndex);
      setWorksheet(generatedWorksheets[nextIndex]);
    }
  };

  const handlePrevWorksheet = () => {
    if (currentWorksheetIndex > 0) {
      const prevIndex = currentWorksheetIndex - 1;
      setCurrentWorksheetIndex(prevIndex);
      setWorksheet(generatedWorksheets[prevIndex]);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="mb-6 no-print">
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">
              {isViewingSaved ? 'View Worksheet' : 'Worksheet Generator'}
            </h1>
            <p className="text-lg font-normal text-slate-500 mt-3">
              {isViewingSaved ? 'Review and print your saved content' : 'Create custom learning materials'}
            </p>
          </div>
          <Link to="/saved-worksheets" className="no-print">
            <Button variant="outline" size="xs" className="h-7 text-[12px]">
              <FileText className="mr-1 h-3 w-3" />
              Saved Worksheets
            </Button>
          </Link>
        </div>
      </div>

      {showGenerator && !isViewingSaved && (
        <Card className="no-print border-none ring-1 ring-slate-200 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Grade Level</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                >
                  {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Topic</label>
                <Input 
                  placeholder="e.g., Solar System, Fractions, Dinosaurs..." 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Worksheet Type</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={worksheetType}
                  onChange={(e) => setWorksheetType(e.target.value)}
                >
                  {worksheetTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Difficulty</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Number of Worksheets</label>
                <Input 
                  type="number"
                  min="1"
                  max="10"
                  value={numWorksheets}
                  onChange={(e) => setNumWorksheets(parseInt(e.target.value) || 1)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <Button 
              className="w-full h-10 font-bold" 
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Worksheet...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Worksheet
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {worksheet && (
        <div className="space-y-4">
          {generatedWorksheets.length > 1 && (
            <div className="flex items-center justify-between bg-white p-3 rounded-lg ring-1 ring-slate-200 shadow-sm no-print">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                  Worksheet {currentWorksheetIndex + 1} of {generatedWorksheets.length}
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="xs" 
                  onClick={handlePrevWorksheet}
                  disabled={currentWorksheetIndex === 0}
                  className="h-8"
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="xs" 
                  onClick={handleNextWorksheet}
                  disabled={currentWorksheetIndex === generatedWorksheets.length - 1}
                  className="h-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 no-print">
            {!isViewingSaved && worksheet && !showGenerator && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 text-[12px]"
              >
                {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                Save Worksheet
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAnswers(!showAnswers)}
              className="h-8 text-[12px]"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              {showAnswers ? 'Hide Answer Key' : 'Show Answer Key'}
            </Button>
            <button 
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 h-8 px-3 text-xs bg-slate-100 text-slate-900 hover:bg-slate-200 cursor-pointer disabled:opacity-50"
            >
              <Printer className={`mr-1.5 h-3.5 w-3.5 ${isPrinting ? 'animate-pulse' : ''}`} />
              {isPrinting ? 'Preparing...' : 'Print Worksheet'}
            </button>
          </div>

          <div ref={printRef} className="print-area bg-white p-8 rounded-lg shadow-sm ring-1 ring-slate-200 min-h-[11in] worksheet-container">
            <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
              {isViewingSaved ? (
                <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">{worksheet.title}</h1>
              ) : (
                <input 
                  value={worksheet.title}
                  onChange={(e) => updateWorksheet({ title: e.target.value })}
                  className="text-3xl font-black uppercase tracking-tight text-slate-900 text-center w-full bg-transparent border-none focus:ring-0"
                />
              )}
              <div className="flex justify-between mt-6 text-sm font-bold text-slate-600">
                <span>Name: __________________________</span>
                <span>Date: __________________________</span>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-slate-50 p-4 rounded border border-slate-200 italic text-slate-700">
                <p className="font-bold not-italic mb-1">Instructions:</p>
                {isViewingSaved ? (
                  worksheet.instructions
                ) : (
                  <textarea 
                    value={worksheet.instructions}
                    onChange={(e) => updateWorksheet({ instructions: e.target.value })}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none min-h-[60px]"
                  />
                )}
              </div>

              {worksheet.sections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-4 section-container">
                  <h2 className="text-xl font-bold border-b border-slate-200 pb-1 text-slate-800">
                    {isViewingSaved ? (
                      section.title.toLowerCase().startsWith('section') ? section.title : `Section ${sIdx + 1}: ${section.title}`
                    ) : (
                      <input 
                        value={section.title}
                        onChange={(e) => updateSection(sIdx, { title: e.target.value })}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 font-bold"
                      />
                    )}
                  </h2>
                  <div className="space-y-6">
                    {section.type === 'coloring' && worksheet.imageUrl && (
                      <div className="flex justify-center py-4">
                        <img 
                          src={worksheet.imageUrl} 
                          alt="Coloring Page" 
                          className="max-w-full h-auto border border-slate-200 rounded-lg shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {section.type === 'dot_to_dot' && worksheet.imageUrl && (
                      <div className="flex justify-center py-4">
                        <img 
                          src={worksheet.imageUrl} 
                          alt="Connect the Dots" 
                          className="max-w-full h-auto border border-slate-200 rounded-lg shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {section.type === 'puzzle' && section.puzzleContent && (
                      <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 whitespace-pre-wrap font-medium text-slate-800 leading-relaxed">
                        {isViewingSaved ? (
                          section.puzzleContent
                        ) : (
                          <textarea 
                            value={section.puzzleContent}
                            onChange={(e) => updateSection(sIdx, { puzzleContent: e.target.value })}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none min-h-[100px]"
                          />
                        )}
                      </div>
                    )}

                    {section.type === 'word_search' && section.wordSearch && (
                      <div className="space-y-8">
                        <div className="flex justify-center">
                          <div className="grid grid-cols-15 gap-0 border-2 border-slate-900 bg-slate-900">
                            {section.wordSearch.grid.map((row, rIdx) => (
                              row.map((char, cIdx) => (
                                <div key={`${rIdx}-${cIdx}`} className="w-6 h-6 md:w-8 md:h-8 bg-white border border-slate-200 flex items-center justify-center font-bold text-sm md:text-base uppercase">
                                  {char}
                                </div>
                              ))
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded border border-slate-200">
                          {section.wordSearch.words.map((word, wIdx) => (
                            <div key={wIdx} className="text-xs font-bold uppercase tracking-widest text-slate-700">
                              {word}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {section.type === 'reading_comprehension' && section.readingPassage && (
                      <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 mb-8">
                        {isViewingSaved ? (
                          <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap">
                            {section.readingPassage}
                          </div>
                        ) : (
                          <textarea 
                            value={section.readingPassage}
                            onChange={(e) => updateSection(sIdx, { readingPassage: e.target.value })}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none min-h-[200px] leading-relaxed"
                          />
                        )}
                      </div>
                    )}

                    {section.type === 'drawing' && section.drawingPrompt && (
                      <div className="space-y-4 py-4">
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-medium italic">
                          {isViewingSaved ? (
                            `Prompt: ${section.drawingPrompt}`
                          ) : (
                            <div className="flex gap-2">
                              <span>Prompt:</span>
                              <input 
                                value={section.drawingPrompt}
                                onChange={(e) => updateSection(sIdx, { drawingPrompt: e.target.value })}
                                className="flex-1 bg-transparent border-none focus:ring-0 p-0 italic"
                              />
                            </div>
                          )}
                        </div>
                        <div className="aspect-[4/3] w-full border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 bg-white">
                          <div className="text-center">
                            <p className="font-medium">Draw your masterpiece here!</p>
                            <p className="text-sm mt-1">Use the space below to express your creativity.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {section.type === 'matching' && section.matching && (
                      <div className="grid grid-cols-2 gap-12 py-4">
                        <div className="space-y-6">
                          {section.matching.pairs.map((pair, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{idx + 1}</div>
                              <div className="flex-1 p-3 border border-slate-200 rounded-lg bg-white font-medium">
                                {isViewingSaved ? (
                                  pair.left
                                ) : (
                                  <input 
                                    value={pair.left}
                                    onChange={(e) => {
                                      const newPairs = [...(section.matching?.pairs || [])];
                                      newPairs[idx] = { ...newPairs[idx], left: e.target.value };
                                      updateSection(sIdx, { matching: { ...section.matching, pairs: newPairs } });
                                    }}
                                    className="w-full bg-transparent border-none focus:ring-0 p-0"
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-6">
                          {section.matching.shuffledRight.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <div className="flex-1 p-3 border border-slate-200 rounded-lg bg-white font-medium text-right">
                                {isViewingSaved ? (
                                  item
                                ) : (
                                  <input 
                                    value={item}
                                    onChange={(e) => {
                                      const newShuffled = [...(section.matching?.shuffledRight || [])];
                                      newShuffled[idx] = e.target.value;
                                      updateSection(sIdx, { matching: { ...section.matching, shuffledRight: newShuffled } });
                                    }}
                                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-right"
                                  />
                                )}
                              </div>
                              <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{String.fromCharCode(65 + idx)}</div>
                            </div>
                          ))}
                        </div>
                        <div className="col-span-2 mt-4 text-center text-slate-400 text-xs italic">
                          Draw lines to match the items on the left with the correct items on the right.
                        </div>
                      </div>
                    )}

                    {section.questions?.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-3">
                        <div className="flex gap-1 items-start">
                          <span className="font-bold text-slate-900 min-w-[1.5rem] text-center">
                            {qIdx + 1}.
                          </span>
                          <div className="flex-1">
                            {isViewingSaved ? (
                              <p className="font-medium text-slate-900">
                                {q.question}
                              </p>
                            ) : (
                              <textarea 
                                value={q.question}
                                onChange={(e) => updateQuestion(sIdx, qIdx, { question: e.target.value })}
                                className="w-full bg-transparent border-none focus:ring-0 p-0 font-medium text-slate-900 resize-none min-h-[40px]"
                              />
                            )}
                          </div>
                        </div>
                        
                        {/* Options for Multiple Choice */}
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 pl-4 mb-2">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2 text-slate-700">
                                <div className="h-4 w-4 rounded-full border border-slate-400" />
                                {isViewingSaved ? (
                                  <span>{opt}</span>
                                ) : (
                                  <input 
                                    value={opt}
                                    onChange={(e) => {
                                      const newOptions = [...(q.options || [])];
                                      newOptions[oIdx] = e.target.value;
                                      updateQuestion(sIdx, qIdx, { options: newOptions });
                                    }}
                                    className="flex-1 bg-transparent border-none focus:ring-0 p-0"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Answer Space based on type */}
                        {section.type === 'short_answer' ? (
                          <div className="pl-4 space-y-3 mt-2">
                            <div className="h-px bg-slate-200 w-full" />
                            <div className="h-px bg-slate-200 w-full" />
                            <div className="h-px bg-slate-200 w-full" />
                          </div>
                        ) : (
                          <div className="pl-4">
                            <span className="text-slate-400 text-sm">Answer: ________________________________________________</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {showAnswers && (
                <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-300 page-break">
                  <h2 className="text-2xl font-black uppercase text-slate-900 mb-6 flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    Answer Key
                  </h2>
                  <div className="space-y-6">
                    {worksheet.sections.map((section, sIdx) => (
                      <div key={sIdx} className="space-y-2">
                        <h3 className="font-bold text-slate-800">
                          {section.title.toLowerCase().startsWith('section') ? section.title : `Section ${sIdx + 1}: ${section.title}`}
                        </h3>
                        <div className="grid gap-1 pl-4">
                          {section.type === 'word_search' && section.wordSearch && (
                            <div className="text-sm text-slate-600">
                              Words to find: {section.wordSearch.words.join(', ')}
                            </div>
                          )}
                          {section.type === 'matching' && section.matching && (
                            <div className="space-y-1">
                              {section.matching.pairs.map((p, i) => (
                                <div key={i} className="text-xs text-slate-600">
                                  {i + 1}. {p.left} → {p.right}
                                </div>
                              ))}
                            </div>
                          )}
                          {section.type === 'puzzle' && (
                            <div className="text-sm text-slate-600 italic">
                              See puzzle instructions for solution or check the answer key below.
                            </div>
                          )}
                          {section.questions?.map((q, qIdx) => (
                            <div key={qIdx} className="text-sm">
                              <span className="font-bold">{qIdx + 1}.</span> 
                              {isViewingSaved ? (
                                q.answer
                              ) : (
                                <input 
                                  value={q.answer}
                                  onChange={(e) => updateQuestion(sIdx, qIdx, { answer: e.target.value })}
                                  className="ml-1 bg-transparent border-none focus:ring-0 p-0 inline-block"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!worksheet && !isGenerating && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
          <div className="bg-slate-50 p-6 rounded-full mb-4">
            <FileText className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-bold text-slate-600">No Worksheet Generated Yet</h3>
          <p className="max-w-xs text-sm">Enter a topic above and click generate to create a custom worksheet.</p>
        </div>
      )}

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-area {
            box-shadow: none !important;
            ring: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            width: 100% !important;
          }
          .page-break-before {
            page-break-before: always;
          }
          @page {
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
