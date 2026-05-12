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
