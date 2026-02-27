// Mock data for the Prelude prototype

export interface MockBrief {
  briefId: string;
  sessionId: string;
  generatedAt: string;
  editedByUser: boolean;
  content: {
    emotionalState: string;
    themes: string[];
    patientWords: string;
    focusItems: string[];
    patternNote: string | null;
  };
}

export interface MockSession {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  status: "complete" | "brief-generated";
  emotionalArc: {
    openingTone: string;
    peakIntensityTurn: number;
    closingTone: string;
    dominantEmotion: string;
  };
}

export const mockSessions: MockSession[] = [
  {
    sessionId: "s1",
    startedAt: "2026-02-27T09:00:00Z",
    completedAt: "2026-02-27T09:11:00Z",
    durationSeconds: 660,
    status: "brief-generated",
    emotionalArc: { openingTone: "anxious", peakIntensityTurn: 6, closingTone: "calm", dominantEmotion: "anxious" },
  },
  {
    sessionId: "s2",
    startedAt: "2026-02-20T09:00:00Z",
    completedAt: "2026-02-20T09:09:00Z",
    durationSeconds: 540,
    status: "brief-generated",
    emotionalArc: { openingTone: "sad", peakIntensityTurn: 4, closingTone: "reflective", dominantEmotion: "sad" },
  },
  {
    sessionId: "s3",
    startedAt: "2026-02-13T09:00:00Z",
    completedAt: "2026-02-13T09:10:00Z",
    durationSeconds: 600,
    status: "brief-generated",
    emotionalArc: { openingTone: "frustrated", peakIntensityTurn: 5, closingTone: "calm", dominantEmotion: "frustrated" },
  },
  {
    sessionId: "s4",
    startedAt: "2026-02-06T09:00:00Z",
    completedAt: "2026-02-06T09:12:00Z",
    durationSeconds: 720,
    status: "brief-generated",
    emotionalArc: { openingTone: "calm", peakIntensityTurn: 7, closingTone: "hopeful", dominantEmotion: "happy" },
  },
  {
    sessionId: "s5",
    startedAt: "2026-01-30T09:00:00Z",
    completedAt: "2026-01-30T09:08:00Z",
    durationSeconds: 480,
    status: "brief-generated",
    emotionalArc: { openingTone: "anxious", peakIntensityTurn: 3, closingTone: "grounded", dominantEmotion: "grateful" },
  },
  {
    sessionId: "s6",
    startedAt: "2026-01-23T09:00:00Z",
    completedAt: "2026-01-23T09:11:00Z",
    durationSeconds: 660,
    status: "brief-generated",
    emotionalArc: { openingTone: "excited", peakIntensityTurn: 8, closingTone: "reflective", dominantEmotion: "excited" },
  },
  {
    sessionId: "s7",
    startedAt: "2026-01-16T09:00:00Z",
    completedAt: "2026-01-16T09:10:00Z",
    durationSeconds: 600,
    status: "brief-generated",
    emotionalArc: { openingTone: "flat", peakIntensityTurn: 5, closingTone: "hopeful", dominantEmotion: "hopeful" },
  },
  {
    sessionId: "s8",
    startedAt: "2026-01-09T09:00:00Z",
    completedAt: "2026-01-09T09:09:00Z",
    durationSeconds: 540,
    status: "brief-generated",
    emotionalArc: { openingTone: "calm", peakIntensityTurn: 3, closingTone: "calm", dominantEmotion: "calm" },
  },
];

export const mockBriefs: MockBrief[] = [
  {
    briefId: "b1",
    sessionId: "s1",
    generatedAt: "2026-02-27T09:12:00Z",
    editedByUser: false,
    content: {
      emotionalState: "I came in feeling wired and anxious — my chest was tight from the start. By the end I felt a little more grounded, like naming it took some of the edge off.",
      themes: [
        "Work deadline pressure building",
        "Tension with partner about priorities",
        "Sleep disruption getting worse",
      ],
      patientWords: "I keep telling myself it's fine but my body is screaming that it's not. I need to actually say that out loud to someone.",
      focusItems: [
        "Talk about why I keep minimizing the work stress",
        "Ask about strategies for the 2AM anxiety spirals",
      ],
      patternNote: "Work-related anxiety has come up in my last 3 sessions. Worth going deeper on this one.",
    },
  },
  {
    briefId: "b2",
    sessionId: "s2",
    generatedAt: "2026-02-20T09:10:00Z",
    editedByUser: true,
    content: {
      emotionalState: "I felt heavy and sad from the beginning — the kind of sadness that sits in your chest. It shifted slightly by the end, more reflective than hopeless.",
      themes: [
        "Missing my grandmother deeply",
        "Guilt about not calling more often",
        "Feeling disconnected from family",
      ],
      patientWords: "She was the one person who never made me feel like I had to perform. I don't know who that person is now.",
      focusItems: [
        "Explore what 'performing' means in my other relationships",
        "Talk about the grief timeline — it's been 6 months",
      ],
      patternNote: null,
    },
  },
  {
    briefId: "b3",
    sessionId: "s3",
    generatedAt: "2026-02-13T09:11:00Z",
    editedByUser: false,
    content: {
      emotionalState: "I came in frustrated — almost angry. It wasn't just one thing; it was everything stacking up. By the end I was calmer but still felt unsettled.",
      themes: [
        "Boundary violations at work",
        "Resentment toward team lead",
        "Questioning career direction",
      ],
      patientWords: "I don't know if I'm angry at them or angry at myself for not saying something sooner.",
      focusItems: [
        "Practice what I'd actually say to my team lead",
        "Discuss the difference between anger and resentment",
      ],
      patternNote: "Work-related stress has come up in my last 3 sessions. Worth going deeper on this one.",
    },
  },
  {
    briefId: "b4",
    sessionId: "s4",
    generatedAt: "2026-02-06T09:13:00Z",
    editedByUser: false,
    content: {
      emotionalState: "I came in feeling genuinely happy for the first time in weeks. Something clicked this week — like I gave myself permission to enjoy things without guilt.",
      themes: [
        "Reconnecting with old friend",
        "Feeling lighter about work",
        "Small wins adding up",
      ],
      patientWords: "I think I forgot what it felt like to just enjoy something without waiting for the other shoe to drop.",
      focusItems: [
        "Explore why happiness feels unfamiliar",
        "Acknowledge the progress — I'm not where I was 3 months ago",
      ],
      patternNote: null,
    },
  },
  {
    briefId: "b5",
    sessionId: "s5",
    generatedAt: "2026-01-30T09:09:00Z",
    editedByUser: false,
    content: {
      emotionalState: "I felt genuinely grateful today — not the performative kind, but the kind that wells up. My partner said something that landed, and I wanted to hold onto it.",
      themes: [
        "Gratitude for partner's patience",
        "Recognizing growth in myself",
        "Letting go of old narratives",
      ],
      patientWords: "She said 'you're not the same person you were last year' and I actually believed her.",
      focusItems: [
        "Talk about what 'believing good things about myself' looks like",
        "Ask about the old narratives I'm still carrying",
      ],
      patternNote: null,
    },
  },
  {
    briefId: "b6",
    sessionId: "s6",
    generatedAt: "2026-01-23T09:12:00Z",
    editedByUser: false,
    content: {
      emotionalState: "I came in buzzing with excitement — I got offered a new role at work and I feel both thrilled and terrified. The energy was high the whole session.",
      themes: [
        "New career opportunity",
        "Fear of change mixed with excitement",
        "Imposter feelings resurfacing",
      ],
      patientWords: "I keep thinking they made a mistake picking me, but also — what if they didn't? What if I'm actually ready?",
      focusItems: [
        "Talk about the imposter feelings in context of real achievement",
        "Explore what 'being ready' actually means to me",
      ],
      patternNote: null,
    },
  },
];

export const emotionColors: Record<string, string> = {
  anxious: "hsl(28 70% 55%)",
  sad: "hsl(220 50% 55%)",
  frustrated: "hsl(0 55% 55%)",
  calm: "hsl(152 35% 50%)",
  flat: "hsl(200 10% 55%)",
  hopeful: "hsl(152 40% 45%)",
  reflective: "hsl(260 30% 55%)",
  grounded: "hsl(152 30% 40%)",
  happy: "hsl(45 80% 55%)",
  excited: "hsl(330 60% 55%)",
  grateful: "hsl(170 50% 45%)",
  confident: "hsl(200 60% 50%)",
  distressed: "hsl(0 70% 45%)",
};

export const emotionEmojis: Record<string, string> = {
  anxious: "😰",
  sad: "😢",
  frustrated: "😤",
  calm: "😌",
  flat: "😐",
  hopeful: "🌱",
  reflective: "🤔",
  grounded: "🧘",
  happy: "😊",
  excited: "🎉",
  grateful: "🙏",
  confident: "💪",
  distressed: "😣",
};
