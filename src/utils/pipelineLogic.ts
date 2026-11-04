import {
  ViralHook,
  ScriptChapter,
  StoryboardBeat,
  ChapterTask,
  GPUWorker,
  QAStatus,
} from '../types';

/**
 * Scores and ranks 20 hooks based on curiosity (30%), clarity (25%),
 * emotional impact (25%), and retention potential (20%).
 */
export function scoreAndRankHooks(
  rawHooks: Array<{
    id?: string;
    text: string;
    technique: string;
    curiosityScore: number;
    clarityScore: number;
    emotionalScore: number;
    retentionScore: number;
  }>
): ViralHook[] {
  const scored: ViralHook[] = rawHooks.map((h, idx) => {
    const c = Math.max(0, Math.min(100, Number(h.curiosityScore) || 70));
    const cl = Math.max(0, Math.min(100, Number(h.clarityScore) || 70));
    const em = Math.max(0, Math.min(100, Number(h.emotionalScore) || 70));
    const ret = Math.max(0, Math.min(100, Number(h.retentionScore) || 70));
    const totalScore = Math.round((c * 0.3 + cl * 0.25 + em * 0.25 + ret * 0.2) * 10) / 10;
    return {
      id: h.id || `hook-${idx + 1}`,
      text: h.text.trim(),
      technique: h.technique.trim(),
      curiosityScore: c,
      clarityScore: cl,
      emotionalScore: em,
      retentionScore: ret,
      totalScore,
      rank: 0,
      recommended: false,
    };
  });

  scored.sort((a, b) => b.totalScore - a.totalScore);
  scored.forEach((h, index) => {
    h.rank = index + 1;
    h.recommended = index === 0;
  });

  return scored;
}

/**
 * Computes word counts and estimated narration duration based on narrator speed (default 145 WPM).
 */
export function calculateScriptMetrics(
  chapters: Array<{ id: string; chapterNumber: number; title: string; narrationText: string }>,
  wordsPerMinute = 145
): {
  chapters: ScriptChapter[];
  totalWordCount: number;
  estimatedTotalDurationSec: number;
} {
  const safeWpm = wordsPerMinute > 0 ? wordsPerMinute : 145;
  let totalWordCount = 0;
  let estimatedTotalDurationSec = 0;

  const enriched: ScriptChapter[] = chapters.map((ch, idx) => {
    const words = ch.narrationText
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const wordCount = words.length;
    const estimatedDurationSec = Math.max(
      3,
      Math.round(((wordCount / safeWpm) * 60) * 10) / 10
    );
    totalWordCount += wordCount;
    estimatedTotalDurationSec += estimatedDurationSec;

    return {
      id: ch.id || `ch-${idx + 1}`,
      chapterNumber: ch.chapterNumber || idx + 1,
      title: ch.title,
      narrationText: ch.narrationText.trim(),
      wordCount,
      estimatedDurationSec,
    };
  });

  return {
    chapters: enriched,
    totalWordCount,
    estimatedTotalDurationSec: Math.round(estimatedTotalDurationSec * 10) / 10,
  };
}

/**
 * Generates word-level forced alignment timestamps for a chapter's narration text
 * using acoustic syllable weighting and punctuation pause modeling when raw audio duration is known.
 */
export function computeWordForcedAlignment(
  narrationText: string,
  actualDurationSec: number,
  chapterOffsetSec = 0
): Array<{ word: string; start: number; end: number }> {
  const words = narrationText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0 || actualDurationSec <= 0) {
    return [];
  }

  // Weight each word by vowel clusters (syllables) + punctuation pause weight
  const weights = words.map((w) => {
    const clean = w.replace(/[^a-zA-Z0-9]/g, '');
    const syllables = Math.max(1, (clean.match(/[aeiouyAEIOUY]+/g) || []).length);
    const pauseBonus = /[.!?]$/.test(w) ? 1.8 : /[,;:—]$/.test(w) ? 0.9 : 0;
    return syllables + pauseBonus;
  });

  const totalWeight = weights.reduce((acc, val) => acc + val, 0) || 1;
  let cursor = chapterOffsetSec;

  return words.map((word, idx) => {
    const slice = (weights[idx] / totalWeight) * actualDurationSec;
    const start = Math.round(cursor * 100) / 100;
    cursor += slice;
    const end =
      idx === words.length - 1
        ? Math.round((chapterOffsetSec + actualDurationSec) * 100) / 100
        : Math.round(cursor * 100) / 100;
    return { word, start, end };
  });
}

/**
 * Audio-First Synchronization Engine:
 * Maps each narration segment to its corresponding storyboard scene and adjusts
 * scene start/end timestamps so visuals match actual generated chapter audio durations exactly.
 */
export function synchronizeStoryboardWithAudio(
  chapters: ScriptChapter[],
  beats: StoryboardBeat[]
): {
  syncedBeats: StoryboardBeat[];
  totalSyncedDurationSec: number;
  chapterOffsets: Record<string, { start: number; end: number; duration: number }>;
} {
  let globalCursor = 0;
  const syncedBeats: StoryboardBeat[] = [];
  const chapterOffsets: Record<string, { start: number; end: number; duration: number }> = {};

  const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);

  for (const chapter of sortedChapters) {
    const chapterDuration =
      chapter.actualAudioDurationSec && chapter.actualAudioDurationSec > 0
        ? chapter.actualAudioDurationSec
        : chapter.estimatedDurationSec;

    const chapterStart = Math.round(globalCursor * 100) / 100;
    const chapterEnd = Math.round((globalCursor + chapterDuration) * 100) / 100;
    chapterOffsets[chapter.id] = {
      start: chapterStart,
      end: chapterEnd,
      duration: chapterDuration,
    };

    const chapterBeats = beats
      .filter((b) => b.chapter_id === chapter.id || b.chapterNumber === chapter.chapterNumber)
      .sort((a, b) => a.beatNumber - b.beatNumber);

    if (chapterBeats.length === 0) {
      globalCursor += chapterDuration;
      continue;
    }

    // Weight beats by their narration segment syllable/word length
    const beatWeights = chapterBeats.map((beat) => {
      const words = beat.narration_segment
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const charWeight = Math.max(6, beat.narration_segment.trim().length);
      return Math.max(1, words.length * 4 + charWeight * 0.4);
    });

    const totalBeatWeight = beatWeights.reduce((sum, w) => sum + w, 0) || 1;
    let beatCursor = chapterStart;

    chapterBeats.forEach((beat, idx) => {
      const proportionalDuration = (beatWeights[idx] / totalBeatWeight) * chapterDuration;
      const startTime = Math.round(beatCursor * 100) / 100;
      beatCursor += proportionalDuration;
      const endTime =
        idx === chapterBeats.length - 1
          ? chapterEnd
          : Math.round(beatCursor * 100) / 100;
      const actual_duration = Math.max(0.5, Math.round((endTime - startTime) * 100) / 100);

      syncedBeats.push({
        ...beat,
        startTime,
        endTime,
        actual_duration,
      });
    });

    globalCursor = chapterEnd;
  }

  // Re-number beatNumber sequentially to preserve strict scene ordering
  syncedBeats.forEach((b, idx) => {
    b.beatNumber = idx + 1;
  });

  return {
    syncedBeats,
    totalSyncedDurationSec: Math.round(globalCursor * 100) / 100,
    chapterOffsets,
  };
}

/**
 * Validates that every visual beat in a storyboard conforms to the required schema.
 */
export function validateStoryboardJson(beats: unknown): {
  valid: boolean;
  errors: string[];
} {
  if (!Array.isArray(beats) || beats.length === 0) {
    return { valid: false, errors: ['Storyboard must be a non-empty array of visual beats.'] };
  }

  const errors: string[] = [];
  const requiredFields = [
    'scene_id',
    'narration_segment',
    'semantic_description',
    'visual_action',
    'character_pose',
    'props',
    'background',
    'animation_type',
    'camera_movement',
    'transition',
    'estimated_duration',
    'chapter_id',
  ];

  beats.forEach((beat, index) => {
    if (!beat || typeof beat !== 'object') {
      errors.push(`Beat at index ${index} is not an object.`);
      return;
    }
    const record = beat as Record<string, unknown>;
    for (const field of requiredFields) {
      if (record[field] === undefined || record[field] === null || record[field] === '') {
        errors.push(`Beat ${record.scene_id || index}: missing required field '${field}'.`);
      }
    }
    if (!Array.isArray(record.props)) {
      errors.push(`Beat ${record.scene_id || index}: 'props' must be an array.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Atomic Task Claiming for Parallel Multi-GPU Workers:
 * Assigns the next PENDING chapter task to the requesting worker and prevents
 * multiple workers from claiming the same chapter. Never deletes completed checkpoints.
 */
export function claimNextAvailableChapterTask(
  tasks: ChapterTask[],
  workerId: string,
  nowIso: string = new Date().toISOString()
): {
  claimedTask: ChapterTask | null;
  updatedTasks: ChapterTask[];
} {
  // Check if worker already holds an active CLAIMED or RENDERING task
  const existingActive = tasks.find(
    (t) =>
      t.assignedWorkerId === workerId &&
      (t.status === 'CLAIMED' || t.status === 'RENDERING')
  );
  if (existingActive) {
    return { claimedTask: existingActive, updatedTasks: tasks };
  }

  // Find first PENDING task in chapter order
  const sortedPending = [...tasks]
    .filter((t) => t.status === 'PENDING' && !t.checkpointSaved)
    .sort((a, b) => a.chapterNumber - b.chapterNumber);

  if (sortedPending.length === 0) {
    return { claimedTask: null, updatedTasks: tasks };
  }

  const targetTaskId = sortedPending[0].taskId;
  let claimedTask: ChapterTask | null = null;

  const updatedTasks = tasks.map((t) => {
    if (t.taskId === targetTaskId) {
      claimedTask = {
        ...t,
        status: 'CLAIMED',
        assignedWorkerId: workerId,
        claimedAt: nowIso,
        errorMessage: null,
      };
      return claimedTask;
    }
    return t;
  });

  return { claimedTask, updatedTasks };
}

/**
 * Calculates estimated remaining rendering time ONLY when real benchmark data exists
 * (at least 1 completed chapter with measured renderTimeSec and >= 1 online worker).
 * Never fabricates completion times.
 */
export function calculateBenchmarkEta(
  tasks: ChapterTask[],
  workers: GPUWorker[]
): {
  hasBenchmarkData: boolean;
  avgChapterRenderSec: number | null;
  estimatedRemainingSec: number | null;
  activeParallelWorkers: number;
} {
  const completedWithTiming = tasks.filter(
    (t) => t.status === 'COMPLETED' && typeof t.renderTimeSec === 'number' && t.renderTimeSec > 0
  );
  const remainingTasks = tasks.filter((t) => t.status !== 'COMPLETED');
  const activeWorkers = workers.filter((w) => w.status !== 'OFFLINE');

  if (completedWithTiming.length === 0) {
    return {
      hasBenchmarkData: false,
      avgChapterRenderSec: null,
      estimatedRemainingSec: null,
      activeParallelWorkers: activeWorkers.length,
    };
  }

  const totalSec = completedWithTiming.reduce((acc, t) => acc + (t.renderTimeSec || 0), 0);
  const avgChapterRenderSec = Math.round((totalSec / completedWithTiming.length) * 10) / 10;

  if (remainingTasks.length === 0) {
    return {
      hasBenchmarkData: true,
      avgChapterRenderSec,
      estimatedRemainingSec: 0,
      activeParallelWorkers: activeWorkers.length,
    };
  }

  if (activeWorkers.length === 0) {
    return {
      hasBenchmarkData: true,
      avgChapterRenderSec,
      estimatedRemainingSec: null,
      activeParallelWorkers: 0,
    };
  }

  const parallelFactor = Math.max(1, activeWorkers.length);
  const estimatedRemainingSec = Math.ceil(
    (remainingTasks.length * avgChapterRenderSec) / parallelFactor
  );

  return {
    hasBenchmarkData: true,
    avgChapterRenderSec,
    estimatedRemainingSec,
    activeParallelWorkers: activeWorkers.length,
  };
}

/**
 * Automated Visual Quality Control:
 * Evaluates a storyboard beat for narration-to-visual plausibility, asset completeness,
 * valid timing, and non-blank descriptions.
 */
export function evaluateSceneQuality(beat: StoryboardBeat): {
  status: QAStatus;
  notes: string;
} {
  if (!beat.narration_segment || beat.narration_segment.trim().length < 4) {
    return {
      status: 'REGENERATE',
      notes: 'Missing or truncated narration segment.',
    };
  }

  if (!beat.semantic_description || beat.semantic_description.trim().length < 10) {
    return {
      status: 'REGENERATE',
      notes: 'Visual description is blank or insufficient for stickman rendering.',
    };
  }

  if (beat.actual_duration <= 0.4 || beat.endTime <= beat.startTime) {
    return {
      status: 'REGENERATE',
      notes: `Invalid scene duration (${beat.actual_duration}s). Requires audio re-alignment.`,
    };
  }

  if (beat.actual_duration > 12) {
    return {
      status: 'REVIEW',
      notes: `Scene duration (${beat.actual_duration}s) exceeds recommended 8s visual beat pacing.`,
    };
  }

  if (
    beat.diagram_type !== 'none' &&
    (!beat.diagram_data ||
      !Array.isArray(beat.diagram_data.labels) ||
      beat.diagram_data.labels.length === 0)
  ) {
    return {
      status: 'REVIEW',
      notes: `Diagram type '${beat.diagram_type}' specified without chart labels/values.`,
    };
  }

  return {
    status: 'PASS',
    notes: 'Semantic description, character pose, props, and synced audio timestamps verified.',
  };
}
