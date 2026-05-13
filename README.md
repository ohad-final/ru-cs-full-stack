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

### 03 — TypeScript
Static typing for JavaScript — history, benefits, and complete tutorial.

**Topics covered:**
- The JavaScript problem and why TypeScript was created
- TypeScript history and Anders Hejlsberg
- Benefits: error catching, IDE support, self-documenting code
- Basic types, arrays, tuples, interfaces
- Type inference and union types
- Generics and utility types (Partial, Pick, Omit, Record)
- Type guards and discriminated unions
- TypeScript with React
- Project setup and strict mode configuration
- Migration strategies for existing codebases

## Getting Started

### Step 1: Download the Files

**Easiest way (no git required):**
1. Click the green **"Code"** button at the top of this page
2. Click **"Download ZIP"**
3. Extract the ZIP file to a folder on your computer

**Or using git:**
```bash
git clone https://github.com/ohad-final/ru-cs-full-stack.git
cd ru-cs-full-stack
```

### Step 2: Run the Presentation

You need a simple web server to run the presentation. Choose one of these options:

**Option 1: Double-click (Mac/Linux)**
```
Double-click the serve.sh file
```

**Option 2: Using Python (pre-installed on Mac/Linux)**
```bash
python -m http.server 8080
```

**Option 3: Using Python on Windows**
```bash
python -m http.server 8080
```
(If Python isn't installed, download it from [python.org](https://www.python.org/downloads/))

### Step 3: Open in Browser

After starting the server, open your browser and go to:

**[http://localhost:8080](http://localhost:8080)**

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
│   ├── nodejs-nextjs-async.html # Lecture 2 slides
│   └── typescript.html          # Lecture 3 slides
└── serve.sh            # Quick start script
```

## License

MIT

---

**Instructor:** Ohad Assulin  
**Course:** Full Stack Engineering — Reichman University
