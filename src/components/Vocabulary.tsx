import React, { useState, useEffect, useRef } from 'react';
import { Search, Library, Bookmark, RefreshCw, Sparkles, Loader2, Copy, Check, Download } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import domtoimage from 'dom-to-image-more';

interface VocabWord {
  id?: string;
  word: string;
  definition: string;
  bengaliMeaning: string;
  example: string;
  bengaliExample: string;
  synonyms: string[];
}

interface StoryWord {
  word: string;
  pronunciation: string;
  meaning: string;
}

interface StoryData {
  id?: string;
  storyText: string;
  words: StoryWord[];
}

export default function Vocabulary() {
  const [activeTab, setActiveTab] = useState<'discover' | 'story' | 'saved'>('discover');
  const [savedView, setSavedView] = useState<'words' | 'stories'>('words');
  const [words, setWords] = useState<VocabWord[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string>('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [savedWords, setSavedWords] = useState<VocabWord[]>([]);
  const [savedStories, setSavedStories] = useState<StoryData[]>([]);
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const storyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedWordsData = JSON.parse(localStorage.getItem('savedWords') || '[]');
    setSavedWords(savedWordsData);
    const savedStoriesData = JSON.parse(localStorage.getItem('savedStories') || '[]');
    setSavedStories(savedStoriesData);
  }, []);

  const searchForWord = async (wordToSearch: string) => {
    if (!wordToSearch.trim()) return;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setErrorStatus('Please set your Gemini API key in Settings first.');
      return;
    }

    setIsSearching(true);
    setErrorStatus('');
    setSearchQuery(wordToSearch); // Update input field

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `Provide the dictionary details for the word "${wordToSearch}". It can be in English or Bengali.
        If it's in Bengali, provide the English translation as the "word", and the Bengali word as "bengaliMeaning", or vice versa.
        It must have a clear English definition, its Bengali meaning, an example sentence in English, the exact Bengali translation of that example, and a list of 3 to 5 English synonyms.
        Output MUST be in JSON format matching strictly to this schema.`;

        const expectedResponseSchema = {
            type: "object",
            properties: {
                word: { type: "string" },
                definition: { type: "string" },
                bengaliMeaning: { type: "string" },
                example: { type: "string" },
                bengaliExample: { type: "string" },
                synonyms: { 
                    type: "array",
                    items: { type: "string" }
                }
            },
            required: ["word", "definition", "bengaliMeaning", "example", "bengaliExample", "synonyms"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: expectedResponseSchema
            }
        });

        if (!response || !response.text) {
            throw new Error("No response generated.");
        }

        const generatedData = JSON.parse(response.text);
        setWords(prev => [generatedData, ...prev]);
        setSearchQuery('');
        setActiveTab('discover');
    } catch (err: any) {
        console.error(err);
        setErrorStatus(err.message || 'Failed to search vocabulary.');
    } finally {
        setIsSearching(false);
    }
  };

  const handleSearchWord = async (e: React.FormEvent) => {
    e.preventDefault();
    await searchForWord(searchQuery);
  };

  const toggleSaveWord = async (wordObj: VocabWord) => {
    const existing = savedWords.find(w => w.word === wordObj.word);
    let newSavedWords = [];
    if (existing) {
        newSavedWords = savedWords.filter(w => w.word !== wordObj.word);
    } else {
        newSavedWords = [...savedWords, { ...wordObj, id: Date.now().toString() }];
    }
    setSavedWords(newSavedWords);
    localStorage.setItem('savedWords', JSON.stringify(newSavedWords));
  };

  const handleGenerateIELTS = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setErrorStatus('Please set your Gemini API key in Settings first.');
      return;
    }

    setIsGenerating(true);
    setErrorStatus('');

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `Generate exactly 20 advanced IELTS vocabulary words. 
        Each word must have a clear definition, its Bengali meaning, an example sentence in English, the exact Bengali translation of that example sentence, and a list of 3 to 5 English synonyms.
        Output MUST be in JSON format matching strictly to this schema.`;

        const expectedResponseSchema = {
            type: "array",
            items: {
                type: "object",
                properties: {
                    word: { type: "string" },
                    definition: { type: "string" },
                    bengaliMeaning: { type: "string" },
                    example: { type: "string" },
                    bengaliExample: { type: "string" },
                    synonyms: { 
                        type: "array",
                        items: { type: "string" }
                    }
                },
                required: ["word", "definition", "bengaliMeaning", "example", "bengaliExample", "synonyms"]
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: expectedResponseSchema
            }
        });

        if (!response || !response.text) {
            throw new Error("No response generated.");
        }

        const generatedData = JSON.parse(response.text);
        setWords(generatedData);
    } catch (err: any) {
        console.error(err);
        setErrorStatus(err.message || 'Failed to generate vocabulary.');
    } finally {
        setIsGenerating(false);
    }
  };

  const handleGenerateStory = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setErrorStatus('Please set your Gemini API key in Settings first.');
      return;
    }

    setIsGeneratingStory(true);
    setErrorStatus('');

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `Generate a short Bengali story that incorporates 10 advanced English vocabulary words. 
        The English words should be written in English inside parentheses like this: (Word).
        Also provide the list of these 10 words with their Bengali pronunciation and Bengali meaning.
        Output MUST be in JSON format matching strictly to this schema.`;

        const expectedResponseSchema = {
            type: "object",
            properties: {
                storyText: { type: "string" },
                words: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            word: { type: "string" },
                            pronunciation: { type: "string" },
                            meaning: { type: "string" }
                        },
                        required: ["word", "pronunciation", "meaning"]
                    }
                }
            },
            required: ["storyText", "words"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: expectedResponseSchema
            }
        });

        if (!response || !response.text) {
            throw new Error("No response generated.");
        }

        const generatedData = JSON.parse(response.text);
        setStoryData(generatedData);
    } catch (err: any) {
        console.error(err);
        setErrorStatus(err.message || 'Failed to generate story.');
    } finally {
        setIsGeneratingStory(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!storyRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await domtoimage.toPng(storyRef.current, {
        bgcolor: '#0b0e14',
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'grammarbd-story.png';
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleSaveStory = async (storyToSave: StoryData) => {
    const existing = savedStories.find(s => s.storyText === storyToSave.storyText);
    let newSavedStories = [];
    if (existing) {
        newSavedStories = savedStories.filter(s => s.storyText !== storyToSave.storyText);
    } else {
        newSavedStories = [...savedStories, { ...storyToSave, id: Date.now().toString() }];
    }
    setSavedStories(newSavedStories);
    localStorage.setItem('savedStories', JSON.stringify(newSavedStories));
  };

  const handleCopyStory = () => {
      if (!storyData) return;
      
      let textToCopy = storyData.storyText + '\n\n';
      textToCopy += 'নতুন শব্দসমূহ:\n';
      
      storyData.words.forEach((w, i) => {
          textToCopy += `${i + 1}. ${w.word} (${w.pronunciation}) - ${w.meaning}\n`;
      });
      
      navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  const renderStoryText = (text: string) => {
      const parts = text.split(/(\([A-Za-z-]+\))/g);
      return parts.map((part, index) => {
          if (/^\([A-Za-z-]+\)$/.test(part)) {
              return <span key={index} className="text-[#ef4444] italic font-medium">{part}</span>;
          }
          return part;
      });
  };

  return (
    <div className="min-h-full flex flex-col font-sans -m-4 md:-m-8">
      {/* Header Section */}
      <div className="relative bg-[#6e5aff] px-6 py-8 overflow-hidden">
        {/* Decorative circle */}
        <div className="absolute top-[-80px] right-[-40px] w-64 h-64 bg-[#8b79ff] rounded-full opacity-60 mix-blend-screen"></div>

        <div className="relative z-10 max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">VOCABULARY</h1>
            <p className="text-white/90 text-sm md:text-base font-medium mb-6 leading-relaxed">
              Learn words personally or through AI stories.
            </p>
            
            {/* Tabs */}
            <div className="flex gap-2 md:gap-4 mb-6">
                <button 
                  onClick={() => setActiveTab('discover')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-[14px] py-2.5 px-2 text-[11px] md:text-xs font-bold uppercase transition-colors ${
                    activeTab === 'discover' ? 'bg-white text-[#6e5aff] shadow-sm' : 'bg-[#8b79ff]/40 text-white hover:bg-[#8b79ff]/60'
                  }`}>
                  <Search size={16} strokeWidth={2.5} />
                  Discover
                </button>
                <button 
                  onClick={() => setActiveTab('story')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-[14px] py-2.5 px-2 text-[11px] md:text-xs font-bold uppercase transition-colors ${
                    activeTab === 'story' ? 'bg-white text-[#6e5aff] shadow-sm' : 'bg-[#8b79ff]/40 text-white hover:bg-[#8b79ff]/60'
                  }`}>
                  <Library size={16} strokeWidth={2.5} />
                  Story
                </button>
                <button 
                  onClick={() => setActiveTab('saved')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-[14px] py-2.5 px-2 text-[11px] md:text-xs font-bold uppercase transition-colors ${
                    activeTab === 'saved' ? 'bg-white text-[#6e5aff] shadow-sm' : 'bg-[#8b79ff]/40 text-white hover:bg-[#8b79ff]/60'
                  }`}>
                  <Bookmark size={16} strokeWidth={2.5} />
                  Saved ({savedWords.length + savedStories.length})
                </button>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchWord} className="flex gap-3">
                <div className="flex-1 bg-[#f8f9fa] rounded-2xl flex items-center px-4 overflow-hidden h-12 md:h-14 shadow-inner">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={isSearching}
                        placeholder="Type any English or Bengali word..." 
                        className="bg-transparent w-full py-2 text-slate-800 placeholder-[#a0aab8] focus:outline-none font-medium text-[15px] md:text-base disabled:opacity-50"
                    />
                </div>
                <button 
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-[#8b79ff] h-12 w-12 md:h-14 md:w-14 rounded-2xl flex items-center justify-center transition-colors hover:bg-[#5b4be0] shadow-sm disabled:opacity-50"
                >
                    {isSearching ? <Loader2 size={20} className="text-white animate-spin" strokeWidth={2.5} /> : <Search size={20} className="text-white" strokeWidth={2.5} />}
                </button>
            </form>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 flex-1 flex flex-col bg-[#0b0e14]">
        <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
            {/* Explore Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-[22px] md:text-2xl font-black tracking-tight text-white uppercase">
                    {activeTab === 'discover' ? 'Explore' : (activeTab === 'story' ? 'Story' : 'Saved')}
                </h2>
                
                {(activeTab === 'discover' || activeTab === 'story') && (
                    <button 
                        onClick={activeTab === 'discover' ? handleGenerateIELTS : handleGenerateStory} 
                        disabled={activeTab === 'discover' ? isGenerating : isGeneratingStory}
                        className="h-10 w-10 flex items-center justify-center bg-[#131b2c] border border-[#212b43] rounded-xl hover:bg-[#1a253c] transition-colors disabled:opacity-50"
                        title={activeTab === 'discover' ? "Generate IELTS Words" : "Generate Story"}
                    >
                        {(activeTab === 'discover' ? isGenerating : isGeneratingStory) ? <Loader2 size={18} className="animate-spin text-[#6e5aff]" /> : <RefreshCw size={18} className="text-[#6e5aff]" />}
                    </button>
                )}
            </div>

            {errorStatus && (
                <div className="mb-6 p-4 rounded-xl border bg-red-900/20 border-red-900/50 text-red-400 text-sm font-medium">
                    {errorStatus}
                </div>
            )}

            {/* Content Display */}
            {activeTab === 'saved' && (
                <div className="flex gap-2 mb-6">
                    <button 
                        onClick={() => setSavedView('words')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${savedView === 'words' ? 'bg-[#1e293b] text-white' : 'bg-transparent text-slate-400 hover:bg-[#131b2c]'}`}>
                        Words ({savedWords.length})
                    </button>
                    <button 
                        onClick={() => setSavedView('stories')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${savedView === 'stories' ? 'bg-[#1e293b] text-white' : 'bg-transparent text-slate-400 hover:bg-[#131b2c]'}`}>
                        Stories ({savedStories.length})
                    </button>
                </div>
            )}

            {activeTab === 'discover' && (words || []).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 content-start mt-2 pb-8">
                    {(words || []).map((w, i) => (
                        <div key={i} className="bg-[#131b2c] border border-[#212b43] rounded-2xl p-6 hover:border-[#6e5aff]/50 transition-colors group relative">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="text-[28px] font-black text-white tracking-tight">{w.word}</h3>
                                <button 
                                    onClick={() => toggleSaveWord(w)}
                                    className={`h-10 w-10 flex items-center justify-center rounded-xl transition-colors ${
                                        savedWords.some(sw => sw.word === w.word) 
                                        ? 'bg-[#6e5aff] text-white' 
                                        : 'bg-[#1e293b] text-slate-400 hover:text-white'
                                    }`}>
                                    <Bookmark size={18} className={savedWords.some(sw => sw.word === w.word) ? 'fill-current' : ''} />
                                </button>
                            </div>
                            <p className="text-[#10b981] font-bold text-lg mb-6">{w.bengaliMeaning || 'অর্থ নেই'}</p>
                            
                            <div className="pl-4 border-l-[3px] border-[#6e5aff] mb-6 space-y-2 py-1">
                                <p className="text-white text-[15px] md:text-base font-medium leading-relaxed italic">"{w.example}"</p>
                                <p className="text-[#8b79ff] font-medium text-[14px] md:text-[15px]">{w.bengaliExample || 'অনুবাদ নেই'}</p>
                            </div>

                            <div>
                                <h4 className="text-[11px] md:text-xs font-bold text-slate-400 tracking-widest uppercase mb-3">Synonyms</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(w.synonyms || []).map((syn, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => searchForWord(syn)}
                                            className="bg-[#1e293b] text-slate-300 font-semibold px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider hover:bg-[#6e5aff] hover:text-white transition-colors">
                                            {syn}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : activeTab === 'saved' && savedView === 'words' && (savedWords || []).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 content-start mt-2 pb-8">
                    {(savedWords || []).map((w, i) => (
                        <div key={i} className="bg-[#131b2c] border border-[#212b43] rounded-2xl p-6 hover:border-[#6e5aff]/50 transition-colors group relative">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="text-[28px] font-black text-white tracking-tight">{w.word}</h3>
                                <button 
                                    onClick={() => toggleSaveWord(w)}
                                    className={`h-10 w-10 flex items-center justify-center rounded-xl transition-colors bg-[#6e5aff] text-white`}>
                                    <Bookmark size={18} className="fill-current" />
                                </button>
                            </div>
                            <p className="text-[#10b981] font-bold text-lg mb-6">{w.bengaliMeaning || 'অর্থ নেই'}</p>
                            
                            <div className="pl-4 border-l-[3px] border-[#6e5aff] mb-6 space-y-2 py-1">
                                <p className="text-white text-[15px] md:text-base font-medium leading-relaxed italic">"{w.example}"</p>
                                <p className="text-[#8b79ff] font-medium text-[14px] md:text-[15px]">{w.bengaliExample || 'অনুবাদ নেই'}</p>
                            </div>

                            <div>
                                <h4 className="text-[11px] md:text-xs font-bold text-slate-400 tracking-widest uppercase mb-3">Synonyms</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(w.synonyms || []).map((syn, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => searchForWord(syn)}
                                            className="bg-[#1e293b] text-slate-300 font-semibold px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider hover:bg-[#6e5aff] hover:text-white transition-colors">
                                            {syn}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : activeTab === 'saved' && savedView === 'stories' && (savedStories || []).length > 0 ? (
                <div className="flex flex-col gap-6 flex-1 content-start mt-2 pb-8">
                    {(savedStories || []).map((story, idx) => (
                        <div key={story.id || idx} className="bg-[#131b2c] border border-[#212b43] rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-bold">Save story {savedStories.length - idx}</h3>
                                <button 
                                    onClick={() => toggleSaveStory(story)}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#6e5aff] text-white transition-colors">
                                    <Bookmark size={18} className="fill-current" />
                                </button>
                            </div>
                            <div className="text-slate-300 text-[15px] leading-relaxed mb-6">
                                {renderStoryText(story.storyText)}
                            </div>
                            <div className="flex flex-col gap-2">
                                {(story.words || []).map((w, i) => (
                                    <div key={i} className="flex gap-3 items-center bg-[#0b0e14] border border-[#212b43] rounded-xl p-3">
                                        <span className="text-[#ef4444] font-black text-sm">{w.word}</span>
                                        <span className="text-slate-400 text-xs">({w.pronunciation})</span>
                                        <span className="text-white font-semibold text-sm ml-auto">{w.meaning}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : activeTab === 'story' && storyData ? (
                <div className="flex-1 overflow-y-auto pb-8">
                    <div ref={storyRef} className="bg-[#0b0e14] py-4 text-white text-lg md:text-[22px] leading-relaxed max-w-4xl tracking-wide">
                       {renderStoryText(storyData.storyText)}
                       
                       <div className="mt-12 max-w-4xl border-t border-[#212b43] pt-12">
                         <div className="flex items-center gap-3 mb-8">
                            <span className="text-[#6e5aff] font-bold">||\</span>
                            <h3 className="text-[#6e5aff] font-bold text-[19px]">নতুন শব্দসমূহ</h3>
                         </div>
                         
                         <div className="flex flex-col gap-4">
                           {(storyData?.words || []).map((w, i) => (
                             <div key={i} className="flex gap-4 items-center bg-[#131b2c] border border-[#212b43] rounded-2xl p-5">
                               <div className="w-9 h-9 rounded-full bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 flex items-center justify-center font-bold text-sm shrink-0">
                                 {i + 1}
                               </div>
                               <div>
                                  <div className="flex items-center gap-3 mb-1">
                                    <span className="text-[#ef4444] font-black text-xl">{w.word}</span>
                                    <span className="text-slate-400 text-[15px]">({w.pronunciation})</span>
                                  </div>
                                  <p className="text-white font-bold text-[17px] mt-2">{w.meaning}</p>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-center sm:justify-start gap-3 mt-10">
                        <button 
                           onClick={handleGenerateStory}
                           disabled={isGeneratingStory}
                           className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-[#212b43] text-[#8b79ff] font-bold text-sm bg-[#131b2c] hover:bg-[#1e293b] transition disabled:opacity-50">
                           <RefreshCw size={18} className={isGeneratingStory ? 'animate-spin' : ''} /> {isGeneratingStory ? 'WORKING' : 'REGENERATE'}
                        </button>
                        <button 
                           onClick={handleCopyStory}
                           className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-[#212b43] text-white font-bold text-sm hover:bg-[#1a253c] transition">
                           {isCopied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />} 
                           {isCopied ? 'COPIED!' : 'COPY'}
                        </button>
                        <button 
                           onClick={handleDownloadImage}
                           disabled={isDownloading}
                           className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-[#212b43] text-white font-bold text-sm hover:bg-[#1a253c] transition disabled:opacity-50">
                           {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} 
                           IMAGE
                        </button>
                        <button 
                           onClick={() => toggleSaveStory(storyData)}
                           className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-[#212b43] font-bold text-sm transition ${
                              savedStories.some(s => s.storyText === storyData.storyText)
                              ? 'bg-[#6e5aff] text-white'
                              : 'text-white hover:bg-[#1a253c]'
                           }`}>
                           <Bookmark size={18} className={savedStories.some(s => s.storyText === storyData.storyText) ? 'fill-current' : ''} /> 
                           SAVE
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 border-[1.5px] border-dashed border-[#232d45] rounded-[2rem] flex flex-col items-center justify-center p-8 bg-[#0e121b] text-slate-400 mt-2 min-h-[300px]">
                    <div className="w-[72px] h-[72px] bg-[#1a2336] rounded-full flex items-center justify-center mb-6 border lg:border-[1.5px] border-[#293652]">
                        <Search size={32} className="text-slate-400" strokeWidth={1.5} />
                    </div>
                    <p className="text-lg md:text-xl font-medium text-[#7a86a1]">
                        {activeTab === 'discover' && isGenerating ? 'Generating vocabulary...' : 
                         activeTab === 'story' && isGeneratingStory ? 'Generating story...' :
                         activeTab === 'saved' ? 'Nothing saved yet.' : 'No words available right now.'}
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
