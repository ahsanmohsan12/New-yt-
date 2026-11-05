import React, { useEffect, useRef, useState } from 'react';
import { StoryboardBeat } from '../types';
import { Play, Pause, SkipBack } from 'lucide-react';

interface StickmanCanvas2DProps {
  beat: StoryboardBeat;
  allBeats?: StoryboardBeat[];
  combinedAudioUrl?: string | null;
  visualTheme?: 'classic_chalkboard' | 'modern_dark_tech' | 'blueprint_lab' | 'warm_paper';
  isPlaying?: boolean;
  showCaptions?: boolean;
  onActiveBeatChange?: (beat: StoryboardBeat) => void;
}

export const StickmanCanvas2D: React.FC<StickmanCanvas2DProps> = ({
  beat,
  allBeats,
  combinedAudioUrl,
  visualTheme = 'modern_dark_tech',
  isPlaying = true,
  showCaptions = true,
  onActiveBeatChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const beatRef = useRef(beat);
  const allBeatsRef = useRef(allBeats || []);
  const themeRef = useRef(visualTheme);
  const showCaptionsRef = useRef(showCaptions);

  const [isMoviePlaying, setIsMoviePlaying] = useState(false);
  const [movieTimeSec, setMovieTimeSec] = useState(0);
  const isMoviePlayingRef = useRef(false);

  useEffect(() => {
    beatRef.current = beat;
    allBeatsRef.current = allBeats || [];
    themeRef.current = visualTheme;
    showCaptionsRef.current = showCaptions;
  }, [beat, allBeats, visualTheme, showCaptions]);

  const totalTimelineSec =
    allBeats && allBeats.length > 0
      ? allBeats[allBeats.length - 1].endTime
      : beat.endTime;

  const toggleMoviePlayback = () => {
    const audio = audioRef.current;
    if (isMoviePlayingRef.current) {
      isMoviePlayingRef.current = false;
      setIsMoviePlaying(false);
      if (audio) audio.pause();
    } else {
      isMoviePlayingRef.current = true;
      setIsMoviePlaying(true);
      if (audio) {
        audio.play().catch(() => {
          // Fallback to internal clock if browser blocks autoplay
        });
      }
    }
  };

  const resetMoviePlayback = () => {
    isMoviePlayingRef.current = false;
    setIsMoviePlaying(false);
    setMovieTimeSec(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (allBeats && allBeats.length > 0 && onActiveBeatChange) {
      onActiveBeatChange(allBeats[0]);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const startTs = performance.now();
    let prevTs = startTs;
    let virtualMovieClock = 0;
    let lastNotifiedBeatId = beatRef.current.scene_id;

    const drawFrame = (now: number) => {
      const dt = Math.min(0.1, (now - prevTs) / 1000);
      prevTs = now;
      const elapsed = (now - startTs) / 1000;

      // Determine active beat when Full Storyboard Movie Mode is playing
      let b = beatRef.current;
      const beatsList = allBeatsRef.current;

      if (isMoviePlayingRef.current && beatsList.length > 0) {
        const audio = audioRef.current;
        if (audio && !audio.paused && audio.duration > 0) {
          // Map audio playback ratio onto the storyboard timeline
          const maxTimeline = beatsList[beatsList.length - 1].endTime || 1;
          const ratio = Math.min(1, audio.currentTime / audio.duration);
          virtualMovieClock = ratio * maxTimeline;
        } else {
          virtualMovieClock += dt;
          const maxTimeline = beatsList[beatsList.length - 1].endTime || 1;
          if (virtualMovieClock >= maxTimeline) {
            virtualMovieClock = 0;
            isMoviePlayingRef.current = false;
            setIsMoviePlaying(false);
          }
        }
        setMovieTimeSec(Math.round(virtualMovieClock * 10) / 10);

        const matched =
          beatsList.find(
            (item) =>
              virtualMovieClock >= item.startTime && virtualMovieClock <= item.endTime
          ) || beatsList[beatsList.length - 1];
        if (matched) {
          b = matched;
          beatRef.current = matched;
          if (matched.scene_id !== lastNotifiedBeatId) {
            lastNotifiedBeatId = matched.scene_id;
            if (onActiveBeatChange) onActiveBeatChange(matched);
          }
        }
      }

      const theme = themeRef.current;
      const W = canvas.width;
      const H = canvas.height;

      const palettes = {
        modern_dark_tech: {
          bg: '#090D16',
          grid: 'rgba(56, 189, 248, 0.08)',
          stage: '#111827',
          stroke: '#F8FAFC',
          accent: '#38BDF8',
          secondary: '#22C55E',
          warn: '#F59E0B',
        },
        classic_chalkboard: {
          bg: '#0F241D',
          grid: 'rgba(255, 255, 255, 0.06)',
          stage: '#143026',
          stroke: '#F1F5F9',
          accent: '#FBBF24',
          secondary: '#34D399',
          warn: '#F87171',
        },
        blueprint_lab: {
          bg: '#0A192F',
          grid: 'rgba(100, 255, 218, 0.09)',
          stage: '#112240',
          stroke: '#E6F1FF',
          accent: '#64FFDA',
          secondary: '#38BDF8',
          warn: '#FBBF24',
        },
        warm_paper: {
          bg: '#1C1917',
          grid: 'rgba(245, 158, 11, 0.08)',
          stage: '#292524',
          stroke: '#FAFAF9',
          accent: '#F59E0B',
          secondary: '#10B981',
          warn: '#EC4899',
        },
      };
      const pal = palettes[theme] || palettes.modern_dark_tech;

      ctx.save();
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, W, H);

      // Camera movement transform (zoom / pan)
      const camCycle = Math.min(1, (elapsed % 4) / 4);
      let zoom = 1.0;
      let panX = 0;
      if (b.camera_movement === 'slow_zoom_in') {
        zoom = 1.0 + camCycle * 0.12;
      } else if (b.camera_movement === 'slow_zoom_out') {
        zoom = 1.12 - camCycle * 0.12;
      } else if (b.camera_movement === 'pan_left_to_right') {
        panX = -30 + camCycle * 60;
      } else if (b.camera_movement === 'pan_right_to_left') {
        panX = 30 - camCycle * 60;
      } else if (b.camera_movement === 'focus_character') {
        zoom = 1.15;
        panX = 90;
      } else if (b.camera_movement === 'focus_diagram') {
        zoom = 1.12;
        panX = -90;
      }

      ctx.translate(W / 2 + panX, H / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-W / 2, -H / 2);

      // Engineering grid
      ctx.strokeStyle = pal.grid;
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Floor line
      const floorY = H * 0.78;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(60, floorY);
      ctx.lineTo(W - 60, floorY);
      ctx.stroke();

      // Stickman Character (Left-Center)
      const stickX = b.diagram_type !== 'none' ? W * 0.28 : W * 0.36;
      const walkOffset =
        b.character_pose === 'walking' || b.character_pose === 'running'
          ? Math.sin(elapsed * 5) * 18
          : 0;
      const cx = stickX + walkOffset;
      const headY = floorY - 190 + Math.abs(Math.sin(elapsed * 3)) * 4;

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(cx, floorY + 4, 42, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = pal.stroke;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Head
      ctx.fillStyle = pal.stage;
      ctx.beginPath();
      ctx.arc(cx, headY, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Expressive eyes
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(cx - 8, headY - 4, 3.2, 0, Math.PI * 2);
      ctx.arc(cx + 10, headY - 4, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Mouth expression
      ctx.strokeStyle = pal.stroke;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (b.character_pose === 'surprised') {
        ctx.arc(cx + 2, headY + 9, 5, 0, Math.PI * 2);
      } else {
        ctx.arc(cx + 2, headY + 6, 8, 0.15 * Math.PI, 0.85 * Math.PI);
      }
      ctx.stroke();

      // Spine
      ctx.strokeStyle = pal.stroke;
      ctx.lineWidth = 5;
      const hipY = floorY - 78;
      ctx.beginPath();
      ctx.moveTo(cx, headY + 26);
      ctx.lineTo(cx, hipY);
      ctx.stroke();

      // Legs
      const stride =
        b.character_pose === 'walking'
          ? Math.sin(elapsed * 6) * 26
          : b.character_pose === 'running'
            ? Math.sin(elapsed * 10) * 38
            : 18;
      ctx.beginPath();
      ctx.moveTo(cx, hipY);
      ctx.lineTo(cx - stride, floorY);
      ctx.moveTo(cx, hipY);
      ctx.lineTo(cx + stride, floorY);
      ctx.stroke();

      // Arms
      const shoulderY = headY + 44;
      const wave = Math.sin(elapsed * 4.5) * 14;
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      if (b.character_pose === 'celebrating' || b.character_pose === 'surprised') {
        ctx.lineTo(cx - 38, shoulderY - 35 + wave * 0.5);
      } else if (b.character_pose === 'thinking') {
        ctx.lineTo(cx - 28, shoulderY + 25);
        ctx.lineTo(cx - 6, headY + 14);
      } else {
        ctx.lineTo(cx - 34, shoulderY + 38);
      }
      ctx.moveTo(cx, shoulderY);
      const rightHandX =
        b.character_pose === 'pointing' || b.character_pose === 'explaining'
          ? cx + 62
          : cx + 42;
      const rightHandY =
        b.character_pose === 'pointing'
          ? shoulderY - 16 + wave * 0.6
          : b.character_pose === 'celebrating'
            ? shoulderY - 40 - wave * 0.5
            : shoulderY + 10 + wave * 0.5;
      ctx.lineTo(rightHandX, rightHandY);
      ctx.stroke();

      // Props
      if (b.props.includes('laser_pointer') || b.diagram_type !== 'none') {
        ctx.strokeStyle = pal.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(rightHandX, rightHandY);
        ctx.lineTo(rightHandX + 42, rightHandY - 12);
        ctx.stroke();
      } else if (b.props.includes('atomic_clock') || b.props.includes('stopwatch')) {
        ctx.strokeStyle = pal.warn;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(rightHandX + 18, rightHandY, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rightHandX + 18, rightHandY);
        ctx.lineTo(
          rightHandX + 18 + Math.cos(elapsed * 4) * 11,
          rightHandY + Math.sin(elapsed * 4) * 11
        );
        ctx.stroke();
      }

      // Right-Side Interactive Diagram / Whiteboard Panel
      const boardX = W * 0.48;
      const boardY = 64;
      const boardW = W * 0.46;
      const boardH = floorY - 84;

      ctx.fillStyle = pal.stage;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(boardX, boardY, boardW, boardH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = pal.accent;
      ctx.font = '600 14px "JetBrains Mono", monospace';
      ctx.fillText(
        `CH ${b.chapterNumber} · SCENE ${b.scene_id.toUpperCase()} · ${b.character_pose.toUpperCase()}`,
        boardX + 20,
        boardY + 30
      );

      if (b.diagram_type === 'bar_chart' && b.diagram_data) {
        const { labels, values, unit } = b.diagram_data;
        const maxVal = Math.max(...values, 1);
        const chartBaseY = boardY + boardH - 42;
        const maxBarH = boardH - 110;
        const barW = Math.min(64, (boardW - 100) / Math.max(1, values.length) - 18);

        values.forEach((v, i) => {
          const bx = boardX + 40 + i * (barW + 24);
          const animFactor = Math.min(1, ((elapsed * 1.4) % 3) * 0.8 + 0.35);
          const bh = (v / maxVal) * maxBarH * animFactor;
          ctx.fillStyle = i % 2 === 0 ? pal.accent : pal.secondary;
          ctx.beginPath();
          ctx.roundRect(bx, chartBaseY - bh, barW, bh, 6);
          ctx.fill();

          ctx.fillStyle = pal.stroke;
          ctx.font = '600 13px "JetBrains Mono", monospace';
          ctx.fillText(`${v}${unit ? ` ${unit}` : ''}`, bx, chartBaseY - bh - 8);
          ctx.fillStyle = '#94A3B8';
          ctx.font = '500 12px "DM Sans", sans-serif';
          ctx.fillText(labels[i] || `Item ${i + 1}`, bx, chartBaseY + 20);
        });
      } else if (b.diagram_type === 'line_graph' && b.diagram_data) {
        const { labels, values } = b.diagram_data;
        const maxVal = Math.max(...values, 100);
        const chartBaseY = boardY + boardH - 42;
        const chartH = boardH - 110;
        const stepX = (boardW - 90) / Math.max(1, values.length - 1);

        ctx.strokeStyle = pal.accent;
        ctx.lineWidth = 4;
        ctx.beginPath();
        values.forEach((v, i) => {
          const px = boardX + 45 + i * stepX;
          const py = chartBaseY - (v / maxVal) * chartH;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();

        values.forEach((v, i) => {
          const px = boardX + 45 + i * stepX;
          const py = chartBaseY - (v / maxVal) * chartH;
          ctx.fillStyle = pal.warn;
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#94A3B8';
          ctx.font = '500 12px "JetBrains Mono", monospace';
          ctx.fillText(labels[i] || '', px - 16, chartBaseY + 22);
        });
      } else if (b.diagram_type === 'pie_chart' && b.diagram_data) {
        const cxPie = boardX + boardW * 0.35;
        const cyPie = boardY + boardH * 0.56;
        const radius = Math.min(boardW, boardH) * 0.26;
        const total = b.diagram_data.values.reduce((a, c) => a + c, 0) || 100;
        let angle = -Math.PI / 2;
        const colors = [pal.accent, pal.warn, pal.secondary];

        b.diagram_data.values.forEach((v, idx) => {
          const slice = (v / total) * Math.PI * 2;
          ctx.fillStyle = colors[idx % colors.length];
          ctx.beginPath();
          ctx.moveTo(cxPie, cyPie);
          ctx.arc(cxPie, cyPie, radius, angle, angle + slice);
          ctx.closePath();
          ctx.fill();
          angle += slice;

          ctx.fillStyle = pal.stroke;
          ctx.font = '500 14px "DM Sans", sans-serif';
          ctx.fillText(
            `${b.diagram_data?.labels[idx] || 'Part'}: ${v}%`,
            boardX + boardW * 0.64,
            boardY + 95 + idx * 32
          );
        });
      } else if (b.diagram_type === 'comparison_split' && b.diagram_data) {
        const { labels, values, unit } = b.diagram_data;
        values.forEach((v, i) => {
          const rowY = boardY + 75 + i * 62;
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.roundRect(boardX + 24, rowY, boardW - 48, 46, 8);
          ctx.fill();

          const barFillW = Math.min(boardW - 60, Math.max(40, (v / 50) * (boardW - 140)));
          ctx.fillStyle = i === 0 ? pal.warn : i === 1 ? pal.secondary : pal.accent;
          ctx.beginPath();
          ctx.roundRect(boardX + 24, rowY, barFillW, 46, 8);
          ctx.fill();

          ctx.fillStyle = pal.stroke;
          ctx.font = '600 13px "JetBrains Mono", monospace';
          ctx.fillText(
            `${labels[i] || 'Metric'}: ${v} ${unit || ''}`,
            boardX + 38,
            rowY + 28
          );
        });
      } else {
        ctx.fillStyle = pal.stroke;
        ctx.font = '600 17px "Outfit", sans-serif';
        ctx.fillText(b.visual_action.slice(0, 48), boardX + 20, boardY + 72);

        b.props.forEach((propName, i) => {
          const nx = boardX + 60 + i * 160;
          const ny = boardY + 150;
          ctx.strokeStyle = i % 2 === 0 ? pal.accent : pal.secondary;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(nx - 40, ny - 32, 134, 64, 10);
          ctx.stroke();

          ctx.fillStyle = pal.stroke;
          ctx.font = '500 13px "JetBrains Mono", monospace';
          ctx.fillText(propName.replace('_', ' '), nx - 26, ny + 5);
        });
      }

      ctx.restore();

      // Synchronized Narration Caption Bar at Bottom of 16:9 Frame
      if (showCaptionsRef.current) {
        ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
        ctx.beginPath();
        ctx.roundRect(50, H - 86, W - 100, 66, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = '500 16px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        const caption =
          b.narration_segment.length > 98
            ? `${b.narration_segment.slice(0, 95)}...`
            : b.narration_segment;
        ctx.fillText(caption, W / 2, H - 50);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#38BDF8';
        ctx.font = '600 12px "JetBrains Mono", monospace';
        ctx.fillText(
          `Beat #${b.beatNumber} · ${b.startTime.toFixed(1)}s – ${b.endTime.toFixed(1)}s`,
          W - 68,
          H - 28
        );
        ctx.textAlign = 'left';
      }

      if (isPlaying) {
        animId = requestAnimationFrame(drawFrame);
      }
    };

    animId = requestAnimationFrame(drawFrame);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, onActiveBeatChange]);

  return (
    <div className="space-y-2">
      <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          data-testid="stickman-canvas-2d"
          className="w-full h-full block"
        />

        {combinedAudioUrl && (
          <audio ref={audioRef} src={combinedAudioUrl} preload="metadata" className="hidden" />
        )}
      </div>

      {/* Full Synced Storyboard Movie Playback Transport Bar */}
      {allBeats && allBeats.length > 1 && (
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMoviePlayback}
              className="px-3.5 min-h-[38px] rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {isMoviePlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Synced Movie</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Play All {allBeats.length} Beats + Audio</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetMoviePlayback}
              className="px-2.5 min-h-[38px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
              aria-label="Reset Storyboard Movie to Beat 1"
            >
              <SkipBack className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center gap-3 font-mono tabular-nums text-slate-300">
            <span>
              Scene <strong className="text-sky-400">{beat.scene_id}</strong> (#{beat.beatNumber}/
              {allBeats.length})
            </span>
            <span>·</span>
            <span>
              {isMoviePlaying ? `${movieTimeSec.toFixed(1)}s` : `${beat.startTime.toFixed(1)}s`} /{' '}
              {totalTimelineSec.toFixed(1)}s
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
