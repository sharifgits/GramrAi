/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import Vocabulary from './components/Vocabulary';
import Learn from './components/Learn';
import AiCreator from './components/AiCreator';
import VoiceChat from './components/VoiceChat';
import Settings from './components/Settings';
import * as LucideIcons from 'lucide-react';
import { LogOut, LogIn } from 'lucide-react';

function getIcon(name: string, size: number = 24) {
  const Icon = (LucideIcons as any)[name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, g => g[1].toUpperCase())];
  return Icon ? <Icon size={size} /> : null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('creator');
  const [extractedText, setExtractedText] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(loading => false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Initialize history
    window.history.pushState({ tab: 'creator' }, '');

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else {
        // Fallback to creator
        setActiveTab('creator');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const changeTab = (tab: string) => {
    window.history.pushState({ tab }, '');
    setActiveTab(tab);
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-950 h-screen w-screen flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-semibold text-slate-400">Loading Grammar AI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-slate-950 h-screen w-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
          <div className="space-y-2">
            <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-black mx-auto shadow-lg shadow-indigo-500/20">G</div>
            <h1 className="text-3xl font-black text-white tracking-tight">Grammar AI</h1>
            <p className="text-slate-400 font-medium">Master English grammar with AI-powered lessons and vocabulary stories.</p>
          </div>
          
          <div className="space-y-4 pt-4">
               <button 
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-950 font-bold py-4 px-6 rounded-2xl transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogIn size={20} />
                Sign in with Google
              </button>
              <p className="text-xs text-slate-500 px-4">
                By signing in, you can save your progress, vocabulary words, and AI-generated stories across devices.
              </p>
          </div>
        </div>
      </div>
    );
  }
    
  return (
    <div className="bg-slate-950 text-slate-100 h-screen w-screen flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-slate-950 border-r border-slate-900 flex-col">
        <div className="p-6 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold">G</div>
            <h1 className="text-xl font-bold tracking-tight text-white">Grammar AI</h1>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem active={activeTab === 'learn'} onClick={() => changeTab('learn')} icon="book" label="Learn" />
          <NavItem active={activeTab === 'vocab'} onClick={() => changeTab('vocab')} icon="book-open" label="Vocabulary" />
          <NavItem active={activeTab === 'creator'} onClick={() => changeTab('creator')} icon="cpu" label="AI Creator" />
          <NavItem active={activeTab === 'voice'} onClick={() => changeTab('voice')} icon="mic" label="Voice Interaction" />
          <NavItem active={activeTab === 'settings'} onClick={() => changeTab('settings')} icon="settings" label="Settings" />
        </nav>
        <div className="p-4 border-t border-slate-900 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-slate-700" />
            <div className="flex-1 min-w-0">
               <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
               <button onClick={handleLogout} className="text-[10px] text-slate-500 hover:text-red-400 font-bold flex items-center gap-1 transition-colors">
                  <LogOut size={10} /> SIGN OUT
               </button>
            </div>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 text-white text-xs">
            <div className="flex justify-between items-center mb-2">
              <span className="opacity-70">Gemini Status</span>
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
            </div>
            <p className="font-mono">v1.5-flash</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {activeTab === 'learn' && <Learn />}
          {activeTab === 'vocab' && <Vocabulary />}
          {activeTab === 'creator' && <AiCreator initialText={extractedText} />}
          {activeTab === 'voice' && <VoiceChat />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden bg-slate-950 border-t border-slate-900 flex justify-around p-3">
        <NavItemMobile active={activeTab === 'learn'} onClick={() => changeTab('learn')} icon="book" label="Learn" />
        <NavItemMobile active={activeTab === 'vocab'} onClick={() => changeTab('vocab')} icon="book-open" label="Vocabulary" />
        <NavItemMobile active={activeTab === 'creator'} onClick={() => changeTab('creator')} icon="cpu" label="AI Creator" />
        <NavItemMobile active={activeTab === 'voice'} onClick={() => changeTab('voice')} icon="mic" label="Voice Interaction" />
        <NavItemMobile active={activeTab === 'settings'} onClick={() => changeTab('settings')} icon="settings" label="Settings" />
      </nav>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 rounded-xl flex items-center gap-3 transition-colors cursor-pointer font-semibold ${
        active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
      }`}
    >
      <div className={`p-2 rounded-lg shrink-0 ${active ? 'bg-indigo-500' : 'bg-slate-800'}`}>
        {getIcon(icon)}
      </div>
      <span className="truncate">{label}</span>
    </div>
  );
}

function NavItemMobile({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 text-xs font-semibold ${
        active ? 'text-indigo-400' : 'text-slate-500'
      }`}
    >
      <div className={`p-2 rounded-lg ${active ? 'bg-indigo-900/30' : 'bg-slate-800'}`}>
        {getIcon(icon, 20)}
      </div>
      <span className="scale-90">{label.split(' ')[0]}</span>
    </button>
  );
}
