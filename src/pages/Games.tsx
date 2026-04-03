import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Gamepad2, Sparkles, History } from 'lucide-react';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';

export default function Games() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Games</h1>
          <p className="text-slate-500 font-medium">Fun and educational games for your child.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-none ring-1 ring-slate-200 overflow-hidden group hover:ring-blue-500 transition-all duration-300">
          <div className="h-48 bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <Sparkles size={64} className="text-blue-500" />
          </div>
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-900">Level Up Challenge</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-6">
              Master 10 questions in your chosen subject to advance to the next grade level!
            </p>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black"
              onClick={() => navigate('/level-up-challenge')}
            >
              Play Now
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-slate-200 overflow-hidden group hover:ring-pink-500 transition-all duration-300">
          <div className="h-48 bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
            <Gamepad2 size={64} className="text-pink-500" />
          </div>
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-900">Brain Quest</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-6">
              Interactive flashcards with fun facts! Perfect for learning new things every day.
            </p>
            <Button 
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black"
              onClick={() => navigate('/brain-quest')}
            >
              Play Now
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-slate-200 overflow-hidden group hover:ring-emerald-500 transition-all duration-300">
          <div className="h-48 bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <Gamepad2 size={64} className="text-emerald-500" />
          </div>
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-900">Memory Match</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-6">
              A classic card matching game with fun animal emojis! Great for focus and memory.
            </p>
            <Button 
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black"
              onClick={() => navigate('/memory-match')}
            >
              Play Now
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-slate-200 overflow-hidden group hover:ring-amber-500 transition-all duration-300">
          <div className="h-48 bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <Gamepad2 size={64} className="text-amber-500" />
          </div>
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-900">Sorting Fun</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-6">
              Help sort fruits and vegetables into the right baskets! Fun for learning categories.
            </p>
            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black"
              onClick={() => navigate('/sorting-game')}
            >
              Play Now
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-slate-200 overflow-hidden group hover:ring-purple-500 transition-all duration-300">
          <div className="h-48 bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
            <Gamepad2 size={64} className="text-purple-500" />
          </div>
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-900">Even or Odd</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-6">
              A fun math game to learn about even and odd numbers! Can you get a 10 streak?
            </p>
            <Button 
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-black"
              onClick={() => navigate('/even-odd')}
            >
              Play Now
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-slate-200 overflow-hidden group hover:ring-emerald-500 transition-all duration-300">
          <div className="h-48 bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <Gamepad2 size={64} className="text-emerald-500" />
          </div>
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-900">Polygon Explorer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-6">
              Learn about different polygons and their names in this fun shape game!
            </p>
            <Button 
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black"
              onClick={() => navigate('/polygons-game')}
            >
              Play Now
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-slate-200 overflow-hidden group hover:ring-blue-500 transition-all duration-300">
          <div className="h-48 bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <Gamepad2 size={64} className="text-blue-500" />
          </div>
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-900">Polygon Hunt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-6">
              Can you find the matching shape? Test your polygon knowledge in this hunt!
            </p>
            <Button 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black"
              onClick={() => navigate('/polygon-hunt')}
            >
              Play Now
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-slate-200 overflow-hidden group opacity-60">
          <div className="h-48 bg-slate-50 flex items-center justify-center">
            <Gamepad2 size={64} className="text-slate-400" />
          </div>
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-400">More Games Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 mb-6">
              We are currently working on exciting new games to help your child learn and grow.
            </p>
            <Button 
              disabled
              variant="outline" 
              className="w-full border-slate-200 text-slate-400"
            >
              Locked
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
