// Advanced AI-like matching algorithms for the chatbot

// Levenshtein distance for fuzzy matching
const levenshteinDistance = (str1, str2) => {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len2][len1];
};

// Calculate similarity score (0-1)
const similarity = (str1, str2) => {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLen;
};

// Extract meaningful keywords (removes stop words)
const stopWords = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
  'could', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'on', 'at',
  'for', 'with', 'by', 'from', 'as', 'about', 'into', 'through', 'during',
  'how', 'what', 'when', 'where', 'why', 'who', 'which', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
  'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'please', 'tell', 'me', 'show', 'help', 'can', 'you'
]);

const extractKeywords = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
};

// Intent detection patterns
const intentPatterns = {
  greeting: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'greetings'],
  attendance: ['attendance', 'present', 'absent', 'mark attendance', 'check attendance', 'my attendance'],
  exam: ['exam', 'test', 'examination', 'upcoming exam', 'exam schedule', 'exam results', 'grades', 'marks', 'scores', 'test date', 'test schedule', 'examination date', 'when is exam', 'exam timetable'],
  assignments: ['assignment', 'assignments', 'homework', 'submit', 'submission', 'upload assignment', 'due date', 'deadline', 'past papers', 'materials'],
  subject: ['subject', 'subjects', 'course', 'courses', 'mathematics', 'math', 'maths', 'science', 'physics', 'chemistry', 'biology', 'english', 'language', 'history', 'geography', 'computer', 'informatics'],
  student: ['student', 'my profile', 'student info', 'student information', 'my details'],
  teacher: ['teacher', 'teachers', 'faculty', 'instructor', 'professor'],
  upload: ['upload', 'file', 'document', 'assignment', 'certificate', 'submit', 'submission', 'homework', 'study materials', 'notes', 'resources'],
  class: ['class', 'classes', 'schedule', 'timetable', 'my class', 'class schedule'],
  help: ['help', 'support', 'assistance', 'contact', 'how', 'what can you', 'guide']
};

// Detect user intent (exported for use in response generation)
export const detectIntent = (message) => {
  const lowerMessage = message.toLowerCase();
  const messageWords = extractKeywords(message);
  
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    for (const pattern of patterns) {
      if (lowerMessage.includes(pattern) || 
          messageWords.some(word => pattern.includes(word) || word.includes(pattern))) {
        return intent;
      }
    }
  }
  return 'general';
};

// Calculate comprehensive match score
export const calculateMatchScore = (userMessage, entry) => {
  const message = userMessage.toLowerCase().trim();
  const messageWords = extractKeywords(message);
  const entryQuestion = entry.question.toLowerCase();
  const entryAnswer = entry.answer.toLowerCase();
  let score = 0;

  // 1. Exact question match (highest priority)
  if (entryQuestion === message || message === entryQuestion) {
    score += 100;
  }
  
  // 2. Question contains message or vice versa
  // Avoid accidental substring matches for very short messages like "hi" matching "this".
  if (message.length >= 4 && (entryQuestion.includes(message) || message.includes(entryQuestion))) {
    score += 50;
  }
  
  // 3. Fuzzy similarity on question
  const questionSimilarity = similarity(message, entryQuestion);
  score += questionSimilarity * 30;
  
  // 4. Keyword matches (exact)
  if (entry.keywords && entry.keywords.length > 0) {
    const entryKeywords = entry.keywords.map(k => k.toLowerCase());
    for (const keyword of entryKeywords) {
      if (message.includes(keyword)) {
        score += 15;
      }
      // Fuzzy keyword match
      for (const word of messageWords) {
        const keywordSimilarity = similarity(word, keyword);
        if (keywordSimilarity > 0.7) {
          score += keywordSimilarity * 10;
        }
      }
    }
  }
  
  // 5. Word overlap
  const entryWords = extractKeywords(entryQuestion + ' ' + entryAnswer);
  const commonWords = messageWords.filter(word => entryWords.includes(word));
  score += commonWords.length * 5;
  
  // 6. Intent matching
  const detectedIntent = detectIntent(message);
  if (entry.category === detectedIntent) {
    score += 25;
  }
  
  // Special handling for exam-related queries
  if (detectedIntent === 'exam' && entry.category === 'exams') {
    // Check for specific exam keywords in message
    const examKeywords = ['schedule', 'date', 'when', 'time', 'results', 'marks', 'grades', 'score'];
    const messageLower = message.toLowerCase();
    examKeywords.forEach(keyword => {
      if (messageLower.includes(keyword) && (entry.question.includes(keyword) || entry.answer.toLowerCase().includes(keyword))) {
        score += 15;
      }
    });
  }
  
  // Special handling for subject-related queries
  if (detectedIntent === 'subject') {
    // Extract subject names from message
    const subjects = ['mathematics', 'math', 'maths', 'science', 'physics', 'chemistry', 'biology', 'english', 'language', 'history', 'geography', 'computer'];
    const messageLower = message.toLowerCase();
    subjects.forEach(subject => {
      if (messageLower.includes(subject) && (entry.question.includes(subject) || entry.answer.toLowerCase().includes(subject))) {
        score += 20;
      }
    });
  }
  
  // 7. Answer relevance
  const answerWords = extractKeywords(entryAnswer);
  const answerOverlap = messageWords.filter(word => answerWords.includes(word));
  score += answerOverlap.length * 3;
  
  // 8. Length similarity (prefer similar length questions)
  const lengthDiff = Math.abs(message.length - entryQuestion.length);
  const maxLength = Math.max(message.length, entryQuestion.length);
  if (maxLength > 0) {
    score += (1 - lengthDiff / maxLength) * 5;
  }

  return score;
};

// Find best matches (returns top N)
export const findBestMatches = (userMessage, entries, topN = 3) => {
  // Prevent false positives for very short inputs (e.g. "hi" matching "this").
  if ((userMessage || '').trim().length < 4) {
    return [];
  }

  const scored = entries.map(entry => ({
    entry,
    score: calculateMatchScore(userMessage, entry)
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Filter out low scores and return top N
  // Dynamic threshold based on query complexity
  const dynamicThreshold = userMessage.split(/\s+/).length > 3 ? 12 : 15;
  
  return scored
    .filter(item => item.score > dynamicThreshold) // Dynamic threshold
    .slice(0, topN);
};

// Generate contextual response
export const generateContextualResponse = (userMessage, matchedEntry, chatHistory = [], score = 100) => {
  let response = matchedEntry.answer;

  // Add contextual information based on chat history
  const recentMessages = chatHistory.slice(-3);
  const context = recentMessages
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content.toLowerCase())
    .join(' ');

  // Personalize response based on user queries
  if (context.includes('my') || userMessage.toLowerCase().includes('my')) {
    response = response.replace(/your/g, 'your');
    response = response.replace(/you can/g, 'you can');
    if (response.includes('the Students page') || response.includes('Students page')) {
      response = response.replace('the Students page', 'your profile on the Students page');
    }
  }

  // Add subject-specific context for exam queries
  const userLower = userMessage.toLowerCase();
  if (userLower.includes('math') || userLower.includes('mathematics')) {
    if (matchedEntry.category === 'exams' || matchedEntry.category === 'classes') {
      response = response.replace(/exams/g, 'mathematics exams');
    }
  }

  // Add helpful follow-up suggestions based on query type
  const queryIntent = detectIntent(userMessage);
  if (queryIntent === 'exam' && score > 30) {
    response += '\n\nWould you like to know more about exam schedules or results?';
  } else if (queryIntent === 'subject' && score > 30) {
    response += '\n\nIs there anything specific you\'d like to know about this subject?';
  } else if (score < 50) {
    response += '\n\nIs this what you were looking for? If not, please try rephrasing your question or asking about a specific topic.';
  }

  // Add context-aware closing for better engagement
  if (score > 70) {
    response += '\n\nIs there anything else I can help you with?';
  }

  return response;
};
