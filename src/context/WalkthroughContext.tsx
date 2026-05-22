import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface WalkthroughStep {
  title: string;
  description: string;
  actionLabel: string;
  link?: string;
  pageRoute?: string;
  fieldGuides?: Array<{
    fieldName: string;
    description: string;
    icon?: string;
  }>;
}

interface WalkthroughContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  steps: WalkthroughStep[];
  hasSeenWalkthrough: boolean;
  markWalkthroughSeen: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  closeWalkthrough: () => void;
  startWalkthrough: () => void;
  getPageSpecificSteps: (route: string) => WalkthroughStep[];
}

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState(false);
  const location = useLocation();

  const [steps] = useState<WalkthroughStep[]>([
    {
      title: "Sign up and get started",
      description: "Create your parent account so you can manage your child's profile, activities, and rewards all in one place.",
      actionLabel: "Got it",
    },
    {
      title: "Create a child profile",
      description: "Add your child's basic information. This helps personalize the app.",
      actionLabel: "Add Child",
      link: "/add-kid",
      pageRoute: "/add-kid",
      fieldGuides: [
        {
          fieldName: "Child's Name",
          description: "Enter your child's name. This will appear throughout the app.",
        },
        {
          fieldName: "Date of Birth",
          description: "Select the date to calculate their current age and grade level.",
        },
        {
          fieldName: "Grade Level",
          description: "Choose the current grade. This helps suggest age-appropriate activities.",
        },
        {
          fieldName: "Strengths & Weaknesses",
          description: "List key strengths and areas to improve. This helps personalize content.",
        },
        {
          fieldName: "Hobbies & Interests",
          description: "Enter hobbies and interests. These are used in games and activities.",
        },
        {
          fieldName: "Behavioral Issues & Therapies",
          description: "Note any behavioral challenges and current therapies. Helps tailor behavior support.",
        },
        {
          fieldName: "Sensory Issues",
          description: "Describe any sensory sensitivities. Affects how activities are recommended.",
        },
        {
          fieldName: "Reward System",
          description: "Choose a reward type (Penny, Token, Star, etc.) and quantity. This motivates your child.",
        },
        {
          fieldName: "Theme & Timezone",
          description: "Pick a theme color and timezone for accurate time tracking and display.",
        },
      ],
    },
    {
      title: "Add behavior rules",
      description: "Set clear behavior expectations and track daily progress.",
      actionLabel: "Open Behavior Rules",
      link: "/behaviors/:kidId",
      pageRoute: "/behaviors",
      fieldGuides: [
        {
          fieldName: "Behavior Rules Tab",
          description: "Create specific behavior definitions with names, descriptions, icons, and reward values.",
        },
        {
          fieldName: "Log Behavior Tab",
          description: "Quickly log when your child demonstrates a behavior. Track positive actions daily.",
        },
        {
          fieldName: "Progress Tab",
          description: "View behavior trends and progress over time with visual charts.",
        },
        {
          fieldName: "Add Rule Button",
          description: "Click to create a new behavior rule (e.g., \"Listened the First Time\").",
        },
        {
          fieldName: "Behavior Name",
          description: "A short, clear name for the behavior (e.g., \"Helpful at Home\").",
        },
        {
          fieldName: "Goal Rewards",
          description: "How many rewards your child earns when they reach the daily goal for this behavior.",
        },
        {
          fieldName: "Target Time & Goal",
          description: "Set how many times per day this behavior should occur or for how long.",
        },
      ],
    },
    {
      title: "Add activities",
      description: "Assign learning and behavior activities to your child.",
      actionLabel: "Go to Assigned Activities",
      link: "/assigned-activities/:kidId",
      pageRoute: "/assigned-activities",
      fieldGuides: [
        {
          fieldName: "Activity Library",
          description: "Browse curated educational and behavioral activities.",
        },
        {
          fieldName: "Assign Activity",
          description: "Select activities and set due dates or frequency.",
        },
        {
          fieldName: "Assigned List",
          description: "See all activities assigned to your child with due dates and status.",
        },
        {
          fieldName: "Mark as Complete",
          description: "Check off activities as your child completes them.",
        },
        {
          fieldName: "View Details",
          description: "Click an activity to see full instructions and learning objectives.",
        },
      ],
    },
    {
      title: "Add rewards",
      description: "Create a reward system to reinforce positive behavior and motivate progress.",
      actionLabel: "Use Rewards",
    },
    {
      title: "Create a quiz",
      description: "Build a quick quiz to help your child practice new skills and track their results.",
      actionLabel: "Create Quiz",
      link: "/quiz-generator",
      pageRoute: "/quiz-generator",
      fieldGuides: [
        {
          fieldName: "Quiz Title",
          description: "Enter a descriptive name for the quiz (e.g., \"Multiplication Facts\").",
        },
        {
          fieldName: "Quiz Description",
          description: "Explain the quiz purpose and what skills are being tested.",
        },
        {
          fieldName: "Add Questions",
          description: "Click to add multiple-choice or short-answer questions.",
        },
        {
          fieldName: "Question Details",
          description: "Enter the question text, correct answer, and distractors (wrong answers).",
        },
        {
          fieldName: "Difficulty Level",
          description: "Mark as Easy, Medium, or Hard to help track skill progression.",
        },
        {
          fieldName: "Save & Assign",
          description: "Save the quiz and assign it to your child with a due date.",
        },
      ],
    },
    {
      title: "Create a social story",
      description: "Make a custom social story that supports your child's learning and behavior goals.",
      actionLabel: "Create Social Story",
      link: "/social-stories/create",
      pageRoute: "/social-stories/create",
      fieldGuides: [
        {
          fieldName: "Story Title",
          description: "Enter a descriptive title (e.g., \"Going to the Dentist\").",
        },
        {
          fieldName: "Story Content",
          description: "Write step-by-step narrative that prepares your child for situations.",
        },
        {
          fieldName: "Add Images",
          description: "Upload or generate images to illustrate each part of the story.",
        },
        {
          fieldName: "Use AI to Generate",
          description: "Let AI help create engaging stories based on your description.",
        },
        {
          fieldName: "Publish",
          description: "Save and share the story with your child.",
        },
      ],
    },
    {
      title: "Create worksheets",
      description: "Add printable or digital worksheets for extra practice and reinforcement.",
      actionLabel: "Create Worksheet",
      link: "/worksheet-generator",
      pageRoute: "/worksheet-generator",
      fieldGuides: [
        {
          fieldName: "Worksheet Title",
          description: "Name your worksheet (e.g., \"Sight Words Practice\").",
        },
        {
          fieldName: "Subject",
          description: "Choose subject area (Math, Reading, Spelling, etc.).",
        },
        {
          fieldName: "Difficulty Level",
          description: "Select appropriate difficulty for your child.",
        },
        {
          fieldName: "Content Type",
          description: "Choose exercise type (fill-in-the-blank, matching, multiple choice, etc.).",
        },
        {
          fieldName: "Generate Worksheet",
          description: "Use AI to auto-generate appropriate practice problems.",
        },
        {
          fieldName: "Customize",
          description: "Edit and personalize problems before saving.",
        },
        {
          fieldName: "Print or Assign",
          description: "Download to print or assign digitally to your child.",
        },
      ],
    },
    {
      title: "View assigned activities",
      description: "See what activities are assigned and what your child is working on today.",
      actionLabel: "View Assigned Activities",
      link: "/assigned-activities/:kidId",
      pageRoute: "/assigned-activities",
    },
    {
      title: "See completed activities",
      description: "Review completed tasks and celebrate your child's progress.",
      actionLabel: "Review Completed",
      link: "/assigned-activities/:kidId",
      pageRoute: "/assigned-activities",
      fieldGuides: [
        {
          fieldName: "Completed Tab",
          description: "Filter to see only finished activities.",
        },
        {
          fieldName: "Activity Details",
          description: "Click to view completion date, score, and feedback.",
        },
        {
          fieldName: "Completion Date",
          description: "See when your child finished each activity.",
        },
        {
          fieldName: "Success Rate",
          description: "View the score or percentage achieved on quizzes.",
        },
      ],
    },
    {
      title: "Check history",
      description: "Open the history view to track long-term progress and behavior patterns.",
      actionLabel: "View History",
      link: "/summary-report/:kidId",
      pageRoute: "/summary-report",
      fieldGuides: [
        {
          fieldName: "Time Period Filter",
          description: "Select date ranges to view specific months or years.",
        },
        {
          fieldName: "Activity History",
          description: "See all activities your child has completed in chronological order.",
        },
        {
          fieldName: "Behavior Trends",
          description: "View how behavior scores have changed over time.",
        },
        {
          fieldName: "Export Data",
          description: "Download records for reports or therapist sharing.",
        },
      ],
    },
    {
      title: "Open progress report",
      description: "See quiz results, behavior progress, and key insights in one place.",
      actionLabel: "View Progress Report",
      link: "/progress-report/:kidId",
      pageRoute: "/progress-report",
      fieldGuides: [
        {
          fieldName: "Quiz Results",
          description: "View all quiz attempts with scores and dates completed.",
        },
        {
          fieldName: "Quiz History Table",
          description: "See each quiz with ability to delete old attempts or retake.",
        },
        {
          fieldName: "Behavior Summary",
          description: "Charts showing behavior tracking and daily progress.",
        },
        {
          fieldName: "Overall Stats",
          description: "Summary of rewards earned, activities completed, and goals met.",
        },
        {
          fieldName: "Delete Button",
          description: "Remove old quiz attempts to keep records clean.",
        },
      ],
    },
    {
      title: "Track daily behavior",
      description: "Use the daily behavior tracker to log wins, challenges, and goals each day.",
      actionLabel: "Track Behavior",
      link: "/behaviors/:kidId",
      pageRoute: "/behaviors",
    },
    {
      title: "Return to your dashboard",
      description: "Use the dashboard as your central hub for parent tools and child progress.",
      actionLabel: "Back to Dashboard",
      link: "/dashboard",
    },
  ]);

  useEffect(() => {
    const seen = localStorage.getItem("new_parent_walkthrough_seen");
    setHasSeenWalkthrough(!!seen);
  }, []);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      closeWalkthrough();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  };

  const closeWalkthrough = () => {
    localStorage.setItem("new_parent_walkthrough_seen", "true");
    setHasSeenWalkthrough(true);
    setIsOpen(false);
  };

  const startWalkthrough = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const markWalkthroughSeen = () => {
    localStorage.setItem("new_parent_walkthrough_seen", "true");
    setHasSeenWalkthrough(true);
  };

  const getPageSpecificSteps = (route: string): WalkthroughStep[] => {
    return steps.filter(step => step.pageRoute && route.includes(step.pageRoute));
  };

  return (
    <WalkthroughContext.Provider
      value={{
        isOpen,
        setIsOpen,
        currentStep,
        setCurrentStep,
        steps,
        hasSeenWalkthrough,
        markWalkthroughSeen,
        nextStep,
        previousStep,
        goToStep,
        closeWalkthrough,
        startWalkthrough,
        getPageSpecificSteps,
      }}
    >
      {children}
    </WalkthroughContext.Provider>
  );
}

export function useWalkthrough() {
  const context = useContext(WalkthroughContext);
  if (context === undefined) {
    throw new Error("useWalkthrough must be used within WalkthroughProvider");
  }
  return context;
}
