/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Vocabulary from './components/Vocabulary';
import Learn from './components/Learn';
import AiCreator from './components/AiCreator';
import VoiceChat from './components/VoiceChat';
import Settings from './components/Settings';
import * as LucideIcons from 'lucide-react';
import { LogOut, Cloud } from 'lucide-react';
import { getUserProfile, logoutDrive, DriveUser } from './services/driveService';

function getIcon(name: string, size: number = 24) {
  const Icon = (LucideIcons as any)[name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, g => g[1].toUpperCase())];
  return Icon ? <Icon size={size} /> : null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('creator');
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [driveUser, setDriveUser] = useState<DriveUser | null>(null);
  
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

    const checkAuth = async () => {
      const user = await getUserProfile();
      setDriveUser(user);
    };
    checkAuth();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data.tokens) {
          localStorage.setItem('google_auth_tokens', JSON.stringify(event.data.tokens));
        }
        checkAuth();
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const changeTab = (tab: string) => {
    window.history.pushState({ tab }, '');
    setActiveTab(tab);
  };

  const handleDriveLogout = async () => {
    await logoutDrive();
    setDriveUser(null);
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
          {driveUser && (
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-3 flex items-center gap-3">
              <img src={driveUser.picture} className="w-8 h-8 rounded-full border border-indigo-500 shadow-sm" alt={driveUser.name} />
              <div className="overflow-hidden">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Backup Active</p>
                <p className="text-[11px] font-bold text-white truncate">{driveUser.name}</p>
              </div>
            </div>
          )}
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
          {activeTab === 'creator' && (
            <AiCreator 
              initialText={extractedText} 
              driveUser={driveUser} 
            />
          )}
          {activeTab === 'voice' && <VoiceChat />}
          {activeTab === 'settings' && <Settings driveUser={driveUser} onDriveLogout={handleDriveLogout} />}
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
