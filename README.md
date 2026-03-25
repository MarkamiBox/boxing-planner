# Boxing Training Planner

A vibecoded, high-performance web application designed specifically for boxing to plan, execute, and analyze training regimens entirely on-device with an integrated AI Coach.

## Features

- **Weekly Scheduling**: Intuitive interface to manage daily boxing routines with support for custom exercises and automated course sync.
- **Integrated AI Coach**: LLM-powered assistant (Claude/Gemini) that provides context-aware advice, manages personal training memory, and proposes actionable schedule optimizations.
- **Smart Timer Engine**: A robust guided timer tracking step progression, rest intervals, and background cues with automatic state restoration via IndexedDB.
- **Constraint-Based Availability**: Visual calendar to manage work/life constraints, identify optimal training windows, and detect schedule conflicts.
- **Biometric Logging**: Track muscular soreness via interactive body maps, energy levels, and intensity metrics to monitor recovery trends over time.
- **JSON Import Framework**: Seamlessly load entire pre-built schedules from coaches using the standardized JSON import modal in the schedule view.
- **PWA & Offline Ready**: Native app-like experience on mobile and desktop devices, working completely offline with full feature parity.

## Tech Stack

- **React 19** for atomic reactive UI handling and modern state-persistence synchronization.
- **Vite** for lightning-fast build cycles and high-performance HMR during development.
- **IndexedDB State Engine**: All application data is persisted locally via `idb-keyval` to bypass 5MB limits and guarantee total user privacy.
- **Recharts** for drawing comprehensive trend analytics and effort distribution charts.
- **Lucide React** for crisp, scalable vector iconography matching the dark-charcoal boxing aesthetic.

## Import Example

Coaches can distribute JSON strings like this to athletes:

```json
[
  {
    "name": "Sparring Day Focus",
    "type": "Boxing",
    "notes": "Focus on head movement before engaging.",
    "steps": [
      {
        "type": "interval",
        "name": "Situational Sparring",
        "work": 180,
        "rest": 60,
        "rounds": 4,
        "instruction": "Only 1-2s and defensive slips."
      }
    ]
  }
]
```
Simply paste this using the import modal in the Schedule View to populate the training day instantly.

## Privacy

MarkamiBox is a "Vibe-Coded" application built on the principle of **Local-First Software**. Your training logs, AI Coach conversations, and personal biometric data never leave your device. All LLM integrations are handled via direct API calls using your own keys, ensuring no middleman ever sees your data.
