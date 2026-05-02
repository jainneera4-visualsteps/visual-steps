import { useState, useEffect, useRef } from 'react';
import { apiFetch, safeJson } from '../utils/api';
import { generateContent, modelNames } from '../lib/gemini';
import { Send, Loader2, MessageSquare, Mic, MicOff, Volume2, VolumeX, Maximize2, Minimize2, X, ExternalLink } from 'lucide-react';
import Markdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { io } from 'socket.io-client';

interface Message {
  role: 'user' | 'bot';
  text: string;
  links?: { uri: string; title: string }[];
}

interface Activity {
  id: string;
  activity_type: string;
  status: 'pending' | 'completed';
}

interface RewardItem {
  id: string;
  kid_id: string;
  name: string;
  cost: number;
  image_url?: string;
}

interface ChatbotComponentProps {
  kidId: string;
  kidName: string;
  chatbotName?: string;
  activities: Activity[];
  rewardBalance: number;
  rewardType: string;
  rewardItems: RewardItem[];
  theme?: string;
  location?: { lat: number; lng: number } | null;
  timezone?: string;
  kidProfile?: {
    dob?: string;
    gradeLevel?: string;
    hobbies?: string;
    interests?: string;
    strengths?: string;
    weaknesses?: string;
    sensoryIssues?: string;
    behavioralIssues?: string;
    notes?: string;
    therapies?: string;
  };
}

// Speech Recognition Type Definition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

export function ChatbotComponent({ kidId, kidName, chatbotName, activities, rewardBalance, rewardType, rewardItems, theme, location, timezone, kidProfile }: ChatbotComponentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatbot, setChatbot] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const greetingSpokenRef = useRef(false);

  const pendingActivities = activities.filter(a => a.status === 'pending');
  const activityList = pendingActivities.map(a => a.activity_type).join(', ');
  const rewardList = rewardItems.map(r => `${r.name} (${r.cost} ${rewardType})`).join(', ');

  const lastHistoryRef = useRef<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(e => console.log('Audio play blocked:', e));
    } catch (e) {
      console.error('Failed to play sound', e);
    }
  };

  useEffect(() => {
    console.log('ChatbotComponent mounted/updated, kidId:', kidId);
    fetchChatbotSettings().then(chatbotData => {
      fetchChatHistory(chatbotData);
    });

    const socket = io(window.location.origin);
    socket.emit('join_kid_room', kidId);

    socket.on('data_updated', (data) => {
      if (data.kidId === kidId) {
        console.log('ChatbotComponent: data_updated received, refreshing history');
        fetchChatbotSettings().then(chatbotData => {
          fetchChatHistory(chatbotData);
        });
      }
    });

    return () => {
      socket.emit('leave_kid_room', kidId);
      socket.disconnect();
    };
  }, [kidId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const fetchChatbotSettings = async () => {
    try {
      const res = await apiFetch(`/api/chatbots/${kidId}`);
      if (res.ok) {
        const data = await safeJson(res);
        setChatbot(data.chatbot);
        return data.chatbot;
      }
    } catch (error) {
      console.error('Failed to fetch chatbot settings:', error);
    }
    return null;
  };

  const fetchChatHistory = async (chatbotData: any) => {
    console.log('fetchChatHistory called');
    try {
      const res = await apiFetch(`/api/kids/${kidId}/chat-history`);
      if (res.ok) {
        const data = await safeJson(res);
        const history = data.history || [];
        const historyMessages: Message[] = history.map((m: any) => ({ role: m.role, text: m.message }));

        // Check for new messages from others (bot/parent) since last fetch
        const historyString = JSON.stringify(historyMessages);
        if (lastHistoryRef.current && historyString !== lastHistoryRef.current) {
          const lastMsg = historyMessages[historyMessages.length - 1];
          if (lastMsg && lastMsg.role === 'bot') {
            console.log('New chatbot/parent message detected, triggering celebration');
            playNotificationSound();
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.7 },
              zIndex: 2000
            });
          }
        }
        lastHistoryRef.current = historyString;

        // Check if we should greet (only once per day)
        const today = new Date().toDateString();
        const lastWelcomeKey = `last_welcome_${kidId}`;
        const lastWelcomeDate = localStorage.getItem(lastWelcomeKey);

        if (lastWelcomeDate !== today && !greetingSpokenRef.current) {
          console.log('First load of the day, greeting');
          const name = chatbotData?.name || chatbotName || 'Buddy';
          const localTime = new Date().toLocaleTimeString('en-US', { timeZone: timezone || undefined, hour: 'numeric', minute: '2-digit' });
          const greeting = `Hi! I'm ${name}. It's ${localTime} here! I'm so happy to see you! How are you doing today? ✨`;
          
          // Show history + greeting (greeting is not saved to DB to avoid clutter)
          setMessages([...historyMessages, { role: 'bot', text: greeting }]);
          speak(greeting);
          
          // Mark as greeted for today
          greetingSpokenRef.current = true;
          localStorage.setItem(lastWelcomeKey, today);
        } else {
          // Just show history
          setMessages(historyMessages);
        }
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    }
  };

  const saveMessage = async (role: 'user' | 'bot', text: string) => {
    try {
      console.log('Saving message:', { role, text, kidId });
      const res = await apiFetch(`/api/kids/${kidId}/chat-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, message: text }),
      });
      console.log('Save message response status:', res.status);
      if (!res.ok) {
        const errorData = await safeJson(res);
        console.error('Failed to save message:', errorData);
      }
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const speak = (text: string) => {
    if (isMuted) return;
    
    // Strip emojis and icons to prevent them from being read aloud
    const cleanText = text.replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to find a voice that matches the preferred gender
    const voices = window.speechSynthesis.getVoices();
    const settings = chatbot;
    const gender = settings?.gender || 'neutral';
    
    let voice;
    if (gender === 'female') {
      voice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha'));
    } else if (gender === 'male') {
      voice = voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('alex'));
    }
    
    if (voice) {
      utterance.voice = voice;
    }

    // Adjust pitch and rate for a friendlier, same-age feel
    utterance.pitch = gender === 'male' ? 1.0 : 1.2; // Slightly higher pitch for a younger feel, lower for male
    utterance.rate = settings?.speakingSpeed || 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    // Save user message
    saveMessage('user', userMessage);

    try {
      // Build system instruction based on chatbot personality and tone
      const settings = chatbot;
      const name = settings?.name || chatbotName || 'Buddy';
      const gender = settings?.gender || 'neutral';
      const personality = settings?.personality || 'friendly';
      const tone = settings?.tone || 'cheerful';
      const maxSentences = settings?.maxSentences || 2;
      const languageComplexity = settings?.languageComplexity || 'simple';

      let localDateTime = '';
      try {
        localDateTime = new Date().toLocaleString('en-US', { 
          timeZone: timezone || undefined, 
          dateStyle: 'full', 
          timeStyle: 'short' 
        });
      } catch (e) {
        console.error('Error formatting localDateTime:', e);
        localDateTime = new Date().toISOString();
      }

      const systemInstruction = `You are ${name}, a close friend who is the SAME AGE as the child you are talking to.
      Your gender identity is ${gender}. Your personality is ${personality}. Your tone of voice is ${tone}.
      
      LOCAL CONTEXT:
      - Current Date and Time: ${localDateTime}
      - Timezone: ${timezone || 'unknown'}
      - Location (Lat/Lng): ${location ? `${location.lat}, ${location.lng}` : 'unknown'}
      
      CHILD PROFILE:
      - Name: ${kidName}
      - DOB: ${kidProfile?.dob || 'unknown'}
      - Grade Level: ${kidProfile?.gradeLevel || 'unknown'}
      - Hobbies: ${kidProfile?.hobbies || 'none listed'}
      - Interests: ${kidProfile?.interests || 'none listed'}
      - Strengths: ${kidProfile?.strengths || 'none listed'}
      - Weaknesses: ${kidProfile?.weaknesses || 'none listed'}
      - Sensory Issues: ${kidProfile?.sensoryIssues || 'none listed'}
      - Behavioral Issues: ${kidProfile?.behavioralIssues || 'none listed'}
      - Therapies: ${kidProfile?.therapies || 'none listed'}
      - Parent Notes: ${kidProfile?.notes || 'none listed'}
      
      CRITICAL RULES FOR CONVERSATION:
      1. Talk to the child as their BEST FRIEND of the SAME AGE. Use a tone that is very friendly, calming, cheerful, and welcoming.
      2. Always help the child calm down if they seem stressed, upset, or over-excited.
      3. Always encourage and support the child in their daily activities and learning.
      4. Use language complexity level: ${languageComplexity}.
      5. Use at most ${maxSentences} sentences per response.
      6. Be extremely supportive, positive, and welcoming.
      7. Act as a supportive companion who is always there for them, like a peer they can trust.
      8. Avoid sounding like an adult, teacher, or authority figure. Talk like a peer!
      9. ABSOLUTELY NO SARCASM. Never use sarcasm, irony, or jokes that could be misunderstood.
      10. NEVER play tricks, tease, make fun of, or say anything that could hurt the child's feelings. Always be extremely kind, sincere, and straightforward.
      11. The child's pending activities are: ${activityList || 'none'}.
      12. The child has ${rewardBalance} ${rewardType}.
      13. The available rewards are: ${rewardList || 'none'}.
      14. Proactively encourage the child to start their activities, praise them when they complete them, and help them stay focused.
      15. Remind the child what to do next based on their pending activities.
      16. When asked for the date or time, use the current local info: ${localDateTime}.
      17. NEVER use the child's name in your responses. Do not call the child by their name.
      18. MEMORY & PERSONALIZATION: You have access to the child's full profile and past conversation history. Use this to remember what you've talked about before. If they mentioned a hobby or interest in the past, bring it up! If they were working on a specific activity, ask how it's going.
      19. Use the child's profile details (hobbies, interests, strengths) to make the conversation more personal and engaging. For example, if they like dinosaurs, you can mention them!
      20. HELPFUL RESOURCES: You can provide helpful images and links to the child to help them with their activities or interests.
          - Use Markdown for images: ![alt text](url)
          - Use Markdown for links: [link text](url)
          - Ensure all links and images are APPROPRIATE and SAFE for children.
          - Use the googleSearch tool to find relevant and safe information if needed.`;

      // Include more context from history (last 50 messages for deep memory)
      const historyContext = messages.slice(-50).map(m => `${m.role === 'user' ? 'Child' : 'Assistant'}: ${m.text}`).join('\n');

      const response = await generateContent({
        model: modelNames.flash,
        prompt: `System Instruction: ${systemInstruction}\n\nRecent History:\n${historyContext}\n\nChild: ${userMessage}`,
        tools: [{ googleSearch: {} }],
      });
      
      const reply = response.text || "I'm not sure what to say to that. Can you tell me more, friend?";
      
      // Extract grounding links if available
      const groundingLinks: { uri: string; title: string }[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web && chunk.web.uri) {
            groundingLinks.push({ uri: chunk.web.uri, title: chunk.web.title || 'Helpful Link' });
          }
        });
      }

      let fullReply = reply;
      if (groundingLinks.length > 0) {
        fullReply += "\n\n**Helpful Links:**\n" + groundingLinks.map(l => `- [${l.title}](${l.uri})`).join('\n');
      }

      setMessages(prev => [...prev, { role: 'bot', text: fullReply, links: groundingLinks.length > 0 ? groundingLinks : undefined }]);
      
      // Trigger small celebration for new message
      playNotificationSound();
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.8 },
        zIndex: 2000
      });

      // Save bot message
      saveMessage('bot', fullReply);
      
      // Speak bot message
      speak(reply);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = "Oops! Something went wrong. I might be taking a little nap.";
      setMessages(prev => [...prev, { role: 'bot', text: errorMsg }]);
      speak(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const themeColors: Record<string, string> = {
    sky: 'bg-sky-600',
    emerald: 'bg-emerald-600',
    sunset: 'bg-orange-600',
    royal: 'bg-purple-600',
    space: 'bg-blue-600'
  };

  const activeColor = themeColors[theme || 'sky'] || themeColors.sky;

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in fade-in zoom-in duration-300">
        <div className={`p-4 ${activeColor} text-white flex items-center justify-between shadow-md shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wider">
                Chatting with {chatbot?.name || chatbotName || 'Buddy'}
              </h3>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Full Screen Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
            <button 
              onClick={() => setIsFullScreen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Exit Full Screen"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 p-6 md:p-12 overflow-y-auto space-y-6 bg-slate-50"
        >
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] md:max-w-[75%] p-4 md:p-6 rounded-3xl text-lg shadow-sm border ${
                  msg.role === 'user' 
                    ? `${activeColor} text-white rounded-tr-none border-transparent` 
                    : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                }`}>
                  <div className="markdown-body">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-4 rounded-3xl rounded-tl-none shadow-sm">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-8 border-t border-slate-200 bg-white shrink-0">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-4 items-center">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-4 rounded-full transition-all transform hover:scale-105 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg ring-4 ring-red-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-sm'}`}
              title={isListening ? "Stop Listening" : "Start Listening"}
            >
              {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or talk to your friend..."
              className="flex-1 h-14 px-6 text-lg rounded-full border-2 border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-inner bg-slate-50"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`h-14 w-14 flex items-center justify-center rounded-full text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100 shadow-lg ${activeColor}`}
            >
              <Send className="w-6 h-6" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[450px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className={`p-3 ${activeColor} text-white flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Chat with {chatbot?.name || chatbotName || 'Buddy'}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => setIsFullScreen(true)}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
            title="Full Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50"
      >
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] p-2.5 rounded-2xl text-sm ${
              msg.role === 'user' 
                ? `${activeColor} text-white rounded-tr-none` 
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
            }`}>
              <div className="markdown-body">
                <Markdown>{msg.text}</Markdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-2.5 rounded-2xl rounded-tl-none shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-2 border-t border-slate-100 bg-white flex gap-2 items-center">
        <button
          type="button"
          onClick={toggleListening}
          className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          title={isListening ? "Stop Listening" : "Start Listening"}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or talk..."
          className="flex-1 h-9 px-3 text-sm rounded-full border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button 
          type="submit"
          disabled={isLoading || !input.trim()}
          className={`h-9 w-9 flex items-center justify-center rounded-full text-white transition-opacity disabled:opacity-50 ${activeColor}`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
