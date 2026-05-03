import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Key, Save, Download, Upload, CheckCircle, AlertTriangle, Loader2, Database, RefreshCw, Smartphone } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';

import { PWAInstall } from './PWAInstall';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{status: 'success' | 'error' | null, message: string}>({status: null, message: ''});
  const [dataResult, setDataResult] = useState<{status: 'success' | 'error' | null, message: string}>({status: null, message: ''});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    const unsub = onSnapshot(doc(db, `users/${userId}/config`, 'default'), (docSnap) => {
        if (docSnap.exists()) {
            setApiKey(docSnap.data().geminiApiKey || '');
        }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}/config/default`));

    return () => unsub();
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    
    try {
        await setDoc(doc(db, `users/${userId}/config`, 'default'), {
            geminiApiKey: apiKey,
            updatedAt: serverTimestamp()
        }, { merge: true });
        
        localStorage.setItem('gemini_api_key', apiKey);
        setTestResult({ status: 'success', message: 'API Key saved to your profile successfully!' });
        setTimeout(() => setTestResult({ status: null, message: '' }), 3000);
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${userId}/config/default`);
        setTestResult({ status: 'error', message: 'Failed to save API key to cloud.' });
    }
  };

  const handleTest = async () => {
    if (!apiKey) {
      setTestResult({ status: 'error', message: 'Please enter an API key first.' });
      return;
    }
    
    setIsTesting(true);
    setTestResult({ status: null, message: '' });

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: 'Say "hello" and reply with only that word.',
      });
      
      const text = response.text;
      if (text) {
        setTestResult({ status: 'success', message: 'Connection successful! API key is valid.' });
      } else {
        throw new Error("Invalid response");
      }
    } catch (error: any) {
      console.error(error);
      setTestResult({ status: 'error', message: error.message || 'Failed to verify API key. Please check and try again.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleBackup = () => {
    try {
        const data: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                data[key] = localStorage.getItem(key) || '';
            }
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grammarbd-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setDataResult({ status: 'success', message: 'Data backup generated successfully!' });
        setTimeout(() => setDataResult({ status: null, message: '' }), 4000);
    } catch(err: any) {
        setDataResult({ status: 'error', message: err.message || 'Failed to generate backup' });
    }
  };

  const handleRestore = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const data = JSON.parse(content);
            
            localStorage.clear();
            for (const key in data) {
                localStorage.setItem(key, data[key]);
            }
            
            const savedKey = localStorage.getItem('gemini_api_key');
            if (savedKey) setApiKey(savedKey);
            
            setDataResult({ status: 'success', message: 'Data restored successfully! Please refresh or restart to apply.' });
        } catch (error) {
            setDataResult({ status: 'error', message: 'Failed to parse backup file. Please ensure it is a valid JSON.' });
        }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-full flex flex-col font-sans -m-4 md:-m-8 pb-10 bg-[#0e121b]">
      {/* Header */}
      <div className="relative bg-[#6e5aff] px-6 py-8 md:py-12 overflow-hidden">
        {/* Decorative circle */}
        <div className="absolute top-[-80px] right-[-40px] w-64 h-64 bg-[#8b79ff] rounded-full opacity-60 mix-blend-screen blur-2xl"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto">
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">SETTINGS</h1>
            <p className="text-white/90 font-medium">Configure API keys and manage your App Data.</p>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-8 mt-6">
        
        {/* Gemini Settings */}
        <section className="bg-[#131b2c] border border-slate-800 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-[#6e5aff]/10 rounded-xl">
                    <Key className="text-[#6e5aff]" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Gemini API Configuration</h2>
                  <p className="text-sm text-slate-400">Required for advanced AI generation features.</p>
                </div>
            </div>

            <div className="space-y-4 max-w-2xl">
                <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">API Key</label>
                    <div className="flex gap-3">
                        <input 
                            type="password" 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="flex-1 bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-[#6e5aff] focus:ring-1 focus:ring-[#6e5aff] transition-colors"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Your key is securely stored in your browser's local storage.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 max-w-sm">
                    <button 
                        onClick={handleSave}
                        className="flex items-center justify-center gap-2 bg-[#6e5aff] hover:bg-[#5b4be0] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm"
                    >
                        <Save size={18} strokeWidth={2.5} />
                        Save
                    </button>
                    <button 
                        onClick={handleTest}
                        disabled={isTesting}
                        className="flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-[#334155] text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 border border-slate-700/50 shadow-sm"
                    >
                        {isTesting ? <Loader2 size={18} className="animate-spin" strokeWidth={2.5} /> : <RefreshCw size={18} strokeWidth={2.5} />}
                        Test
                    </button>
                </div>

                {testResult.status && (
                    <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 border ${
                        testResult.status === 'success' 
                            ? 'bg-[#6e5aff]/10 border-[#6e5aff]/30 text-[#d4d1ff]' 
                            : 'bg-red-900/20 border-red-900/50 text-red-400'
                    }`}>
                        {testResult.status === 'success' ? <CheckCircle size={20} className="mt-0.5 shrink-0 text-[#8b79ff]" /> : <AlertTriangle size={20} className="mt-0.5 shrink-0" />}
                        <p className="font-medium text-sm">{testResult.message}</p>
                    </div>
                )}
            </div>
        </section>

        {/* PWA Installation */}
        <section className="bg-[#131b2c] border border-slate-800 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-500/10 rounded-xl">
                    <Smartphone className="text-indigo-500" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">App Installation</h2>
                  <p className="text-sm text-slate-400">Install this web app on your device for a native-like experience.</p>
                </div>
            </div>

            <div className="max-w-2xl">
                <PWAInstall />
            </div>
        </section>

        {/* Data Backup & Restore */}
        <section className="bg-[#131b2c] border border-slate-800 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                    <Database className="text-emerald-500" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Data Backup & Restore</h2>
                  <p className="text-sm text-slate-400">Save or load your customized topics, vocab, and settings.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <h3 className="font-bold text-white mb-2">Backup Data</h3>
                    <p className="text-sm text-slate-400 mb-6 min-h-[40px]">Export all your local data to a JSON file for safekeeping.</p>
                    <button 
                        onClick={handleBackup}
                        className="w-full justify-center flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                        <Download size={18} />
                        Download Backup
                    </button>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <h3 className="font-bold text-white mb-2">Restore Data</h3>
                    <p className="text-sm text-slate-400 mb-6 min-h-[40px]">Import a previously saved backup file. This overrides current data.</p>
                    
                    <input 
                        type="file" 
                        accept=".json,application/json" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleRestore}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full justify-center flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 border border-emerald-900/50 font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                        <Upload size={18} />
                        Upload Backup
                    </button>
                </div>
            </div>

            {dataResult.status && (
                <div className={`mt-6 p-4 max-w-2xl rounded-xl flex items-start gap-3 border ${
                    dataResult.status === 'success' 
                        ? 'bg-emerald-900/20 border-emerald-900/50 text-emerald-400' 
                        : 'bg-red-900/20 border-red-900/50 text-red-400'
                }`}>
                    {dataResult.status === 'success' ? <CheckCircle size={20} className="mt-0.5 shrink-0" /> : <AlertTriangle size={20} className="mt-0.5 shrink-0" />}
                    <p className="font-medium text-sm">{dataResult.message}</p>
                </div>
            )}
        </section>

      </div>
    </div>
  );
}

