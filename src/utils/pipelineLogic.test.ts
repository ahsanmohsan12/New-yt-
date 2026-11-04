import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreAndRankHooks,
  calculateScriptMetrics,
  computeWordForcedAlignment,
  synchronizeStoryboardWithAudio,
  validateStoryboardJson,
  claimNextAvailableChapterTask,
  calculateBenchmarkEta,
  evaluateSceneQuality,
} from './pipelineLogic';
import { ChapterTask, GPUWorker, StoryboardBeat } from '../types';

test('scoreAndRankHooks ranks hooks descending and flags top hook as recommended', () => {
  const ranked = scoreAndRankHooks([
    {
      text: 'Hook A: Low score',
      technique: 'Question',
      curiosityScore: 60,
      clarityScore: 65,
      emotionalScore: 60,
      retentionScore: 60,
    },
    {
      text: 'Hook B: High viral potential',
      technique: 'Counterintuitive',
      curiosityScore: 95,
      clarityScore: 92,
      emotionalScore: 90,
      retentionScore: 94,
    },
  ]);

  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].text, 'Hook B: High viral potential');
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[0].recommended, true);
  assert.equal(ranked[1].rank, 2);
  assert.equal(ranked[1].recommended, false);
  assert.ok(ranked[0].totalScore > ranked[1].totalScore);
});

test('calculateScriptMetrics computes accurate word count and duration at 145 WPM', () => {
  const result = calculateScriptMetrics([
    {
      id: 'ch-1',
      chapterNumber: 1,
      title: 'Intro',
      narrationText: 'One two three four five six seven eight nine ten.',
    },
  ], 120);

  assert.equal(result.totalWordCount, 10);
  assert.equal(result.chapters[0].wordCount, 10);
  assert.equal(result.chapters[0].estimatedDurationSec, 5);
});

test('computeWordForcedAlignment maps words across exact actual audio duration', () => {
  const words = computeWordForcedAlignment('Time slows down near massive objects.', 6.0, 10.0);
  assert.equal(words.length, 6);
  assert.equal(words[0].start, 10.0);
  assert.equal(words[words.length - 1].end, 16.0);
  for (let i = 1; i < words.length; i++) {
    assert.ok(words[i].start >= words[i - 1].start);
  }
});

test('synchronizeStoryboardWithAudio aligns storyboard beats to actual chapter audio duration', () => {
  const chapters = [
    {
      id: 'ch-1',
      chapterNumber: 1,
      title: 'Chapter 1',
      narrationText: 'First beat narration text here. Second beat narration text right here.',
      wordCount: 11,
      estimatedDurationSec: 10,
      actualAudioDurationSec: 12.5,
    },
  ];

  const beats: StoryboardBeat[] = [
    {
      scene_id: 'sc-1',
      beatNumber: 1,
      chapter_id: 'ch-1',
      chapterNumber: 1,
      narration_segment: 'First beat narration text here.',
      semantic_description: 'Stickman standing next to a clock tower.',
      visual_action: 'Stickman points at spinning clock hands',
      character_pose: 'pointing',
      props: ['clock'],
      background: 'chalkboard_grid',
      diagram_type: 'none',
      animation_type: 'keyframe_pose',
      camera_movement: 'static_wide',
      transition: 'fade',
      estimated_duration: 3,
      startTime: 0,
      endTime: 3,
      actual_duration: 3,
      approved: true,
      qaStatus: 'PASS',
    },
    {
      scene_id: 'sc-2',
      beatNumber: 2,
      chapter_id: 'ch-1',
      chapterNumber: 1,
      narration_segment: 'Second beat narration text right here.',
      semantic_description: 'Stickman compares two atomic clocks on a diagram.',
      visual_action: 'Stickman holds laser pointer toward bar chart',
      character_pose: 'explaining',
      props: ['laser_pointer'],
      background: 'chalkboard_grid',
      diagram_type: 'bar_chart',
      diagram_data: { labels: ['Earth', 'Orbit'], values: [100, 94] },
      animation_type: 'chart_grow',
      camera_movement: 'slow_zoom_in',
      transition: 'cut',
      estimated_duration: 3,
      startTime: 3,
      endTime: 6,
      actual_duration: 3,
      approved: true,
      qaStatus: 'PASS',
    },
  ];

  const { syncedBeats, totalSyncedDurationSec } = synchronizeStoryboardWithAudio(chapters, beats);
  assert.equal(totalSyncedDurationSec, 12.5);
  assert.equal(syncedBeats[0].startTime, 0);
  assert.equal(syncedBeats[1].endTime, 12.5);
  assert.equal(
    Math.round((syncedBeats[0].actual_duration + syncedBeats[1].actual_duration) * 100) / 100,
    12.5
  );
});

test('validateStoryboardJson validates required storyboard beat fields', () => {
  const validBeat = {
    scene_id: 'sc-1',
    narration_segment: 'Hello world',
    semantic_description: 'Stickman waves hello on dark canvas',
    visual_action: 'Waves arm',
    character_pose: 'explaining',
    props: ['whiteboard'],
    background: 'modern_dark',
    animation_type: 'wave',
    camera_movement: 'static_wide',
    transition: 'fade',
    estimated_duration: 3,
    chapter_id: 'ch-1',
  };

  assert.equal(validateStoryboardJson([validBeat]).valid, true);
  assert.equal(validateStoryboardJson([]).valid, false);
});

test('claimNextAvailableChapterTask atomically assigns distinct tasks to parallel GPU workers', () => {
  const initialTasks: ChapterTask[] = [
    {
      taskId: 't-1',
      jobId: 'job-1',
      chapterId: 'ch-1',
      chapterNumber: 1,
      status: 'PENDING',
      assignedWorkerId: null,
      claimedAt: null,
      completedAt: null,
      renderTimeSec: null,
      outputUrl: null,
      checkpointSaved: false,
      retryCount: 0,
      errorMessage: null,
    },
    {
      taskId: 't-2',
      jobId: 'job-1',
      chapterId: 'ch-2',
      chapterNumber: 2,
      status: 'PENDING',
      assignedWorkerId: null,
      claimedAt: null,
      completedAt: null,
      renderTimeSec: null,
      outputUrl: null,
      checkpointSaved: false,
      retryCount: 0,
      errorMessage: null,
    },
  ];

  const claim1 = claimNextAvailableChapterTask(initialTasks, 'worker-t4-1');
  assert.equal(claim1.claimedTask?.taskId, 't-1');
  assert.equal(claim1.claimedTask?.assignedWorkerId, 'worker-t4-1');

  const claim2 = claimNextAvailableChapterTask(claim1.updatedTasks, 'worker-t4-2');
  assert.equal(claim2.claimedTask?.taskId, 't-2');
  assert.equal(claim2.claimedTask?.assignedWorkerId, 'worker-t4-2');
});

test('calculateBenchmarkEta returns null when no benchmark data exists and computes accurately when available', () => {
  const tasks: ChapterTask[] = [
    {
      taskId: 't-1',
      jobId: 'job-1',
      chapterId: 'ch-1',
      chapterNumber: 1,
      status: 'PENDING',
      assignedWorkerId: null,
      claimedAt: null,
      completedAt: null,
      renderTimeSec: null,
      outputUrl: null,
      checkpointSaved: false,
      retryCount: 0,
      errorMessage: null,
    },
  ];
  const workers: GPUWorker[] = [
    {
      workerId: 'w-1',
      name: 'Colab Tesla T4 #1',
      gpuModel: 'Tesla T4',
      vramTotalGb: 15,
      vramUsedGb: 2.4,
      environment: 'google_colab',
      status: 'IDLE',
      currentTaskId: null,
      currentJobId: null,
      currentChapterNumber: null,
      lastHeartbeat: new Date().toISOString(),
      completedChaptersCount: 0,
      avgRenderSpeedFps: null,
      avgChapterRenderSec: null,
    },
  ];

  const noBench = calculateBenchmarkEta(tasks, workers);
  assert.equal(noBench.hasBenchmarkData, false);
  assert.equal(noBench.estimatedRemainingSec, null);

  tasks[0].status = 'COMPLETED';
  tasks[0].renderTimeSec = 18;
  tasks.push({
    ...tasks[0],
    taskId: 't-2',
    chapterId: 'ch-2',
    chapterNumber: 2,
    status: 'PENDING',
    renderTimeSec: null,
  });

  const withBench = calculateBenchmarkEta(tasks, workers);
  assert.equal(withBench.hasBenchmarkData, true);
  assert.equal(withBench.avgChapterRenderSec, 18);
  assert.equal(withBench.estimatedRemainingSec, 18);
});

test('evaluateSceneQuality flags scenes with missing descriptions or excessive duration', () => {
  const sampleBeat: StoryboardBeat = {
    scene_id: 'sc-1',
    beatNumber: 1,
    chapter_id: 'ch-1',
    chapterNumber: 1,
    narration_segment: 'Valid narration segment here.',
    semantic_description: 'Stickman explains quantum entanglement using two glowing spin particles.',
    visual_action: 'Points between two spheres',
    character_pose: 'explaining',
    props: ['atom_model'],
    background: 'modern_dark',
    diagram_type: 'none',
    animation_type: 'pulse',
    camera_movement: 'static_wide',
    transition: 'fade',
    estimated_duration: 3.5,
    startTime: 0,
    endTime: 3.5,
    actual_duration: 3.5,
    approved: true,
    qaStatus: 'PASS',
  };

  assert.equal(evaluateSceneQuality(sampleBeat).status, 'PASS');
  assert.equal(
    evaluateSceneQuality({ ...sampleBeat, semantic_description: '' }).status,
    'REGENERATE'
  );
  assert.equal(
    evaluateSceneQuality({ ...sampleBeat, actual_duration: 14, endTime: 14 }).status,
    'REVIEW'
  );
});
