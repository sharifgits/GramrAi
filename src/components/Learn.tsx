import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GrammarExplanation } from './GrammarExplanation';
import { GrammarTopics } from './GrammarTopics';

import { defaultTopics } from '../data/defaultTopics';
import localforage from 'localforage';
import { Lesson } from './Lesson';

export default function Learn() {
  const [customTopics, setCustomTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingLesson, setViewingLesson] = useState<{ topicId: string | number, pageIdx: number, isCustom: boolean, customData?: any } | null>(null);
  const [viewingPractice, setViewingPractice] = useState<{ topicId: string | number } | null>(null);

  useEffect(() => {
    const loadTopics = async () => {
      try {
        const saved = await localforage.getItem('custom_topics');
        if (saved) {
          setCustomTopics(saved as any[]);
        } else {
          setCustomTopics(defaultTopics);
        }
      } catch (err) {
        console.error("Failed to load topics", err);
        setCustomTopics(defaultTopics);
      } finally {
        setLoading(false);
      }
    };
    loadTopics();
  }, []);

  const handleUpdateTopic = async (updatedTopic: any) => {
    const newTopics = customTopics.map(t => t.id === updatedTopic.id ? updatedTopic : t);
    setCustomTopics(newTopics);
    await localforage.setItem('custom_topics', newTopics);
  };

  const handleDeleteTopic = async (topicId: string) => {
    const newTopics = customTopics.filter(t => t.id !== topicId);
    setCustomTopics(newTopics);
    await localforage.setItem('custom_topics', newTopics);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <GrammarTopics 
        customTopics={customTopics} 
        onViewTopic={(topicId, pageIdx, isCustom) => {
          if (isCustom) {
            const topic = customTopics.find(t => t.id === topicId || t.steps?.some((s: any) => s.topicId === topicId));
            setViewingLesson({ topicId, pageIdx: pageIdx || 0, isCustom: true, customData: topic?.grammarData });
          } else {
            setViewingLesson({ topicId, pageIdx: pageIdx || 0, isCustom: false });
          }
        }}
        onUpdateTopic={handleUpdateTopic}
        onDeleteTopic={handleDeleteTopic}
      />

      <AnimatePresence>
        {viewingLesson && (
          <GrammarExplanation 
            topicId={viewingLesson.topicId}
            initialPage={viewingLesson.pageIdx}
            isCustom={viewingLesson.isCustom}
            customData={viewingLesson.customData}
            onClose={() => setViewingLesson(null)}
            onStartPractice={(id) => {
              setViewingLesson(null);
              setViewingPractice({ topicId: id });
            }}
            onUpdateContent={viewingLesson.isCustom ? (updatedData) => {
               const topic = customTopics.find(t => t.id === viewingLesson.topicId || t.steps?.some((s: any) => s.topicId === viewingLesson.topicId));
               if (topic) {
                 handleUpdateTopic({ ...topic, grammarData: updatedData });
               }
            } : undefined}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingPractice && (
          <Lesson 
            onClose={() => setViewingPractice(null)}
            onComplete={() => setViewingPractice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
