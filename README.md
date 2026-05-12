# Full Stack Engineering Presentations

Interactive presentation system for the **Full Stack Engineering** course at Reichman University.

## Lectures

### 01 — HTTP & The Browser
Deep dive into the foundations of web communication and browser internals.

**Topics covered:**
- HTTP Protocol evolution (HTTP/1.1 → HTTP/2 → HTTP/3)
- Request/Response structure and headers
- HTTP methods and status codes
- Cookies, sessions, and authentication
- Browser architecture (UI, Engine, Renderer, JS Engine, Network, Storage)
- Critical rendering path (DOM → CSSOM → Render Tree → Layout → Paint → Composite)
- Performance optimization

### 02 — Node.js, Next.js & Async JavaScript
Server-side JavaScript and modern async patterns.

**Topics covered:**
- HTTP servers and the request lifecycle
- Node.js architecture (V8, libuv, event loop)
- Built-in modules (fs, path, http, net, crypto, events, stream, os)
- Express.js and middleware patterns
- Next.js rendering strategies (SSG, SSR, ISR, CSR)
- App Router and React Server Components
- Promises, async/await, and error handling
- Common async patterns and gotchas

## Getting Started

### Prerequisites
- Python 3.x (for the built-in HTTP server)
- A modern web browser

### Running Locally

**Option 1: Using the serve script**
```bash
./serve.sh
```

**Option 2: Using Python directly**
```bash
python -m http.server 8080
```

**Option 3: Using any static file server**
```bash
# Node.js
npx serve .

# PHP
php -S localhost:8080
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

## Navigation

| Key | Action |
|-----|--------|
| `→` `↓` `Space` | Next slide |
| `←` `↑` | Previous slide |
| `Home` | First slide |
| `End` | Last slide |
| `M` | Return to lecture menu |
| `F` | Toggle fullscreen |
| `T` | Toggle dark/light theme |

You can also use touch/swipe gestures on mobile devices.

## Features

- **Interactive modals** — Click highlighted elements for detailed explanations
- **Code highlighting** — Syntax highlighting for HTTP, JavaScript, and more
- **Dark/Light themes** — Toggle with `T` key or theme button
- **Responsive design** — Works on desktop, tablet, and mobile
- **Direct linking** — Share links to specific lectures (e.g., `#http-browser`)

## Project Structure

```
├── index.html          # Main entry point with lecture menu
├── styles.css          # All styling (themes, animations, components)
├── script.js           # Navigation, modals, interactions
├── lectures/
│   ├── http-browser.html        # Lecture 1 slides
│   └── nodejs-nextjs-async.html # Lecture 2 slides
└── serve.sh            # Quick start script
```

## License

MIT

---

**Instructor:** Ohad Assulin  
**Course:** Full Stack Engineering — Reichman University
