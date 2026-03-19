# 🔧 Women's Legal Rights Chatbot - History System Technical Guide

## Architecture Overview

This technical guide provides deep insights into the Chat History System architecture, algorithms, data structures, and implementation details.

## 🏗️ System Architecture

### Component Diagram
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Chat Page     │───▶│  Integration     │───▶│ History Service │
│  (script.js)    │    │   Functions      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                       │
┌─────────────────┐    ┌──────────────────┐           │
│ History Page    │◀───│   History UI     │◀──────────┘
│ (history.html)  │    │   Controller     │
└─────────────────┘    └──────────────────┘
         │
         ▼
┌─────────────────┐
│  localStorage   │
│   Persistence   │
└─────────────────┘
```

### Data Flow
1. **User sends message** → Chat page processes
2. **Bot responds** → Integration layer captures
3. **Auto-categorization** → Message analyzed for category
4. **Data persistence** → Saved to localStorage
5. **UI updates** → History page reflects changes

## 📊 Data Structures

### Core Chat Object
```javascript
interface ChatEntry {
  id: string;              // Unique identifier (timestamp)
  userMessage: string;     // User's question/input
  botResponse: string;     // Bot's response
  category: string;        // Auto-detected category
  timestamp: number;       // Unix timestamp (ms)
  date: string;           // ISO date string (YYYY-MM-DD)
  time: string;           // Localized time string
  pinned: boolean;        // Pin status
  favorite: boolean;      // Favorite status
  relevance: number;      // Relevance score (0-100)
}
```

### Statistics Object
```javascript
interface ChatStatistics {
  total: number;          // Total conversation count
  mostSearched: string;   // Most frequent category
  lastActive: string;     // Relative time string
}
```

### Filter State
```javascript
interface FilterState {
  searchTerm: string;     // Current search query
  category: string;       // Active category filter
  sortBy: string;         // Sort method
  viewType: string;       // View filter (all/pinned/favorites)
}
```

## 🔍 Algorithms

### Auto-Categorization Algorithm

```javascript
function categorizeMessage(message: string): string {
  const text = message.toLowerCase().trim();

  // Define category patterns with weights
  const patterns = {
    domestic: {
      keywords: ['domestic', 'abuse', 'violence', 'assault', 'battery',
                'spouse', 'husband', 'wife', 'partner', 'family'],
      weight: 10
    },
    workplace: {
      keywords: ['workplace', 'work', 'job', 'employment', 'boss',
                'office', 'harassment', 'discrimination', 'salary'],
      weight: 8
    },
    police: {
      keywords: ['police', 'fir', 'complaint', 'crime', 'arrest',
                'law enforcement', 'investigation', 'report'],
      weight: 9
    },
    emergency: {
      keywords: ['emergency', 'urgent', 'help', 'danger', 'threat',
                'immediate', 'crisis', 'safety'],
      weight: 12
    },
    legal: {
      keywords: ['rights', 'legal', 'law', 'court', 'justice',
                'protection', 'order', 'divorce', 'custody'],
      weight: 5
    }
  };

  // Calculate scores for each category
  const scores = {};
  for (const [category, config] of Object.entries(patterns)) {
    scores[category] = 0;
    for (const keyword of config.keywords) {
      if (text.includes(keyword)) {
        scores[category] += config.weight;
      }
    }
  }

  // Find highest scoring category
  let maxScore = 0;
  let bestCategory = 'legal'; // default

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}
```

### Relevance Scoring Algorithm

```javascript
function calculateRelevance(userMessage: string, botResponse: string): number {
  const text = (userMessage + ' ' + botResponse).toLowerCase();
  let score = 0;

  // Base score from length (longer conversations = more detailed)
  score += Math.min(text.length / 100, 5);

  // Keyword importance scoring
  const importantTerms = [
    'emergency', 'urgent', 'help', 'violence', 'abuse',
    'rights', 'legal', 'court', 'police', 'protection'
  ];

  importantTerms.forEach(term => {
    if (text.includes(term)) score += 10;
  });

  // Question marks indicate specific queries
  const questionCount = (userMessage.match(/\?/g) || []).length;
  score += questionCount * 5;

  // Normalize to 0-100 range
  return Math.min(Math.max(Math.round(score), 0), 100);
}
```

### Search Algorithm

```javascript
function searchConversations(query: string, conversations: ChatEntry[]): ChatEntry[] {
  if (!query.trim()) return conversations;

  const searchTerm = query.toLowerCase().trim();
  const results = [];

  for (const chat of conversations) {
    const userText = chat.userMessage.toLowerCase();
    const botText = chat.botResponse.toLowerCase();
    const categoryText = chat.category.toLowerCase();

    // Exact phrase match gets highest score
    if (userText.includes(searchTerm) || botText.includes(searchTerm)) {
      const score = calculateSearchScore(searchTerm, chat);
      results.push({ chat, score });
    }
  }

  // Sort by relevance score
  results.sort((a, b) => b.score - a.score);

  return results.map(item => item.chat);
}

function calculateSearchScore(searchTerm: string, chat: ChatEntry): number {
  let score = 0;
  const userText = chat.userMessage.toLowerCase();
  const botText = chat.botResponse.toLowerCase();

  // Exact matches get highest score
  if (userText === searchTerm) score += 100;
  if (botText === searchTerm) score += 100;

  // Phrase matches
  if (userText.includes(searchTerm)) score += 50;
  if (botText.includes(searchTerm)) score += 50;

  // Word matches
  const words = searchTerm.split(' ');
  words.forEach(word => {
    if (userText.includes(word)) score += 10;
    if (botText.includes(word)) score += 10;
  });

  // Category bonus
  if (chat.category.toLowerCase().includes(searchTerm)) score += 25;

  // Recency bonus (newer = higher score)
  const daysSince = (Date.now() - chat.timestamp) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 20 - daysSince);

  return score;
}
```

## 💾 Storage Strategy

### localStorage Implementation

```javascript
class ChatStorage {
  constructor() {
    this.key = 'wlr_chat_history';
    this.maxEntries = 1000;
  }

  save(data: ChatEntry[]): boolean {
    try {
      // Validate data structure
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array');
      }

      // Limit entries to prevent storage bloat
      const limited = data.slice(0, this.maxEntries);

      // Serialize with error handling
      const serialized = JSON.stringify(limited);

      // Check size limit (5MB browser limit)
      if (serialized.length > 4.5 * 1024 * 1024) {
        throw new Error('Data too large for storage');
      }

      localStorage.setItem(this.key, serialized);
      return true;
    } catch (error) {
      console.error('Storage save error:', error);
      return false;
    }
  }

  load(): ChatEntry[] {
    try {
      const data = localStorage.getItem(this.key);
      if (!data) return [];

      const parsed = JSON.parse(data);

      // Validate structure
      if (!Array.isArray(parsed)) {
        console.warn('Invalid data structure, resetting');
        return [];
      }

      // Validate and clean entries
      return parsed.filter(this.validateEntry).map(this.migrateEntry);
    } catch (error) {
      console.error('Storage load error:', error);
      return [];
    }
  }

  validateEntry(entry: any): boolean {
    return (
      typeof entry === 'object' &&
      entry.id &&
      entry.userMessage &&
      entry.botResponse &&
      entry.timestamp &&
      typeof entry.timestamp === 'number'
    );
  }

  migrateEntry(entry: any): ChatEntry {
    // Handle version migrations
    return {
      id: entry.id || Date.now().toString(),
      userMessage: entry.userMessage || '',
      botResponse: entry.botResponse || '',
      category: entry.category || 'legal',
      timestamp: entry.timestamp || Date.now(),
      date: entry.date || new Date(entry.timestamp).toISOString().split('T')[0],
      time: entry.time || new Date(entry.timestamp).toLocaleTimeString(),
      pinned: entry.pinned || false,
      favorite: entry.favorite || false,
      relevance: entry.relevance || 0
    };
  }
}
```

## 🔄 State Management

### UI State Controller

```javascript
class UIStateManager {
  constructor() {
    this.state = {
      searchTerm: '',
      activeFilter: 'all',
      sortMethod: 'newest',
      viewType: 'all',
      selectedChat: null,
      modalOpen: false
    };

    this.listeners = [];
  }

  // Update state and notify listeners
  setState(updates: Partial<State>) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...updates };

    // Notify listeners of changes
    this.listeners.forEach(listener => {
      listener(this.state, prevState);
    });
  }

  // Subscribe to state changes
  subscribe(listener: Function) {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Get current state
  getState() {
    return { ...this.state };
  }

  // Reset to defaults
  reset() {
    this.setState({
      searchTerm: '',
      activeFilter: 'all',
      sortMethod: 'newest',
      viewType: 'all',
      selectedChat: null,
      modalOpen: false
    });
  }
}
```

## 🎨 UI Rendering Engine

### Virtual List Implementation

```javascript
class VirtualChatList {
  constructor(container: HTMLElement, itemHeight: number = 120) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.items = [];
    this.scrollTop = 0;
    this.containerHeight = container.clientHeight;

    this.setupScrollListener();
  }

  setItems(items: ChatEntry[]) {
    this.items = items;
    this.render();
  }

  setupScrollListener() {
    this.container.addEventListener('scroll', (e) => {
      this.scrollTop = e.target.scrollTop;
      this.render();
    });
  }

  render() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(this.containerHeight / this.itemHeight) + 1,
      this.items.length
    );

    // Clear container
    this.container.innerHTML = '';

    // Render visible items
    for (let i = startIndex; i < endIndex; i++) {
      const item = this.items[i];
      const element = this.createItemElement(item, i);
      this.container.appendChild(element);
    }

    // Set container height for proper scrolling
    this.container.style.height = `${this.items.length * this.itemHeight}px`;
  }

  createItemElement(item: ChatEntry, index: number): HTMLElement {
    const element = document.createElement('div');
    element.className = 'chat-item';
    element.style.position = 'absolute';
    element.style.top = `${index * this.itemHeight}px`;
    element.style.height = `${this.itemHeight}px`;

    element.innerHTML = `
      <div class="chat-card">
        <div class="chat-header">
          <span class="category-badge category-${item.category}">
            ${item.category}
          </span>
          <div class="chat-actions">
            <button class="pin-btn ${item.pinned ? 'active' : ''}">📌</button>
            <button class="favorite-btn ${item.favorite ? 'active' : ''}">⭐</button>
          </div>
        </div>
        <div class="chat-preview">${item.userMessage.substring(0, 50)}...</div>
        <div class="chat-meta">
          <span>${this.formatTime(item.timestamp)}</span>
        </div>
      </div>
    `;

    return element;
  }

  formatTime(timestamp: number): string {
    // Relative time formatting
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(diff / 86400000);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  }
}
```

## ⚡ Performance Optimizations

### Debounced Search
```javascript
function debounce(func: Function, wait: number): Function {
  let timeout: number;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Usage
const debouncedSearch = debounce((query) => {
  // Perform search
  this.filterConversations(query);
}, 150);
```

### Memoized Filtering
```javascript
class MemoizedFilter {
  constructor() {
    this.cache = new Map();
  }

  filter(conversations: ChatEntry[], filters: FilterState): ChatEntry[] {
    const cacheKey = this.generateCacheKey(filters);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const result = this.performFilter(conversations, filters);
    this.cache.set(cacheKey, result);

    // Limit cache size
    if (this.cache.size > 10) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    return result;
  }

  generateCacheKey(filters: FilterState): string {
    return `${filters.searchTerm}|${filters.category}|${filters.sortBy}|${filters.viewType}`;
  }

  performFilter(conversations: ChatEntry[], filters: FilterState): ChatEntry[] {
    let result = [...conversations];

    // Apply filters...
    return result;
  }
}
```

## 🧪 Testing Framework

### Unit Test Structure
```javascript
// tests/chat-history.test.js
describe('ChatHistoryService', () => {
  let service;

  beforeEach(() => {
    service = new ChatHistoryService();
    localStorage.clear();
  });

  describe('saveChat', () => {
    test('should save chat with correct structure', () => {
      const chat = service.saveChat('Hello', 'Hi there', 'legal');

      expect(chat).toHaveProperty('id');
      expect(chat.userMessage).toBe('Hello');
      expect(chat.botResponse).toBe('Hi there');
      expect(chat.category).toBe('legal');
    });

    test('should generate unique IDs', () => {
      const chat1 = service.saveChat('Test1', 'Response1', 'legal');
      const chat2 = service.saveChat('Test2', 'Response2', 'legal');

      expect(chat1.id).not.toBe(chat2.id);
    });
  });

  describe('getHistory', () => {
    test('should return empty array when no chats', () => {
      const history = service.getHistory();
      expect(history).toEqual([]);
    });

    test('should return saved chats', () => {
      service.saveChat('Test', 'Response', 'legal');
      const history = service.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].userMessage).toBe('Test');
    });
  });
});
```

### Performance Benchmarks
```javascript
// benchmarks/performance.test.js
describe('Performance Benchmarks', () => {
  test('should load 1000 chats in under 500ms', () => {
    const start = performance.now();

    // Generate 1000 test chats
    const chats = generateTestChats(1000);
    localStorage.setItem('test_history', JSON.stringify(chats));

    const service = new ChatHistoryService();
    service.getHistory();

    const end = performance.now();
    const duration = end - start;

    expect(duration).toBeLessThan(500);
  });

  test('should search through 1000 chats in under 100ms', () => {
    const chats = generateTestChats(1000);
    const ui = new HistoryUI();

    const start = performance.now();
    ui.getFilteredHistory();
    const end = performance.now();

    expect(end - start).toBeLessThan(100);
  });
});
```

## 🔒 Security Considerations

### Input Sanitization
```javascript
function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}
```

### Data Validation
```javascript
function validateChatData(data: any): boolean {
  const required = ['id', 'userMessage', 'botResponse', 'timestamp'];

  for (const field of required) {
    if (!data.hasOwnProperty(field)) return false;
  }

  // Type validation
  if (typeof data.timestamp !== 'number') return false;
  if (typeof data.userMessage !== 'string') return false;
  if (typeof data.botResponse !== 'string') return false;

  // Length limits
  if (data.userMessage.length > 10000) return false;
  if (data.botResponse.length > 50000) return false;

  return true;
}
```

## 📈 Monitoring & Analytics

### Performance Monitoring
```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTime: [],
      searchTime: [],
      renderTime: [],
      memoryUsage: []
    };
  }

  recordMetric(name: string, value: number) {
    if (this.metrics[name]) {
      this.metrics[name].push(value);

      // Keep only last 100 measurements
      if (this.metrics[name].length > 100) {
        this.metrics[name].shift();
      }
    }
  }

  getAverage(name: string): number {
    const values = this.metrics[name];
    if (!values || values.length === 0) return 0;

    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getStats() {
    return {
      loadTime: {
        average: this.getAverage('loadTime'),
        latest: this.metrics.loadTime[this.metrics.loadTime.length - 1] || 0
      },
      searchTime: {
        average: this.getAverage('searchTime'),
        latest: this.metrics.searchTime[this.metrics.searchTime.length - 1] || 0
      }
    };
  }
}
```

## 🚀 Deployment Considerations

### Build Optimization
```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        history: {
          test: /history-management\.js$/,
          name: 'history',
          chunks: 'all',
        }
      }
    }
  }
};
```

### CDN Deployment
```html
<!-- Production: Load from CDN -->
<script src="https://cdn.example.com/history-management.v1.0.0.min.js"></script>

<!-- Development: Load locally -->
<script src="history-management.js"></script>
```

## 🔄 Migration Strategies

### Data Migration
```javascript
function migrateData(oldVersion: string, data: any): ChatEntry[] {
  switch (oldVersion) {
    case '1.0':
      return migrateFromV1(data);
    case '1.1':
      return migrateFromV1_1(data);
    default:
      return data;
  }
}

function migrateFromV1(data: any): ChatEntry[] {
  return data.map(item => ({
    ...item,
    relevance: calculateRelevance(item.userMessage, item.botResponse),
    time: new Date(item.timestamp).toLocaleTimeString()
  }));
}
```

## 📋 Error Handling

### Global Error Boundary
```javascript
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);

  // Report to monitoring service
  reportError({
    message: event.message,
    stack: event.error.stack,
    url: event.filename,
    line: event.lineno,
    column: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);

  // Handle promise rejections
  event.preventDefault();
});
```

---

## 📚 API Reference

### Complete Method Signatures

#### ChatHistoryService
```typescript
class ChatHistoryService {
  getHistory(): ChatEntry[]
  saveChat(userMessage: string, botResponse: string, category: string): ChatEntry | null
  deleteChat(chatId: string): boolean
  clearAllHistory(): boolean
  updateChat(chatId: string, updates: Partial<ChatEntry>): ChatEntry | null
  getStatistics(): ChatStatistics
  formatRelativeTime(timestamp: number): string
  getDateGroupLabel(dateString: string): string
  calculateRelevance(userMessage: string, botResponse: string): number
}
```

#### HistoryUI
```typescript
class HistoryUI {
  init(): void
  render(): void
  getFilteredHistory(): ChatEntry[]
  groupByDate(history: ChatEntry[]): Record<string, ChatEntry[]>
  createChatCard(chat: ChatEntry): string
  attachChatCardListeners(): void
  viewConversation(chatId: string): void
  handleExport(): void
  handleClearAll(): void
  renderEmptyState(): void
  updateStatistics(): void
  showConfirmDialog(title: string, message: string, callback: Function): void
}
```

---

*Technical Guide v1.0 - Comprehensive system documentation for developers*
