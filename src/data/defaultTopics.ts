/**
 * Default grammar topics and their lesson content.
 */

export const GRAMMAR_DATA: Record<string, any> = {
  "nouns": {
    title: "Nouns",
    content: [
      {
        title: "Introduction to Nouns",
        text: "A noun is a word that names a person, place, thing, or idea. Nouns are the building blocks of most sentences.",
        keyPoints: ["Person", "Place", "Thing", "Idea"],
        examples: ["John", "London", "Apple", "Happiness"],
        practice: []
      }
    ]
  }
};

export const defaultTopics = [
  {
    id: 'nouns',
    title: 'Nouns',
    description: 'The building blocks of language',
    steps: [
      { id: 'nouns-1', title: 'What is a Noun?', subtitle: 'Basics of naming words', status: 'active', topicId: 'nouns', pageIdx: 0 }
    ]
  }
];
