# 🥊 MarkamiBox: Smart Boxing Planner

A high-performance, privacy-first training ecosystem designed for boxers and combat athletes. Plan, execute, and analyze your training sessions with a state-of-the-art AI Coach, all while keeping 100% of your data local and secure.

![App Interface Mockup](https://raw.githubusercontent.com/lucide-react/lucide/main/icons/brain.svg) *(Visual placeholder for the AI Coach module)*

## ⚔️ Core Modules

### 🤖 AI Coach (The Brain)
- **Context-Aware Coaching**: Integrates with Anthropic (Claude 3.5), Google (Gemini 2.5), and OpenRouter.
- **Persistent Memory**: The coach remembers your style, past injuries, progress, and preferences across sessions.
- **Active Planning**: The AI can propose schedule changes, suggest recovery days, and update your long-term goals based on your actual training velocity.
- **Structured Tools**: Proposals are presented as actionable diffs (Add/Remove/Modify/Reschedule) that you can approve with a single tap.

### 📅 Advanced Scheduler & Availability
- **Constraint-Based Planning**: Use the **Availability Calendar** to mark "Hard" constraints (Work, Travel, Family) and "Soft" windows.
- **Dynamic Training Windows**: The UI highlights optimal time slots and detects conflicts between your busy schedule and planned sessions.
- **Guided Step Playlist**: Break down any session into a granular list of intervals, sets, or technical drills with specific instructions for every round.
- **JSON Import/Export**: Instantly load professional training protocols or share your own via a simple, standardized JSON framework.

### ⏱️ Performance Execution (The Timer)
- **Guided Workout Engine**: A robust, background-safe timer that walks you through your session step-by-step.
- **Intelligent Transitions**: Automatic handling of prep times, work intervals, and recovery periods with customizable beep and vibration cues.
- **Sync & Restore**: Powered by IndexedDB to ensure your timer state is never lost, even if you accidentally close the tab or the browser refreshes.

### 📊 Deep Logging & Analytics
- **Biometric Tracking**: Log weight, sleep quality, and energy levels to monitor recovery.
- **Body Map Soreness**: A visual dummy allows you to tap and track muscular fatigue/soreness across specific zones, helping to identify overtraining patterns.
- **KPI Visualization**: Beautiful, data-driven charts for volume, intensity trends, and consistency over weeks and months.

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/) with functional components and hooks.
- **Storage**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via `idb-keyval`) for fast, local-only persistence that circumvents the 5MB localStorage limit.
- **Tooling**: [Vite](https://vitejs.dev/) for ultra-fast builds and HMR.
- **PWA**: [Vite PWA Plugin](https://vite-pwa-org.netlify.app/) for full offline capability and "Add to Home Screen" support on iOS/Android.
- **Charts**: [Recharts](https://recharts.org/) for high-performance SVG animations and data visualization.
- **Icons**: [Lucide React](https://lucide.dev/) for a clean, consistent UI across all views.

## 🚀 Getting Started

1. **Local Development**:
   ```bash
   npm install
   npm run dev
   ```
2. **Build for Production**:
   ```bash
   npm run build
   ```
3. **PWA Usage**: Visit the hosted URL on your mobile device and use "Add to Home Screen" for a native, standalone experience.

## 🔒 Privacy Commitment

MarkamiBox is a "Vibe-Coded" application built on the principle of **Local-First Software**. Your training logs, AI Coach conversations, and personal biometric data never leave your device. All LLM integrations are handled via direct API calls using your own keys, ensuring no middleman ever sees your data.

---
*Created with focus and discipline. Ready for the next round.*
