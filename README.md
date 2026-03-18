# Boxing Training Planner

A vibecoded, web application designed specifically for boxing to plan, log, and analyze their weekly training regimens entirely on the device.

## Features

- **Weekly Scheduling**: An intuitive, visually driven interface to schedule daily boxing routines.
- **Detailed Step Editor**: Break down exercises into distinct steps (e.g., Heavy Bag, Shadow Boxing) with timers and custom instructions.
- **JSON Import Framework**: Seamlessly load entire pre-built schedules from coaches using the `< / >` JSON import button in the schedule view.
- **Smart Timer**: A highly customized visual guided timer, tracking step progression, rest intervals, skips, and sound notifications (vibe-designed for minimal interruption).
- **Session Logging**: Rate workouts on exertion, fatigue, and cardio scales to keep track of progress and monitor overtraining.
- **Analytics & Trends**: Detailed KPIs and trend charts generated automatically from completed logs over time, visually representing progress and effort distribution.
- **PWA Ready**: Installable as a native app on mobile and desktop devices (can be used completely offline with full feature parity).
- **Theme Accents & Swipe UX**: Optimized heavily for mobile touch ergonomics (swipe-to-change-day logic, context menus grouped at finger reach) with "Dark-Charcoal & Red" boxing aesthetics.

## Tech Stack

- **React 18** for atomic reactive UI handling.
- **Vite** as a lightning-fast build tool and bundler.
- **Vite PWA Plugin** for native app-like caching and installability.
- **Recharts** for drawing comprehensive trend analytics.
- **Lucide React** for crisp, scalable vector iconography matching the design system.
- **LocalStorage State Engine**: All application persistence is managed synchronously via an optimized local repository wrapper to guarantee privacy and instant loads.

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
