import { Tooltip as ChartRechartsTooltip, Legend, ResponsiveContainer, Label, LabelList, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Tooltip as CustomTooltip } from '../components/ui/Tooltip';
import { io } from 'socket.io-client';
import { apiFetch, safeJson } from '../utils/api';
import { formatReward } from '../utils/rewardUtils';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { ArrowLeft, Plus, Trash2, Edit2, CheckCircle, Circle, Calendar, Clock, Repeat, Image as ImageIcon, Eye, Sparkles, Loader2, LayoutList, ChevronLeft, ChevronRight, Activity, TrendingUp, PieChart as PieChartIcon, Award, BarChart as BarChartIcon, History, Lock, Printer, Lightbulb } from 'lucide-react';
import { ActivityDetailModal } from '../components/ActivityDetailModal';

// Global Chart Tooltip helper
const CustomChartTooltip = (props: any) => <ChartRechartsTooltip {...props} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />;




interface ActivityStep {
  id?: number;
  step_number: number;
  description: string;
  image_url?: string;
}

interface Activity {
  id: string;
  kid_id: string;
  activity_type: string;
  category: string;
  repeat_frequency: string;
  repeats_till?: string;
  time_of_day: string;
  description: string;
  link: string;
  image_url: string;
  status: 'pending' | 'completed';
  due_date: string;
  repeat_interval?: number;
  repeat_unit?: string;
  created_at?: string;
  completed_at?: string;
  steps?: ActivityStep[];
  isHistory?: boolean;
  reward_qty?: number;
}

interface Kid {
  id: string;
  name: string;
  dob?: string;
  grade_level?: string;
  hobbies?: string;
  interests?: string;
  strengths?: string;
  weaknesses?: string;
  sensory_issues?: string;
  behavioral_issues?: string;
  notes?: string;
  chatbot_name?: string;
  reward_type?: string;
  reward_quantity?: number;
  start_time?: string;
  end_time?: string;
  rules?: string;
  reward_balance?: number;
  timezone?: string;
}

interface RewardItem {
  id: string;
  kid_id: string;
  name: string;
  cost: number;
  image_url?: string;
  location?: string;
}

interface Purchase {
  id: string;
  kid_id: string;
  item_name: string;
  cost: number;
  purchased_at: string;
}

interface ActivityTemplate {
  id: string;
  activity_type: string;
  category: string;
  description: string;
  link: string;
  image_url: string;
  steps: ActivityStep[];
  created_at: string;
}

export default function AssignedActivities() {
  const { kidId } = useParams();
  const navigate = useNavigate();
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [historyActivities, setHistoryActivities] = useState<Activity[]>([]);
  const [kid, setKid] = useState<Kid | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [activityCategories, setActivityCategories] = useState<string[]>([]);
  const [previewActivity, setPreviewActivity] = useState<Activity | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    console.log('Activity types:', activityTypes);
  }, [activityTypes]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'activities' | 'completed' | 'history' | 'rewards' | 'progress'>('activities');
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [socialStories, setSocialStories] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [worksheets, setWorksheets] = useState<any[]>([]);
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isPurchasesTableMissing, setIsPurchasesTableMissing] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [isHistoryDeleteConfirmOpen, setIsHistoryDeleteConfirmOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<string | null>(null);
  const [rewardToDelete, setRewardToDelete] = useState<string | null>(null);
  const [newReward, setNewReward] = useState({ name: '', cost: 1, imageUrl: '', location: '' });
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [isSavingReward, setIsSavingReward] = useState(false);
  const [reportDuration, setReportDuration] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);
  const [completedPage, setCompletedPage] = useState(1);
  const [completedItemsPerPage, setCompletedItemsPerPage] = useState(10);
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchaseItemsPerPage, setPurchaseItemsPerPage] = useState(10);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [activitiesItemsPerPage, setActivitiesItemsPerPage] = useState(10);
  const [viewingQuizResult, setViewingQuizResult] = useState<any | null>(null);

  useEffect(() => {
    if (viewingQuizResult) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [viewingQuizResult]);
  const [activitiesSortConfig, setActivitiesSortConfig] = useState<{ key: keyof Activity | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [predefinedType, setPredefinedType] = useState<string>('');
  const [predefinedId, setPredefinedId] = useState<string>('');

  useEffect(() => {
    setHistoryPage(1);
  }, [reportDuration, historyItemsPerPage]);

  useEffect(() => {
    setPurchasePage(1);
  }, [reportDuration, purchaseItemsPerPage]);
  const [completedSearchQuery, setCompletedSearchQuery] = useState('');
  const [completedCategoryFilter, setCompletedCategoryFilter] = useState('All');
  const [completedDateFilter, setCompletedDateFilter] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('All');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);

  const rewardImages: Record<string, string> = {
    'Penny': 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png',
    'Cent': 'https://cdn-icons-png.flaticon.com/512/550/550638.png',
    'Token': 'https://cdn-icons-png.flaticon.com/512/2169/2169862.png',
    'Bead': 'https://cdn-icons-png.flaticon.com/512/2953/2953423.png',
    'Star': 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png',
    'Point': 'https://cdn-icons-png.flaticon.com/512/1170/1170611.png',
    'Sticker': 'https://cdn-icons-png.flaticon.com/512/4359/4359922.png',
    'Dollar': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%F0%9F%92%B5%3C/text%3E%3C/svg%3E',
    'Coffee': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%E2%98%95%3C/text%3E%3C/svg%3E',
    'Drink': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%F0%9F%8D%B9%3C/text%3E%3C/svg%3E',
    'Ticket': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%F0%9F%8E%9F%EF%B8%8F%3C/text%3E%3C/svg%3E',
    'Hour': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%E2%8C%9B%3C/text%3E%3C/svg%3E',
    'Credit': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%F0%9F%92%B3%3C/text%3E%3C/svg%3E'
  };

  const rewardIcon = kid?.reward_type ? (rewardImages[kid.reward_type] || rewardImages['Penny']) : rewardImages['Penny'];

  const formatKidDate = (date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        ...options
      }).format(d);
    } catch (e) {
      console.error('formatKidDate error:', e, 'date:', date);
      return String(date);
    }
  };

  const activitiesToRender = activeTab === 'activities' 
    ? activities.filter(a => a.status === 'pending' || !a.status) 
    : activeTab === 'completed' 
      ? activities.filter(a => a.status === 'completed')
      : historyActivities;

  const fixedBuiltInActivities = [
    {
      label: 'Brush Teeth',
      category: 'Daily Care',
      activityType: 'Brush Teeth',
      description: 'Brush your teeth for 2 minutes.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Morning',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20brushing%20teeth%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Put toothpaste on your brush' },
        { step_number: 2, description: 'Brush your teeth for 2 minutes' },
        { step_number: 3, description: 'Rinse your mouth with water' }
      ]
    },
    {
      label: 'Wash Hands',
      category: 'Daily Care',
      activityType: 'Wash Hands',
      description: 'Wash your hands with soap.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Any time',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20washing%20hands%20with%20soap%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Wet your hands with water' },
        { step_number: 2, description: 'Use soap and scrub for 20 seconds' },
        { step_number: 3, description: 'Rinse and dry your hands' }
      ]
    },
    {
      label: 'Put on Shoes',
      category: 'Daily Care',
      activityType: 'Put on Shoes',
      description: 'Put on your shoes to go outside.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Morning',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20putting%20on%20shoes%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Find your shoes' },
        { step_number: 2, description: 'Put your feet inside' },
        { step_number: 3, description: 'Tie your laces or close the straps' }
      ]
    },
    {
      label: 'Clean up Toys',
      category: 'Home',
      activityType: 'Clean up Toys',
      description: 'Put your toys back in the bin.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Evening',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20cleaning%20up%20toys%20into%20a%20box%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Gather all your blocks' },
        { step_number: 2, description: 'Put your blocks in the blue bin' },
        { step_number: 3, description: 'Put your stuffed animals on the shelf' }
      ]
    },
    {
      label: 'Set the Table',
      category: 'Home',
      activityType: 'Set the Table',
      description: 'Help set the table for dinner.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Evening',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20setting%20the%20dinner%20table%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Put a plate at each seat' },
        { step_number: 2, description: 'Put a fork and spoon next to each plate' },
        { step_number: 3, description: 'Put a napkin at each seat' }
      ]
    },
    {
      label: 'Make the Bed',
      category: 'Home',
      activityType: 'Make the Bed',
      description: 'Make your bed after waking up.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Morning',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20making%20the%20bed%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Pull up your sheets' },
        { step_number: 2, description: 'Smooth out your blanket' },
        { step_number: 3, description: 'Put your pillow at the top' }
      ]
    },
    {
      label: 'Get Dressed',
      category: 'Daily Care',
      activityType: 'Get Dressed',
      description: 'Put on your clothes for the day.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Morning',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20getting%20dressed%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Put on your shirt' },
        { step_number: 2, description: 'Put on your pants' },
        { step_number: 3, description: 'Put on your socks' }
      ]
    },
    {
      label: 'Comb Hair',
      category: 'Daily Care',
      activityType: 'Comb Hair',
      description: 'Comb your hair to look neat.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Morning',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20combing%20hair%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Get your comb or brush' },
        { step_number: 2, description: 'Gently brush your hair' },
        { step_number: 3, description: 'Put the brush back' }
      ]
    },
    {
      label: 'Drink Water',
      category: 'Daily Care',
      activityType: 'Drink Water',
      description: 'Drink a full glass of water.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Any time',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20drinking%20a%20glass%20of%20water%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Get a clean glass' },
        { step_number: 2, description: 'Fill it with water' },
        { step_number: 3, description: 'Drink all the water' }
      ]
    },
    {
      label: 'Eat Breakfast',
      category: 'Daily Care',
      activityType: 'Eat Breakfast',
      description: 'Eat your healthy breakfast.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Morning',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20eating%20breakfast%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Sit at the table' },
        { step_number: 2, description: 'Eat your food' },
        { step_number: 3, description: 'Put your plate in the sink' }
      ]
    },
    {
      label: 'Pack School Bag',
      category: 'Home',
      activityType: 'Pack School Bag',
      description: 'Put your books and lunch in your bag.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Evening',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20packing%20a%20school%20backpack%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Check your schedule' },
        { step_number: 2, description: 'Put your books in the bag' },
        { step_number: 3, description: 'Zip up the bag' }
      ]
    },
    {
      label: 'Put Away Laundry',
      category: 'Home',
      activityType: 'Put Away Laundry',
      description: 'Put your clean clothes in the drawer.',
      repeatFrequency: 'Weekly',
      timeOfDay: 'Afternoon',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20putting%20away%20clean%20laundry%20in%20drawers%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Fold your clothes' },
        { step_number: 2, description: 'Open your drawer' },
        { step_number: 3, description: 'Stack the clothes neatly' }
      ]
    },
    {
      label: 'Water Plants',
      category: 'Home',
      activityType: 'Water Plants',
      description: 'Give the plants some water.',
      repeatFrequency: 'Weekly',
      timeOfDay: 'Morning',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20watering%20plants%20with%20a%20watering%20can%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Fill the watering can' },
        { step_number: 2, description: 'Pour water on the soil' },
        { step_number: 3, description: 'Wipe up any spills' }
      ]
    },
    {
      label: 'Feed the Pet',
      category: 'Home',
      activityType: 'Feed the Pet',
      description: 'Give food to your pet.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Morning',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20feeding%20a%20pet%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Get the pet food' },
        { step_number: 2, description: 'Put the food in the bowl' },
        { step_number: 3, description: 'Give your pet some fresh water' }
      ]
    },
    {
      label: 'Take Out Trash',
      category: 'Home',
      activityType: 'Take Out Trash',
      description: 'Take the trash bag to the big bin.',
      repeatFrequency: 'Weekly',
      timeOfDay: 'Evening',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20taking%20out%20the%20trash%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Tie the trash bag' },
        { step_number: 2, description: 'Carry it to the outside bin' },
        { step_number: 3, description: 'Put a new bag in the trash can' }
      ]
    },
    {
      label: 'Read a Book',
      category: 'Education',
      activityType: 'Read a Book',
      description: 'Read for 15 minutes.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Evening',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20reading%20a%20book%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Pick a book you like' },
        { step_number: 2, description: 'Find a quiet spot' },
        { step_number: 3, description: 'Read for 15 minutes' }
      ]
    },
    {
      label: 'Practice Math',
      category: 'Education',
      activityType: 'Practice Math',
      description: 'Do 5 math problems.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Afternoon',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20doing%20math%20problems%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Get your math book' },
        { step_number: 2, description: 'Solve 5 problems' },
        { step_number: 3, description: 'Show your work to a parent' }
      ]
    },
    {
      label: 'Write in Journal',
      category: 'Education',
      activityType: 'Write in Journal',
      description: 'Write 3 sentences about your day.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Evening',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20writing%20in%20a%20journal%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Open your journal' },
        { step_number: 2, description: 'Write about what you did today' },
        { step_number: 3, description: 'Draw a small picture' }
      ]
    },
    {
      label: 'Draw a Picture',
      category: 'Creative',
      activityType: 'Draw a Picture',
      description: 'A person drawing a picture with crayons.',
      repeatFrequency: 'Never',
      timeOfDay: 'Any time',
      imageUrl: '',
      steps: [
        { step_number: 1, description: 'Get your paper and crayons' },
        { step_number: 2, description: 'Draw a beautiful picture' },
        { step_number: 3, description: 'Put your crayons away' }
      ]
    },
    {
      label: 'Build with Blocks',
      category: 'Creative',
      activityType: 'Build with Blocks',
      description: 'Build a tall tower.',
      repeatFrequency: 'Never',
      timeOfDay: 'Any time',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20building%20with%20blocks%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Get your building blocks' },
        { step_number: 2, description: 'Build a tall tower' },
        { step_number: 3, description: 'Take a photo of your tower' }
      ]
    },
    {
      label: 'Do a Puzzle',
      category: 'Creative',
      activityType: 'Do a Puzzle',
      description: 'Complete a small puzzle.',
      repeatFrequency: 'Never',
      timeOfDay: 'Any time',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20doing%20a%20puzzle%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Find all the edge pieces' },
        { step_number: 2, description: 'Put the edges together' },
        { step_number: 3, description: 'Fill in the middle' }
      ]
    },
    {
      label: 'Jump Rope',
      category: 'Physical',
      activityType: 'Jump Rope',
      description: 'Jump 10 times.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Afternoon',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20jumping%20rope%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Get your jump rope' },
        { step_number: 2, description: 'Jump 10 times' },
        { step_number: 3, description: 'Put the rope away' }
      ]
    },
    {
      label: 'Stretch Your Body',
      category: 'Physical',
      activityType: 'Stretch Your Body',
      description: 'Do 5 big stretches.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Morning',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20stretching%20body%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Reach for the sky' },
        { step_number: 2, description: 'Touch your toes' },
        { step_number: 3, description: 'Stretch your arms wide' }
      ]
    },
    {
      label: 'Take a Deep Breath',
      category: 'Physical',
      activityType: 'Take a Deep Breath',
      description: 'Take 3 slow, deep breaths.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Any time',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20taking%20a%20deep%20breath%2C%20meditating%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Breathe in through your nose' },
        { step_number: 2, description: 'Hold it for 2 seconds' },
        { step_number: 3, description: 'Breathe out through your mouth' }
      ]
    },
    {
      label: 'Say Thank You',
      category: 'Social',
      activityType: 'Say Thank You',
      description: 'Say thank you to someone today.',
      repeatFrequency: 'Daily',
      timeOfDay: 'Any time',
      imageUrl: 'https://image.pollinations.ai/prompt/cute%20cartoon%20illustration%20of%20a%20child%20saying%20thank%20you%2C%20colorful%2C%20vector%20art%2C%20kids%20style?width=800&height=600&nologo=true',
      steps: [
        { step_number: 1, description: 'Find someone who helped you' },
        { step_number: 2, description: 'Look at them and smile' },
        { step_number: 3, description: 'Say "Thank you for your help"' }
      ]
    }
  ];

  const handleGenerateImage = () => {
    // Strictly use description if available. Only fallback to activityType if description is completely empty.
    const description = formData.description?.trim();
    const activityType = formData.activityType?.trim();
    const promptText = description || activityType;
    
    console.log('Manual image generation:', { description, activityType, usedPrompt: promptText });

    if (!promptText) return;

    const safePromptText = promptText.replace(/[^\w\s,.]/gi, '').substring(0, 200);
    // Simplified prompt structure to rely more on the description, placing it first
    const prompt = `illustration of ${safePromptText}, vector art, colorful, white background`;
    const seed = Math.floor(Math.random() * 1000);
    const generatedImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=600&nologo=true&seed=${seed}`;
    
    setFormData({ ...formData, imageUrl: generatedImage });
  };

  // Form state
  const [formData, setFormData] = useState({
    activityType: '',
    category: '',
    repeatFrequency: 'Never',
    repeatInterval: 1,
    repeatUnit: 'day',
    repeatsTill: '',
    timeOfDay: 'Any time',
    description: '',
    link: '',
    imageUrl: '',
    dueDate: '',
    status: 'pending',
    steps: [] as ActivityStep[],
  });
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async (options: { silent?: boolean; skipSamples?: boolean } = {}) => {
    const { silent = false, skipSamples = false } = options;
    
    if (!kidId) return;
    
    if (!silent) setIsLoading(true);
    try {
      // Fetch kid details for the header
      const kidRes = await apiFetch(`/api/kids/${encodeURIComponent(kidId || '')}`);
      let currentKid: Kid | null = null;
      if (kidRes.ok) {
        const kidData = await safeJson(kidRes);
        currentKid = kidData.kid;
        setKid(currentKid);
      }

      // Fetch activities
      const now = new Date();
      const kidTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: kidTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      
      const localDate = `${year}-${month}-${day}`;
      const localTime = hour * 60 + minute;
      const actRes = await apiFetch(`/api/kids/${encodeURIComponent(kidId)}/activities?mode=parent&localDate=${localDate}&localTime=${localTime}&_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      let currentActivities: Activity[] = [];
      if (actRes.ok) {
        const actData = await safeJson(actRes);
        console.log('AssignedActivities: Fetched activities:', actData.activities);
        if (actData.activities) {
          console.log('AssignedActivities: Activity statuses:', actData.activities.map((a: Activity) => a.status));
          // Sort by due_date ascending, then by time_of_day order
          currentActivities = actData.activities.sort((a: Activity, b: Activity) => {
            if (a.due_date !== b.due_date) {
              if (!a.due_date) return 1;
              if (!b.due_date) return -1;
              return a.due_date.localeCompare(b.due_date);
            }
            const timeOrder: { [key: string]: number } = { 'Morning': 1, 'Afternoon': 2, 'Evening': 3, 'Any time': 4 };
            const timeA = timeOrder[a.time_of_day] || 5;
            const timeB = timeOrder[b.time_of_day] || 5;
            return timeA - timeB;
          });
        }
        setActivities(currentActivities);
      } else {
        console.error('AssignedActivities: Failed to fetch activities:', actRes.status, actRes.statusText);
      }

      // Fetch history
      const histRes = await apiFetch(`/api/kids/${encodeURIComponent(kidId)}/activity-history?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (histRes.ok) {
        const histData = await safeJson(histRes);
        // Map history to match Activity interface where possible
        const mappedHistory = histData.history.map((h: any) => ({
          ...h,
          id: String(h.id),
          status: 'completed',
          isHistory: true,
          steps: h.activity_history_steps || []
        }));
        setHistoryActivities(mappedHistory);
      }

      // Fetch purchases
      const redRes = await apiFetch(`/api/kids/${encodeURIComponent(kidId)}/purchases`);
      if (redRes.ok) {
        const redData = await safeJson(redRes);
        setPurchases(redData.purchases || []);
        setIsPurchasesTableMissing(!!redData.tableMissing);
      } else {
        const errorData = await safeJson(redRes).catch(() => ({}));
        console.error('Failed to fetch purchases:', redRes.status, errorData);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchActivityTypes();
    fetchActivityCategories();
    fetchRewardItems();
    fetchTemplates();
    fetchSocialStories();
    fetchQuizzes();
    fetchQuizResults();
    fetchWorksheets();

    // Set up socket connection
    const socket = io(window.location.origin);
    
    if (kidId) {
      socket.emit('join_kid_room', kidId);
    }

    socket.on('data_updated', (data) => {
      console.log('Received data_updated event:', data);
      if (data.kidId === kidId) {
        fetchData({ silent: true, skipSamples: true });
        fetchRewardItems();
      }
    });

    // Refresh data every 10 seconds to keep dates/times current
    const intervalId = setInterval(() => {
      // Check if date has changed since last fetch
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const currentLocalDate = `${year}-${month}-${day}`;
      
      // If date changed, force a non-silent refresh (or silent depending on UX preference)
      // We'll use silent for now to avoid flickering, but the data will update
      fetchData({ silent: true, skipSamples: true });
    }, 10000);

    // Also refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData({ silent: true, skipSamples: true });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (kidId) {
        socket.emit('leave_kid_room', kidId);
      }
      socket.disconnect();
    };
  }, [kidId]);

  const fetchActivityTypes = async () => {
    try {
      const res = await apiFetch('/api/activity-types');
      if (res.ok) {
        const data = await safeJson(res);
        console.log('Fetched activity types:', data.types);
        setActivityTypes(data.types);
      } else {
        console.error('Failed to fetch activity types, status:', res.status);
      }
    } catch (error) {
      console.error('Failed to fetch activity types', error);
    }
  };

  const fetchActivityCategories = async () => {
    try {
      const res = await apiFetch('/api/activity-categories');
      if (res.ok) {
        const data = await safeJson(res);
        setActivityCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch activity categories', error);
    }
  };

  const fetchRewardItems = async () => {
    try {
      const res = await apiFetch(`/api/kids/${kidId}/reward-items`);
      if (res.ok) {
        const data = await safeJson(res);
        setRewardItems(data.items);
      }
    } catch (error) {
      console.error('Failed to fetch reward items', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await apiFetch('/api/activity-templates');
      if (res.ok) {
        const data = await safeJson(res);
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates', error);
    }
  };

  const fetchSocialStories = async () => {
    try {
      const res = await apiFetch('/api/social-stories');
      if (res.ok) {
        const data = await safeJson(res);
        setSocialStories(data.stories || []);
      }
    } catch (error) {
      console.error('Failed to fetch social stories', error);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await apiFetch('/api/quizzes');
      if (res.ok) {
        const data = await safeJson(res);
        setQuizzes(data.quizzes || []);
      }
    } catch (error) {
      console.error('Failed to fetch quizzes', error);
    }
  };

  const fetchQuizResults = async () => {
    if (!kidId) return;
    try {
      const res = await apiFetch(`/api/kids/${kidId}/quiz-results`);
      if (res.ok) {
        const data = await safeJson(res);
        setQuizResults(data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch quiz results', error);
    }
  };

  const fetchWorksheets = async () => {
    try {
      const res = await apiFetch('/api/worksheets');
      if (res.ok) {
        const data = await safeJson(res);
        setWorksheets(data.worksheets || []);
      }
    } catch (error) {
      console.error('Failed to fetch worksheets', error);
    }
  };

  const handleOpenForm = (activity?: Activity) => {
    setPredefinedType('');
    setPredefinedId('');
    if (activity) {
      setEditingActivity(activity);
      const freq = activity.repeat_frequency || 'Never';
      let repeatInterval = activity.repeat_interval || 1;
      let repeatUnit = activity.repeat_unit || 'day';
      let repeatFrequency = 'Never';
      
      if (freq === 'Daily') { repeatFrequency = 'Daily'; }
      else if (freq === 'Weekly') { repeatFrequency = 'Weekly'; }
      else if (freq === 'Bi-Weekly') { repeatFrequency = 'Bi-Weekly'; }
      else if (freq === 'Monthly') { repeatFrequency = 'Monthly'; }
      else if (freq === 'Yearly') { repeatFrequency = 'Yearly'; }
      else if (freq.startsWith('Every ')) {
          repeatFrequency = 'Custom';
          if (!activity.repeat_interval) {
              const parts = freq.split(' ');
              repeatInterval = parseInt(parts[1]) || 1;
              repeatUnit = parts[2]?.replace(/s$/, '') || 'day';
          }
      }
      else { repeatFrequency = freq; }

      setFormData({
        activityType: activity.activity_type,
        category: activity.category || '',
        repeatFrequency,
        repeatInterval,
        repeatUnit,
        repeatsTill: activity.repeats_till || '',
        timeOfDay: activity.time_of_day || 'Any time',
        description: activity.description || '',
        link: activity.link || '',
        imageUrl: activity.image_url || '',
        dueDate: activity.due_date || '',
        status: activity.status,
        steps: activity.steps || [],
      });
    } else {
      setEditingActivity(null);
      
      // Calculate default due date based on local time and kid's end time
      const now = new Date();
      let defaultDate = new Date();
      
      if (kid?.end_time) {
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [endHour, endMinute] = kid.end_time.split(':').map(Number);
        const endTime = endHour * 60 + endMinute;
        
        if (currentTime > endTime) {
          defaultDate.setDate(defaultDate.getDate() + 1);
        }
      }
      
      // Format as YYYY-MM-DD in local time
      const year = defaultDate.getFullYear();
      const month = String(defaultDate.getMonth() + 1).padStart(2, '0');
      const day = String(defaultDate.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;

      setFormData({
        activityType: '',
        category: '',
        repeatFrequency: 'Never',
        repeatInterval: 1,
        repeatUnit: 'day',
        repeatsTill: '',
        timeOfDay: 'Any time',
        description: '',
        link: '',
        imageUrl: '',
        dueDate: localDateString,
        status: 'pending',
        steps: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsModalOpen(false);
    setEditingActivity(null);
    setFormError(null);
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    console.log('Starting image upload...', file.name);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      console.log('Upload response status:', res.status);
      if (res.ok) {
        const data = await safeJson(res);
        console.log('Upload success, url:', data.imageUrl);
        return data.imageUrl;
      } else {
        const errorText = await res.text();
        console.error('Upload failed:', errorText);
        alert('Failed to upload image. Please try again.');
      }
    } catch (error) {
      console.error('Failed to upload image', error);
      alert('An error occurred while uploading the image.');
    } finally {
      setIsUploading(false);
    }
    return null;
  };

  const handleAddStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { step_number: formData.steps.length + 1, description: '', image_url: '' }],
    });
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    // Reorder step numbers
    const reorderedSteps = newSteps.map((step, i) => ({ ...step, step_number: i + 1 }));
    setFormData({ ...formData, steps: reorderedSteps });
  };

  const handleStepChange = (index: number, field: keyof ActivityStep, value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  const handleStepImageUpload = async (index: number, file: File) => {
    const imageUrl = await handleImageUpload(file);
    if (imageUrl) {
      handleStepChange(index, 'image_url', imageUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    console.log('Submitting form...', { kidId, formData });
    
    if (!kidId) {
      console.error('Missing kidId');
      return;
    }

    // Check if assigning for past dates or today past end time
    if (formData.dueDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Midnight today local time
      
      // Parse selected date as local time
      // formData.dueDate is "YYYY-MM-DD"
      const [y, m, d] = formData.dueDate.split('-').map(Number);
      const selectedDate = new Date(y, m - 1, d); // Local midnight of selected date
      
      // Compare timestamps
      if (selectedDate.getTime() < now.getTime()) {
        setFormError('You cannot assign activities for past dates. Please select today or a future date.');
        return;
      }

      // Check end time if selected date is today
      if (selectedDate.getTime() === now.getTime() && kid?.end_time) {
        const nowTime = new Date();
        const currentTime = nowTime.getHours() * 60 + nowTime.getMinutes();
        
        const [endHour, endMinute] = kid.end_time.split(':').map(Number);
        const endTime = endHour * 60 + endMinute;
        
        if (currentTime > endTime) {
          const [h, m] = kid.end_time.split(':').map(Number);
          const formattedEndTime = `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
          setFormError(`It is past ${kid.name}'s end time (${formattedEndTime}). Please assign this activity for another day.`);
          return;
        }
      }
    }

    try {
      const url = editingActivity 
        ? `/api/activities/${encodeURIComponent(editingActivity.id)}` 
        : '/api/activities';
      
      const method = editingActivity ? 'PUT' : 'POST';
      
      const body = {
        ...formData,
        repeatFrequency: formData.repeatFrequency === 'Custom' ? `Every ${formData.repeatInterval} ${formData.repeatUnit}${formData.repeatInterval > 1 ? 's' : ''}` : formData.repeatFrequency,
        repeat_interval: formData.repeatFrequency === 'Custom' ? formData.repeatInterval : null,
        repeat_unit: formData.repeatFrequency === 'Custom' ? formData.repeatUnit : null,
        repeatsTill: formData.repeatFrequency === 'Never' ? null : (formData.repeatsTill || null),
        kidId: kidId,
      };

      console.log('Sending request:', { url, method, body });

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      console.log('Response status:', res.status);

      if (res.ok) {
        handleCloseForm();
        fetchData(); // Refresh list
        fetchActivityTypes(); // Refresh types list
        fetchActivityCategories(); // Refresh categories list
      } else {
        let errData;
        try {
          errData = await safeJson(res);
        } catch (e) {
          errData = { error: 'Unknown error' };
        }
        console.error('Failed to save activity', errData);
        setFormError(`Failed to save: ${errData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save activity', error);
      setFormError('An error occurred while saving.');
    }
  };

  const handleDelete = (id: string) => {
    setActivityToDelete(id);
  };

  const handleSort = (key: keyof Activity) => {
    setActivitiesSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setActivitiesPage(1);
  };

  const confirmDelete = async () => {
    if (!activityToDelete) return;
    
    const id = activityToDelete;
    setActivityToDelete(null);

    console.log('Frontend: confirmDelete called for ID:', id);
    
    // Optimistic update: remove from UI immediately
    const previousActivities = [...activities];
    setActivities(prev => {
      const filtered = prev.filter(a => a.id !== id);
      console.log(`Frontend: Optimistic filter - Before: ${prev.length}, After: ${filtered.length}`);
      return filtered;
    });
    
    try {
      console.log(`Frontend: Sending DELETE request for activity ${id}`);
      const res = await apiFetch(`/api/activities/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('Frontend: DELETE response status:', res.status);
      
      if (res.ok) {
        console.log('Frontend: Delete confirmed by server');
        await fetchData();
      } else {
        const errData = await safeJson(res).catch(() => ({ error: 'Unknown error' }));
        console.error('Frontend: Delete failed on server:', errData);
        alert(`Failed to delete activity: ${errData.error || 'Unknown error'}`);
        // Rollback optimistic update
        setActivities(previousActivities);
      }
    } catch (error: any) {
      console.error('Frontend: Network error during delete:', error);
      alert(`An error occurred while deleting: ${error.message}`);
      // Rollback optimistic update
      setActivities(previousActivities);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    setIsPrinting(true);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print this list.');
      setIsPrinting(false);
      return;
    }

    const contentHtml = printRef.current.innerHTML;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Activities Report - ${kid?.name || 'Kid'}</title>
          ${styles}
          <style>
            @page {
              size: auto;
            }
            @media print {
              .no-print { display: none !important; }
              html, body { 
                margin: 0; 
                padding: 0; 
                background: white; 
                height: auto !important; 
                overflow: visible !important;
              }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              padding: 20px;
              height: auto !important;
              overflow: visible !important;
            }
            .print-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid black;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .logo-container {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .logo-icon {
              width: 32px;
              height: 32px;
              background: #2563eb;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
            }
            .logo-text {
              font-size: 20px;
              font-weight: bold;
              color: #1e3a8a !important;
              text-transform: uppercase;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .report-title {
              font-size: 24px;
              font-weight: 900;
              text-transform: uppercase;
              text-align: right;
              flex: 1;
              margin-left: 20px;
              color: black !important;
            }
            .print-container { width: 100%; position: relative; }
            .card { border: 1px solid #e2e8f0 !important; margin-bottom: 1rem !important; break-inside: avoid; }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="print-header">
              <div class="logo-container">
                <div class="logo-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                </div>
                <span class="logo-text">Visual Steps</span>
              </div>
              <h1 class="report-title">Activities Report</h1>
            </div>
            ${contentHtml}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setIsPrinting(false);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReward.name || newReward.cost <= 0) return;

    setIsSavingReward(true);
    try {
      const url = editingReward 
        ? `/api/reward-items/${encodeURIComponent(editingReward.id)}`
        : `/api/kids/${encodeURIComponent(kidId || '')}/reward-items`;
      const method = editingReward ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReward),
      });

      if (res.ok) {
        fetchRewardItems();
        setIsRewardModalOpen(false);
        setNewReward({ name: '', cost: 1, imageUrl: '', location: '' });
        setEditingReward(null);
      }
    } catch (error) {
      console.error('Failed to save reward', error);
    } finally {
      setIsSavingReward(false);
    }
  };

  const handleEditReward = (item: RewardItem) => {
    setEditingReward(item);
    setNewReward({
      name: item.name,
      cost: item.cost,
      imageUrl: item.image_url || '',
      location: item.location || ''
    });
    setIsRewardModalOpen(true);
  };

  const handleDeleteReward = (id: string) => {
    setRewardToDelete(id);
  };

  const confirmDeleteReward = async () => {
    if (!rewardToDelete) return;
    const id = rewardToDelete;
    setRewardToDelete(null);

    try {
      const res = await apiFetch(`/api/reward-items/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setRewardItems(rewardItems.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete reward', error);
    }
  };

  const toggleStatus = async (activity: Activity) => {
    try {
      const newStatus = activity.status === 'completed' ? 'pending' : 'completed';
      const res = await apiFetch(`/api/activities/${encodeURIComponent(activity.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityType: activity.activity_type,
          category: activity.category,
          repeatFrequency: activity.repeat_frequency,
          timeOfDay: activity.time_of_day,
          description: activity.description,
          link: activity.link,
          imageUrl: activity.image_url,
          dueDate: activity.due_date,
          status: newStatus,
        }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const renderCalendar = (activitiesToRender: Activity[]) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-16 border border-slate-100 bg-slate-50/50" />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayActivities = activitiesToRender.filter(a => 
        a.due_date === dateStr && 
        (activeTab !== 'activities' || a.status !== 'completed')
      );
      
      days.push(
        <div 
          key={day} 
          className={`h-16 border border-slate-100 p-1 bg-white cursor-pointer hover:bg-blue-50 transition-colors relative ${
            selectedDate === dateStr ? 'ring-2 ring-inset ring-blue-500' : ''
          }`}
          onClick={() => {
            setSelectedDate(dateStr);
            setViewMode('list');
          }}
        >
          <span className={`absolute top-1 left-1 text-[10px] font-bold ${
            dateStr === (() => {
              const d = new Date();
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            })()
              ? 'bg-blue-600 text-white px-1.5 py-0.5 rounded-full z-10' 
              : 'text-slate-400 z-10'
          }`}>
            {day}
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            {dayActivities.length > 0 && (
              <span className="text-lg font-black text-blue-600 leading-none">
                {dayActivities.length}
              </span>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between bg-white p-2 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {formatKidDate(currentMonth, { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="xs" 
              onClick={() => setCurrentMonth(new Date(year, month - 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="xs" 
              onClick={() => setCurrentMonth(new Date())}
              className="px-2 h-7 text-[10px]"
            >
              Today
            </Button>
            <Button 
              variant="ghost" 
              size="xs" 
              onClick={() => setCurrentMonth(new Date(year, month + 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 bg-slate-50 text-center py-1 border-b border-slate-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <span key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days}
        </div>
      </div>
    );
  };

  const renderCompletedTab = () => {
    const completedOriginal = activities.filter(a => a.status === 'completed' && (!selectedDate || a.due_date === selectedDate));
    
    const filteredCompleted = completedOriginal
      .filter(a => completedCategoryFilter === 'All' || (a.category || 'Uncategorized') === completedCategoryFilter)
      .filter(a => !completedDateFilter || a.due_date === completedDateFilter)
      .filter(a => a.activity_type.toLowerCase().includes(completedSearchQuery.toLowerCase()) || (a.description || '').toLowerCase().includes(completedSearchQuery.toLowerCase()));

    const totalCompletedPages = Math.ceil(filteredCompleted.length / completedItemsPerPage);
    const paginatedCompleted = filteredCompleted.slice((completedPage - 1) * completedItemsPerPage, completedPage * completedItemsPerPage);

    return (
      <Card className="border-none ring-1 ring-slate-200 shadow-sm">
        <CardContent className="p-0">
          {selectedDate && (
            <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/50 px-4 py-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-blue-900">
                  {formatKidDate(selectedDate + 'T12:00:00', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: undefined, minute: undefined })}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="xs" 
                onClick={() => setSelectedDate(null)}
                className="h-6 text-[10px] text-blue-600 hover:bg-blue-100 hover:text-blue-800"
              >
                Clear Filter
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 p-4 border-b border-slate-100">
            <input
              type="text"
              placeholder="Search by name or keyword..."
              className="flex-1 h-8 rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
              value={completedSearchQuery}
              onChange={(e) => {
                setCompletedSearchQuery(e.target.value);
                setCompletedPage(1);
              }}
            />
            <select
              className="h-8 rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
              value={completedCategoryFilter}
              onChange={(e) => {
                setCompletedCategoryFilter(e.target.value);
                setCompletedPage(1);
              }}
            >
              <option value="All">All Categories</option>
              {activityCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input
              type="date"
              className="h-8 rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
              value={completedDateFilter}
              onChange={(e) => {
                setCompletedDateFilter(e.target.value);
                setCompletedPage(1);
              }}
            />
          </div>

          {/* Pagination Controls */}
          {filteredCompleted.length > 0 && totalCompletedPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Per page:</span>
                <select
                  className="h-7 rounded border border-slate-300 bg-white px-2 text-xs"
                  value={completedItemsPerPage}
                  onChange={(e) => {
                    setCompletedItemsPerPage(Number(e.target.value));
                    setCompletedPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={completedPage === 1}
                  onClick={() => setCompletedPage(prev => Math.max(1, prev - 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-bold text-slate-600">
                  Page {completedPage} of {totalCompletedPages}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={completedPage === totalCompletedPages}
                  onClick={() => setCompletedPage(prev => Math.min(totalCompletedPages, prev + 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {filteredCompleted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <div className="bg-slate-50 p-4 rounded-full mb-3">
                <CheckCircle className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-600">{selectedDate ? 'No completed activities for this day' : 'No completed activities yet'}</p>
              <p className="text-xs mt-1">{selectedDate ? 'Try selecting another date or clear the filter.' : 'Activities you complete will appear here.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paginatedCompleted.map((activity) => (
                <div key={activity.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 truncate flex items-center gap-2">
                        {activity.activity_type}
                        {activity.link?.includes('/social-stories/view/') && (
                          <div className={`flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-600`}>
                            <Eye className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </h3>
                      {activity.category && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                          {activity.category}
                        </span>
                      )}
                    </div>
                    {activity.description && (
                      <p className="text-sm text-slate-600 truncate mt-0.5">{activity.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {activity.due_date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {activity.time_of_day}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-8 w-8 p-0"
                      onClick={() => setPreviewActivity(activity)}
                    >
                      <Eye className="h-4 w-4 text-slate-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-8 w-8 p-0"
                      onClick={() => handleOpenForm(activity)}
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDelete(activity.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-3 w-full" ref={printRef}>
      {!isModalOpen && !previewActivity && !viewingQuizResult ? (
        <>
          <div className="mb-6">
            <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </button>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 no-print">
              <div>
                <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">
                  {activeTab === 'activities' 
                    ? <div className="flex items-center gap-4"><LayoutList className="h-12 w-12 text-blue-600" /> Assigned Activities</div>
                    : activeTab === 'completed' 
                        ? <div className="flex items-center gap-4"><CheckCircle className="h-12 w-12 text-emerald-600" /> Completed Activities</div>
                        : activeTab === 'history'
                            ? <div className="flex items-center gap-4"><History className="h-12 w-12 text-purple-600" /> History</div>
                            : activeTab === 'progress'
                                ? <div className="flex items-center gap-4"><Activity className="h-12 w-12 text-indigo-600" /> Progress Report</div>
                                : <div className="flex items-center gap-4"><Award className="h-12 w-12 text-amber-500" /> Reward Items</div>}
                </h1>
                <p className="text-lg font-normal text-slate-500 mt-3">
                  {activeTab === 'activities' 
                    ? 'Organize daily tasks and track learning progress' 
                    : activeTab === 'completed' 
                        ? 'Activities that have been marked as completed. You can repeat them if you want.' 
                        : activeTab === 'history'
                            ? 'View past activity and reward history.'
                            : activeTab === 'progress'
                                ? 'Track learning progress and activity trends.'
                                : 'Add or edit reward items'}
                </p>
              </div>
              
              <div className="flex gap-2">
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 overflow-x-auto scrollbar-hide">
                  <CustomTooltip content="View all assigned activities">
                    <button
                      onClick={() => setActiveTab('activities')}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                        activeTab === 'activities' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <LayoutList className="h-3 w-3" />
                      Activities
                    </button>
                  </CustomTooltip>
                  <CustomTooltip content="View completed activities">
                    <button
                      onClick={() => setActiveTab('completed')}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                        activeTab === 'completed' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle className="h-3 w-3" />
                      Completed
                    </button>
                  </CustomTooltip>
                  <CustomTooltip content="View activity history">
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                        activeTab === 'history' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <History className="h-3 w-3" />
                      History
                    </button>
                  </CustomTooltip>
                  <CustomTooltip content="Manage your rewards">
                    <button
                      onClick={() => setActiveTab('rewards')}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                        activeTab === 'rewards' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      Rewards
                    </button>
                  </CustomTooltip>
                  <CustomTooltip content="View progress report">
                    <button
                      onClick={() => setActiveTab('progress')}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                        activeTab === 'progress' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Activity className="h-3 w-3" />
                      Progress Report
                    </button>
                  </CustomTooltip>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="xs" onClick={handlePrint} disabled={isPrinting} className="h-7 text-[12px] shrink-0">
                    <Printer className={`mr-1 h-3 w-3 ${isPrinting ? 'animate-pulse' : ''}`} />
                    Print List
                  </Button>
                  {activeTab === 'activities' ? (
                    <Button size="xs" onClick={() => handleOpenForm()} className="h-7 text-[12px] shrink-0">
                      <Plus className="mr-1 h-3 w-3" />
                      Add Activity
                    </Button>
                  ) : activeTab === 'rewards' ? (
                    <Button size="xs" onClick={() => setIsRewardModalOpen(true)} className="h-7 text-[12px] shrink-0">
                      <Plus className="mr-1 h-3 w-3" />
                      Add Item
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {(activeTab === 'activities' || activeTab === 'completed' || activeTab === 'history') && (
              <div className="flex items-center justify-between gap-4 no-print">
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 text-sm font-medium transition-all ${
                      viewMode === 'list' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <LayoutList className="h-4 w-4 inline mr-1" />
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-4 py-2 text-sm font-medium transition-all ${
                      viewMode === 'calendar' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Calendar
                  </button>
                </div>
              </div>
          )}

          {isLoading && activeTab === 'activities' ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : viewMode === 'calendar' ? (
            <Card className="border-none ring-1 ring-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {activeTab === 'activities' && <LayoutList className="h-5 w-5 text-blue-600" />}
                  {activeTab === 'completed' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                  {activeTab === 'history' && <History className="h-5 w-5 text-blue-600" />}
                  {activeTab === 'activities' ? 'Activities Calendar' : activeTab === 'completed' ? 'Completed Activities Calendar' : 'Activity History Calendar'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderCalendar(activitiesToRender)}
              </CardContent>
            </Card>
          ) : activeTab === 'activities' ? (
            activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                <div className="rounded-full bg-slate-100 p-3">
                  <Calendar className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-900">No activities yet</h3>
                <p className="mt-1 text-[12px] text-slate-500">
                  Start by assigning some activities.
                </p>
                <Button size="xs" onClick={() => handleOpenForm()} className="mt-4">
                  Add First Activity
                </Button>
              </div>
            ) : (
            <div className="space-y-2">
              {selectedDate && (
                <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-bold text-blue-900">
                      {formatKidDate(selectedDate + 'T12:00:00', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: undefined, minute: undefined })}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    onClick={() => setSelectedDate(null)}
                    className="h-7 text-[11px] text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                  >
                    Clear Filter
                  </Button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-y border-slate-200">
                    <tr>
                      <th className="py-2 px-4">
                        <select
                          value={activitiesItemsPerPage}
                          onChange={(e) => setActivitiesItemsPerPage(Number(e.target.value))}
                          className="text-xs border border-slate-300 rounded p-1"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </th>
                      <th colSpan={4} className="py-2"></th>
                      <th className="px-4 py-2 text-right">
                        {(() => {
                          const filtered = activitiesToRender.filter(a => !selectedDate || a.due_date === selectedDate);
                          const totalActivitiesPages = Math.ceil(filtered.length / activitiesItemsPerPage);
                          return (
                            filtered.length > 0 && totalActivitiesPages > 1 && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  disabled={activitiesPage === 1}
                                  onClick={() => setActivitiesPage(prev => Math.max(1, prev - 1))}
                                  className="h-7 w-7 p-0"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs font-bold text-slate-600">
                                  {activitiesPage} / {totalActivitiesPages}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  disabled={activitiesPage === totalActivitiesPages}
                                  onClick={() => setActivitiesPage(prev => Math.min(totalActivitiesPages, prev + 1))}
                                  className="h-7 w-7 p-0"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            )
                          );
                        })()}
                      </th>
                    </tr>
                    <tr>
                      <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSort('status')}>Status</th>
                      <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSort('activity_type')}>Activity</th>
                      <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSort('repeat_frequency')}>Repeat</th>
                      <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSort('due_date')}>Due Date</th>
                      <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSort('time_of_day')}>Time</th>
                      <th className="px-4 py-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const filtered = activitiesToRender.filter(a => !selectedDate || a.due_date === selectedDate);
                      
                      const sorted = [...filtered].sort((a, b) => {
                        if (!activitiesSortConfig.key) {
                          if (a.status === b.status) return 0;
                          return a.status === 'completed' ? 1 : -1;
                        }
                        const aValue = a[activitiesSortConfig.key];
                        const bValue = b[activitiesSortConfig.key];
                        if (aValue === bValue) return 0;
                        const comparison = aValue! < bValue! ? -1 : 1;
                        return activitiesSortConfig.direction === 'asc' ? comparison : -comparison;
                      });

                      const totalActivitiesPages = Math.ceil(sorted.length / activitiesItemsPerPage);
                      const paginated = sorted.slice((activitiesPage - 1) * activitiesItemsPerPage, activitiesPage * activitiesItemsPerPage);

                      return paginated.map((activity) => (
                      <tr key={activity.id} className={`hover:bg-slate-50 transition-colors ${activity.status === 'completed' ? 'bg-slate-50 opacity-75' : 'bg-white'}`}>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => {
                              if (activity.status !== 'completed') {
                                toggleStatus(activity);
                              }
                            }}
                            disabled={activity.status === 'completed'}
                            className={`flex-shrink-0 rounded-full transition-colors ${
                              activity.status === 'completed' ? 'text-emerald-500 cursor-default' : 'text-slate-300 hover:text-blue-500'
                            }`}
                          >
                            {activity.status === 'completed' ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <Circle className="h-5 w-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`font-bold flex items-center gap-2 ${activity.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                            {activity.image_url && (
                              <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded border border-slate-200">
                                <img src={activity.image_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            )}
                            {activity.activity_type}
                            {activity.link?.includes('/social-stories/view/') && (
                              <div className={`flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-600`}>
                                <Eye className="h-2.5 w-2.5" />
                              </div>
                            )}
                          </div>
                          {activity.description && (
                            <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {activity.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {activity.repeat_frequency}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {activity.due_date}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {activity.time_of_day}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-7 w-7 p-0"
                              onClick={() => setPreviewActivity(activity)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                            </Button>
                            {activity.status !== 'completed' && (
                              <Button
                                variant="ghost"
                                size="xs"
                                className="h-7 w-7 p-0"
                                onClick={() => handleOpenForm(activity)}
                                title="Edit Activity"
                              >
                                <Edit2 className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                              </Button>
                            )}
                            <button
                              type="button"
                              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-50 group transition-all active:scale-95"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(activity.id);
                              }}
                              title="Delete Activity"
                            >
                              <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                    })()}
                  </tbody>
                </table>
              </div>
            {selectedDate && activities.filter(a => a.status !== 'completed').filter(a => a.due_date === selectedDate).length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                <p className="text-sm font-medium text-slate-500">No activities scheduled for this day.</p>
                <Button 
                  size="xs" 
                  onClick={() => {
                    handleOpenForm();
                    setFormData(prev => ({ ...prev, dueDate: selectedDate }));
                  }} 
                  className="mt-2"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Activity
                </Button>
              </div>
            )}
            {!selectedDate && activities.filter(a => a.status !== 'completed').length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                <div className="rounded-full bg-slate-100 p-3 mb-3">
                  <LayoutList className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-900">
                  All caught up!
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  There are no pending activities to show.
                </p>
              </div>
            )}
          </div>
        )) : activeTab === 'completed' ? (
          renderCompletedTab()
        ) : activeTab === 'history' ? (
        <Card className="border-none ring-1 ring-slate-200 shadow-sm">
          <CardContent className="p-0">
            {selectedDate && (
              <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/50 px-4 py-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-[11px] font-bold text-blue-900">
                    {formatKidDate(selectedDate + 'T12:00:00', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: undefined, minute: undefined })}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="xs" 
                  onClick={() => setSelectedDate(null)}
                  className="h-6 text-[10px] text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                >
                  Clear Filter
                </Button>
              </div>
            )}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  placeholder="Search by name or keyword..."
                  className="flex-1 h-8 rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                />
                <select
                  className="h-8 rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={historyCategoryFilter}
                  onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {activityCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <input
                  type="date"
                  className="h-8 rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                />
              </div>
            </div>

            {(() => {
              const filteredHistory = historyActivities
                .filter(a => !selectedDate || a.due_date === selectedDate)
                .filter(a => historyCategoryFilter === 'All' || (a.category || 'Uncategorized') === historyCategoryFilter)
                .filter(a => !historyDateFilter || (a.completed_at ? a.completed_at.split('T')[0] : a.due_date) === historyDateFilter)
                .filter(a => a.activity_type.toLowerCase().includes(historySearchQuery.toLowerCase()) || (a.description || '').toLowerCase().includes(historySearchQuery.toLowerCase()));
              
              const totalHistoryPages = Math.ceil(filteredHistory.length / historyItemsPerPage);
              const paginatedHistory = filteredHistory.slice((historyPage - 1) * historyItemsPerPage, historyPage * historyItemsPerPage);

              return (
                <>
                  {/* Pagination Controls */}
                  {filteredHistory.length > 0 && totalHistoryPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/30">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Per page:</span>
                        <select
                          className="h-7 rounded border border-slate-300 bg-white px-2 text-xs"
                          value={historyItemsPerPage}
                          onChange={(e) => {
                            setHistoryItemsPerPage(Number(e.target.value));
                            setHistoryPage(1);
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={historyPage === 1}
                          onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                          className="h-7 w-7 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-bold text-slate-600">
                          Page {historyPage} of {totalHistoryPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={historyPage === totalHistoryPages}
                          onClick={() => setHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                          className="h-7 w-7 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {filteredHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                      <div className="bg-slate-50 p-4 rounded-full mb-3">
                        <History className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-600">{selectedDate ? 'No history for this day' : 'No history yet'}</p>
                      <p className="text-xs mt-1">{selectedDate ? 'Try selecting another date or clear the filter.' : 'Completed activities will appear here.'}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-y border-slate-200">
                        <tr>
                          <th className="px-4 py-3 font-bold">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedHistoryIds.length === filteredHistory.length && filteredHistory.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedHistoryIds(filteredHistory.map(a => a.id));
                                  } else {
                                    setSelectedHistoryIds([]);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className={`h-8 w-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${
                                  selectedHistoryIds.length > 0 
                                    ? 'hover:bg-red-50 group' 
                                    : 'opacity-50 cursor-not-allowed'
                                }`}
                                onClick={() => {
                                  if (selectedHistoryIds.length === 0) return;
                                  setIsHistoryDeleteConfirmOpen(true);
                                }}
                                title="Delete Selected Activities"
                                disabled={selectedHistoryIds.length === 0}
                              >
                                <Trash2 className={`h-5 w-5 ${selectedHistoryIds.length > 0 ? 'text-slate-400 group-hover:text-red-500' : 'text-slate-400'}`} />
                              </button>
                            </div>
                          </th>
                          <th className="px-4 py-3 font-bold">Activity</th>
                          <th className="px-4 py-3 font-bold">Category</th>
                          <th className="px-4 py-3 font-bold">Completion Date</th>
                          <th className="px-4 py-3 font-bold">Time</th>
                          <th className="px-4 py-3 font-bold">Reward</th>
                          <th className="px-4 py-3 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedHistory.map((activity) => (
                          <tr key={activity.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedHistoryIds.includes(activity.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedHistoryIds([...selectedHistoryIds, activity.id]);
                                  } else {
                                    setSelectedHistoryIds(selectedHistoryIds.filter(id => id !== activity.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                {activity.image_url && (
                                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded border border-slate-200">
                                    <img src={activity.image_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                )}
                                {activity.activity_type}
                                {activity.link?.includes('/social-stories/view/') && (
                                  <div className={`flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-600`}>
                                    <Eye className="h-2.5 w-2.5" />
                                  </div>
                                )}
                              </div>
                              {activity.description && (
                                <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{activity.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {activity.category && (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                                  {activity.category}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                              {formatKidDate(activity.due_date + 'T12:00:00', { month: 'short', day: 'numeric', year: 'numeric', hour: undefined, minute: undefined })}
                            </td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                              {activity.time_of_day}
                            </td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                              <div className="text-[11px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                                <img src={rewardIcon} alt={kid?.reward_type} className="h-3 w-3 object-contain" referrerPolicy="no-referrer" />
                                +{activity.reward_qty || 0} {formatReward(kid?.reward_type, activity.reward_qty || 0)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="xs"
                                className="h-7 w-7 p-0"
                                onClick={() => setPreviewActivity(activity)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          );
        })()}
          </CardContent>
        </Card>
      ) : activeTab === 'progress' ? (() => {
        // Filter history based on duration
        const filteredHistory = historyActivities.filter(h => {
          if (reportDuration === 'all') return true;
          if (!h.completed_at) return false;
          const completedDate = new Date(h.completed_at);
          const now = new Date();
          const diffMs = Math.abs(now.getTime() - completedDate.getTime());
          const diffHours = diffMs / (1000 * 60 * 60);
          
          if (reportDuration === '24h') return diffHours <= 24;
          if (reportDuration === '7d') return diffHours <= 24 * 7;
          if (reportDuration === '30d') return diffHours <= 24 * 30;
          return true;
        });

        // Group "Parent Bonus" entries by same minute
        const groupedHistory: any[] = [];
        const bonusGroups: { [key: string]: any } = {};
        
        filteredHistory.forEach(item => {
          if (item.activity_type === 'Parent Bonus' && item.completed_at) {
            // Group by the formatted date/time (which is down to the minute)
            const timeKey = formatKidDate(item.completed_at);
            if (!bonusGroups[timeKey]) {
              bonusGroups[timeKey] = { 
                ...item, 
                reward_qty: 0,
                // Keep the original ID or generate a unique one for the group
                id: `bonus-group-${timeKey}`
              };
            }
            bonusGroups[timeKey].reward_qty += (Number(item.reward_qty) || 0);
          } else {
            groupedHistory.push(item);
          }
        });

        const finalHistory = [...groupedHistory, ...Object.values(bonusGroups)];
        const sortedHistory = finalHistory.sort((a, b) => new Date(b.completed_at || '').getTime() - new Date(a.completed_at || '').getTime());
        const totalHistoryPages = Math.ceil(sortedHistory.length / historyItemsPerPage);
        const paginatedHistory = sortedHistory.slice((historyPage - 1) * historyItemsPerPage, historyPage * historyItemsPerPage);

        // Combine history and currently completed activities for a complete picture
        const currentCompleted = activities.filter(a => {
          if (a.status !== 'completed' || !a.completed_at) return false;
          if (reportDuration === 'all') return true;
          
          const completedDate = new Date(a.completed_at);
          const now = new Date();
          const diffMs = Math.abs(now.getTime() - completedDate.getTime());
          const diffHours = diffMs / (1000 * 60 * 60);
          
          if (reportDuration === '24h') return diffHours <= 24;
          if (reportDuration === '7d') return diffHours <= 24 * 7;
          if (reportDuration === '30d') return diffHours <= 24 * 30;
          return true;
        });

        const combinedCompleted = [...filteredHistory, ...currentCompleted];

        // Activities completed should only count actual activities, not manual reward adjustments
        const actualActivitiesCompleted = combinedCompleted.filter(item => item.activity_type !== 'Parent Bonus');
        const completedCount = actualActivitiesCompleted.length;
        
        const totalRewardsEarned = combinedCompleted.reduce((sum, item) => sum + (Number(item.reward_qty) || 0), 0);
        
        // Group by category (including manual rewards if we want them in the chart, or excluding them)
        // Let's exclude manual rewards from the "Activity" charts to keep them focused on tasks
        const categories = Array.from(new Set(actualActivitiesCompleted.map(a => a.category || 'Uncategorized')));
        const categoryData = categories.map(cat => ({
          name: cat,
          completed: actualActivitiesCompleted.filter(a => (a.category || 'Uncategorized') === cat).length
        })).sort((a, b) => b.completed - a.completed);

        const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

        // Group by activity name
        const activityNames = Array.from(new Set(actualActivitiesCompleted.map(a => a.activity_type)));
        const activityData = activityNames.map(name => ({
          name: name,
          completed: actualActivitiesCompleted.filter(a => a.activity_type === name).length
        })).sort((a, b) => b.completed - a.completed).slice(0, 10); // Top 10

        // Group by week
        const weeklyDataMap: { [key: string]: number } = {};
        actualActivitiesCompleted.forEach(a => {
          if (!a.completed_at) return;
          const date = new Date(a.completed_at);
          if (isNaN(date.getTime())) return;
          // Get the start of the week (Monday)
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1);
          const weekStart = new Date(date.getFullYear(), date.getMonth(), diff);
          if (isNaN(weekStart.getTime())) return;
          const weekKey = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          weeklyDataMap[weekKey] = (weeklyDataMap[weekKey] || 0) + 1;
        });
        const weeklyData = Object.entries(weeklyDataMap)
          .map(([name, completed]) => ({ name, completed }))
          .sort((a, b) => new Date(a.name.replace('Week of ', '')).getTime() - new Date(b.name.replace('Week of ', '')).getTime());

        // Group by date
        const dailyDataMap: { [key: string]: { activityCount: number, totalRewards: number, date: Date } } = {};
        combinedCompleted.forEach(item => {
          if (!item.completed_at) return;
          const date = new Date(item.completed_at);
          if (isNaN(date.getTime())) return;
          const dateKey = date.toISOString().split('T')[0];
          if (!dailyDataMap[dateKey]) {
            dailyDataMap[dateKey] = { activityCount: 0, totalRewards: 0, date: date };
          }
          if (item.activity_type !== 'Parent Bonus') {
            dailyDataMap[dateKey].activityCount++;
          }
          dailyDataMap[dateKey].totalRewards += (Number(item.reward_qty) || 0);
        });
        const dailyData = Object.entries(dailyDataMap)
          .map(([key, value]) => ({ 
            name: value.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
            completed: value.activityCount,
            rewards: value.totalRewards,
            fullDate: value.date
          }))
          .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());

        // Filter purchases based on duration
        const filteredPurchases = purchases.filter(r => {
          if (reportDuration === 'all') return true;
          const purchasedDate = new Date(r.purchased_at);
          const now = new Date();
          const diffMs = Math.abs(now.getTime() - purchasedDate.getTime());
          const diffHours = diffMs / (1000 * 60 * 60);
          
          if (reportDuration === '24h') return diffHours <= 24;
          if (reportDuration === '7d') return diffHours <= 24 * 7;
          if (reportDuration === '30d') return diffHours <= 24 * 30;
          return true;
        });

        const sortedPurchases = [...filteredPurchases].sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime());
        const totalPurchasePages = Math.ceil(sortedPurchases.length / purchaseItemsPerPage);
        const paginatedPurchases = sortedPurchases.slice((purchasePage - 1) * purchaseItemsPerPage, purchasePage * purchaseItemsPerPage);

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration:</span>
                <select 
                  value={reportDuration}
                  onChange={(e) => setReportDuration(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-none ring-1 ring-slate-200 bg-emerald-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-100 p-2 text-emerald-600">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Activities Completed</p>
                      <p className="text-2xl font-black text-slate-900">{completedCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none ring-1 ring-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                      <LayoutList className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unique Categories</p>
                      <p className="text-2xl font-black text-slate-900">{categories.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none ring-1 ring-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-purple-100 p-2 text-purple-600">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reward Balance</p>
                      <p className="text-2xl font-black text-slate-900">{kid?.reward_balance || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none ring-1 ring-slate-200 bg-yellow-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-yellow-100 p-2 text-yellow-600">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rewards Earned</p>
                      <p className="text-2xl font-black text-slate-900">{totalRewardsEarned}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-none ring-1 ring-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-blue-600" />
                    Category Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    {filteredHistory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="completed"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartRechartsTooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            align="center"
                            iconType="circle"
                            wrapperStyle={{ fontSize: '10px', fontWeight: 600, paddingTop: '10px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-slate-400">
                        <History className="h-12 w-12 mb-2 opacity-20" />
                        <p className="text-sm font-bold italic">No history</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none ring-1 ring-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-purple-600" />
                    Weekly Activity Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    {weeklyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={weeklyData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="completed"
                          >
                            {weeklyData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[(index + 3) % PIE_COLORS.length]} />
                            ))}
                            <Label 
                              content={({ viewBox }) => {
                                const { cx, cy } = viewBox as any;
                                return (
                                  <g>
                                    <text
                                      x={cx}
                                      y={cy - 5}
                                      textAnchor="middle"
                                      dominantBaseline="central"
                                      className="text-2xl font-black fill-slate-900"
                                    >
                                      {totalRewardsEarned}
                                    </text>
                                    <text
                                      x={cx}
                                      y={cy + 15}
                                      textAnchor="middle"
                                      dominantBaseline="central"
                                      className="text-[8px] font-bold uppercase tracking-wider fill-slate-400"
                                    >
                                      Total Earned
                                    </text>
                                  </g>
                                );
                              }}
                            />
                          </Pie>
                          <ChartRechartsTooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            align="center"
                            iconType="circle"
                            wrapperStyle={{ fontSize: '10px', fontWeight: 600, paddingTop: '10px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-slate-400">
                        <History className="h-12 w-12 mb-2 opacity-20" />
                        <p className="text-sm font-bold italic">No history</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none ring-1 ring-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChartIcon className="h-4 w-4 text-blue-600" />
                    Activity by Dates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    {dailyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyData}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                          />
                          <ChartRechartsTooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="completed" name="Completed" radius={[4, 4, 0, 0]}>
                            {dailyData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                            <LabelList 
                              dataKey="rewards" 
                              position="top" 
                              style={{ fontSize: '10px', fontWeight: 800, fill: '#3b82f6' }}
                              formatter={(value: number) => value > 0 ? `+${value}` : ''}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-slate-400">
                        <History className="h-12 w-12 mb-2 opacity-20" />
                        <p className="text-sm font-bold italic">No history</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none ring-1 ring-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Top Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    {filteredHistory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activityData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                            width={100}
                          />
                          <ChartRechartsTooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="completed" name="Completed" radius={[0, 4, 4, 0]}>
                            {activityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-slate-400">
                        <History className="h-12 w-12 mb-2 opacity-20" />
                        <p className="text-sm font-bold italic">No history</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="border-none ring-1 ring-slate-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <History className="h-4 w-4 text-blue-600" />
                    Recent History ({sortedHistory.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Per page:</span>
                    <select 
                      className="h-6 rounded border border-slate-200 bg-white px-1 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-blue-600"
                      value={historyItemsPerPage}
                      onChange={(e) => setHistoryItemsPerPage(Number(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={40}>40</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {paginatedHistory.map(activity => (
                    <div key={activity.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                      <div className="rounded-full bg-emerald-100 p-1.5 text-emerald-600">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                          {activity.activity_type}
                          {activity.link?.includes('/social-stories/view/') && (
                            <div className={`flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-600`}>
                              <Eye className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </div>
                        {activity.description && (
                          <p className="text-[11px] text-slate-600 truncate">{activity.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{activity.category}</span>
                          <span className="text-[10px] text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {activity.completed_at ? formatKidDate(activity.completed_at) : activity.due_date}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-full flex items-center gap-1">
                        <img src={rewardIcon} alt={kid?.reward_type} className="h-3 w-3 object-contain" referrerPolicy="no-referrer" />
                        +{activity.reward_qty || 0} {formatReward(kid?.reward_type, activity.reward_qty || 0)}
                      </div>
                    </div>
                  ))}
                  
                  {filteredHistory.length > 0 && totalHistoryPages > 1 && (
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        Page {historyPage} of {totalHistoryPages}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={historyPage === 1}
                          onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                          className="h-7 w-7 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalHistoryPages) }, (_, i) => {
                            let pageNum;
                            if (totalHistoryPages <= 5) {
                              pageNum = i + 1;
                            } else if (historyPage <= 3) {
                              pageNum = i + 1;
                            } else if (historyPage >= totalHistoryPages - 2) {
                              pageNum = totalHistoryPages - 4 + i;
                            } else {
                              pageNum = historyPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={historyPage === pageNum ? 'primary' : 'ghost'}
                                size="xs"
                                onClick={() => setHistoryPage(pageNum)}
                                className={`h-7 w-7 p-0 text-[10px] font-bold ${historyPage === pageNum ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={historyPage === totalHistoryPages}
                          onClick={() => setHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                          className="h-7 w-7 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {filteredHistory.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-bold italic">No history found for the selected duration.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="border-none ring-1 ring-slate-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Award className="h-4 w-4 text-purple-600" />
                    Purchase History ({filteredPurchases.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Per page:</span>
                    <select 
                      className="h-6 rounded border border-slate-200 bg-white px-1 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-blue-600"
                      value={purchaseItemsPerPage}
                      onChange={(e) => setPurchaseItemsPerPage(Number(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={40}>40</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {paginatedPurchases.map(purchase => (
                    <div key={purchase.id} className="flex items-center gap-3 rounded-lg bg-purple-50/30 p-2.5 border border-purple-100/50">
                      <div className="rounded-full bg-purple-100 p-1.5 text-purple-600">
                        <img src={rewardIcon} alt={kid?.reward_type} className="h-4 w-4 object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{purchase.item_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {formatKidDate(purchase.purchased_at)}
                        </p>
                      </div>
                      <div className="text-[11px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-full flex items-center gap-1">
                        <img src={rewardIcon} alt={kid?.reward_type} className="h-3 w-3 object-contain" referrerPolicy="no-referrer" />
                        -{purchase.cost} {formatReward(kid?.reward_type, purchase.cost)}
                      </div>
                    </div>
                  ))}

                  {filteredPurchases.length > 0 && totalPurchasePages > 1 && (
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        Page {purchasePage} of {totalPurchasePages}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={purchasePage === 1}
                          onClick={() => setPurchasePage(prev => Math.max(1, prev - 1))}
                          className="h-7 w-7 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPurchasePages) }, (_, i) => {
                            let pageNum;
                            if (totalPurchasePages <= 5) {
                              pageNum = i + 1;
                            } else if (purchasePage <= 3) {
                              pageNum = i + 1;
                            } else if (purchasePage >= totalPurchasePages - 2) {
                              pageNum = totalPurchasePages - 4 + i;
                            } else {
                              pageNum = purchasePage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={purchasePage === pageNum ? 'primary' : 'ghost'}
                                size="xs"
                                onClick={() => setPurchasePage(pageNum)}
                                className={`h-7 w-7 p-0 text-[10px] font-bold ${purchasePage === pageNum ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={purchasePage === totalPurchasePages}
                          onClick={() => setPurchasePage(prev => Math.min(totalPurchasePages, prev + 1))}
                          className="h-7 w-7 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {isPurchasesTableMissing ? (
                    <div className="text-center py-8 bg-amber-50 rounded-xl border border-amber-200">
                      <Lock className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-amber-800 px-4">
                        Database table not found. Please ask your administrator to run the SQL setup script to enable purchase history.
                      </p>
                    </div>
                  ) : filteredPurchases.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <Award className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-bold italic">No items bought in this period.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quiz Results</CardTitle>
              </CardHeader>
              <CardContent>
                {quizResults.filter(q => {
                  if (reportDuration === 'all') return true;
                  if (!q.completed_at) return false;
                  const completedDate = new Date(q.completed_at);
                  const now = new Date();
                  const diffMs = Math.abs(now.getTime() - completedDate.getTime());
                  const diffHours = diffMs / (1000 * 60 * 60);
                  
                  if (reportDuration === '24h') return diffHours <= 24;
                  if (reportDuration === '7d') return diffHours <= 24 * 7;
                  if (reportDuration === '30d') return diffHours <= 24 * 30;
                  return true;
                }).length === 0 ? (
                  <p className="text-slate-500">No quiz results yet.</p>
                ) : (
                  <div className="space-y-4">
                    {quizResults.filter(q => {
                      if (reportDuration === 'all') return true;
                      if (!q.completed_at) return false;
                      const completedDate = new Date(q.completed_at);
                      const now = new Date();
                      const diffMs = Math.abs(now.getTime() - completedDate.getTime());
                      const diffHours = diffMs / (1000 * 60 * 60);
                      
                      if (reportDuration === '24h') return diffHours <= 24;
                      if (reportDuration === '7d') return diffHours <= 24 * 7;
                      if (reportDuration === '30d') return diffHours <= 24 * 30;
                      return true;
                    }).map(res => (
                      <div 
                        key={res.id} 
                        className="flex justify-between items-center border-b pb-2 cursor-pointer hover:bg-slate-50 transition-colors p-1 rounded"
                        onClick={() => setViewingQuizResult(res)}
                      >
                        <div>
                          <p className="font-medium">{res.quizzes?.title || 'Quiz'}</p>
                          <p className="text-sm text-slate-500">{formatKidDate(res.completed_at)}</p>
                        </div>
                        <div className="font-bold text-blue-600">
                          {res.score} / {res.total_questions}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })() : activeTab === 'rewards' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rewardItems.map((item) => (
              <Card key={item.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex h-24">
                    <div className="h-24 w-24 flex-shrink-0 bg-slate-100 border-r border-slate-100">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <Sparkles className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-3 min-w-0">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 truncate">{item.name}</h3>
                        <div className="mt-1 flex items-center gap-1 text-xs font-black text-blue-600 uppercase tracking-wider">
                          <img src={rewardIcon} alt={kid?.reward_type} className="h-3 w-3 object-contain" referrerPolicy="no-referrer" />
                          {item.cost} {formatReward(kid?.reward_type, item.cost)}
                        </div>
                        {item.location && (
                          <div className="mt-1 text-[10px] font-medium text-slate-500 flex items-center gap-1">
                            <span className="inline-block w-1 h-1 rounded-full bg-slate-300"></span>
                            {item.location}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-7 w-7 p-0 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => handleEditReward(item)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-7 w-7 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDeleteReward(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {rewardItems.length === 0 && (
              <div className="col-span-full py-12 text-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Sparkles className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No reward items yet</h3>
                <p className="text-[12px] text-slate-500">Add items that can be bought for rewards.</p>
                <Button size="xs" onClick={() => setIsRewardModalOpen(true)} className="mt-4">
                  Add First Item
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  ) : viewingQuizResult ? (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="xs" onClick={() => setViewingQuizResult(null)} className="pl-0 h-7 hover:bg-transparent hover:text-blue-600 text-[12px] font-bold uppercase">
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to Reports
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
          Quiz Detail: {viewingQuizResult.quizzes?.title || 'Quiz'}
        </h1>
      </div>

      <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
        <CardHeader className="py-3 px-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-bold">Results Summary</CardTitle>
            <div className="text-lg font-black text-blue-600">
              Score: {viewingQuizResult.score} / {viewingQuizResult.total_questions}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Completed on {new Date(viewingQuizResult.completed_at).toLocaleString()}
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {viewingQuizResult.questions && viewingQuizResult.questions.map((q: any, idx: number) => {
            const kidAnswerIndex = viewingQuizResult.responses ? viewingQuizResult.responses[idx] : -1;
            const isCorrect = kidAnswerIndex === q.correctAnswerIndex;
            
            return (
              <div key={idx} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-emerald-100 bg-emerald-50/30' : 'border-red-100 bg-red-50/30'}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {isCorrect ? <CheckCircle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800">{idx + 1}. {q.question}</h4>
                    
                    <div className="mt-3 space-y-2">
                      {q.options.map((option: string, optIdx: number) => {
                        const isKidChoice = optIdx === kidAnswerIndex;
                        const isCorrectChoice = optIdx === q.correctAnswerIndex;
                        
                        let optionClass = "p-2 rounded-lg text-sm border ";
                        if (isCorrectChoice) {
                          optionClass += "border-emerald-500 bg-emerald-100 text-emerald-800 font-bold";
                        } else if (isKidChoice && !isCorrectChoice) {
                          optionClass += "border-red-500 bg-red-100 text-red-800 font-bold";
                        } else {
                          optionClass += "border-slate-200 bg-white text-slate-600";
                        }

                        return (
                          <div key={optIdx} className={optionClass}>
                            <div className="flex items-center justify-between">
                              <span>{option}</span>
                              {isKidChoice && (
                                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-white/50">
                                  Kid's Choice
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {q.explanation && (
                      <div className="mt-3 p-2 bg-white/50 rounded border border-slate-100 text-xs italic text-slate-600">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  ) : isModalOpen ? (
    <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="xs" onClick={handleCloseForm} className="pl-0 h-7 hover:bg-transparent hover:text-blue-600 text-[12px] font-bold uppercase">
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back to List
            </Button>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
              {editingActivity ? 'Edit Activity' : 'New Activity'}
            </h1>
          </div>
          <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-2 px-4 space-y-0">
              <CardTitle className="text-base font-bold">{editingActivity ? 'Edit Activity Details' : 'Activity Details'}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <form onSubmit={handleSubmit} className="space-y-2.5">
                {formError && (
                  <div className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-600 border border-red-100">
                    {formError}
                  </div>
                )}

                {editingActivity && editingActivity.status === 'completed' && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-100">
                    <input
                      type="radio"
                      id="status-pending"
                      checked={formData.status === 'pending'}
                      onChange={() => setFormData({ ...formData, status: 'pending' })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="status-pending" className="text-sm font-medium text-blue-800">
                      Re-assign
                    </label>
                  </div>
                )}

                {!editingActivity && (
                  <div className="grid gap-2.5 md:grid-cols-2">
                    <div className="space-y-0.5 p-2 bg-blue-50 rounded border border-blue-100">
                      <label className="text-[12px] font-bold text-blue-600 uppercase">Select Activity Type (Optional)</label>
                      <select
                        className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                        value={predefinedType}
                        onChange={(e) => {
                          setPredefinedType(e.target.value);
                          setPredefinedId('');
                        }}
                      >
                        <option value="">-- Select Type --</option>
                        <option value="quiz">Quizzes</option>
                        <option value="story">Social Stories</option>
                        <option value="worksheet">Worksheets</option>
                      </select>
                    </div>

                    <div className="space-y-0.5 p-2 bg-blue-50 rounded border border-blue-100">
                      <label className="text-[12px] font-bold text-blue-600 uppercase">Select Pre-defined Activity</label>
                      <select
                        className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-slate-50 disabled:cursor-not-allowed"
                        disabled={!predefinedType}
                        value={predefinedId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPredefinedId(val);
                          if (!val) return;
                          
                          if (predefinedType === 'story') {
                            const story = socialStories.find(s => s.id === val);
                            if (story) {
                              setFormData({
                                ...formData,
                                activityType: 'Social Story',
                                description: story.title,
                                link: `/social-stories/view/${story.id}`,
                                category: 'Social Skills',
                                status: 'pending'
                              });
                            }
                          } else if (predefinedType === 'quiz') {
                            const quiz = quizzes.find(q => q.id === val);
                            if (quiz) {
                              setFormData({
                                ...formData,
                                activityType: 'Quiz',
                                description: quiz.title,
                                link: `/play-quiz/${quiz.id}/${kidId}`,
                                category: 'Education',
                                status: 'pending'
                              });
                            }
                          } else if (predefinedType === 'worksheet') {
                            const worksheet = worksheets.find(w => w.id === val);
                            if (worksheet) {
                              setFormData({
                                ...formData,
                                activityType: 'Worksheet',
                                description: worksheet.title,
                                link: `/worksheet-generator?id=${worksheet.id}`,
                                category: 'Education',
                                status: 'pending'
                              });
                            }
                          }
                        }}
                      >
                        <option value="">-- Select Activity --</option>
                        {predefinedType === 'quiz' && quizzes.map(q => (
                          <option key={q.id} value={q.id}>{q.title}</option>
                        ))}
                        {predefinedType === 'story' && socialStories.map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                        {predefinedType === 'worksheet' && worksheets.map(w => (
                          <option key={w.id} value={w.id}>{w.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2.5">
                  <div className="grid gap-2.5 md:grid-cols-2">
                    <div className="space-y-0.5">
                      <label className="text-[12px] font-bold text-slate-500 uppercase">Activity Category</label>
                      <input
                        list="activity-categories"
                        className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Education, Chores"
                        readOnly={!!editingActivity}
                      />
                      <datalist id="activity-categories">
                        {activityCategories.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[12px] font-bold text-slate-500 uppercase">Activity Name</label>
                      <input
                        list="activity-types"
                        className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent"
                        value={formData.activityType}
                        onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                        required
                        placeholder="e.g., Read a book"
                        disabled={!!editingActivity}
                        autoComplete="on"
                      />
                      <datalist id="activity-types">
                        {(() => {
                          const options = Array.from(new Set([...activityTypes]));
                          console.log('Datalist options:', options);
                          return options.map((type) => (
                            <option key={type} value={type} />
                          ));
                        })()}
                      </datalist>
                    </div>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Description</label>
                  <textarea
                    className="flex min-h-[40px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add details..."
                  />
                </div>

                <div className="grid gap-2.5 md:grid-cols-2">
                  <div className="space-y-0.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Link</label>
                    <Input
                      className="h-8 text-sm"
                      value={formData.link}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Image</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="activity-image-upload"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = await handleImageUpload(file);
                            if (url) setFormData({ ...formData, imageUrl: url });
                            e.target.value = '';
                          }
                        }}
                      />
                      <label
                        htmlFor="activity-image-upload"
                        className={`flex h-8 w-full cursor-pointer items-center justify-center rounded border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-50 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                        {isUploading ? 'Uploading...' : (formData.imageUrl ? 'Change' : 'Upload')}
                      </label>
                      {formData.imageUrl && (
                        <div className="flex items-center gap-1">
                          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded border border-slate-200">
                            <img key={formData.imageUrl} src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="xs" 
                            onClick={() => setFormData({ ...formData, imageUrl: '' })}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Steps Section */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Steps</label>
                    <Button type="button" variant="ghost" size="xs" onClick={handleAddStep} className="h-6 text-[11px] px-1.5">
                      <Plus className="mr-1 h-2.5 w-2.5" /> Add Step
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {formData.steps.map((step, index) => (
                      <div key={index} className="flex gap-2 items-start rounded border border-slate-200 bg-slate-50 p-2">
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                          {index + 1}
                        </span>
                        <div className="flex-1 space-y-1.5">
                          <textarea
                            className="flex min-h-[30px] w-full rounded border border-slate-300 bg-white px-1.5 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-600"
                            value={step.description}
                            onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                            placeholder={`Step ${index + 1}...`}
                          />
                          <div className="flex items-center gap-1.5">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id={`step-image-${index}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleStepImageUpload(index, file);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <label
                              htmlFor={`step-image-${index}`}
                              className="flex cursor-pointer items-center text-[11px] font-bold text-blue-600 hover:text-blue-800"
                            >
                              <ImageIcon className="mr-1 h-2.5 w-2.5" />
                              {step.image_url ? 'Change' : 'Image'}
                            </label>
                            {step.image_url && (
                              <div className="flex items-center gap-1">
                                <div className="relative h-5 w-5 overflow-hidden rounded border border-slate-200">
                                  <img src={step.image_url} alt="Step" className="h-full w-full object-cover" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleStepChange(index, 'image_url', '')}
                                  className="text-red-500 hover:text-red-700"
                                  title="Delete image"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="xs" onClick={() => handleRemoveStep(index)} className="h-5 w-5 p-0">
                          <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid gap-2.5 md:grid-cols-3">
                  <div className="space-y-0.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Repeat</label>
                    <select
                      className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                      value={formData.repeatFrequency}
                      onChange={(e) => {
                        const newFreq = e.target.value;
                        setFormData({ 
                          ...formData, 
                          repeatFrequency: newFreq,
                          repeatsTill: newFreq === 'Never' ? '' : formData.repeatsTill
                        });
                      }}
                    >
                      <option value="Never">Never</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Bi-Weekly">Bi-Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>

                  {formData.repeatFrequency === 'Custom' && (
                    <>
                      <div className="space-y-0.5">
                        <label className="text-[12px] font-bold text-slate-500 uppercase">Every</label>
                        <input
                          type="number"
                          min="1"
                          className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                          value={formData.repeatInterval}
                          onChange={(e) => setFormData({ ...formData, repeatInterval: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[12px] font-bold text-slate-500 uppercase">Unit</label>
                        <select
                          className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                          value={formData.repeatUnit}
                          onChange={(e) => setFormData({ ...formData, repeatUnit: e.target.value })}
                        >
                          <option value="day">Day(s)</option>
                          <option value="week">Week(s)</option>
                          <option value="month">Month(s)</option>
                          <option value="year">Year(s)</option>
                        </select>
                      </div>
                    </>
                  )}
                  <div className="space-y-0.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Repeats till</label>
                    <Input
                      type="date"
                      className="h-8 text-sm"
                      value={formData.repeatsTill}
                      onChange={(e) => setFormData({ ...formData, repeatsTill: e.target.value })}
                      disabled={formData.repeatFrequency === 'Never'}
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Time</label>
                    <select
                      className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                      value={formData.timeOfDay}
                      onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                    >
                      <option value="Any time">Any time</option>
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Due Date</label>
                    <Input
                      className="h-8 text-sm"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end items-center pt-1">
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="xs" onClick={handleCloseForm} className="h-7 text-[12px]">
                      Cancel
                    </Button>
                    <Button type="submit" size="xs" className="h-7 text-[12px]">
                      {editingActivity ? 'Save Changes' : 'Add Activity'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <ActivityDetailModal
          activity={previewActivity}
          onClose={() => setPreviewActivity(null)}
          onToggleStatus={toggleStatus}
          onEdit={(activity) => {
            handleOpenForm(activity);
            setPreviewActivity(null);
          }}
          isReadOnly={previewActivity?.status === 'completed'}
          canPrint={!previewActivity?.isHistory}
          rewardType={kid?.reward_type}
          rewardQuantity={kid?.reward_quantity}
          showToggleOnly={true}
        />
      )}

      {/* Reward Item Modal */}
      {isRewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingReward ? 'Edit Reward Item' : 'Add Reward Item'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveReward} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Item Name</label>
                  <Input
                    placeholder="e.g., 15 mins Screen Time, Extra Dessert"
                    value={newReward.name}
                    onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cost ({formatReward(kid?.reward_type, 2)})</label>
                  <Input
                    type="number"
                    min="1"
                    value={newReward.cost}
                    onChange={(e) => setNewReward({ ...newReward, cost: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Image URL (Optional)</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={newReward.imageUrl}
                      onChange={(e) => setNewReward({ ...newReward, imageUrl: e.target.value })}
                    />
                    <label className="cursor-pointer bg-slate-100 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-200">
                      Upload
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('image', file);
                          try {
                            const response = await fetch('/api/upload', {
                              method: 'POST',
                              body: formData,
                            });
                            const data = await response.json();
                            if (data.imageUrl) {
                              setNewReward({ ...newReward, imageUrl: data.imageUrl });
                            }
                          } catch (error) {
                            console.error('Upload failed', error);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Available At (Optional)</label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newReward.location}
                    onChange={(e) => setNewReward({ ...newReward, location: e.target.value })}
                  >
                    <option value="">Select a place...</option>
                    <option value="House">House</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Park">Park</option>
                    <option value="Car">Car</option>
                    <option value="Party">Party</option>
                    <option value="Friend’s / relative’s house">Friend’s / relative’s house</option>
                    <option value="Store / Mall">Store / Mall</option>
                    <option value="Any place">Any place</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsRewardModalOpen(false);
                    setEditingReward(null);
                    setNewReward({ name: '', cost: 1, imageUrl: '', location: '' });
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSavingReward}>
                    {isSavingReward ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingReward ? 'Save Changes' : 'Save Reward')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      {/* History Delete Confirmation Modal */}
      {isHistoryDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-6">do you want to delete {selectedHistoryIds.length} activities from the history?</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsHistoryDeleteConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="danger" 
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={async () => {
                    setIsHistoryDeleteConfirmOpen(false);
                    setIsLoading(true);
                    try {
                      const deletePromises = selectedHistoryIds.map(id => 
                        apiFetch(`/api/activities/${encodeURIComponent(id)}`, { method: 'DELETE' })
                      );
                      await Promise.all(deletePromises);
                      setSelectedHistoryIds([]);
                      await fetchData({ silent: true });
                    } catch (error) {
                      console.error('Failed to delete history records:', error);
                      // Using a custom toast/error message would be better, but for now we'll just log it
                      // and maybe show a simple error state if needed.
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Activity Delete Confirmation Modal */}
      {activityToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-6">Are you sure you want to delete this activity? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setActivityToDelete(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Reward Delete Confirmation Modal */}
      {rewardToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete Reward
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-6">Are you sure you want to delete this reward? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setRewardToDelete(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={confirmDeleteReward} className="bg-red-600 hover:bg-red-700 text-white">
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
