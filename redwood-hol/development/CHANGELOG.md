# Oracle LiveLabs Workshop Framework - Changelog

## Version 24.2 (January 22, 2026)

### Summary
Added quiz scoring system with badge download rewards.

### New Features

#### Quiz Scoring with Badge Download
Track learner progress across multiple quizzes and reward completion.

**Scored Quiz Syntax:**
```markdown
```quiz score
Q: Your question?
* Correct answer
- Wrong answer
```
```

**Configuration Block:**
```markdown
```quiz-config
passing: 80
badge: images/badge.png
```
```

**Features:**
- `score` flag marks quiz as contributing to total score
- Visual progress bar tracks answered quizzes
- Pass/fail indication when all scored quizzes completed
- Badge download button appears when passing score achieved
- "Try Again" button allows unlimited retries
- Score updates in real-time as learners improve

**Files:**
- `main.24.js`: `convertQuizConfig()`, `retryQuiz()`, `updateQuizScore()` functions
- `style.24.css`: `.ll-quiz-scored`, `#ll-quiz-score-tracker`, badge download styles

---

## Version 24.0 / 24.1 (January 22, 2026)

### Summary
Major release adding interactive quiz feature, lazy loading images, and code readability improvements.

---

## New Features

### 1. Interactive Quiz Component
Allows workshop authors to add interactive quizzes in markdown.

**Syntax:**
```markdown
```quiz
Q: What is the current version of Oracle Database?
* 23ai (correct answer marked with asterisk)
- 19c (wrong answers marked with dash)
- 12c
> Optional explanation shown after answering
```
```

**Features:**
- Single correct answer = radio buttons
- Multiple correct answers = checkboxes (use multiple `*`)
- Visual feedback: green checkmark for correct, red X for wrong, yellow for missed
- Optional explanation with `>` prefix
- Disables inputs after checking answer

**Files:**
- `main.24.js`: `convertQuizBlocks()` function (parses markdown) + `checkQuizAnswer()` global function
- `style.24.css`: `.ll-quiz-*` styles

### 2. Lazy Loading Images
Images now use native browser lazy loading for better performance.

**Implementation:**
- First image: `loading="eager"` (loads immediately, above the fold)
- All other images: `loading="lazy"` (loads when scrolled into view)

**File:** `main.24.js` in `wrapImgWithFigure()` function

### 3. Code Readability Improvements
Fixed hard-to-read code blocks by updating text colors.

**Changes:**
| Element | Before | After |
|---------|--------|-------|
| Base code text (`.hljs`) | `#444` | `#1A1816` |
| Code comments | `#888888` | `#5a5a5a` |
| `pre, code` elements | (inherited) | `#1A1816` |
| `.copy-code` spans | (inherited) | `#1A1816` |

**Files:** `highlight.css`, `style.24.css`

---

## Other Changes

### Clipboard API Modernization
Copy-to-clipboard now uses modern `navigator.clipboard.writeText()` API with fallback to `document.execCommand('copy')` for older browsers.

**File:** `main.24.js` - `copyToClipboard()` and `fallbackCopyToClipboard()` functions

### Code Organization
- Added section comments (SECTION 1: CONFIGURATION, SECTION 2: INITIALIZATION, etc.)
- Added JSDoc documentation to major functions
- Changed some `let` to `const` for function declarations
- Added `console.debug()` in catch blocks (was empty)

---

## Files Summary

### New Files
| File | Size | Description |
|------|------|-------------|
| `development/js/main.24.js` | 120 KB | Main JS with all new features |
| `development/js/main.24.min.js` | 47 KB | Minified JS |
| `development/css/style.24.css` | 44 KB | CSS with quiz styles |
| `development/css/style.24.min.css` | 31 KB | Minified CSS |

### Modified Files
| File | Description |
|------|-------------|
| `development/css/highlight.css` | Darker text colors |
| `development/css/highlight.min.css` | Minified |

### Unchanged (Production)
| File | Description |
|------|-------------|
| `js/main.min.js` | Production JS (version 23.7) |
| `css/style.min.css` | Production CSS (version 22.1) |
| `development/css/style.22.1.css` | Previous CSS version |

---

## Deployment Notes

To deploy version 24:
1. Copy `development/js/main.24.min.js` to `js/main.min.js`
2. Copy `development/css/style.24.min.css` to `css/style.min.css`
3. Copy `development/css/highlight.min.css` to `css/highlight.min.css`

---

## Version History Reference

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 23.7 | Jan-06-26 | Brianna Ambler | Renaming LiveSQL to FreeSQL |
| 24.0 | Jan-22-26 | Kevin Lazarz | Added lazy loading images |
| 24.1 | Jan-22-26 | Kevin Lazarz | Added interactive quiz feature |
| 24.2 | Jan-22-26 | Kevin Lazarz | Added quiz scoring with badge download |

---

## Features NOT Implemented (Removed from original plan)

The following features were planned but removed per user request:
- **Dark Mode**: Theme toggle, CSS variables, `prefers-color-scheme` support
- **Progress Tracking**: Lab completion tracking, progress bar, resume functionality
