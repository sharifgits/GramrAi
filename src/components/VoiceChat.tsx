import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MessageSquare, FileText, Languages, RefreshCw, Volume2, Globe, Check, Square, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function VoiceChat() {
  const [activeTab, setActiveTab] = useState<'conversation' | 'dictation' | 'translation'>('conversation');
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  // Conversation State
  const [messages, setMessages] = useState<{role: 'user'|'assistant', text: string}[]>([
    { role: 'assistant', text: 'Hello! I am your AI language tutor. Tap the microphone and say something to practice your English speaking.' },
  ]);
  
  // Translation State
  const [sourceLang, setSourceLang] = useState('en-US');
  const [targetLang, setTargetLang] = useState('bn-BD');
  const [translationResult, setTranslationResult] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    const unsub = onSnapshot(doc(db, `users/${userId}/config`, 'default'), (docSnap) => {
        if (docSnap.exists()) {
            setGeminiApiKey(docSnap.data().geminiApiKey);
        }
    });

    return () => unsub();
  }, [userId]);

  const getGeminiResponse = async (userText: string, mode: 'conversation' | 'translation') => {
    const apiKey = geminiApiKey || localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      return "Please set your Gemini API key in Settings first.";
    }

    try {
      const genAI = new GoogleGenAI({ apiKey });

      let prompt = "";
      if (mode === 'conversation') {
        const history = messages.slice(-5).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join("\n");
        prompt = `You are a helpful and encouraging language tutor. 
History:
${history}
User: ${userText}
Assistant: (Reply concisely and encourage correct pronunciation/grammar if needed)`;
      } else {
        const sourceLangLabel = sourceLang === 'en-US' ? 'English' : sourceLang === 'es-ES' ? 'Spanish' : 'Bengali';
        const targetLangLabel = targetLang === 'bn-BD' ? 'Bengali' : targetLang === 'es-ES' ? 'Spanish' : 'English';
        prompt = `Translate the following text from ${sourceLangLabel} to ${targetLangLabel}. Return ONLY the translated text, nothing else.
Text: ${userText}`;
      }

      const response = await genAI.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt
      });
      return (response.text || "").trim();
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Sorry, I had trouble connecting to the AI. Please try again.";
    }
  };

  useEffect(() => {
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }
        setTranscript(prev => prev + finalTrans);
        setInterimTranscript(interimTrans);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'aborted') {
          console.log("Speech recognition stopped.");
        } else {
          console.error("Speech recognition error", event.error);
        }
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, []);

  useEffect(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    setTranscript('');
    setInterimTranscript('');
  }, [activeTab]);

  useEffect(() => {
    if (scrollRef.current && activeTab === 'conversation') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interimTranscript, activeTab, isProcessing]);

  const toggleRecording = async () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      
      const fullText = (transcript + interimTranscript).trim();
      
      if (activeTab === 'conversation' && fullText) {
        setMessages(prev => [...prev, { role: 'user', text: fullText }]);
        setTranscript('');
        setInterimTranscript('');
        
        setIsProcessing(true);
        const aiResponse = await getGeminiResponse(fullText, 'conversation');
        setMessages(prev => [...prev, { role: 'assistant', text: aiResponse }]);
        setIsProcessing(false);
        
        // Auto-speak response
        handleSpeaker(aiResponse);
      }
      
      if (activeTab === 'translation' && fullText) {
        setIsProcessing(true);
        const translated = await getGeminiResponse(fullText, 'translation');
        setTranslationResult(translated);
        setIsProcessing(false);
      }

    } else {
      setTranscript('');
      setInterimTranscript('');
      setTranslationResult('');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = activeTab === 'translation' ? sourceLang : 'en-US';
          recognitionRef.current.start();
          setIsRecording(true);
        } catch (e) {
          console.warn("Speech recognition is already running.");
        }
      } else {
        alert("Voice features aren't fully supported in your browser (try Chrome/Edge or open in new tab).");
      }
    }
  };

  const handleSpeaker = (text: string) => {
    if ('speechSynthesis' in window) {
       window.speechSynthesis.cancel(); // Stop current speaking
       const utterance = new SpeechSynthesisUtterance(text);
       utterance.lang = activeTab === 'translation' ? targetLang : 'en-US';
       window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-full flex flex-col font-sans -m-4 md:-m-8 pb-10 bg-[#0e121b]">
      {/* Header Area */}
      <div className="relative bg-[#6e5aff] px-6 py-8 overflow-hidden">
        {/* Decorative circle */}
        <div className="absolute top-[-50px] right-[-20px] w-48 h-48 bg-[#8b79ff] rounded-full opacity-60 mix-blend-screen blur-2xl"></div>

        <div className="relative z-10 max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">VOICE LAB</h1>
            <p className="text-white/90 text-sm md:text-base font-medium mb-6 leading-relaxed max-w-lg">
              Practice pronunciation, dictate text efficiently, or translate spoken words seamlessly with AI power.
            </p>
            
            {/* Nav Tabs */}
            <div className="flex gap-2 md:gap-4 mb-6">
                <button 
                  onClick={() => setActiveTab('conversation')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-[14px] py-2.5 px-2 text-[11px] md:text-xs font-bold uppercase transition-colors ${
                    activeTab === 'conversation' ? 'bg-white text-[#6e5aff] shadow-sm' : 'bg-[#8b79ff]/40 text-white hover:bg-[#8b79ff]/60'
                  }`}>
                  <MessageSquare size={16} strokeWidth={2.5} />
                  Conversation
                </button>
                <button 
                  onClick={() => setActiveTab('dictation')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-[14px] py-2.5 px-2 text-[11px] md:text-xs font-bold uppercase transition-colors ${
                    activeTab === 'dictation' ? 'bg-white text-[#6e5aff] shadow-sm' : 'bg-[#8b79ff]/40 text-white hover:bg-[#8b79ff]/60'
                  }`}>
                  <FileText size={16} strokeWidth={2.5} />
                  Dictation
                </button>
                <button 
                  onClick={() => setActiveTab('translation')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-[14px] py-2.5 px-2 text-[11px] md:text-xs font-bold uppercase transition-colors ${
                    activeTab === 'translation' ? 'bg-white text-[#6e5aff] shadow-sm' : 'bg-[#8b79ff]/40 text-white hover:bg-[#8b79ff]/60'
                  }`}>
                  <Languages size={16} strokeWidth={2.5} />
                  Translation
                </button>
            </div>
        </div>
      </div>

      <div className="p-4 md:p-6 flex-1 flex flex-col max-w-6xl mx-auto w-full">
        {/* TAB 1: CONVERSATION */}
        {activeTab === 'conversation' && (
          <div className="flex-1 flex flex-col h-[500px] border border-slate-800 rounded-3xl overflow-hidden bg-[#131b2c]">
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#8b79ff]/20 flex items-center justify-center border border-[#8b79ff]/50">
                   <span className="w-2.5 h-2.5 rounded-full bg-[#8b79ff] shadow-[0_0_8px_rgba(139,121,255,0.8)] animate-pulse"></span>
                </div>
                <div>
                  <h3 className="text-white font-bold tracking-tight">AI Language Tutor</h3>
                  <p className="text-[#8b79ff] text-xs font-semibold uppercase">Online • Listening Mode</p>
                </div>
              </div>
              <button className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 transition">
                <RefreshCw size={18} className="text-slate-400" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {(messages || []).map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-4 md:px-5 ${
                    msg.role === 'user' 
                      ? 'bg-[#6e5aff] text-white rounded-tr-sm' 
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
                  }`}>
                    <p className="leading-relaxed">{msg.text}</p>
                    {msg.role === 'assistant' && (
                      <button onClick={() => handleSpeaker(msg.text)} className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#8b79ff] p-1 -ml-1 rounded hover:bg-slate-700/50 mix-blend-screen transition">
                        <Volume2 size={14} /> Listen
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isProcessing && activeTab === 'conversation' && (
                <div className="flex justify-start">
                   <div className="bg-slate-800 border border-slate-700 text-slate-400 rounded-2xl p-4 md:px-5 rounded-tl-sm flex items-center gap-3">
                      <Loader2 size={18} className="animate-spin text-[#8b79ff]" />
                      <p className="text-sm font-medium italic">Gemini is thinking...</p>
                   </div>
                </div>
              )}
              
              {(transcript || interimTranscript) && (
                 <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl p-4 md:px-5 bg-[#8b79ff]/20 border border-[#8b79ff]/40 text-[#d4d1ff] rounded-tr-sm">
                      <p className="leading-relaxed opacity-80 italic animate-pulse">
                        {transcript} <span className="opacity-50">{interimTranscript}</span>
                      </p>
                    </div>
                </div>
              )}
            </div>
            
            {/* Record Control */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-center pb-8 pt-6">
              <button 
                onClick={toggleRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)] scale-110' 
                    : 'bg-[#8b79ff] hover:bg-[#6e5aff] shadow-xl'
                }`}
              >
                {isRecording ? <Square size={28} className="text-white" fill="currentColor" /> : <Mic size={32} className="text-white" strokeWidth={2.5} />}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: DICTATION (VOICE TO TEXT) */}
        {activeTab === 'dictation' && (
          <div className="flex-1 flex flex-col h-[500px]">
            <div className="bg-[#131b2c] border border-slate-800 rounded-3xl p-6 flex flex-col flex-1">
              <h2 className="text-lg font-bold text-white mb-4">Live Dictation</h2>
              <div className="flex-1 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/50 p-6 overflow-y-auto">
                 {(!transcript && !interimTranscript) ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                     <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                        <FileText size={28} />
                     </div>
                     <p className="font-medium">Tap the microphone to start transcribing speech to text.</p>
                   </div>
                 ) : (
                   <p className="text-lg text-slate-200 leading-relaxed font-medium">
                     {transcript} <span className="text-[#8b79ff] italic bg-[#8b79ff]/20">{interimTranscript}</span>
                   </p>
                 )}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition">
                      Copy Text
                   </button>
                   <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition">
                      Clear
                   </button>
                </div>
                <button 
                  onClick={toggleRecording}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                      : 'bg-[#8b79ff] hover:bg-[#6e5aff]'
                  }`}
                >
                  {isRecording ? <Square size={20} className="text-white" fill="currentColor" /> : <Mic size={24} className="text-white" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRANSLATION */}
        {activeTab === 'translation' && (
          <div className="flex-1 flex flex-col gap-4 h-[500px]">
            {/* Language Selectors */}
            <div className="flex flex-col md:flex-row gap-4">
               <div className="flex-1 bg-[#131b2c] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Source Language</p>
                    <select 
                      value={sourceLang} 
                      onChange={(e) => setSourceLang(e.target.value)}
                      className="bg-transparent text-white font-semibold focus:outline-none w-full"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Spanish</option>
                      <option value="bn-BD">Bengali</option>
                    </select>
                  </div>
                  <Globe className="text-slate-600" />
               </div>
               
               <div className="flex items-center justify-center py-2 md:py-0">
                  <RefreshCw className="text-slate-500 hidden md:block" />
               </div>

               <div className="flex-1 bg-[#131b2c] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Target Language</p>
                    <select 
                      value={targetLang} 
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="bg-transparent text-white font-semibold focus:outline-none w-full"
                    >
                      <option value="bn-BD">Bengali</option>
                      <option value="es-ES">Spanish</option>
                      <option value="en-US">English (US)</option>
                    </select>
                  </div>
                  <Globe className="text-slate-600" />
               </div>
            </div>

            {/* Translation Output boxes */}
            <div className="flex-1 flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 relative flex flex-col">
                   <p className="text-sm font-semibold text-slate-400 mb-4">Original Speech</p>
                   <div className="flex-1 overflow-y-auto">
                     {(!transcript && !interimTranscript) ? (
                        <p className="text-slate-600 text-lg">Tap microphone & speak to see translation...</p>
                     ) : (
                        <p className="text-slate-200 text-lg font-medium">
                          {transcript} <span className="text-[#8b79ff] italic">{interimTranscript}</span>
                        </p>
                     )}
                   </div>
                   
                    <div className="absolute bottom-6 right-6">
                        <button 
                          onClick={toggleRecording}
                          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                            isRecording 
                              ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                              : 'bg-[#8b79ff] hover:bg-[#6e5aff]'
                          }`}
                        >
                          {isRecording ? <Square size={20} className="text-white" fill="currentColor" /> : <Mic size={24} className="text-white" />}
                        </button>
                    </div>
                </div>

                 <div className="flex-1 bg-[#8b79ff]/10 border border-[#8b79ff]/30 rounded-3xl p-6 relative flex flex-col">
                    <p className="text-sm font-semibold text-[#8b79ff] mb-4">Translated Result</p>
                    <div className="flex-1 overflow-y-auto">
                       {isProcessing ? (
                          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#8b79ff]">
                             <Loader2 size={32} className="animate-spin" />
                             <p className="font-bold animate-pulse">Translating...</p>
                          </div>
                       ) : !translationResult && !isRecording ? (
                          <p className="text-[#8b79ff]/50 text-lg">Translation will appear here...</p>
                       ) : (
                          <p className="text-[#d4d1ff] text-2xl font-bold leading-relaxed shadow-[#8b79ff]/10">{translationResult || 'Listening...'}</p>
                       )}
                    </div>
                   {translationResult && (
                      <div className="absolute bottom-6 right-6">
                          <button onClick={() => {}} className="w-12 h-12 rounded-full bg-[#8b79ff]/30 hover:bg-[#8b79ff]/50 text-[#d4d1ff] flex items-center justify-center transition">
                            <Volume2 size={20} />
                          </button>
                      </div>
                   )}
                </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
