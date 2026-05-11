import { Tooltip as ChartRechartsTooltip, Legend, ResponsiveContainer, Label, LabelList, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Tooltip as CustomTooltip } from '../components/ui/Tooltip';
import { io } from 'socket.io-client';
import { apiFetch, safeJson } from '../utils/api';
import { formatReward } from '../utils/rewardUtils';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { ArrowLeft, Plus, Trash2, Edit2, CheckCircle, Circle, Calendar, Clock, Repeat, Image as ImageIcon, Eye, Sparkles, Loader2, LayoutList, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Activity, TrendingUp, PieChart as PieChartIcon, Award, BarChart as BarChartIcon, History, Lock, Lightbulb, HelpCircle, X } from 'lucide-react';
import { ActivityDetailModal } from '../components/ActivityDetailModal';
import { formatInTimezone, getZonedTime, convertDateToTimeZone } from '../utils/dateUtils';

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
  steps?: ActivityStep[];
  isHistory?: boolean;
  reward_qty?: number;
  completion_date?: string;
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
  is_active?: boolean;
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

const SortIndicator = ({ config, columnKey }: { config: { key: any, direction: 'asc' | 'desc' }, columnKey: any }) => {
  if (config.key !== columnKey) return null;
  return config.direction === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-blue-600" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-600" />;
};

export default function AssignedActivities() {
  const { kidId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [behaviorLogs, setBehaviorLogs] = useState<any[]>([]);
  const [behaviorTracker, setBehaviorTracker] = useState<any[]>([]);
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
    if (kidId) {
      localStorage.setItem('dashboard_selected_kid_id', kidId);
    }
  }, [kidId]);

  useEffect(() => {
    console.log('Activity types:', activityTypes);
  }, [activityTypes]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const zoned = getZonedTime();
    return new Date(zoned.year, zoned.month - 1, 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'activities' | 'completed' | 'history' | 'rewards'>((searchParams.get('tab') as any) || 'activities');

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
  const [locationFilter, setLocationFilter] = useState('');
  const [rewardToDelete, setRewardToDelete] = useState<string | null>(null);
  const [newReward, setNewReward] = useState({ name: '', cost: 1, imageUrl: '', location: '', is_active: true });
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [isSavingReward, setIsSavingReward] = useState(false);
  const [isAddingCustomLocation, setIsAddingCustomLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  const [reportDuration, setReportDuration] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);
  const [completedPage, setCompletedPage] = useState(1);
  const [completedItemsPerPage, setCompletedItemsPerPage] = useState(10);
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchaseItemsPerPage, setPurchaseItemsPerPage] = useState(10);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [activitiesItemsPerPage, setActivitiesItemsPerPage] = useState(10);
  const [behaviorPage, setBehaviorPage] = useState(1);
  const [behaviorItemsPerPage, setBehaviorItemsPerPage] = useState(10);
  const [viewingQuizResult, setViewingQuizResult] = useState<any | null>(null);

  useEffect(() => {
    if (viewingQuizResult) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [viewingQuizResult]);
  const [activitiesSortConfig, setActivitiesSortConfig] = useState<{ key: keyof Activity | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [completedSortConfig, setCompletedSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ key: 'completion_date', direction: 'desc' });
  const [historySortConfig, setHistorySortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [predefinedType, setPredefinedType] = useState<string>('');
  const [predefinedId, setPredefinedId] = useState<string>('');

  useEffect(() => {
    setHistoryPage(1);
  }, [reportDuration, historyItemsPerPage]);

  useEffect(() => {
    setPurchasePage(1);
  }, [reportDuration, purchaseItemsPerPage]);

  useEffect(() => {
    setBehaviorPage(1);
  }, [reportDuration, behaviorItemsPerPage]);
  const [completedSearchQuery, setCompletedSearchQuery] = useState('');
  const [completedCategoryFilter, setCompletedCategoryFilter] = useState('All');
  const [completedDateFilter, setCompletedDateFilter] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
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
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    return formatInTimezone(date, kid?.timezone, options || defaultOptions);
  };

  const formatSimpleDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.split('T')[0].split('-');
      const date = new Date(Date.UTC(Number(y), Number(m)-1, Number(d)));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    }
    return formatKidDate(dateStr, { month: 'short', day: 'numeric', year: 'numeric', hour: undefined, minute: undefined });
  };

  const formatTimeOnly = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return formatKidDate(dateStr, { year: undefined, month: undefined, day: undefined, hour: '2-digit', minute: '2-digit', hour12: true });
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
      const zoned = getZonedTime(currentKid?.timezone);
      const localDate = zoned.isoDate;
      const localTime = zoned.totalMinutes;

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
    } catch (error: any) {
      console.error('AssignedActivities: Failed to fetch data', {
        error,
        message: error?.message,
        stack: error?.stack,
        kidId
      });
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
    fetchBehaviorLogs();

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
        fetchBehaviorLogs();
      }
    });

    // Refresh data every 10 seconds to keep dates/times current
    const intervalId = setInterval(() => {
      // Check if date has changed since last fetch
      const zoned = getZonedTime(kid?.timezone);
      const currentLocalDate = zoned.isoDate;
      
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

  const fetchBehaviorLogs = async () => {
    try {
      const res = await apiFetch(`/api/kids/${encodeURIComponent(kidId || '')}/behavior-logs`);
      if (res.ok) {
        const data = await safeJson(res);
        console.log('AssignedActivities: Fetched behavior logs:', data.logs);
        setBehaviorLogs(data.logs || []);
        setBehaviorTracker(data.tracker || []);
      }
    } catch (error) {
      console.error('Failed to fetch behavior logs', error);
    }
  };

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
      const zoned = getZonedTime(kid?.timezone);
      const now = new Date(zoned.year, zoned.month - 1, zoned.day);
      now.setHours(0, 0, 0, 0); // Midnight today in kid's local time (represented in system local)
      
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
        const currentTime = zoned.totalMinutes;
        
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

  const handleSortCompleted = (key: string) => {
    setCompletedSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCompletedPage(1);
  };

  const handleSortHistory = (key: string) => {
    setHistorySortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setHistoryPage(1);
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
        setNewReward({ name: '', cost: 1, imageUrl: '', location: '', is_active: true });
        setEditingReward(null);
        setIsAddingCustomLocation(false);
        setCustomLocation('');
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
      location: item.location || '',
      is_active: item.is_active !== false // Default to true if undefined
    });
    setIsAddingCustomLocation(false);
    setCustomLocation('');
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
          ...(newStatus === 'completed' ? { 
            completedAt: convertDateToTimeZone(new Date(), kid!.timezone),
            createdAt: convertDateToTimeZone(activity.created_at, kid!.timezone) 
          } : {}),
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
            dateStr === getZonedTime(kid?.timezone).isoDate
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
              onClick={() => {
                const zoned = getZonedTime(kid?.timezone);
                setCurrentMonth(new Date(zoned.year, zoned.month - 1));
              }}
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
      
    const sortedCompleted = [...filteredCompleted].sort((a, b) => {
      if (!completedSortConfig.key) return 0;
      
      let aValue: any;
      let bValue: any;
      
      if (completedSortConfig.key === 'status') { aValue = a.status; bValue = b.status; }
      else if (completedSortConfig.key === 'activity_type') { aValue = a.activity_type; bValue = b.activity_type; }
      else if (completedSortConfig.key === 'description') { aValue = a.description; bValue = b.description; }
      else if (completedSortConfig.key === 'repeat_frequency') { aValue = a.repeat_frequency; bValue = b.repeat_frequency; }
      else if (completedSortConfig.key === 'completion_date') { aValue = a.due_date; bValue = b.due_date; }
      else if (completedSortConfig.key === 'time_of_day') { aValue = a.time_of_day; bValue = b.time_of_day; }
      else { return 0; }
      
      // Handle null/undefined (treat as empty string)
      aValue = aValue || '';
      bValue = bValue || '';
      
      const comparison = aValue < bValue ? -1 : 1;
      return completedSortConfig.direction === 'asc' ? comparison : -comparison;
    });

    const totalCompletedPages = Math.ceil(sortedCompleted.length / completedItemsPerPage);
    const paginatedCompleted = sortedCompleted.slice((completedPage - 1) * completedItemsPerPage, completedPage * completedItemsPerPage);

    return (
      <Card className="border-none ring-1 ring-slate-200 shadow-sm">
        <CardContent className="p-0">
          {selectedDate && (
            <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/50 px-4 py-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-blue-900">
                  {formatSimpleDate(selectedDate)}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSortCompleted('status')}>
                      <div className="flex items-center gap-1.5">
                        <span>Status</span>
                        <SortIndicator config={completedSortConfig} columnKey="status" />
                        <div className="group relative">
                          <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                          <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                            <div className="flex items-start gap-3">
                              <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                <HelpCircle className="h-4 w-4 text-yellow-700" />
                              </div>
                              <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                Current status of the activity. Marked as completed.
                              </span>
                            </div>
                            <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                          </div>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSortCompleted('activity_type')}>
                      <div className="flex items-center gap-1.5">
                        <span>Activity</span>
                        <SortIndicator config={completedSortConfig} columnKey="activity_type" />
                        <div className="group relative">
                          <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                          <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                            <div className="flex items-start gap-3">
                              <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                <HelpCircle className="h-4 w-4 text-yellow-700" />
                              </div>
                              <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                The title or type of the completed activity.
                              </span>
                            </div>
                            <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                          </div>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSortCompleted('description')}>
                      <div className="flex items-center gap-1.5">
                        <span>Description</span>
                        <SortIndicator config={completedSortConfig} columnKey="description" />
                        <div className="group relative">
                          <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                          <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                            <div className="flex items-start gap-3">
                              <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                <HelpCircle className="h-4 w-4 text-yellow-700" />
                              </div>
                              <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                Brief description of what the activity involved.
                              </span>
                            </div>
                            <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                          </div>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSortCompleted('repeat_frequency')}>
                      <div className="flex items-center gap-1.5">
                        <span>Repeat</span>
                        <SortIndicator config={completedSortConfig} columnKey="repeat_frequency" />
                        <div className="group relative">
                          <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                          <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                            <div className="flex items-start gap-3">
                              <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                <HelpCircle className="h-4 w-4 text-yellow-700" />
                              </div>
                              <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                How frequently this activity recurred.
                              </span>
                            </div>
                            <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                          </div>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSortCompleted('completion_date')}>
                      <div className="flex items-center gap-1.5">
                        <span>Completion Date</span>
                        <SortIndicator config={completedSortConfig} columnKey="completion_date" />
                        <div className="group relative">
                          <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                          <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                            <div className="flex items-start gap-3">
                              <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                <HelpCircle className="h-4 w-4 text-yellow-700" />
                              </div>
                              <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                The date and time when this activity was marked finished.
                              </span>
                            </div>
                            <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                          </div>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSortCompleted('time_of_day')}>
                      <div className="flex items-center gap-1.5">
                        <span>Time of day</span>
                        <SortIndicator config={completedSortConfig} columnKey="time_of_day" />
                        <div className="group relative">
                          <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                          <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                            <div className="flex items-start gap-3">
                              <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                <HelpCircle className="h-4 w-4 text-yellow-700" />
                              </div>
                              <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                The preferred time slot for this activity.
                              </span>
                            </div>
                            <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                          </div>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 font-bold text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Actions</span>
                        <div className="group relative">
                          <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                          <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                            <div className="flex items-start gap-3">
                              <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                <HelpCircle className="h-4 w-4 text-yellow-700" />
                              </div>
                              <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                Manage this activity: View details, edit, or delete as needed.
                              </span>
                            </div>
                            <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                          </div>
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCompleted.map((activity) => (
                    <tr key={activity.id} className="hover:bg-slate-50 transition-colors bg-white">
                      <td className="px-4 py-3">
                        <div className="text-emerald-500">
                          <CheckCircle className="h-5 w-5" />
                        </div>
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
                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                              <Eye className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {activity.description && (
                          <div className="text-xs text-slate-600 line-clamp-1">
                            {activity.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {activity.repeat_frequency}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatSimpleDate(activity.due_date)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {activity.time_of_day}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <CustomTooltip content="View Activity Details">
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-7 w-7 p-0"
                              onClick={() => setPreviewActivity(activity)}
                            >
                              <Eye className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                            </Button>
                          </CustomTooltip>
                          <CustomTooltip content="Edit Activity Details">
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-7 w-7 p-0"
                              onClick={() => handleOpenForm(activity)}
                            >
                              <Edit2 className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                            </Button>
                          </CustomTooltip>
                          <CustomTooltip content="Delete Activity">
                            <button
                              type="button"
                              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-50 group transition-all active:scale-95"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(activity.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
                            </button>
                          </CustomTooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-3 w-full">
      {!isModalOpen && !previewActivity && !viewingQuizResult && !isRewardModalOpen ? (
        <>
          <div className="mb-6">
            <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </button>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 no-print">
              <div>
                <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">
                  {activeTab === 'activities' 
                    ? <div className="flex items-center gap-4"><LayoutList className="h-12 w-12 text-blue-600" /> {kid?.name ? `${kid.name}'s ` : ''}Assigned Activities</div>
                    : activeTab === 'completed' 
                        ? <div className="flex items-center gap-4"><CheckCircle className="h-12 w-12 text-emerald-600" /> {kid?.name ? `${kid.name}'s ` : ''}Completed Activities</div>
                        : activeTab === 'history'
                            ? <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-4">
                                  <History className="h-12 w-12 text-purple-600" /> 
                                  {kid?.name ? `${kid.name}'s ` : ''}Activities History
                                </div>
                                {kid?.timezone && (
                                  <div className="flex items-center gap-2 ml-16">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                      Timezone: {kid.timezone}
                                    </span>
                                    <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                      UTC Date: {new Date().toISOString().split('T')[0]}
                                    </span>
                                  </div>
                                )}
                              </div>
                                : <div className="flex items-center gap-4"><Award className="h-12 w-12 text-amber-500" /> {kid?.name ? `${kid.name}'s ` : ''}Reward Items</div>}
                </h1>
                <p className="text-lg font-normal text-slate-500 mt-3">
                  {activeTab === 'activities' 
                    ? 'Organize daily tasks and track learning progress' 
                    : activeTab === 'completed' 
                        ? 'Activities that have been marked as completed. You can repeat them if you want.' 
                        : activeTab === 'history'
                            ? 'View past activity and reward history.'
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
                  <CustomTooltip content={`Manage ${kid?.name || 'Kid'}'s Rewards`}>
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
                </div>
                <div className="flex gap-2">
                  {activeTab === 'activities' ? (
                    <CustomTooltip content="Add New Activity">
                      <Button size="xs" onClick={() => handleOpenForm()} className="h-7 text-[12px] shrink-0">
                        <Plus className="mr-1 h-3 w-3" />
                        Add Activity
                      </Button>
                    </CustomTooltip>
                  ) : activeTab === 'rewards' ? (
                    <CustomTooltip content="Adds reward item">
                      <Button size="xs" onClick={() => setIsRewardModalOpen(true)} className="h-7 text-[12px] shrink-0">
                        <Plus className="mr-1 h-3 w-3" />
                        Add Item
                      </Button>
                    </CustomTooltip>
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
            <Card className="border-none ring-1 ring-slate-200 shadow-sm">
              <CardContent className="p-0">
                {selectedDate && (
                  <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/50 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-[11px] font-bold text-blue-900">
                        {formatSimpleDate(selectedDate)}
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
                {(() => {
                  const filteredCount = activitiesToRender.filter(a => !selectedDate || a.due_date === selectedDate).length;
                  const totalActivitiesPages = Math.ceil(filteredCount / activitiesItemsPerPage);
                  return (
                    filteredCount > 0 && totalActivitiesPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/30">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Per page:</span>
                          <select
                            className="h-7 rounded border border-slate-300 bg-white px-2 text-xs"
                            value={activitiesItemsPerPage}
                            onChange={(e) => {
                              setActivitiesItemsPerPage(Number(e.target.value));
                              setActivitiesPage(1);
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
                            disabled={activitiesPage === 1}
                            onClick={() => setActivitiesPage(prev => Math.max(1, prev - 1))}
                            className="h-7 w-7 p-0"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-xs font-bold text-slate-600">
                            Page {activitiesPage} of {totalActivitiesPages}
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
                      </div>
                    )
                  );
                })()}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-y border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-1.5">
                          <span>Status</span>
                          <SortIndicator config={activitiesSortConfig} columnKey="status" />
                          <div className="group relative">
                            <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                            <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                              <div className="flex items-start gap-3">
                                <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                  <HelpCircle className="h-4 w-4 text-yellow-700" />
                                </div>
                                <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                  Current status of the activity. Click the circle icon to mark as completed.
                                </span>
                              </div>
                              <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSort('activity_type')}>
                        <div className="flex items-center gap-1.5">
                          <span>Activity</span>
                          <SortIndicator config={activitiesSortConfig} columnKey="activity_type" />
                          <div className="group relative">
                            <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                            <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                              <div className="flex items-start gap-3">
                                <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                  <HelpCircle className="h-4 w-4 text-yellow-700" />
                                </div>
                                <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                  The title or type of the activity assigned to your child.
                                </span>
                              </div>
                              <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSort('repeat_frequency')}>
                        <div className="flex items-center gap-1.5">
                          <span>Repeat</span>
                          <SortIndicator config={activitiesSortConfig} columnKey="repeat_frequency" />
                          <div className="group relative">
                            <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                            <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                              <div className="flex items-start gap-3">
                                <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                  <HelpCircle className="h-4 w-4 text-yellow-700" />
                                </div>
                                <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                  How frequently this activity is scheduled to recur (e.g., Daily, Weekly).
                                </span>
                              </div>
                              <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSort('due_date')}>
                        <div className="flex items-center gap-1.5">
                          <span>Due Date</span>
                          <SortIndicator config={activitiesSortConfig} columnKey="due_date" />
                          <div className="group relative">
                            <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                            <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                              <div className="flex items-start gap-3">
                                <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                  <HelpCircle className="h-4 w-4 text-yellow-700" />
                                </div>
                                <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                  The date for which this activity is assigned.
                                </span>
                              </div>
                              <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSort('time_of_day')}>
                        <div className="flex items-center gap-1.5">
                          <span>Time of day</span>
                          <SortIndicator config={activitiesSortConfig} columnKey="time_of_day" />
                          <div className="group relative">
                            <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                            <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                              <div className="flex items-start gap-3">
                                <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                  <HelpCircle className="h-4 w-4 text-yellow-700" />
                                </div>
                                <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                  The specific time slot preferred for this activity.
                                </span>
                              </div>
                              <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-bold text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Actions</span>
                          <div className="group relative">
                            <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                            <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                              <div className="flex items-start gap-3">
                                <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                  <HelpCircle className="h-4 w-4 text-yellow-700" />
                                </div>
                                <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                  Manage this activity: View details, edit, or delete as needed.
                                </span>
                              </div>
                              <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                            </div>
                          </div>
                        </div>
                      </th>
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
                          {formatSimpleDate(activity.due_date)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {activity.time_of_day}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <CustomTooltip content="View Activity Details">
                              <Button
                                variant="ghost"
                                size="xs"
                                className="h-7 w-7 p-0"
                                onClick={() => setPreviewActivity(activity)}
                              >
                                <Eye className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                              </Button>
                            </CustomTooltip>
                            {activity.status !== 'completed' && (
                              <CustomTooltip content="Edit Activity Details">
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleOpenForm(activity)}
                                >
                                  <Edit2 className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                                </Button>
                              </CustomTooltip>
                            )}
                            <CustomTooltip content="Delete Activity">
                              <button
                                type="button"
                                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-50 group transition-all active:scale-95"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDelete(activity.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
                              </button>
                            </CustomTooltip>
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
                <CustomTooltip content="Add New Activity">
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
                </CustomTooltip>
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
              </CardContent>
            </Card>
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
                    {formatSimpleDate(selectedDate)}
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
                <input
                  type="date"
                  className="h-8 rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                />
              </div>
            </div>

            {(() => {
              const filteredHistoryBase = historyActivities
                .filter(a => !selectedDate || a.due_date === selectedDate)
                .filter(a => {
                  if (!historyDateFilter) return true;
                  const dateToUse = a.completion_date || a.created_at;
                  if (!dateToUse) return a.due_date === historyDateFilter;
                  return getZonedTime(kid?.timezone, new Date(dateToUse)).isoDate === historyDateFilter;
                })
                .filter(a => a.activity_type.toLowerCase().includes(historySearchQuery.toLowerCase()) || (a.description || '').toLowerCase().includes(historySearchQuery.toLowerCase()));
              
              // Group "Parent Bonus" entries by same minute
              const groupedHistory: any[] = [];
              const bonusGroups: { [key: string]: any } = {};
              
              filteredHistoryBase.forEach(item => {
                if (item.activity_type === 'Parent Bonus' && (item.completion_date || item.created_at)) {
                  // Group by the formatted date/time (which is down to the minute)
                  const timeKey = formatKidDate(item.completion_date || item.created_at);
                  if (!bonusGroups[timeKey]) {
                    bonusGroups[timeKey] = { 
                      ...item, 
                      reward_qty: 0,
                      id: `bonus-group-history-${timeKey}`
                    };
                  }
                  bonusGroups[timeKey].reward_qty += (Number(item.reward_qty) || 0);
                } else {
                  groupedHistory.push(item);
                }
              });

              const filteredHistoryRaw = [...groupedHistory, ...Object.values(bonusGroups)];
              
              const filteredHistory = [...filteredHistoryRaw].sort((a, b) => {
                if (!historySortConfig.key) {
                  return new Date(b.completion_date || b.created_at || b.due_date).getTime() - new Date(a.completion_date || a.created_at || a.due_date).getTime();
                }
                
                let aValue: any;
                let bValue: any;
                
                if (historySortConfig.key === 'activity_type') { aValue = a.activity_type; bValue = b.activity_type; }
                else if (historySortConfig.key === 'description') { aValue = a.description; bValue = b.description; }
                else if (historySortConfig.key === 'completion_date') { aValue = a.completion_date || a.created_at || a.due_date; bValue = b.completion_date || b.created_at || b.due_date; }
                else if (historySortConfig.key === 'reward_qty') { aValue = Number(a.reward_qty) || 0; bValue = Number(b.reward_qty) || 0; }
                else { return 0; }
                
                if (aValue === bValue) return 0;

                // Handle null/undefined (treat as empty string)
                if (typeof aValue === 'string') aValue = aValue || '';
                if (typeof bValue === 'string') bValue = bValue || '';
                
                const comparison = aValue < bValue ? -1 : 1;
                return historySortConfig.direction === 'asc' ? comparison : -comparison;
              });

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
                          <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSortHistory('activity_type')}>
                            <div className="flex items-center gap-1.5">
                              <span>Activity</span>
                              <SortIndicator config={historySortConfig} columnKey="activity_type" />
                              <div className="group relative">
                                <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                                <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                                  <div className="flex items-start gap-3">
                                    <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                      <HelpCircle className="h-4 w-4 text-yellow-700" />
                                    </div>
                                    <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                      The title or type of the activity from history.
                                    </span>
                                  </div>
                                  <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                                </div>
                              </div>
                            </div>
                          </th>
                          <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSortHistory('description')}>
                            <div className="flex items-center gap-1.5">
                              <span>Description</span>
                              <SortIndicator config={historySortConfig} columnKey="description" />
                              <div className="group relative">
                                <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                                <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                                  <div className="flex items-start gap-3">
                                    <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                      <HelpCircle className="h-4 w-4 text-yellow-700" />
                                    </div>
                                    <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                      Brief description of the activity performance.
                                    </span>
                                  </div>
                                  <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                                </div>
                              </div>
                            </div>
                          </th>
                          <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSortHistory('completion_date')}>
                            <div className="flex items-center gap-1.5">
                              <span>Completion Date</span>
                              <SortIndicator config={historySortConfig} columnKey="completion_date" />
                              <div className="group relative">
                                <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                                <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                                  <div className="flex items-start gap-3">
                                    <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                      <HelpCircle className="h-4 w-4 text-yellow-700" />
                                    </div>
                                    <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                      The historical record of when this activity was completed.
                                    </span>
                                  </div>
                                  <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                                </div>
                              </div>
                            </div>
                          </th>
                          <th className="px-4 py-3 font-bold cursor-pointer hover:text-slate-700" onClick={() => handleSortHistory('reward_qty')}>
                            <div className="flex items-center gap-1.5">
                              <span>Rewards</span>
                              <SortIndicator config={historySortConfig} columnKey="reward_qty" />
                              <div className="group relative">
                                <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                                <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                                  <div className="flex items-start gap-3">
                                    <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                      <HelpCircle className="h-4 w-4 text-yellow-700" />
                                    </div>
                                    <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                      The rewards granted for this specific activity completion.
                                    </span>
                                  </div>
                                  <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                                </div>
                              </div>
                            </div>
                          </th>
                          <th className="px-4 py-3 font-bold text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span>Actions</span>
                              <div className="group relative">
                                <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                                <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial] font-normal normal-case">
                                  <div className="flex items-start gap-3">
                                    <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                      <HelpCircle className="h-4 w-4 text-yellow-700" />
                                    </div>
                                    <span className="font-bold text-[15px] leading-tight text-slate-900 text-left">
                                      Manage historical record: View details or remove from history as needed.
                                    </span>
                                  </div>
                                  <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                                </div>
                              </div>
                            </div>
                          </th>
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
                                {activity.activity_type === 'Parent Bonus' ? (
                                  <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-600">
                                    <Sparkles className="h-4 w-4" />
                                  </div>
                                ) : activity.image_url ? (
                                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded border border-slate-200">
                                    <img src={activity.image_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                ) : null}
                                {activity.activity_type}
                                {activity.link?.includes('/social-stories/view/') && (
                                  <div className={`flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-600`}>
                                    <Eye className="h-2.5 w-2.5" />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {activity.description && (
                                <div className="text-xs text-slate-500 line-clamp-2">{activity.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                              {formatSimpleDate(activity.due_date)}
                            </td>
                            
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                              <div className="text-[11px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                                <img src={rewardIcon} alt={kid?.reward_type} className="h-3 w-3 object-contain" referrerPolicy="no-referrer" />
                                +{activity.reward_qty || 0} {formatReward(kid?.reward_type, activity.reward_qty || 0)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <CustomTooltip content="View Activity Details">
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  className="h-7 w-7 p-0"
                                  onClick={() => setPreviewActivity(activity)}
                                >
                                  <Eye className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                                </Button>
                              </CustomTooltip>
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


            


            


      ) : activeTab === 'rewards' ? (
        <div className="space-y-4">
          <div className="flex justify-start items-center gap-4">
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="">All Locations</option>
              {[...new Set(rewardItems.map(item => item.location || ''))].filter(Boolean).map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{kid?.name ? `${kid.name}'s ` : ''}Reward Items</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rewardItems.filter(item => !locationFilter || item.location === locationFilter).map((item) => (
              <Card key={item.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-green-50">
                <CardContent className="p-0">
                  <div className="flex h-28">
                    <div className="h-28 w-28 flex-shrink-0 bg-slate-100 border-r border-slate-100">
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
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm text-slate-900 truncate">{item.name}</h3>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs font-black text-blue-600 uppercase tracking-wider">
                          <img src={rewardIcon} alt={kid?.reward_type} className="h-3 w-3 object-contain" referrerPolicy="no-referrer" />
                          {item.cost} {formatReward(kid?.reward_type, item.cost)}
                        </div>
                        {item.location && (
                          <div className="mt-1 text-sm font-semibold text-slate-700 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400"></span>
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
            {rewardItems.filter(item => !locationFilter || item.location === locationFilter).length === 0 && (
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
  ) : isRewardModalOpen ? (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="xs" 
          onClick={() => {
            setIsRewardModalOpen(false);
            setEditingReward(null);
            setNewReward({ name: '', cost: 1, imageUrl: '', location: '', is_active: true });
            setIsAddingCustomLocation(false);
            setCustomLocation('');
          }} 
          className="pl-0 h-7 hover:bg-transparent hover:text-blue-600 text-[12px] font-bold uppercase transition-colors"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to List
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
          {editingReward ? 'Edit Reward Item' : 'New Reward Item'}
        </h1>
      </div>
      <Card className="border-blue-200 bg-blue-50/50 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 space-y-0 border-b border-blue-100 bg-white/50">
          <CardTitle className="text-base font-bold">{editingReward ? 'Edit Reward Details' : 'Reward Details'}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-4">
          <form onSubmit={handleSaveReward} className="space-y-3">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Item Name</label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-sans">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                          The name of the reward item that can be purchased (e.g., 15 mins Screen Time).
                        </span>
                      </div>
                      <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                  </div>
                </div>
                <Input
                  className="h-9 text-sm focus:ring-1 focus:ring-blue-600"
                  placeholder="e.g., 15 mins Screen Time"
                  value={newReward.name}
                  onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Cost ({formatReward(kid?.reward_type || 'Points', 2)})</label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-sans">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                          How many {formatReward(kid?.reward_type || 'Reward', 2)} this item costs?
                        </span>
                      </div>
                      <div className="absolute left-3 sm:left-auto sm:right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                  </div>
                </div>
                <Input
                  className="h-9 text-sm focus:ring-1 focus:ring-blue-600"
                  type="number"
                  min="1"
                  value={newReward.cost}
                  onChange={(e) => setNewReward({ ...newReward, cost: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Image URL (Optional)</label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-sans">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                          Add a picture for this reward to make it look special!
                        </span>
                      </div>
                      <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="h-9 text-sm flex-1 focus:ring-1 focus:ring-blue-600"
                    placeholder="https://example.com/image.jpg"
                    value={newReward.imageUrl}
                    onChange={(e) => setNewReward({ ...newReward, imageUrl: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="reward-image-upload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleImageUpload(file);
                          if (url) setNewReward({ ...newReward, imageUrl: url });
                          e.target.value = '';
                        }
                      }}
                    />
                    <label
                      htmlFor="reward-image-upload"
                      className={`flex h-9 cursor-pointer items-center justify-center rounded border border-slate-300 bg-white px-3 py-1 text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-colors shrink-0`}
                    >
                      <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                      {newReward.imageUrl ? 'Change' : 'Upload'}
                    </label>
                  </div>
                </div>
                {newReward.imageUrl && (
                  <div className="mt-2 relative h-20 w-20 rounded-lg overflow-hidden border border-blue-100 shadow-sm">
                    <img src={newReward.imageUrl} alt="Reward Preview" className="h-full w-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setNewReward({...newReward, imageUrl: ''})}
                      className="absolute top-0.5 right-0.5 bg-white/80 p-1 rounded-full text-red-500 hover:bg-white transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Available At (Optional)</label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-sans">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                          Where this reward item can be redeemed - House, Car, Restaurant etc.
                        </span>
                      </div>
                      <div className="absolute left-3 sm:left-auto sm:right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                  </div>
                </div>
                {isAddingCustomLocation ? (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      className="h-9 text-sm focus:ring-1 focus:ring-blue-600 flex-1"
                      placeholder="Enter custom location..."
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (customLocation.trim()) {
                            setNewReward({ ...newReward, location: customLocation.trim() });
                            setIsAddingCustomLocation(false);
                          }
                        }
                        if (e.key === 'Escape') {
                          setIsAddingCustomLocation(false);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        if (customLocation.trim()) {
                          setNewReward({ ...newReward, location: customLocation.trim() });
                        }
                        setIsAddingCustomLocation(false);
                      }}
                      className="h-9 px-3 text-blue-600 font-bold"
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setIsAddingCustomLocation(false)}
                      className="h-9 px-2 text-slate-400"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <select
                    className="flex h-9 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    value={newReward.location}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        setIsAddingCustomLocation(true);
                        setCustomLocation('');
                      } else {
                        setNewReward({ ...newReward, location: e.target.value });
                      }
                    }}
                  >
                    <option value="">Select a place...</option>
                    {/* Only show locations from existing items */}
                    {[...new Set(rewardItems.map(item => item.location))].filter(Boolean).map(loc => (
                      <option key={loc} value={loc!}>{loc}</option>
                    ))}
                    <option value="ADD_NEW" className="text-blue-600 font-bold">+ Add new location...</option>
                  </select>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Status</label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-sans">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                          Active items appear in the rewards list. Inactive items are hidden.
                        </span>
                      </div>
                      <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 h-9">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-slate-300 text-blue-600 focus:ring-blue-600"
                    checked={newReward.is_active}
                    onChange={(e) => setNewReward({ ...newReward, is_active: e.target.checked })}
                  />
                  <span className="text-sm font-medium text-slate-700">Active</span>
                </div>
              </div>

            </div>

            <div className="flex justify-end items-center pt-4 border-t border-blue-100 mt-2">
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="xs" 
                  onClick={() => {
                    setIsRewardModalOpen(false);
                    setEditingReward(null);
                    setNewReward({ name: '', cost: 1, imageUrl: '', location: '', is_active: true });
                    setIsAddingCustomLocation(false);
                    setCustomLocation('');
                  }} 
                  className="h-8 text-[12px] font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="xs" 
                  disabled={isSavingReward} 
                  className="h-8 text-[12px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  {isSavingReward ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : (editingReward ? 'Save Changes' : 'Add Item')}
                </Button>
              </div>
            </div>
          </form>
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
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-100 mb-2">
                    <input
                      type="radio"
                      id="status-pending"
                      checked={formData.status === 'pending'}
                      onChange={() => setFormData({ ...formData, status: 'pending' })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-1.5">
                      <label htmlFor="status-pending" className="text-sm font-medium text-blue-800">
                        Re-assign
                      </label>
                      <div className="group relative">
                        <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                        <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                              <HelpCircle className="h-4 w-4 text-yellow-700" />
                            </div>
                            <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                              Check this to reset a completed activity to re-assign for another date to repeat the activity
                            </span>
                          </div>
                          <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!editingActivity && (
                  <div className="grid gap-2.5 md:grid-cols-2">
                    <div className="space-y-0.5 p-2 bg-blue-50 rounded border border-blue-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="text-[12px] font-bold text-blue-600 uppercase">Select Activity Type (Optional)</label>
                        <div className="group relative">
                          <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                          <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                            <div className="flex items-start gap-3">
                              <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                <HelpCircle className="h-4 w-4 text-yellow-700" />
                              </div>
                              <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                                Select the category of the pre-defined activity you want to assign, such as Quizzes, Social Stories, or Worksheets.
                              </span>
                            </div>
                            <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                          </div>
                        </div>
                      </div>
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
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="text-[12px] font-bold text-blue-600 uppercase">Select Pre-defined Activity</label>
                        <div className="group relative">
                          <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                          <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                            <div className="flex items-start gap-3">
                              <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                <HelpCircle className="h-4 w-4 text-yellow-700" />
                              </div>
                              <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                                Choose from your saved library of activities to quickly assign them to your child.
                              </span>
                            </div>
                            <div className="absolute left-3 sm:left-auto sm:right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                          </div>
                        </div>
                      </div>
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
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="text-[12px] font-bold text-slate-500 uppercase">Activity Category</label>
                        <div className="group relative">
                          <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                          <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                            <div className="flex items-start gap-3">
                              <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                <HelpCircle className="h-4 w-4 text-yellow-700" />
                              </div>
                              <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                                Categorize the activity to help organize your child's dashboard (e.g., Morning Routine, Math, Self-Care).
                              </span>
                            </div>
                            <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                          </div>
                        </div>
                      </div>
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
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="text-[12px] font-bold text-slate-500 uppercase">Activity Name</label>
                        <div className="group relative">
                          <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                          <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                            <div className="flex items-start gap-3">
                              <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                <HelpCircle className="h-4 w-4 text-yellow-700" />
                              </div>
                              <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                                The title of the activity that your child will see on their dashboard.
                              </span>
                            </div>
                            <div className="absolute left-3 sm:left-auto sm:right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                          </div>
                        </div>
                      </div>
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
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Description</label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                      <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                        <div className="flex items-start gap-3">
                          <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                            <HelpCircle className="h-4 w-4 text-yellow-700" />
                          </div>
                          <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                            Add a detailed explanation of what the activity involves.
                          </span>
                        </div>
                        <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                      </div>
                    </div>
                  </div>
                  <textarea
                    className="flex min-h-[40px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add details..."
                  />
                </div>

                <div className="grid gap-2.5 md:grid-cols-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-[12px] font-bold text-slate-500 uppercase">Link</label>
                      <div className="group relative">
                        <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                        <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                              <HelpCircle className="h-4 w-4 text-yellow-700" />
                            </div>
                            <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                              Include a URL for external resources, videos, or references.
                            </span>
                          </div>
                          <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                        </div>
                      </div>
                    </div>
                    <Input
                      className="h-8 text-sm"
                      value={formData.link}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-[12px] font-bold text-slate-500 uppercase">Image</label>
                      <div className="group relative">
                        <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                              <HelpCircle className="h-4 w-4 text-yellow-700" />
                            </div>
                            <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                              Upload an image to represent the activity visually.
                            </span>
                          </div>
                          <div className="absolute left-3 sm:left-auto sm:right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                        </div>
                      </div>
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <label className="text-[12px] font-bold text-slate-500 uppercase">Steps</label>
                      <div className="group relative">
                        <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                        <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                              <HelpCircle className="h-4 w-4 text-yellow-700" />
                            </div>
                            <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                              Break down the activity into manageable steps with optional images.
                            </span>
                          </div>
                          <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                        </div>
                      </div>
                    </div>
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
                
                <div className="grid gap-2.5 md:grid-cols-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-[12px] font-bold text-slate-500 uppercase">Due Date</label>
                      <div className="group relative">
                        <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                        <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                              <HelpCircle className="h-4 w-4 text-yellow-700" />
                            </div>
                            <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                              Activities start appearing on your child's dashboard from this date. If not finished, the activity will automatically roll over to the next day.
                            </span>
                          </div>
                          <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                        </div>
                      </div>
                    </div>
                    <Input
                      className="h-8 text-sm"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-[12px] font-bold text-slate-500 uppercase">Time</label>
                      <div className="group relative">
                        <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                              <HelpCircle className="h-4 w-4 text-yellow-700" />
                            </div>
                            <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                              The general time of day for this activity.
                            </span>
                          </div>
                          <div className="absolute left-3 sm:left-auto sm:right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                        </div>
                      </div>
                    </div>
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
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-[12px] font-bold text-slate-500 uppercase">Repeat</label>
                      <div className="group relative">
                        <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                        <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                              <HelpCircle className="h-4 w-4 text-yellow-700" />
                            </div>
                            <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                              Set how often this activity should recur.
                            </span>
                          </div>
                          <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                        </div>
                      </div>
                    </div>
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

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-[12px] font-bold text-slate-500 uppercase">Repeats till</label>
                      <div className="group relative">
                        <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                              <HelpCircle className="h-4 w-4 text-yellow-700" />
                            </div>
                            <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                              The final date for the recurring schedule.
                            </span>
                          </div>
                          <div className="absolute left-3 sm:left-auto sm:right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                        </div>
                      </div>
                    </div>
                    <Input
                      type="date"
                      className="h-8 text-sm"
                      value={formData.repeatsTill}
                      onChange={(e) => setFormData({ ...formData, repeatsTill: e.target.value })}
                      disabled={formData.repeatFrequency === 'Never'}
                    />
                  </div>

                  {formData.repeatFrequency === 'Custom' && (
                    <div className="col-span-full grid gap-2.5 md:grid-cols-2 mt-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <label className="text-[12px] font-bold text-slate-500 uppercase">Every</label>
                          <div className="group relative">
                            <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                            <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                              <div className="flex items-start gap-3">
                                <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                  <HelpCircle className="h-4 w-4 text-yellow-700" />
                                </div>
                                <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                                  Set the interval for the custom recurring frequency (e.g., every 2 units).
                                </span>
                              </div>
                              <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                            </div>
                          </div>
                        </div>
                        <input
                          type="number"
                          min="1"
                          className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                          value={formData.repeatInterval}
                          onChange={(e) => setFormData({ ...formData, repeatInterval: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <label className="text-[12px] font-bold text-slate-500 uppercase">Unit</label>
                          <div className="group relative">
                            <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                            <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                              <div className="flex items-start gap-3">
                                <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                  <HelpCircle className="h-4 w-4 text-yellow-700" />
                                </div>
                                <span className="font-bold text-[15px] leading-tight text-slate-900 normal-case">
                                  Select the unit of time for your custom recurring frequency (Days, Weeks, Months, or Years).
                                </span>
                              </div>
                              <div className="absolute left-3 sm:left-auto sm:right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                            </div>
                          </div>
                        </div>
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
                    </div>
                  )}
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
          timezone={kid?.timezone}
        />
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
