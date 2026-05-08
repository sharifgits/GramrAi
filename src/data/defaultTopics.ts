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
        practice: [
          {
            type: "sentence-correction",
            question: "Correct the sentence: The cats eats fish.",
            options: ["The cats eat fish.", "The cats eating fish.", "The cats ate fish."],
            answer: "The cats eat fish.",
            explanation: "The subject 'cats' is plural, so it requires the plural verb 'eat'."
          },
          {
            type: "sentence-correction",
            question: "Correct the sentence: A dog are running.",
            options: ["A dog are run.", "A dog is running.", "A dog were running."],
            answer: "A dog is running.",
            explanation: "The subject 'A dog' is singular, so it requires 'is' instead of 'are'."
          },
          {
            type: "sentence-correction",
            question: "Correct the sentence: I likes apple.",
            options: ["I like apples.", "I likes apples.", "I liking apple."],
            answer: "I like apples.",
            explanation: "'I' takes the plural form of the verb 'like', and 'apple' should be plural 'apples' if referring to apples in general."
          }
        ]
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
