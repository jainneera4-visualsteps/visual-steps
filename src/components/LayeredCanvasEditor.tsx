import React, { useState, useRef, useEffect } from 'react';
import { 
  Trash2, Layers, Check, RotateCcw, Sparkles, LayoutGrid, Hash, CircleDashed,
  Loader2, Info
} from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { GoogleGenAI } from "@google/genai";

interface Layer {
  id: string;
  type: 'path';
  content: string; // path data
}

interface LayeredCanvasEditorProps {
  initialValue?: string;
  onSave: (svg: string) => void;
}

const TEMPLATES = [
  { id: 'numline', icon: Hash, label: 'Number Line', path: "M 20 150 L 280 150 M 20 140 L 20 160 M 72 140 L 72 160 M 124 140 L 124 160 M 176 140 L 176 160 M 228 140 L 228 160 M 280 140 L 280 160" },
  { id: 'grid', icon: LayoutGrid, label: 'Coordinate Grid', path: "M 20 150 L 280 150 M 150 20 L 150 280 M 50 20 L 50 280 M 100 20 L 100 280 M 200 20 L 200 280 M 250 20 L 250 280 M 20 50 L 280 50 M 20 100 L 280 100 M 20 200 L 280 200 M 20 250 L 280 250" },
  { id: 'venn', icon: CircleDashed, label: 'Venn Diagram', path: "M 100 150 m -60 0 a 60 60 0 1 0 120 0 a 60 60 0 1 0 -120 0 M 200 150 m -60 0 a 60 60 0 1 0 120 0 a 60 60 0 1 0 -120 0" },
];

export function LayeredCanvasEditor({ initialValue, onSave }: LayeredCanvasEditorProps) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [mode, setMode] = useState<'ai' | 'templates'>('ai');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);

  // Initialize layers from initialValue if it's a valid SVG with paths
  useEffect(() => {
    if (initialValue && layers.length === 0) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(initialValue, 'image/svg+xml');
        const paths = Array.from(doc.querySelectorAll('path'));
        if (paths.length > 0) {
          const newLayers = paths.map(p => ({
            id: Math.random().toString(36).substr(2, 9),
            type: 'path' as const,
            content: p.getAttribute('d') || ''
          })).filter(l => l.content);
          setLayers(newLayers);
        }
      } catch (e) {
        console.error('Failed to parse initial SVG value', e);
      }
    }
  }, [initialValue]);

  const addLayer = (content: string) => {
    const newLayer: Layer = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'path',
      content
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  const removeLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(null);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Create a single complex SVG <path> 'd' attribute string (multiple segments allowed) for a high-quality Black and White Line Art icon/illustration representing: "${aiPrompt}". 
        Include measurements, labels, or specific structural details if mentioned. 
        Requirements:
        - Viewport: 300x300
        - Style: Minimalist line art, NO color fills, strokes only.
        - Output: Return ONLY the raw value for the 'd' attribute. NO markdown, NO tags.`,
      });
      
      const pathData = response.text.trim().replace(/^['"]|['"]$/g, '');
      if (pathData) {
        addLayer(pathData);
        setAiPrompt('');
      }
    } catch (err) {
      console.error('AI Generation failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateAndSave = () => {
    if (!svgRef.current) return;
    const svgContent = Array.from(svgRef.current.children)
      .map(child => child.outerHTML)
      .join('');
    
    const finalSvg = `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgContent}</svg>`;
    onSave(finalSvg);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 border rounded-xl p-4 bg-white shadow-sm border-slate-200 min-h-[500px]">
      {/* Left Toolbar */}
      <div className="flex md:flex-col gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 h-fit">
        <Button 
          variant={mode === 'ai' ? 'primary' : 'ghost'} 
          size="sm" 
          onClick={() => setMode('ai')}
          className="w-full justify-start text-purple-600 hover:text-purple-700 hover:bg-purple-50"
        >
          <Sparkles className="w-4 h-4 mr-2" /> <span className="hidden md:inline">AI Assist</span>
        </Button>
        <Button 
          variant={mode === 'templates' ? 'primary' : 'ghost'} 
          size="sm" 
          onClick={() => setMode('templates')}
          className="w-full justify-start"
        >
          <LayoutGrid className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Templates</span>
        </Button>
        <div className="h-px bg-slate-200 my-1 hidden md:block" />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={generateAndSave}
          className="w-full justify-start text-emerald-600 border-emerald-100 hover:bg-emerald-50"
        >
          <Check className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Update</span>
        </Button>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col gap-4">
        {mode === 'ai' && (
          <div className="space-y-3 p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
            <div className="flex items-center gap-2 text-purple-700 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">AI Assisted Editor</span>
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="e.g., A cylinder with 5cm height, 3cm radius..." 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 bg-white border-purple-200 focus-visible:ring-purple-500"
                disabled={isAiLoading}
              />
              <Button 
                onClick={handleAiGenerate} 
                disabled={isAiLoading || !aiPrompt.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
              </Button>
            </div>
            <p className="text-[10px] text-purple-600 flex items-center gap-1">
              <Info className="w-3 h-3" /> Describe the shape, graph, or chart with measurements and details.
            </p>
          </div>
        )}

        {mode === 'templates' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TEMPLATES.map(t => (
              <button 
                key={t.id}
                onClick={() => addLayer(t.path)}
                className="p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-3 text-left"
              >
                <div className="p-2 bg-slate-50 rounded-md text-slate-600">
                  <t.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-700">{t.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="relative flex-1 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden min-h-[300px] flex items-center justify-center">
          <svg 
            ref={svgRef}
            viewBox="0 0 300 300" 
            className="w-full h-full max-w-[300px] aspect-square"
          >
            {layers.map((layer) => (
              <path 
                key={layer.id} 
                d={layer.content} 
                fill="none" 
                stroke={activeLayerId === layer.id ? '#3b82f6' : 'black'} 
                strokeWidth={activeLayerId === layer.id ? '3' : '2'} 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                onClick={() => setActiveLayerId(layer.id)}
                className="cursor-pointer"
              />
            ))}
          </svg>
          
          {layers.length > 0 && (
            <div className="absolute top-2 right-2 flex gap-2">
               <Button 
                variant="outline" 
                size="xs" 
                onClick={() => setLayers([])} 
                className="bg-white/80 backdrop-blur-sm"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Clear
              </Button>
              {activeLayerId && (
                <Button 
                  variant="outline" 
                  size="xs" 
                  onClick={() => removeLayer(activeLayerId)}
                  className="bg-white/80 backdrop-blur-sm text-red-500 border-red-100 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Delete Segment
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
