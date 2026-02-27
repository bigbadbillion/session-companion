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
    emotionalArc: { openingTone: "calm", peakIntensityTurn: 7, closingTone: "hopeful", dominantEmotion: "calm" },
  },
  {
    sessionId: "s5",
    startedAt: "2026-01-30T09:00:00Z",
    completedAt: "2026-01-30T09:08:00Z",
    durationSeconds: 480,
    status: "brief-generated",
    emotionalArc: { openingTone: "anxious", peakIntensityTurn: 3, closingTone: "grounded", dominantEmotion: "anxious" },
  },
  {
    sessionId: "s6",
    startedAt: "2026-01-23T09:00:00Z",
    completedAt: "2026-01-23T09:11:00Z",
    durationSeconds: 660,
    status: "brief-generated",
    emotionalArc: { openingTone: "flat", peakIntensityTurn: 8, closingTone: "reflective", dominantEmotion: "flat" },
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
      emotionalState: "I started calm, which surprised me. As we talked, something bigger surfaced about my relationship with control. Ended feeling cautiously hopeful.",
      themes: [
        "Need for control in relationships",
        "Fear of vulnerability with partner",
        "Small wins this week I didn't notice",
      ],
      patientWords: "I think I control things because the alternative is feeling everything, and I'm not sure I can handle that.",
      focusItems: [
        "Explore what 'handling everything' actually means to me",
        "Acknowledge the wins — I actually set a boundary this week",
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
      emotionalState: "I felt jittery and anxious — like I'd had too much coffee. By the end I felt more settled, like the anxiety had somewhere to go.",
      themes: [
        "Social anxiety at a work event",
        "Comparing myself to colleagues",
        "Imposter feelings resurfacing",
      ],
      patientWords: "Everyone else seems to just... belong. I'm always calculating whether I'm doing it right.",
      focusItems: [
        "Talk about when the imposter feelings started",
        "Ask about grounding techniques for social settings",
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
      emotionalState: "I felt flat — like I was going through the motions. Something shifted when we talked about what I'm avoiding. By the end I felt more present.",
      themes: [
        "Emotional numbness and avoidance",
        "Avoiding difficult conversation with partner",
        "Work feeling meaningless",
      ],
      patientWords: "I think the numbness is protection. If I don't feel it, I don't have to deal with it.",
      focusItems: [
        "Explore what I'm protecting myself from",
        "Talk about the conversation I keep postponing with my partner",
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
};
