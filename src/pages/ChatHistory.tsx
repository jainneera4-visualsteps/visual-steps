import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch, safeJson } from '../utils/api';
import { MessageSquare, User, Bot, ArrowLeft, Loader2, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import Markdown from 'react-markdown';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  message: string;
  created_at: string;
  links?: { uri: string; title: string }[];
}

export default function ChatHistory() {
  const { kidId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kidName, setKidName] = useState('');
  const [kidAvatar, setKidAvatar] = useState('');
  const [chatbotName, setChatbotName] = useState('');

  useEffect(() => {
    if (kidId) {
      fetchKidDetails();
      fetchHistory();
    }
  }, [kidId]);

  const fetchKidDetails = async () => {
    try {
      const res = await apiFetch(`/api/kids/${kidId}`);
      if (res.ok) {
        const data = await safeJson(res);
        setKidName(data.kid.name || 'Child');
        setKidAvatar(data.kid.avatar || '');
        let name = data.kid.chatbot_name || 'Buddy';

        // Try to fetch from dedicated chatbots table
        try {
          const chatbotRes = await apiFetch(`/api/chatbots/${kidId}`);
          if (chatbotRes.ok) {
            const chatbotData = await safeJson(chatbotRes);
            if (chatbotData.chatbot && chatbotData.chatbot.name) {
              name = chatbotData.chatbot.name;
            }
          }
        } catch (e) {
          console.error('Failed to fetch chatbot details:', e);
        }

        setChatbotName(name);
      }
    } catch (error) {
      console.error('Failed to fetch kid details:', error);
    }
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/kids/${kidId}/chat-history`);
      if (res.ok) {
        const data = await safeJson(res);
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] space-y-4 p-4">
      <div className="flex items-center justify-between shrink-0">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-slate-800">Chat History</h1>
          <p className="text-slate-500 text-sm">Reviewing conversations for {kidName}</p>
        </div>
      </div>

      <Card className="border-none shadow-lg overflow-hidden flex flex-col flex-1">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Conversations Log</CardTitle>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                {kidName} & {chatbotName}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0 bg-slate-50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-slate-500 font-medium">Loading conversation history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="p-4 bg-white rounded-full shadow-sm">
                <MessageSquare className="w-12 h-12 text-slate-200" />
              </div>
              <div>
                <p className="text-slate-500 font-bold text-lg">No messages yet</p>
                <p className="text-slate-400 max-w-xs mx-auto">
                  Conversations will appear here once {kidName} starts chatting with {chatbotName}.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
              {history.map((msg, index) => {
                const date = new Date(msg.created_at);
                const showDate = index === 0 || 
                  new Date(history[index-1].created_at).toDateString() !== date.toDateString();

                return (
                  <div key={msg.id} className="space-y-6">
                    {showDate && (
                      <div className="flex items-center justify-center py-6">
                        <div className="px-4 py-1.5 bg-white shadow-sm border border-slate-100 rounded-full flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                            {date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
                        <div className="flex items-center gap-2 mb-2 px-1">
                          {msg.role === 'bot' ? (
                            <>
                              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                                <Bot className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-sm font-bold text-slate-800">{chatbotName}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-bold text-slate-800">{kidName}</span>
                              <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
                                {kidAvatar ? (
                                  <img src={kidAvatar} alt={kidName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <User className="w-4 h-4 text-white" />
                                )}
                              </div>
                            </>
                          )}
                          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter ml-2">
                            {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`p-4 md:p-5 rounded-2xl text-base shadow-sm leading-relaxed border ${
                          msg.role === 'user' 
                            ? 'bg-emerald-500 text-white border-emerald-600 rounded-tr-none' 
                            : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                        }`}>
                          <div className="markdown-body">
                            <Markdown>{msg.message}</Markdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
