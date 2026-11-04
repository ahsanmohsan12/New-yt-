# AI Video Factory

**Single-User Automated 10-Minute YouTube Educational Stickman Video Production System**

AI Video Factory is a mobile-first full-stack web application designed to produce one complete 10-minute (1920x1080, 16:9, H.264 MP4) educational stickman explainer video per day with minimal manual work.

---

## 1. Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   ANDROID CHROME / DESKTOP WEB DASHBOARD                   │
│  Home · Create Video · Script Studio · Voice · Storyboard · Monitor · MP4  │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ REST API (/api/*) + Google OAuth
┌─────────────────────────────────────▼──────────────────────────────────────┐
│                      NODE.JS / EXPRESS BACKEND SERVER                      │
│  • Gemini 3.8 Flash Script & 20 Viral Hooks Engine (Server-Side API Key)   │
│  • Audio-First Forced Alignment & 200-Beat Storyboard Synchronizer         │
│  • Atomic Chapter Task Queue & Checkpoint Persistence (/storage/db.json)   │
│  • Local FFmpeg 1920x1080 H.264 MP4 Assembler (/usr/bin/ffmpeg)            │
└───────┬─────────────────────────────┬──────────────────────────────┬───────┘
        │                             │                              │
        ▼                             ▼                              ▼
┌───────────────────┐   ┌───────────────────────────┐   ┌────────────────────┐
│ GOOGLE COLAB T4 1 │   │   GOOGLE COLAB T4 2       │   │ GOOGLE DRIVE (5TB) │
│ Chapters 1–5      │   │   Chapters 6–10           │   │ /AI Video Factory/ │
│ Kokoro-82M TTS    │   │   Kokoro-82M TTS          │   │   /Projects/<Name> │
│ Stickman Renderer │   │   Stickman Renderer       │   │     /Script        │
│ FFmpeg Encode     │   │   FFmpeg Encode           │   │     /Storyboard    │
└───────────────────┘   └───────────────────────────┘   │     /Audio         │
                                                        │     /Checkpoints   │
                                                        │     /Final Video   │
                                                        └────────────────────┘
```

---

## 2. Repository Evaluation (`stickman-kino` & `stickman-video-director`)

- **`dsauce/stickman-kino`**: Evaluated its declarative code-based scene specification (`scenes.js`) and headless browser canvas rendering approach. Adopted its code-centric philosophy (avoiding expensive per-frame generative video models) in `src/components/StickmanCanvas2D.tsx`.
- **`kaomei/stickman-video-director`**: Evaluated its multi-beat narrative choreography, camera path grammar (`slow_zoom_in`, `pan_left_to_right`, `focus_diagram`), and multi-theme visual styling (`modern_dark_tech`, `classic_chalkboard`, `blueprint_lab`, `warm_paper`). Integrated alongside a **Three.js 3D Procedural Stickman Stage (`src/components/StickmanStage3D.tsx`)**.

---

## 3. Required Dependencies

- **Node.js & Frontend**: `react`, `react-dom`, `express`, `@google/genai`, `three`, `firebase`, `lucide-react`, `tailwindcss`
- **System Binaries**: `ffmpeg` (`/usr/bin/ffmpeg`), `python3`
- **Colab GPU Worker (Python)**: `kokoro>=0.3.4`, `soundfile`, `torch`, `pillow`, `numpy`, `requests`, `espeak-ng`, `ffmpeg`

---

## 4. Environment Variables & API Configuration

Configure in `.env` (or AI Studio **Settings > Secrets**):

- `GEMINI_API_KEY`: Server-side Google AI Studio API key for `gemini-3.8-flash` and `gemini-3.8-flash-lite-tts`. Never exposed in client code.
- `WORKER_SECRET_TOKEN`: Shared secret token passed via `X-Worker-Token` header by Colab GPU workers.
- `APP_URL`: Public URL of the application.

---

## 5. Google Drive 5TB Setup

1. OAuth 2.0 is configured with the least-privilege scope `https://www.googleapis.com/auth/drive.file` via `firebase-applet-config.json`.
2. Click **Sign in with Google** on the **Home Dashboard** or **Final Videos** page.
3. Click **Save Project & MP4 to Google Drive** to automatically provision and populate:
   `AI Video Factory/Projects/<Project Name>/{Script, Storyboard, Audio, Scenes, Chapters, Checkpoints, Final Video}`.

---

## 6. Google Colab Tesla T4 GPU Worker Setup

Open two separate Google Colab notebooks, enable **T4 GPU** (`Runtime -> Change runtime type -> T4 GPU`), and run:

```bash
!pip install -q kokoro>=0.3.4 soundfile torch pillow numpy requests
!apt-get install -y ffmpeg espeak-ng
!curl -sSL $APP_URL/api/workers/colab-script -o colab_worker.py
!python3 colab_worker.py --backend-url "$APP_URL" --worker-token "aivf-colab-worker-token-2026" --worker-name "Colab-T4-Alpha"
```

Each worker registers with `/api/workers/register`, sends periodic heartbeats, claims chapters atomically via `/api/workers/claim-task` so two GPUs never render the same chapter, and saves checkpoints immediately.

---

## 7. Deployment & Troubleshooting

- **Development**: `npm run dev` (starts `tsx server.ts` on port 3000 with Vite middleware).
- **Production Build**: `npm run build` followed by `npm start`.
- **Unit Tests**: `npx --yes tsx --test src/utils/pipelineLogic.test.ts`
- **Troubleshooting**:
  - *Script not advancing to Voice/Storyboard*: Ensure you click **Approve Script** in Script Studio (mandatory cost-protection gate).
  - *Colab runtime disconnected*: Click **Retry Unfinished** in Production Monitor; completed chapter checkpoints are preserved and never re-rendered unless requested.
