import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, safeJson } from '../utils/api';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Bot, Plus, Edit2 } from 'lucide-react';

interface Kid {
  id: string;
  name: string;
}

interface Chatbot {
  id: string;
  kid_id: string;
  name: string;
  gender: string;
  personality: string;
  tone: string;
}

export default function ChatbotsDashboard() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [chatbots, setChatbots] = useState<Record<string, Chatbot>>({});
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const kidsRes = await apiFetch('/api/kids');
        if (!kidsRes.ok) throw new Error('Failed to fetch kids');
        const kidsData = await safeJson(kidsRes);
        console.log('Fetched kids:', kidsData);
        setKids(kidsData.kids);

        const chatbotMap: Record<string, Chatbot> = {};
        for (const kid of kidsData.kids) {
          const chatbotRes = await apiFetch(`/api/chatbots/${kid.id}`);
          if (chatbotRes.ok) {
            const chatbotData = await safeJson(chatbotRes);
            console.log(`Chatbot data for kid ${kid.id}:`, chatbotData);
            if (chatbotData.chatbot && chatbotData.chatbot.name) {
              console.log(`Chatbot found for kid ${kid.id}:`, chatbotData.chatbot);
              chatbotMap[kid.id] = chatbotData.chatbot;
            } else {
              console.log(`No chatbot found or missing name for kid ${kid.id}`, chatbotData);
            }
          } else {
            const errorText = await chatbotRes.text();
            console.error(`Failed to fetch chatbot for kid ${kid.id}. Status: ${chatbotRes.status}, Text: ${errorText}`);
          }
        }
        setChatbots(chatbotMap);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Chatbot Management</h1>
      <div className="grid gap-4">
        {kids.map((kid) => {
          const chatbot = chatbots[kid.id];
          return (
            <Card key={kid.id} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                <CardTitle className="text-lg font-bold">{kid.name}</CardTitle>
                {chatbot ? (
                  <Button 
                    variant="outline" 
                    size="xs" 
                    onClick={() => navigate(`/edit-kid/${kid.id}/chatbot`)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" /> Edit {chatbot.name}
                  </Button>
                ) : (
                  <Button 
                    size="xs" 
                    onClick={() => navigate(`/edit-kid/${kid.id}/chatbot`)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Create Chatbot
                  </Button>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {chatbot ? (
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Bot className="w-5 h-5 text-blue-600" />
                    <span><strong>Name:</strong> {chatbot.name}</span>
                    <span><strong>Personality:</strong> {chatbot.personality}</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No chatbot created for this child yet.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
