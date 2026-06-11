# 🌌 Ultimate Tic Tac Toe

A modern, highly polished, dark-themed web implementation of **Ultimate (Super) Tic Tac Toe**. Play local offline pass-and-play with a friend beside you, or host/join online rooms instantly using zero-configuration, serverless peer-to-peer WebRTC connections.

---

## ⚡ Features

*   **Offline Mode:** Classic pass-and-play on the same device.
*   **Online Multiplayer:** Host/join game rooms with simple 5-letter codes (no database, no account creation, no server deployments).
*   **Real-time Chat:** Communicate with your online opponent via an in-game chat panel.
*   **Synthesized Audio:** Realistic UI sound feedback (move plucks, micro wins, macro wins, errors) synthesized dynamically using the browser's native **Web Audio API** (requires no external `.mp3` loading).
*   **Sleek Dark Theme:** Premium glassmorphism panels, glowing neon markers (Cyan for X, Pink for O, Emerald Green for active boards), and smooth pop-in animations.
*   **In-Game Guide:** Interactive rules popup with live visual grid diagrams explaining the game.
*   **SEO Optimized:** Built with semantic HTML, unique access IDs, responsive configurations, and meta-descriptions.

---

## 🎮 How to Play

Ultimate Tic Tac Toe is played on a large 3x3 grid (the **Macro Board**), where each cell contains a smaller 3x3 grid (a **Micro Board**).

1.  **The Target Rule:** When you make a move in any cell of a sub-grid, you send your opponent to the corresponding sub-board. 
    *   *Example:* If you play in the **top-right cell** of a board, your opponent's next move **must** be placed somewhere in the **top-right board**.
2.  **Winning Sub-Boards:** Getting 3-in-a-row on a Micro Board wins that board. It gets locked and covered with your giant, glowing marker.
3.  **The Wildcard:** If you are sent to a Micro Board that is already won or fully tied, you get a **Wildcard** and can play in **any** available board on the map.
4.  **Victory:** The overall game is won when you secure three Micro Boards in a line (horizontal, vertical, or diagonal) on the Macro Board.

---

## 🛠️ Technology Stack

*   **Core Logic:** JavaScript (ES6+), React 18
*   **Build Tool:** Vite
*   **Styling:** Vanilla CSS (CSS variables, backdrop blur filters, keyframe pulse animations)
*   **Icons:** Lucide React
*   **Real-time Networking:** PeerJS (WebRTC client wrapper)
*   **Audio Synthesis:** Web Audio API (Oscillators, Gain nodes, Frequency sweeps)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed.

### Installation

1. Clone or navigate to the project directory:
   ```bash
   cd super-tic-tac-toe
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser to play!

---

## 📦 Production Build

To build a minimized, production-ready static bundle:

```bash
npm run build
```

The output assets will be saved to the `/dist` directory.