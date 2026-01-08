import Chat from '../models/Chat.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import { detectIntent, findBestMatches, generateContextualResponse } from '../utils/chatAI.js';
import { detectDialogflowIntent, isDialogflowConfigured } from '../utils/dialogflow.js';

// Default responses when no match is found
const DEFAULT_RESPONSES = [
  "I don’t have that information yet. Please try rephrasing your question or contact your administrator for help.",
  "I’m not able to confirm that from the system right now. If you tell me your class/subject, I can guide you to the right place in the app.",
  "I couldn’t find a clear match. Try asking about Attendance, Assignments, Exams, Uploads, Students, or Teachers."
];

// Greeting responses
const GREETING_RESPONSES = [
  "Hello! I can help with Attendance, Assignments, Exams, file uploads, and basic navigation. What would you like to do?",
  "Hi! Ask me about upcoming exams, assignments due dates, marking attendance, or uploading files.",
  "Welcome! Tell me what you need help with (attendance, exams, assignments, uploads, students, teachers)."
];

// Closing responses (when user indicates conversation is over)
const CLOSING_RESPONSES = [
  "No problem — happy to help. Have a great day!",
  "Alright! If you need anything later, just message me. Take care.",
  "Understood. Thanks for chatting — goodbye!"
];

// Help responses
const HELP_TOPICS = [
  'Attendance (view/mark)',
  'Assignments (create/view/due dates)',
  'Exams (schedule/past papers)',
  'Upload Files (submit documents/assignments)',
  'Students / Teachers (admin/teacher access)',
  'Login / account approval'
];

const roleCapabilities = (role = 'student') => {
  if (role === 'admin') {
    return [
      'Manage Students and Teachers',
      'Create/update Assignments and Exams',
      'Approve users (admin approvals)',
      'Manage Knowledge Base (chatbot training)'
    ];
  }
  if (role === 'teacher') {
    return [
      'View Students',
      'Mark Attendance',
      'Create/update Assignments and Exams',
      'Upload study materials'
    ];
  }
  return [
    'View Attendance',
    'View Assignments and Exams',
    'Upload files (submissions/documents)',
    'Chat support'
  ];
};

const buildHelpResponse = (role) => {
  return [
    'Here’s what I can help you with:',
    `• ${HELP_TOPICS.join('\n• ')}`,
    '',
    `Based on your role (${role}):`,
    `• ${roleCapabilities(role).join('\n• ')}`,
    '',
    'Try asking:',
    '• "Show my upcoming exams"',
    '• "How do I submit an assignment?"',
    '• "How do I mark attendance?"',
    '• "Where can I upload files?"'
  ].join('\n');
};

const buildIntentFallbackResponse = ({ intent, role }) => {
  switch (intent) {
    case 'greeting':
      return GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)];
    case 'help':
      return buildHelpResponse(role);
    case 'attendance':
      return role === 'student'
        ? [
            'To view your attendance:',
            '• Open **Attendance** from the sidebar.',
            '• Select the date to view present/absent records.',
            '',
            'If something looks incorrect, contact your class teacher.'
          ].join('\n')
        : [
            'To manage attendance:',
            '• Open **Attendance** from the sidebar.',
            '• Select a class and date.',
            '• Mark students as present/absent and save.',
            '',
            'Tip: Use the stats view to quickly check attendance rate.'
          ].join('\n');
    case 'exam':
      return [
        'For exams:',
        '• Open **Exams** to view upcoming exams and details.',
        '• You can filter by subject (and by class if available to your role).',
        '• Past papers can be attached to an exam (teacher/admin).',
        '',
        role === 'student'
          ? 'If you don’t see an exam, your teacher/admin may not have published it yet.'
          : 'Teachers/Admins can create and update exams from the Exams page.'
      ].join('\n');
    case 'assignments':
      return [
        'For assignments:',
        '• Open **Assignments** to view all assignments for your class.',
        '• Check the due date badge (Due Soon / Overdue).',
        '',
        role === 'student'
          ? 'To submit work, go to **Upload Files** and upload your file (choose the appropriate category/description).'
          : 'Teachers/Admins can create or edit assignments from the Assignments page.'
      ].join('\n');
    case 'upload':
      return [
        'To upload files (documents/assignments):',
        '• Open **Upload Files** from the sidebar.',
        '• Select the file and choose a category.',
        '• Add a short description so it’s easy to find later.',
        '',
        'If S3 is configured, uploads are stored in the cloud; otherwise they may be stored locally.'
      ].join('\n');
    case 'teacher':
      return role === 'admin'
        ? [
            'To view/manage teachers:',
            '• Open **Teachers** from the sidebar.',
            '• You can add/update teacher records and contact details there.'
          ].join('\n')
        : [
            'Teacher details are managed by the administrator.',
            'If you need a teacher’s contact/department info, please contact the admin or ask your teacher directly.'
          ].join('\n');
    case 'student':
      return role === 'student'
        ? [
            'Students can’t access the full Students directory in this app.',
            'If you need to update your profile details, contact your teacher/admin.'
          ].join('\n')
        : [
            'To view students:',
            '• Open **Students** from the sidebar.',
            '• Use search and filters to find a student quickly.'
          ].join('\n');
    case 'class':
      return [
        'Classes in this system are used to group students for attendance, exams, and assignments.',
        '• You’ll see class information on relevant pages (Assignments/Exams) and in Dashboard statistics.',
        '',
        role === 'admin'
          ? 'Admins can manage classes (via the backend/classes module).'
          : 'If you need changes to class allocation, contact your admin.'
      ].join('\n');
    default:
      return DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)];
  }
};

const normalizeText = (text = '') =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');

const isAffirmative = (text) => {
  const t = normalizeText(text);
  return (
    t === 'yes' ||
    t === 'y' ||
    t === 'yeah' ||
    t === 'yep' ||
    t === 'sure' ||
    t === 'ok' ||
    t === 'okay' ||
    t === 'please' ||
    t === 'yes please'
  );
};

const isNegativeOrClosing = (text) => {
  const t = normalizeText(text);
  return (
    t === 'no' ||
    t === 'nope' ||
    t === 'nah' ||
    t === 'not now' ||
    t === 'no thanks' ||
    t === 'thanks' ||
    t === 'thank you' ||
    t === 'thats it' ||
    t === 'that is it' ||
    t === 'nothing' ||
    t === 'nothing else' ||
    t === 'all good' ||
    t === 'all set' ||
    t === 'bye' ||
    t === 'goodbye'
  );
};

const lastAssistantAskedAnythingElse = (assistantText = '') => {
  const t = normalizeText(assistantText);
  return (
    t.includes('anything else i can help') ||
    t.includes('anything else i can assist') ||
    t.includes('is there anything else') ||
    t.includes('can i help you with anything else')
  );
};

// Get contextual default response
const getDefaultResponse = (message, role) => {
  const intent = detectIntent(message);
  return buildIntentFallbackResponse({ intent, role });
};

export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user._id;
    const userRole = req.user?.role || 'student';

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Get or create chat history
    let chat = await Chat.findOne({ user: userId });
    if (!chat) {
      chat = await Chat.create({ user: userId, messages: [] });
    }

    // If the assistant just asked "Anything else?" handle simple yes/no closings cleanly.
    // This prevents Dialogflow/KB from replying with unrelated content.
    const lastAssistantMessage = [...chat.messages].reverse().find(m => m.role === 'assistant')?.content || '';
    if (lastAssistantAskedAnythingElse(lastAssistantMessage)) {
      if (isNegativeOrClosing(message)) {
        const closing = CLOSING_RESPONSES[Math.floor(Math.random() * CLOSING_RESPONSES.length)];
        chat.messages.push({ role: 'user', content: message });
        chat.messages.push({ role: 'assistant', content: closing });
        if (chat.messages.length > 50) chat.messages = chat.messages.slice(-50);
        await chat.save();
        return res.json({
          message: closing,
          history: chat.messages,
          meta: { source: 'default', intent: 'closing', dialogflow: null, knowledgeBase: null }
        });
      }

      if (isAffirmative(message)) {
        const prompt = 'Sure — what would you like help with? (Attendance, Assignments, Exams, Upload Files)';
        chat.messages.push({ role: 'user', content: message });
        chat.messages.push({ role: 'assistant', content: prompt });
        if (chat.messages.length > 50) chat.messages = chat.messages.slice(-50);
        await chat.save();
        return res.json({
          message: prompt,
          history: chat.messages,
          meta: { source: 'default', intent: 'followup', dialogflow: null, knowledgeBase: null }
        });
      }
    }

    // Add user message to history
    chat.messages.push({
      role: 'user',
      content: message
    });

    let assistantMessage = null;
    let matchedEntry = null;
    let responseSource = 'default';
    let dialogflowMeta = null;

    // 1) Dialogflow handles ALL messages (if configured)
    if (isDialogflowConfigured()) {
      try {
        const sessionId = String(userId);
        const df = await detectDialogflowIntent({ text: message, sessionId });
        const confidenceThreshold = 0.45;
        const isFallback =
          df.isFallbackIntent ||
          df.intentName === 'Default Fallback Intent' ||
          (typeof df.intentDetectionConfidence === 'number' &&
            df.intentDetectionConfidence < confidenceThreshold);

        dialogflowMeta = {
          intentName: df.intentName,
          confidence: df.intentDetectionConfidence,
          isFallback
        };

        if (!isFallback && df.fulfillmentText && df.fulfillmentText.trim().length > 0) {
          assistantMessage = df.fulfillmentText.trim();
          responseSource = 'dialogflow';
        }
      } catch (dfError) {
        console.warn('Dialogflow error, falling back to Knowledge Base/default response:', dfError?.message || dfError);
      }
    }

    // 2) Optional fallback: Knowledge Base matching (only if Dialogflow had no response)
    if (!assistantMessage) {
      const knowledgeEntries = await KnowledgeBase.find({});

      if (knowledgeEntries.length > 0) {
        // Find best matches using advanced AI matching
        const matches = findBestMatches(message, knowledgeEntries, 1);

        // Dynamic threshold - lower for shorter queries (more flexible)
        const queryLength = message.split(/\s+/).length;
        const threshold = queryLength <= 3 ? 12 : 18; // More lenient for short queries

        if (matches.length > 0 && matches[0].score > threshold) {
          matchedEntry = matches[0].entry;
          const matchScore = matches[0].score;

          // Generate contextual response
          assistantMessage = generateContextualResponse(
            message,
            matchedEntry,
            chat.messages,
            matchScore
          );

          // Increment usage count
          matchedEntry.usageCount += 1;
          await matchedEntry.save();
          responseSource = 'knowledge_base';
        }
      }
    }

    // 3) Final fallback: contextual default response
    if (!assistantMessage) {
      assistantMessage = getDefaultResponse(message, userRole);
      responseSource = 'default';
    }

    // Add assistant response to history
    chat.messages.push({
      role: 'assistant',
      content: assistantMessage
    });

    // Save chat history (limit to last 50 messages)
    if (chat.messages.length > 50) {
      chat.messages = chat.messages.slice(-50);
    }
    await chat.save();

    res.json({
      message: assistantMessage,
      history: chat.messages,
      meta: {
        source: responseSource,
        intent: detectIntent(message),
        dialogflow: dialogflowMeta,
        knowledgeBase: matchedEntry
          ? { id: matchedEntry._id, category: matchedEntry.category }
          : null
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: error.message || 'Failed to get chat response' });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const chat = await Chat.findOne({ user: userId });

    if (!chat) {
      return res.json({ messages: [] });
    }

    res.json({ messages: chat.messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const clearChatHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const chat = await Chat.findOne({ user: userId });

    if (chat) {
      chat.messages = [];
      await chat.save();
    }

    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};