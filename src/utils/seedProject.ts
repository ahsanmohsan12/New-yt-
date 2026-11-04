import {
  VideoProjectJob,
  StoryboardBeat,
  StickmanPose,
  VisualDiagramType,
  CameraMovement,
  ChapterTask,
} from '../types';
import {
  scoreAndRankHooks,
  calculateScriptMetrics,
  computeWordForcedAlignment,
  synchronizeStoryboardWithAudio,
  evaluateSceneQuality,
} from './pipelineLogic';

const RAW_RELATIVITY_HOOKS = [
  {
    text: 'If you parked a spaceship right above a black hole for one hour, you would return to Earth to find everyone you know has been gone for seven thousand years.',
    technique: 'Counterintuitive Time Paradox',
    curiosityScore: 98,
    clarityScore: 96,
    emotionalScore: 94,
    retentionScore: 97,
  },
  {
    text: 'Right now, your head is aging slightly faster than your feet—and the reason why completely broke nineteenth-century physics.',
    technique: 'Visceral Personal Fact',
    curiosityScore: 95,
    clarityScore: 94,
    emotionalScore: 89,
    retentionScore: 95,
  },
  {
    text: 'Every single day, GPS satellites in orbit have to turn back their atomic clocks by 38 microseconds, or Google Maps would misplace your house by six miles.',
    technique: 'Everyday Tech Proof',
    curiosityScore: 92,
    clarityScore: 97,
    emotionalScore: 86,
    retentionScore: 93,
  },
  {
    text: 'We think of time as a universal ticking clock across the cosmos, but Einstein proved that time is actually a local river that bends around mass.',
    technique: 'Metaphorical Reframing',
    curiosityScore: 90,
    clarityScore: 93,
    emotionalScore: 88,
    retentionScore: 91,
  },
  {
    text: 'Why does moving through space steal speed from your movement through time? A stickman and two mirrors are all you need to see the truth.',
    technique: 'Visual Simplicity Promise',
    curiosityScore: 91,
    clarityScore: 95,
    emotionalScore: 84,
    retentionScore: 92,
  },
  {
    text: 'Imagine two identical twins: one stays on Earth, the other boards a rocket at 99% the speed of light. When the rocket lands, only one twin is old.',
    technique: 'Classic Thought Experiment',
    curiosityScore: 89,
    clarityScore: 96,
    emotionalScore: 91,
    retentionScore: 90,
  },
  {
    text: 'Light always travels at 299,792 kilometers per second no matter how fast you chase it—and that single stubborn rule forces time itself to stretch.',
    technique: 'First-Principles Mystery',
    curiosityScore: 88,
    clarityScore: 91,
    emotionalScore: 85,
    retentionScore: 89,
  },
  {
    text: 'What looks like gravity pulling an apple toward the ground is actually the apple sliding down a curve in time.',
    technique: 'Paradigm Shift',
    curiosityScore: 93,
    clarityScore: 87,
    emotionalScore: 86,
    retentionScore: 90,
  },
  {
    text: 'If you watched an astronaut fall into an event horizon, you would never actually see them cross the border—they would freeze in redshifted light forever.',
    technique: 'Dramatic Cosmic Scenario',
    curiosityScore: 94,
    clarityScore: 89,
    emotionalScore: 92,
    retentionScore: 91,
  },
  {
    text: 'You are already traveling through spacetime at the speed of light right now—even while sitting completely still in your chair.',
    technique: 'Mind-Bending Identity Hook',
    curiosityScore: 94,
    clarityScore: 88,
    emotionalScore: 87,
    retentionScore: 90,
  },
  {
    text: 'In 1971, two physicists bought commercial airline tickets for four atomic clocks and proved time travel into the future is completely real.',
    technique: 'Historical Experiment Story',
    curiosityScore: 87,
    clarityScore: 94,
    emotionalScore: 84,
    retentionScore: 88,
  },
  {
    text: 'Subatomic particles called muons should decay high in the upper atmosphere before ever reaching the ground—yet thousands pass through your body every minute.',
    technique: 'Scientific Detective Puzzle',
    curiosityScore: 86,
    clarityScore: 88,
    emotionalScore: 82,
    retentionScore: 87,
  },
  {
    text: 'Forget wormholes and flux capacitors: real forward time travel only requires either an absurdly fast engine or a very heavy star.',
    technique: 'Myth vs Reality Contrast',
    curiosityScore: 85,
    clarityScore: 92,
    emotionalScore: 84,
    retentionScore: 86,
  },
  {
    text: 'Why can nothing in the universe outrun a beam of light? Because as you approach light speed, your own clock slows down to stop you.',
    technique: 'Causal Inversion',
    curiosityScore: 88,
    clarityScore: 90,
    emotionalScore: 83,
    retentionScore: 87,
  },
  {
    text: 'How a 26-year-old patent clerk in Bern dismantled Isaac Newton’s absolute clockwork universe using nothing but thought experiments.',
    technique: 'Underdog Origin Story',
    curiosityScore: 84,
    clarityScore: 91,
    emotionalScore: 86,
    retentionScore: 85,
  },
  {
    text: 'At the exact edge of a black hole, a single second on your wristwatch spans the entire remaining lifetime of stars and galaxies.',
    technique: 'Cosmic Scale Contrast',
    curiosityScore: 91,
    clarityScore: 89,
    emotionalScore: 90,
    retentionScore: 88,
  },
  {
    text: 'If gravity isn’t a magnetic-style force pulling objects across empty space, what is actually pushing your feet against the floor right now?',
    technique: 'Direct Physical Question',
    curiosityScore: 87,
    clarityScore: 88,
    emotionalScore: 81,
    retentionScore: 85,
  },
  {
    text: 'The movie Interstellar didn’t exaggerate Miller’s Planet—a real spinning supermassive black hole can slow time by 60,000 times.',
    technique: 'Pop Culture Validation',
    curiosityScore: 90,
    clarityScore: 93,
    emotionalScore: 88,
    retentionScore: 89,
  },
  {
    text: 'Every object in the universe shares a fixed cosmic speed budget between space and time: spend more on motion, and you have less left for aging.',
    technique: 'Economic Analogy',
    curiosityScore: 89,
    clarityScore: 94,
    emotionalScore: 83,
    retentionScore: 88,
  },
  {
    text: 'By the end of this ten-minute explainer, you will intuitively understand the exact equation that links velocity, gravity, and the flow of time.',
    technique: 'Educational Mastery Promise',
    curiosityScore: 80,
    clarityScore: 95,
    emotionalScore: 79,
    retentionScore: 84,
  },
];

const RAW_CHAPTERS = [
  {
    id: 'ch-1',
    chapterNumber: 1,
    title: 'Chapter 1: The Illusion of a Universal Clock',
    narrationText: `If you parked a spaceship right above a black hole for one hour, you would return to Earth to find everyone you know has been gone for seven thousand years. For centuries, human beings assumed that time was like an invisible metronome ticking at the exact same speed everywhere in the universe. Isaac Newton called this absolute time. Whether you were standing in a quiet meadow on Earth, hurtling aboard a comet past Jupiter, or floating in deep intergalactic space, one second was supposed to equal one second everywhere. Stickman Bob here wears a precision digital stopwatch, and his twin brother Alice wears an identical stopwatch across the room. As long as they stand still together, their watches agree down to the billionth of a second. But the moment one of them starts moving at extreme speed—or stands next to something extraordinarily heavy—their clocks stop agreeing. Neither watch is broken. Time itself actually flows at different rates depending on how fast you move and how close you stand to mass.`,
  },
  {
    id: 'ch-2',
    chapterNumber: 2,
    title: 'Chapter 2: The Stubborn Speed of Light',
    narrationText: `To understand why time bends, we first have to look at the strangest experimental fact in all of physics: the speed of light never changes. In everyday life, speeds add together nicely. If Stickman Bob stands in the back of a pickup truck driving at fifty kilometers per hour and throws a baseball forward at一hundred kilometers per hour, someone standing by the road measures that baseball traveling at one hundred and fifty kilometers per hour. Simple addition. Now replace the baseball with a flashlight beam. Light travels through a vacuum at roughly three hundred thousand kilometers per second. If Bob rides a futuristic rocket moving at half the speed of light and shines his laser pointer forward, you might expect an outside observer to measure that laser beam traveling at one and a half times the speed of light. Yet when physicists actually perform this measurement, the light beam still moves at exact normal light speed—three hundred thousand kilometers per second. Because the speed of light refuses to budge, distance and time have to flex to make the math work.`,
  },
  {
    id: 'ch-3',
    chapterNumber: 3,
    title: 'Chapter 3: The Photon Clock Thought Experiment',
    narrationText: `How does a constant speed of light force time to slow down? Let us build the simplest clock in the universe: a photon clock. Picture two small mirrors facing each other one meter apart, with a single particle of light—a photon—bouncing vertically up and down between them. Every time the photon hits the bottom mirror, the clock ticks once. When Stickman Alice holds this photon clock while standing still, the photon travels straight up and straight down, covering a short vertical path. Now watch what happens when Stickman Bob flies past in a transparent glass train at eighty percent of the speed of light while holding an identical photon clock. From Bob’s seat inside the train, his photon still bounces straight up and down. But from Alice’s view on the station platform, the mirrors are moving sideways! That means Bob’s photon has to travel along a much longer diagonal zigzag path to catch up with the moving mirrors. Since light cannot speed up to cover that longer diagonal triangle, each bounce takes longer to complete.`,
  },
  {
    id: 'ch-4',
    chapterNumber: 4,
    title: 'Chapter 4: The Cosmic Speed Budget & Lorentz Factor',
    narrationText: `Because that diagonal path forms a right-angled triangle, anyone who remembers basic school geometry—specifically the Pythagorean theorem—can derive Einstein’s time dilation formula in thirty seconds. The vertical line is the time experienced on the train, the horizontal base is the distance the train moves, and the slanted hypotenuse is the path light takes from the platform view. The faster the train moves, the wider that triangle stretches, and the slower the moving clock ticks relative to the stationary observer. Physicists summarize this ratio with a Greek letter called gamma, the Lorentz factor. At everyday highway speeds, gamma is so close to one that you would need to drive for millions of years just to lose a single millisecond. At fifty percent of light speed, your clock slows by about fifteen percent. At ninety-nine percent of light speed, one year on your ship equals seven years on Earth. At ninety-nine point nine nine percent of light speed, a single year aboard the ship spans seventy Earth years.`,
  },
  {
    id: 'ch-5',
    chapterNumber: 5,
    title: 'Chapter 5: Real-World Proof — Muons & Airline Clocks',
    narrationText: `Is this just clever chalkboard geometry, or does nature actually behave this way? We see dramatic proof raining down on our heads every second. High in Earth’s upper atmosphere, cosmic rays slam into air molecules and create unstable subatomic particles called muons. In a laboratory at rest, a muon survives for only two point two microseconds before decaying—even at the speed of light, that is barely enough time to travel six hundred and sixty meters. Yet these muons are born fifteen kilometers above the ground, and detectors at sea level catch thousands of them! Why do they survive the fifteen-kilometer trip? Because they travel at ninety-nine point eight percent of light speed. From our perspective, their internal clocks run fifteen times slower, stretching their lifespan long enough to reach the surface. And in nineteen seventy-one, physicists Joseph Hafele and Richard Keating flew cesium atomic clocks around the world on commercial jetliners, proving that even passenger airplanes experience measurable time dilation.`,
  },
  {
    id: 'ch-6',
    chapterNumber: 6,
    title: 'Chapter 6: The Equivalence Principle — Acceleration & Gravity',
    narrationText: `Special relativity explained how motion affects time, published by Einstein in nineteen oh five. But for the next ten years, Einstein wrestled with a deeper puzzle: where does gravity fit in? His breakthrough came from what he called the happiest thought of his life—the Equivalence Principle. Imagine Stickman Bob wakes up inside a windowless elevator cabin. When he drops an apple, it falls to the floor at nine point eight meters per second squared. Can Bob tell whether his cabin is sitting stationary on the surface of the Earth, or being pulled upward through empty space by a rocket accelerating at nine point eight meters per second squared? Einstein realized that locally, there is zero physical difference between standing in a gravitational field and accelerating in a rocket. Now imagine shining a beam of light horizontally across that accelerating elevator. While the light crosses the cabin, the floor accelerates upward to meet it, making the light beam curve downward—which means gravity must bend light and stretch time too!`,
  },
  {
    id: 'ch-7',
    chapterNumber: 7,
    title: 'Chapter 7: Gravitational Time Dilation Explained',
    narrationText: `Let us place two stickmen on a tall skyscraperinside that accelerating rocket—or equivalently, inside Earth’s gravity. Alice stands at the top penthouse, and Bob stands in the basement. Bob sends flashes of green light upward to Alice once every second according to his basement wristwatch. As each wave of light climbs upward against gravity, it loses energy—just like a ball thrown upward slows down—except light cannot lose speed! Instead, light loses frequency, shifting toward the red end of the spectrum. Because the wave crests arrive at the penthouse stretched further apart in time, Alice measures more than one second between Bob’s flashes. In other words, clocks closer to a massive object tick slower than clocks high above it. Even on Earth, an optical lattice clock raised by just one millimeter ticks measurably faster than one sitting lower on the lab bench. Your head is literally a few nanoseconds older than your ankles over a lifetime.`,
  },
  {
    id: 'ch-8',
    chapterNumber: 8,
    title: 'Chapter 8: Why Your Phone GPS Needs Einstein Every Day',
    narrationText: `If you ever doubt whether relativistic physics matters in daily life, pull out your smartphone and open your map app. The Global Positioning System relies on a constellation of twenty-four satellites orbiting twenty thousand kilometers above Earth, traveling at fourteen thousand kilometers per hour. To pinpoint your location on a city street within a few meters, those satellites have to time radio signals to within twenty nanoseconds. Here is the catch: two competing relativistic effects happen simultaneously! Because the satellites move fast relative to the ground, special relativity slows their onboard atomic clocks down by about seven microseconds every day. At the same time, because they orbit high up where Earth’s gravity is four times weaker, general relativity speeds their clocks up by forty-five microseconds every day. Combine minus seven with plus forty-five, and satellite clocks run thirty-eight microseconds faster per day than clocks on Earth. Engineers literally built Einstein’s equations into satellite hardware so your navigation works.`,
  },
  {
    id: 'ch-9',
    chapterNumber: 9,
    title: 'Chapter 9: Approaching a Black Hole’s Event Horizon',
    narrationText: `Now let us take gravitational time dilation to its ultimate cosmic laboratory: a black hole. When a massive star collapses into a tiny volume, it warps spacetime so intensely that an invisible boundary forms called the event horizon, at the Schwarzschild radius. Suppose Stickman Bob pilots a reinforced probe down toward the event horizon while Alice watches through a telescope from a safe distance far away. As Bob descends deeper into the gravitational well, his clock slows down drastically compared to Alice’s ship clock. At twice the Schwarzschild radius, Bob’s time runs at seventy percent speed. Just a few meters above the horizon, a single tick of Bob’s second hand takes hours, then years, then centuries on Alice’s calendar. From Alice’s viewpoint, Bob appears to slow down like a video paused in slow motion, his light stretching into dim infrared radio waves. Yet according to Bob’s own wristwatch, he feels completely normal and crosses the horizon in seconds.`,
  },
  {
    id: 'ch-10',
    chapterNumber: 10,
    title: 'Chapter 10: The Unified Picture of Spacetime',
    narrationText: `So why do speed and gravity both slow down time? Because space and time are not separate stages—they are woven together into a single four-dimensional fabric called spacetime. Every person, planet, and particle travels through four-dimensional spacetime at one universal combined speed: the speed of light. When you sit still in a quiet room away from heavy stars, almost all of your cosmic motion goes along the time axis, moving you steadily from Monday into Tuesday. When you fire up a relativistic rocket and divert some of that motion into traveling through three-dimensional space, you have less speed left over for traveling along the time axis. And when a massive star or black hole curves the geometry of spacetime around itself, the time axis tilts inward toward the mass, creating both the downward pull we call gravity and the slowing of clocks deep in the well. Time is not a rigid cage—it is dynamic, personal, and alive across the cosmos.`,
  },
];

const POSES: StickmanPose[] = [
  'explaining',
  'pointing',
  'thinking',
  'walking',
  'running',
  'surprised',
  'celebrating',
  'writing_board',
  'holding_prop',
  'comparing',
];

const CAMERA_MOVES: CameraMovement[] = [
  'static_wide',
  'slow_zoom_in',
  'slow_zoom_out',
  'pan_left_to_right',
  'pan_right_to_left',
  'focus_character',
  'focus_diagram',
];

const TRANSITIONS: Array<'cut' | 'fade' | 'slide_left' | 'zoom_transition' | 'wipe'> = [
  'fade',
  'cut',
  'slide_left',
  'zoom_transition',
  'wipe',
];

export function generateBeatsForChapters(
  chapters: ReturnType<typeof calculateScriptMetrics>['chapters'],
  targetBeatsPerChapter = 20
): StoryboardBeat[] {
  const allBeats: StoryboardBeat[] = [];
  let globalBeatIdx = 0;

  chapters.forEach((ch) => {
    // Split narration into sentences/clauses and expand/group into targetBeatsPerChapter beats
    const rawSentences = ch.narrationText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const segments: string[] = [];
    // Distribute words evenly across targetBeatsPerChapter visual beats (~3 seconds per beat)
    const allWords = ch.narrationText.trim().split(/\s+/).filter(Boolean);
    const wordsPerBeat = Math.max(4, Math.ceil(allWords.length / targetBeatsPerChapter));

    for (let i = 0; i < targetBeatsPerChapter; i++) {
      const startWord = Math.floor((i * allWords.length) / targetBeatsPerChapter);
      const endWord = Math.floor(((i + 1) * allWords.length) / targetBeatsPerChapter);
      const slice = allWords.slice(startWord, Math.max(startWord + 1, endWord)).join(' ');
      segments.push(slice || rawSentences[i % rawSentences.length] || ch.title);
    }

    segments.forEach((seg, localIdx) => {
      globalBeatIdx++;
      const pose = POSES[(globalBeatIdx + ch.chapterNumber) % POSES.length];
      const camera = CAMERA_MOVES[(globalBeatIdx + localIdx) % CAMERA_MOVES.length];
      const transition =
        localIdx === 0 ? 'fade' : TRANSITIONS[globalBeatIdx % TRANSITIONS.length];

      // Determine diagram type based on content keywords or periodic educational visual variety
      let diagramType: VisualDiagramType = 'none';
      let diagramData: StoryboardBeat['diagram_data'] = undefined;
      const lower = seg.toLowerCase();

      if (lower.includes('percent') || lower.includes('gamma') || localIdx === 5) {
        diagramType = 'bar_chart';
        diagramData = {
          labels: ['0.1c', '0.5c', '0.9c', '0.99c'],
          values: [1.0, 1.15, 2.29, 7.09],
          unit: 'γ Factor',
        };
      } else if (lower.includes('gps') || lower.includes('microsecond') || localIdx === 11) {
        diagramType = 'comparison_split';
        diagramData = {
          labels: ['Special Rel (-7μs)', 'General Rel (+45μs)', 'Net Shift (+38μs)'],
          values: [7, 45, 38],
          unit: 'μs/day',
        };
      } else if (lower.includes('speed') || lower.includes('curve') || localIdx === 15) {
        diagramType = 'line_graph';
        diagramData = {
          labels: ['10r_s', '5r_s', '2r_s', '1.1r_s'],
          values: [95, 89, 71, 30],
          unit: '% Clock Rate',
        };
      } else if (lower.includes('budget') || lower.includes('axis') || localIdx === 18) {
        diagramType = 'pie_chart';
        diagramData = {
          labels: ['Time Motion', 'Space Motion'],
          values: [80, 20],
          unit: '% c',
        };
      }

      const propsList =
        diagramType !== 'none'
          ? ['chalkboard_chart', 'laser_pointer']
          : lower.includes('clock') || lower.includes('watch')
            ? ['atomic_clock', 'stopwatch']
            : lower.includes('rocket') || lower.includes('spaceship')
              ? ['rocket_rig', 'starfield']
              : lower.includes('black hole') || lower.includes('horizon')
                ? ['accretion_disk', 'gravity_grid']
                : ['whiteboard', 'marker'];

      const beat: StoryboardBeat = {
        scene_id: `sc-${ch.chapterNumber}-${String(localIdx + 1).padStart(2, '0')}`,
        beatNumber: globalBeatIdx,
        chapter_id: ch.id,
        chapterNumber: ch.chapterNumber,
        narration_segment: seg,
        semantic_description: `Chapter ${ch.chapterNumber} Beat ${localIdx + 1}: Educational stickman (${pose}) illustrating "${seg.slice(0, 68)}${seg.length > 68 ? '...' : ''}" with ${propsList.join(' + ')}.`,
        visual_action:
          diagramType !== 'none'
            ? `Stickman gestures toward interactive ${diagramType.replace('_', ' ')} while values animate`
            : `Stickman performs ${pose.replace('_', ' ')} motion synchronized to narration beat`,
        character_pose: pose,
        props: propsList,
        background: ch.chapterNumber >= 9 ? 'cosmic_event_horizon' : 'chalkboard_grid',
        diagram_type: diagramType,
        diagram_data: diagramData,
        animation_type: diagramType !== 'none' ? 'procedural_chart_reveal' : 'rig_keyframe_ik',
        camera_movement: camera,
        transition,
        estimated_duration: 3.0,
        startTime: (globalBeatIdx - 1) * 3.0,
        endTime: globalBeatIdx * 3.0,
        actual_duration: 3.0,
        approved: true,
        qaStatus: 'PASS',
        qaNotes: 'Verified narration-to-visual semantic alignment and reusable rig asset key.',
        renderedFrameCount: 90,
        assetReuseKey: `rig_${pose}_${propsList[0]}`,
      };

      const qa = evaluateSceneQuality(beat);
      beat.qaStatus = qa.status;
      beat.qaNotes = qa.notes;

      allBeats.push(beat);
    });
  });

  return allBeats;
}

export function createSeedRelativityProject(): VideoProjectJob {
  const rankedHooks = scoreAndRankHooks(RAW_RELATIVITY_HOOKS);
  const { chapters, totalWordCount, estimatedTotalDurationSec } =
    calculateScriptMetrics(RAW_CHAPTERS, 145);

  // Populate actual audio durations and word forced alignment for the seed project
  let offset = 0;
  const enrichedChapters = chapters.map((ch) => {
    const actualSec = Math.round((ch.estimatedDurationSec * 1.02) * 10) / 10;
    const wordTimestamps = computeWordForcedAlignment(ch.narrationText, actualSec, offset);
    offset += actualSec;
    return {
      ...ch,
      actualAudioDurationSec: actualSec,
      audioUrl: `/api/projects/job-relativity-demo/audio/${ch.id}.wav`,
      audioFormat: 'WAV 24kHz 16-bit Mono',
      ttsEngineUsed: 'Kokoro-82M / Acoustic Neural Engine (af_bella)',
      alignmentStatus: 'aligned' as const,
      wordTimestamps,
    };
  });

  const initialBeats = generateBeatsForChapters(enrichedChapters, 20);
  const { syncedBeats, totalSyncedDurationSec } = synchronizeStoryboardWithAudio(
    enrichedChapters,
    initialBeats
  );

  const chapterTasks: ChapterTask[] = enrichedChapters.map((ch) => ({
    taskId: `task-demo-${ch.id}`,
    jobId: 'job-relativity-demo',
    chapterId: ch.id,
    chapterNumber: ch.chapterNumber,
    status: 'COMPLETED',
    assignedWorkerId: ch.chapterNumber <= 5 ? 'colab-t4-worker-alpha' : 'colab-t4-worker-beta',
    claimedAt: '2026-11-04T09:42:10.000Z',
    completedAt: '2026-11-04T09:45:30.000Z',
    renderTimeSec: Math.round((18.4 + (ch.chapterNumber % 3) * 1.2) * 10) / 10,
    outputUrl: `/api/projects/job-relativity-demo/video`,
    checkpointSaved: true,
    retryCount: 0,
    errorMessage: null,
  }));

  return {
    id: 'job-relativity-demo',
    title: 'Why Time Slows Down Near Black Holes (Relativity Explained)',
    topic: 'How Special and General Relativity Cause Time Dilation Near Black Holes and GPS Satellites',
    instructions:
      'Use clear everyday analogies (pickup truck baseball, photon mirror clock, accelerating elevator, GPS satellites) before reaching black hole event horizons. Include quantitative charts for Lorentz factor and GPS microsecond shifts.',
    targetDurationMinutes: 10,
    audienceLevel: 'general',
    language: 'English',
    narratorVoice: 'af_bella',
    narratorLabel: 'Kokoro af_bella (Energetic Educational Female)',
    visualTheme: 'modern_dark_tech',
    resolution: '1920x1080',
    aspectRatio: '16:9',
    status: 'COMPLETED',
    createdAt: '2026-11-04T09:30:00.000Z',
    updatedAt: '2026-11-04T09:52:00.000Z',
    hooks: rankedHooks,
    selectedHookId: rankedHooks[0].id,
    chapters: enrichedChapters,
    scriptApproved: true,
    scriptApprovedAt: '2026-11-04T09:35:12.000Z',
    totalWordCount,
    estimatedTotalDurationSec,
    actualTotalAudioDurationSec: totalSyncedDurationSec,
    combinedAudioUrl: '/api/projects/job-relativity-demo/audio/combined.wav',
    alignmentMethod: 'whisperx_forced',
    storyboard: syncedBeats,
    chapterTasks,
    completedChapterIds: enrichedChapters.map((c) => c.id),
    failedTaskIds: [],
    finalVideo: {
      url: '/api/projects/job-relativity-demo/video',
      fileSizeBytes: 2458624,
      durationSec: totalSyncedDurationSec,
      resolution: '1920x1080',
      codec: 'H.264 / AAC',
      createdAt: '2026-11-04T09:51:45.000Z',
      syncVerified: true,
      audioVideoDeltaSec: 0.01,
    },
    driveSync: {
      synced: false,
      lastSyncedAt: null,
      uploadedFiles: [],
    },
    logs: [
      {
        id: 'log-1',
        timestamp: '2026-11-04T09:30:05.000Z',
        level: 'info',
        stage: 'SCRIPT_GENERATION',
        message: 'Generated 20 scored viral hooks and 10-chapter script via Gemini API.',
      },
      {
        id: 'log-2',
        timestamp: '2026-11-04T09:35:12.000Z',
        level: 'success',
        stage: 'AWAITING_APPROVAL',
        message: 'User approved Hook #1 (96.5 pts) and 10-chapter educational script.',
      },
      {
        id: 'log-3',
        timestamp: '2026-11-04T09:38:40.000Z',
        level: 'info',
        stage: 'VOICE_GENERATION',
        message: 'Generated chapter-by-chapter WAV narration and recorded exact audio durations.',
      },
      {
        id: 'log-4',
        timestamp: '2026-11-04T09:40:15.000Z',
        level: 'info',
        stage: 'STORYBOARD_GENERATION',
        message: 'Generated 200 structured visual beats and ran Audio-First Forced Alignment.',
      },
      {
        id: 'log-5',
        timestamp: '2026-11-04T09:48:20.000Z',
        level: 'info',
        stage: 'RENDERING',
        message: 'Rendered 10 chapters with reusable stickman IK rigs and animated charts.',
      },
      {
        id: 'log-6',
        timestamp: '2026-11-04T09:51:45.000Z',
        level: 'success',
        stage: 'COMPLETED',
        message: 'FFmpeg assembled 1920x1080 16:9 H.264 MP4 with synchronized narration and captions. QA Passed (200/200 scenes).',
      },
    ],
  };
}
