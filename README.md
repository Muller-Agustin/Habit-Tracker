# Calm Tracker

A minimalist, distraction-free habit tracker extension for Chromium-based browsers, built around the principles of Calm Technology.

Instead of punitive streak counters and toxic gamification, Calm Tracker provides a quiet, GitHub-inspired contribution heatmap directly from your browser toolbar. Missing a day is simply an empty cell, not a broken streak.

## Features

- Quick-access popup interface from the browser toolbar.
- Custom habits with an icon and a curated, muted color palette.
- GitHub-style heatmap visualization (Weekly, Monthly, and Annual views).
- Non-intrusive habit editing and completion tracking.
- Fully offline operation with native dark mode support.

## Tech Stack

- **Platform**: Manifest V3 Browser Extension (Chrome, Brave, Edge).
- **Frontend**: Semantic HTML5 and pure CSS3 with system typography.
- **Logic**: Vanilla JavaScript (ES6+).
- **Storage**: Asynchronous `chrome.storage.local` API.

## Repository Structure

```text
.
├── manifest.json       # Extension configuration, permissions, and entry points
├── index.html          # Popup interface markup
├── css/
│   └── style.css       # Core styling, layout constraints, and dark theme
├── js/
│   └── app.js          # Application state, DOM events, and storage persistence
├── icons/              # Browser toolbar and extension icons (16px, 48px, 128px)
└── README.md