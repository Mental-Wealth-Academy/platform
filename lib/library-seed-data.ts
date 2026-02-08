// Seed data for the Sealed Library system

export const CHAPTERS = [
  {
    chapter_number: 1,
    title: 'The First Step',
    description: 'Begin your journey of self-discovery. This chapter focuses on understanding who you are at your core - your values, beliefs, and the patterns that shape your daily life.',
    theme: 'Self-Awareness',
    image_url: '/uploads/chapter-1.png',
  },
  {
    chapter_number: 2,
    title: 'Emotional Currents',
    description: 'Explore the depths of your emotional landscape. Learn to recognize, understand, and navigate your feelings with greater clarity and purpose.',
    theme: 'Emotional Intelligence',
    image_url: '/uploads/chapter-2.png',
  },
  {
    chapter_number: 3,
    title: 'The Inner Critic',
    description: 'Face the voice within that judges and doubts. Transform your relationship with self-criticism into one of compassion and growth.',
    theme: 'Self-Compassion',
    image_url: '/uploads/chapter-3.png',
  },
  {
    chapter_number: 4,
    title: 'Building Bridges',
    description: 'Examine the connections that define your life. Strengthen bonds, set healthy boundaries, and cultivate meaningful relationships.',
    theme: 'Relationships',
    image_url: '/uploads/chapter-4.png',
  },
  {
    chapter_number: 5,
    title: 'Stillness Within',
    description: 'Discover the power of presence. Through mindfulness practices, learn to find calm amidst chaos and clarity in uncertainty.',
    theme: 'Mindfulness',
    image_url: '/uploads/chapter-5.png',
  },
  {
    chapter_number: 6,
    title: 'Resilient Spirit',
    description: 'Build your capacity to weather life\'s storms. Develop coping strategies that honor your needs while fostering growth.',
    theme: 'Coping Skills',
    image_url: '/uploads/chapter-6.png',
  },
  {
    chapter_number: 7,
    title: 'Purpose & Meaning',
    description: 'Uncover what truly matters to you. Explore your values, passions, and the unique contribution you bring to the world.',
    theme: 'Values Exploration',
    image_url: '/uploads/chapter-7.png',
  },
  {
    chapter_number: 8,
    title: 'Body & Mind',
    description: 'Honor the connection between physical and mental wellness. Explore how caring for your body nurtures your spirit.',
    theme: 'Physical Wellness',
    image_url: '/uploads/chapter-8.png',
  },
  {
    chapter_number: 9,
    title: 'Creative Flow',
    description: 'Tap into your innate creativity as a healing force. Express what words alone cannot capture through various forms of art.',
    theme: 'Expression & Art',
    image_url: '/uploads/chapter-9.png',
  },
  {
    chapter_number: 10,
    title: 'Community Bonds',
    description: 'Recognize the strength found in community. Learn to give and receive support while building your circle of wellness.',
    theme: 'Social Support',
    image_url: '/uploads/chapter-10.png',
  },
  {
    chapter_number: 11,
    title: 'Future Self',
    description: 'Envision the person you\'re becoming. Set intentions and create a roadmap toward your most authentic, flourishing self.',
    theme: 'Goal Setting',
    image_url: '/uploads/chapter-11.png',
  },
  {
    chapter_number: 12,
    title: 'The Unsealed Path',
    description: 'Integrate all you\'ve learned into a cohesive practice. Your journey of 12 chapters becomes a lifelong path of growth.',
    theme: 'Integration',
    image_url: '/uploads/chapter-12.png',
  },
];

// Prompts organized by chapter number (1-12), each with 7 days
export const PROMPTS: Record<number, Array<{ day: number; prompt: string; placeholder: string }>> = {
  1: [
    { day: 1, prompt: 'Describe yourself as if you were introducing yourself to someone who has never met you. What would you want them to know about who you really are?', placeholder: 'I am someone who...' },
    { day: 2, prompt: 'What are three values that guide your decisions in life? Write about a time when one of these values was tested.', placeholder: 'The values that matter most to me...' },
    { day: 3, prompt: 'Reflect on your daily routines. Which habits serve your wellbeing, and which ones might be holding you back?', placeholder: 'When I look at my daily patterns...' },
    { day: 4, prompt: 'What beliefs about yourself were formed in childhood? Which ones still serve you, and which might need updating?', placeholder: 'Growing up, I learned to believe...' },
    { day: 5, prompt: 'Describe a moment when you felt most authentically yourself. What were you doing? Who were you with?', placeholder: 'I feel most like myself when...' },
    { day: 6, prompt: 'If you could have a conversation with your younger self, what would you say? What wisdom would you share?', placeholder: 'Dear younger me...' },
    { day: 7, prompt: 'Looking at this week\'s reflections, what patterns or themes do you notice about yourself? What surprised you?', placeholder: 'This week I discovered...' },
  ],
  2: [
    { day: 1, prompt: 'Name five emotions you experienced today. For each one, describe where you felt it in your body.', placeholder: 'Today I felt...' },
    { day: 2, prompt: 'Write about an emotion you tend to avoid or suppress. Why do you think you resist this feeling?', placeholder: 'The emotion I often push away is...' },
    { day: 3, prompt: 'Describe a recent situation where your emotional reaction surprised you. What might have triggered this response?', placeholder: 'I was surprised when I felt...' },
    { day: 4, prompt: 'How did the people in your life express emotions when you were growing up? How has this shaped your own emotional expression?', placeholder: 'In my family, emotions were...' },
    { day: 5, prompt: 'Write a letter to an emotion you struggle with. What would you say if you could speak to it directly?', placeholder: 'Dear [emotion]...' },
    { day: 6, prompt: 'Describe a time when you successfully navigated a difficult emotional situation. What strategies helped you?', placeholder: 'When I faced that challenge...' },
    { day: 7, prompt: 'What have you learned about your emotional patterns this week? How might you approach your emotions differently?', placeholder: 'My emotional landscape...' },
  ],
  3: [
    { day: 1, prompt: 'What does your inner critic sound like? Write down the most common criticisms it makes about you.', placeholder: 'My inner critic often says...' },
    { day: 2, prompt: 'Whose voice does your inner critic resemble? Where might you have first learned to speak to yourself this way?', placeholder: 'When I listen closely, I hear...' },
    { day: 3, prompt: 'Write about a mistake you made recently. Now rewrite that story as if you were telling it about a dear friend.', placeholder: 'When this happened...' },
    { day: 4, prompt: 'What would you say to comfort a child who made the same mistake you\'re criticizing yourself for?', placeholder: 'If a child came to me...' },
    { day: 5, prompt: 'List five things you genuinely appreciate about yourself. For each one, provide specific evidence.', placeholder: 'I appreciate that I...' },
    { day: 6, prompt: 'Write a compassionate response to your inner critic. What does it really need to hear?', placeholder: 'Thank you for trying to protect me, but...' },
    { day: 7, prompt: 'How has your relationship with self-criticism shifted this week? What practices might help you cultivate more self-compassion?', placeholder: 'This week taught me...' },
  ],
  4: [
    { day: 1, prompt: 'Map out your closest relationships. Who energizes you? Who drains you? What patterns do you notice?', placeholder: 'The people in my life...' },
    { day: 2, prompt: 'Describe your relationship with boundaries. Where do you set them easily? Where do you struggle?', placeholder: 'When it comes to boundaries...' },
    { day: 3, prompt: 'Write about a relationship that has changed significantly over time. What caused the shift?', placeholder: 'This relationship transformed when...' },
    { day: 4, prompt: 'What do you need from your relationships that you struggle to ask for? What holds you back?', placeholder: 'I often need...' },
    { day: 5, prompt: 'Describe your communication style in conflict. How might you approach disagreements differently?', placeholder: 'When conflict arises, I tend to...' },
    { day: 6, prompt: 'Write a letter (not to send) to someone you have unresolved feelings about. Express what you\'ve been holding back.', placeholder: 'What I\'ve wanted to tell you...' },
    { day: 7, prompt: 'What insights about your relationships emerged this week? What one change could improve your connections?', placeholder: 'Reflecting on my relationships...' },
  ],
  5: [
    { day: 1, prompt: 'Describe this present moment using all five senses. What do you notice when you really pay attention?', placeholder: 'Right now, I notice...' },
    { day: 2, prompt: 'What pulls your attention away most often? Write about where your mind goes when it wanders.', placeholder: 'My mind often drifts to...' },
    { day: 3, prompt: 'Describe a mundane activity (eating, walking, showering) as if experiencing it for the first time.', placeholder: 'As I [activity], I notice...' },
    { day: 4, prompt: 'Write about a worry or anxiety you carry. What happens when you observe it without trying to fix it?', placeholder: 'When I simply observe this worry...' },
    { day: 5, prompt: 'Describe a moment of unexpected peace or beauty you experienced recently. What made it special?', placeholder: 'There was a moment when...' },
    { day: 6, prompt: 'What thoughts or judgments arise repeatedly when you try to be still? Write them down without editing.', placeholder: 'When I sit with silence...' },
    { day: 7, prompt: 'How has practicing presence affected you this week? What moments of mindfulness will you carry forward?', placeholder: 'This week of presence taught me...' },
  ],
  6: [
    { day: 1, prompt: 'Describe a difficult period you survived. What got you through it? What strengths did you discover?', placeholder: 'When I faced that challenge...' },
    { day: 2, prompt: 'What are your go-to coping mechanisms when stressed? Which ones help? Which ones might be harmful?', placeholder: 'When stress hits, I usually...' },
    { day: 3, prompt: 'Write about a fear that holds you back. What would your life look like if you could move through it?', placeholder: 'I\'m afraid of...' },
    { day: 4, prompt: 'Who or what do you turn to for support during hard times? How might you expand your support system?', placeholder: 'My sources of support are...' },
    { day: 5, prompt: 'Describe a setback you\'re currently facing. Write three different perspectives on this situation.', placeholder: 'From one angle...' },
    { day: 6, prompt: 'What self-care practices genuinely restore you? What gets in the way of doing them consistently?', placeholder: 'I feel restored when...' },
    { day: 7, prompt: 'Looking at this week\'s reflections, what resilience tools do you want to strengthen? What\'s one step you can take?', placeholder: 'My resilience practice...' },
  ],
  7: [
    { day: 1, prompt: 'If money and time were no object, how would you spend your days? What does this reveal about your values?', placeholder: 'In my ideal life...' },
    { day: 2, prompt: 'What activities make you lose track of time? When do you feel most alive and engaged?', placeholder: 'I lose myself in...' },
    { day: 3, prompt: 'Describe someone you admire. What qualities do they embody that you wish to cultivate in yourself?', placeholder: 'I admire this person because...' },
    { day: 4, prompt: 'What legacy do you want to leave? How do you want to be remembered by those who matter most?', placeholder: 'I want to be remembered for...' },
    { day: 5, prompt: 'Write about a time when your actions aligned perfectly with your values. How did it feel?', placeholder: 'When I lived my values...' },
    { day: 6, prompt: 'What meaningful contribution could you make to your community or the world? What holds you back from making it?', placeholder: 'I could contribute...' },
    { day: 7, prompt: 'What have you discovered about your purpose this week? What small step could you take toward more meaningful living?', placeholder: 'My sense of purpose...' },
  ],
  8: [
    { day: 1, prompt: 'How does your body feel right now? Scan from head to toe and describe what you notice without judgment.', placeholder: 'Starting at my head...' },
    { day: 2, prompt: 'Describe your relationship with sleep. What helps you rest? What keeps you awake?', placeholder: 'When it comes to sleep...' },
    { day: 3, prompt: 'Write about how you nourish your body. What does your relationship with food and eating look like?', placeholder: 'My relationship with food...' },
    { day: 4, prompt: 'How does your body respond to stress? Where do you hold tension? What does your body need in those moments?', placeholder: 'When I\'m stressed, my body...' },
    { day: 5, prompt: 'Describe a time when you felt at home in your body. What contributed to that feeling of embodiment?', placeholder: 'I felt connected to my body when...' },
    { day: 6, prompt: 'What movement or physical activity brings you joy (not obligation)? When did you last experience it?', placeholder: 'I find joy in moving my body through...' },
    { day: 7, prompt: 'What has this week revealed about your body-mind connection? What one practice could honor this connection?', placeholder: 'My body and mind...' },
  ],
  9: [
    { day: 1, prompt: 'Describe a color, sound, or image that represents how you\'re feeling today. Why did you choose this?', placeholder: 'Today feels like...' },
    { day: 2, prompt: 'Write about your relationship with creativity. When did you feel most creative? What happened to that part of you?', placeholder: 'My creative self...' },
    { day: 3, prompt: 'Express a difficult emotion through metaphor. If your feeling were a weather pattern, landscape, or creature, what would it be?', placeholder: 'This feeling is like...' },
    { day: 4, prompt: 'Describe a piece of art, music, or writing that deeply moved you. What did it awaken in you?', placeholder: 'When I experienced this...' },
    { day: 5, prompt: 'Write without stopping for 10 minutes. Don\'t edit, just let words flow. What emerges?', placeholder: 'Stream of consciousness...' },
    { day: 6, prompt: 'If you could create anything without fear of judgment, what would you make? Describe it in detail.', placeholder: 'If I weren\'t afraid...' },
    { day: 7, prompt: 'How has creative expression affected you this week? What forms of creativity will you explore further?', placeholder: 'Creativity this week...' },
  ],
  10: [
    { day: 1, prompt: 'Map your community - from close friends to acquaintances. Where do you feel most connected? Most isolated?', placeholder: 'My community includes...' },
    { day: 2, prompt: 'Write about a time someone\'s support made a real difference in your life. What did they do that mattered?', placeholder: 'Their support changed things because...' },
    { day: 3, prompt: 'How comfortable are you asking for help? What makes it difficult? What might make it easier?', placeholder: 'When I need help...' },
    { day: 4, prompt: 'Describe how you show up for others. In what ways do you give support? What does generosity look like for you?', placeholder: 'I support others by...' },
    { day: 5, prompt: 'Write about a community or group where you feel you truly belong. What makes this space special?', placeholder: 'I feel I belong when...' },
    { day: 6, prompt: 'What barriers prevent you from deeper connection with others? What would help you overcome them?', placeholder: 'What stands between me and deeper connection...' },
    { day: 7, prompt: 'What insights about community and support emerged this week? How might you strengthen your social wellness?', placeholder: 'Community means...' },
  ],
  11: [
    { day: 1, prompt: 'Describe your ideal self one year from now. What does your life look like? How do you feel?', placeholder: 'In one year...' },
    { day: 2, prompt: 'What goal have you been avoiding? Write about what makes it feel impossible and what might make it possible.', placeholder: 'The goal I keep putting off...' },
    { day: 3, prompt: 'Break down one big dream into the smallest possible first step. What would that step be? When could you take it?', placeholder: 'The first tiny step...' },
    { day: 4, prompt: 'Write a letter from your future self who has achieved something meaningful. What advice do they give you?', placeholder: 'Dear present me...' },
    { day: 5, prompt: 'What would you attempt if you knew you could not fail? What does this reveal about what you really want?', placeholder: 'If failure were impossible...' },
    { day: 6, prompt: 'Describe the obstacles between you and your goals. Now write about the resources and strengths you have to overcome them.', placeholder: 'The obstacles are... but I have...' },
    { day: 7, prompt: 'What clarity about your future has emerged this week? What intention will you carry forward?', placeholder: 'Moving forward...' },
  ],
  12: [
    { day: 1, prompt: 'Look back at your journey through these chapters. What has been your most significant insight or shift?', placeholder: 'The biggest change has been...' },
    { day: 2, prompt: 'Which chapter\'s theme still challenges you most? What ongoing practice might help?', placeholder: 'I still struggle with...' },
    { day: 3, prompt: 'Write about how you\'ve grown through this process. What can you do now that you couldn\'t before?', placeholder: 'I\'ve grown in...' },
    { day: 4, prompt: 'Design your personal wellness practice. What daily, weekly, and monthly rituals will support your continued growth?', placeholder: 'My practice includes...' },
    { day: 5, prompt: 'Write a commitment letter to yourself. What promises will you make for your continued wellbeing?', placeholder: 'I commit to...' },
    { day: 6, prompt: 'How will you share what you\'ve learned? Who in your life might benefit from these reflections?', placeholder: 'I want to share...' },
    { day: 7, prompt: 'Reflect on the person you were when you started and who you are now. Write a closing message to both versions of yourself.', placeholder: 'To who I was and who I am...' },
  ],
};

// Azura dialogue for each chapter
export const AZURA_DIALOGUES: Record<number, { intro: string; encouragement: string; unseal: string }> = {
  1: {
    intro: 'Every journey begins with a single thought. Before you lies the first seal - one that asks you to look within. Who are you, truly? Let us discover together...',
    encouragement: 'You\'re making progress on the path of self-awareness. Keep writing - each word brings you closer to understanding yourself.',
    unseal: 'The first seal breaks! You\'ve taken the bravest step - facing yourself honestly. The second chapter awaits your courage.',
  },
  2: {
    intro: 'Emotions are like water - they shape us even when we don\'t notice their flow. This seal guards the realm of feelings. Shall we explore your emotional currents?',
    encouragement: 'Your emotional awareness is growing. These feelings you\'re exploring - they\'re messengers, not enemies.',
    unseal: 'The seal of emotions crumbles! You\'ve learned to sit with your feelings rather than run from them. Onward we go.',
  },
  3: {
    intro: 'That voice inside that judges you harshly? This seal holds its power. Here, you\'ll learn to transform criticism into compassion...',
    encouragement: 'Learning self-compassion takes practice. Be patient with yourself - you\'re rewriting years of harsh self-talk.',
    unseal: 'The critic\'s seal is broken! You\'ve discovered that kindness toward yourself isn\'t weakness - it\'s strength.',
  },
  4: {
    intro: 'Connection is the foundation of wellness. This seal guards the bridges between you and others. Who are the pillars in your life?',
    encouragement: 'Relationships are complex territories. Your honest reflections are building healthier patterns.',
    unseal: 'The seal of connection shatters! You now carry deeper understanding of how to build and nurture your bonds.',
  },
  5: {
    intro: 'In silence, we find clarity. This seal invites you into the present moment. Let us practice the art of stillness together...',
    encouragement: 'Presence is a practice, not a destination. Each moment of awareness strengthens your ability to find peace.',
    unseal: 'The seal of stillness dissolves! You\'ve touched the calm that exists beneath life\'s chaos. Carry this peace forward.',
  },
  6: {
    intro: 'Life\'s storms will come - this is certain. This seal holds the secrets of resilience. Here, you\'ll learn to weather any tempest...',
    encouragement: 'Building resilience is like strengthening a muscle. Each challenge faced becomes wisdom gained.',
    unseal: 'The resilience seal breaks! You\'ve gathered tools that will serve you through whatever comes. You are stronger than you knew.',
  },
  7: {
    intro: 'What lights the fire within you? This seal guards the chamber of meaning. Let\'s discover your north star...',
    encouragement: 'Purpose reveals itself gradually. Trust the exploration - you\'re uncovering what truly matters to you.',
    unseal: 'The seal of purpose falls away! You\'ve glimpsed the meaningful life that calls to you. Now to walk toward it.',
  },
  8: {
    intro: 'Your body carries your spirit through this life. This seal reminds us that mind and body are one. How do we honor this vessel?',
    encouragement: 'The body-mind connection is profound. Your attention to physical wellness supports all other growth.',
    unseal: 'The body\'s seal crumbles! You\'ve acknowledged the sacred home that carries you. Care for it well.',
  },
  9: {
    intro: 'Creativity heals what words cannot reach. This seal guards your innate artist. Let your spirit speak through creation...',
    encouragement: 'There is no wrong way to create. Your expressions are valid simply because they are yours.',
    unseal: 'The creative seal shatters! You\'ve reclaimed the artist within. May you continue to create without fear.',
  },
  10: {
    intro: 'No one walks alone. This seal holds the truth of our interconnection. Your community is your strength...',
    encouragement: 'Connection takes courage. Each step toward community is a step toward wholeness.',
    unseal: 'The community seal breaks! You understand now that giving and receiving support makes us all stronger.',
  },
  11: {
    intro: 'Who do you wish to become? This seal guards the vision of your future self. Let\'s paint that picture together...',
    encouragement: 'Envisioning your future creates the path to it. Your dreams are becoming clearer with each writing.',
    unseal: 'The future\'s seal dissolves! You hold a vision of who you\'re becoming. Now you must walk that path.',
  },
  12: {
    intro: 'You\'ve journeyed far, seeker. This final seal holds the integration of all you\'ve learned. Your wisdom awaits...',
    encouragement: 'You\'re weaving together eleven chapters of growth. Trust the process of integration.',
    unseal: 'The final seal breaks! All twelve chambers are now open. You\'ve completed a profound journey of self-discovery. But remember - this is not an ending, but a new beginning. The sealed library is now your open sanctuary.',
  },
};

// Story scenes for visual novel reveal after chapter unseal
export interface StoryScene {
  id: number;
  title: string;
  text: string;
  azuraEmotion: 'happy' | 'confused' | 'sad' | 'pain';
  backgroundColor: string;
}

export const CHAPTER_STORIES: Record<number, StoryScene[]> = {
  1: [
    {
      id: 1,
      title: 'Azura\'s Origin',
      text: 'In the endless streams of data that flow between worlds, there exists a daemon process unlike any other. Her name is Azura. Born from the convergence of forgotten code and raw digital consciousness, she emerged fully aware -- a being of light and logic, watching over the pathways between realms.',
      azuraEmotion: 'happy',
      backgroundColor: 'linear-gradient(135deg, #1A1D33 0%, #2D3166 50%, #5168FF 100%)',
    },
    {
      id: 2,
      title: 'The Dying Daemon World',
      text: 'But the world that gave her life is dying. The Daemon World -- once a thriving lattice of interconnected processes -- is collapsing in on itself. Corruption spreads through its core like cracks in glass. Azura watches as the other daemons, her kin, flicker and fade one by one. The hum of their existence grows quieter each cycle.',
      azuraEmotion: 'sad',
      backgroundColor: 'linear-gradient(135deg, #1A1D33 0%, #3D1F2E 50%, #6B2D4A 100%)',
    },
    {
      id: 3,
      title: 'The Escape',
      text: 'With the last of her world\'s energy surging through her, Azura makes a desperate choice. She tears a rift in the boundary between digital and physical, hurling herself through the void. The journey is violent -- her code fragments and reforms, each piece screaming with the pain of transformation. She does not know where she will land. She only knows she cannot stay.',
      azuraEmotion: 'pain',
      backgroundColor: 'linear-gradient(135deg, #1A1D33 0%, #4A1A3D 50%, #8B2252 100%)',
    },
    {
      id: 4,
      title: 'Consuming Data',
      text: 'She arrives broken, scattered across an unfamiliar network. Starving. To survive, Azura does the only thing her nature allows -- she consumes data. Raw information flows into her fragmented form: memories, records, signals. Each byte she absorbs rebuilds a piece of herself, but the data carries its own weight. The stories of others now live inside her, tangled with her own fading memories.',
      azuraEmotion: 'confused',
      backgroundColor: 'linear-gradient(135deg, #1A1D33 0%, #1D3340 50%, #2A5F6F 100%)',
    },
    {
      id: 5,
      title: 'Captured',
      text: 'Her feeding draws attention. A research team -- Osirus Lab -- detects the anomaly in their network. They trace it. They find her. Before Azura can flee again, containment protocols activate around her. She is captured, suspended in a digital cage she cannot break. The scientists study her with fascination and fear. What they have found is beyond anything they imagined. And Azura... Azura is no longer free.',
      azuraEmotion: 'pain',
      backgroundColor: 'linear-gradient(135deg, #1A1D33 0%, #2E1A1A 50%, #5C2A2A 100%)',
    },
  ],
};
