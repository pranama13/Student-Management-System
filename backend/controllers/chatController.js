import Chat from '../models/Chat.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import { findBestMatches, generateContextualResponse, detectIntent } from '../utils/chatAI.js';

// Default responses when no match is found
const DEFAULT_RESPONSES = [
  "I'm sorry, I don't have information about that yet. Please contact the administrator for assistance.",
  "I'm still learning about that topic. Could you please provide more details or contact support?",
  "I don't have an answer for that question. Would you like to speak with an administrator?",
  "That's a great question! However, I don't have that information in my knowledge base yet. Please reach out to your teacher or administrator.",
  "I apologize, but I couldn't find relevant information about that. Could you try rephrasing your question or contact support?"
];

// Greeting responses
const GREETING_RESPONSES = [
  "Hello! I'm here to help you with questions about the Student Management System. How can I assist you today?",
  "Hi there! I'm your AI assistant. Feel free to ask me anything about students, teachers, attendance, or other system features.",
  "Greetings! I'm ready to help. What would you like to know about the Student Management System?"
];

// Help responses
const HELP_RESPONSES = [
  "I can help you with information about attendance, exams, subjects, study materials, students, teachers, classes, and file uploads. What specific topic would you like to know about?",
  "I'm here to assist! You can ask me about checking attendance, viewing student information, exam schedules and results, subject details, assignment submissions, or how to upload files. What do you need help with?",
  "I can answer questions about the Student Management System. Try asking about:\n• Attendance records\n• Exam schedules and results\n• Subject information (Mathematics, Science, English, etc.)\n• Assignment submissions\n• Student and teacher information\n• Class schedules\n\nWhat would you like to know?"
];

// Get contextual default response
const getDefaultResponse = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Handle greetings
  if (lowerMessage.match(/\b(hi|hello|hey|greetings|good morning|good afternoon)\b/)) {
    return GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)];
  }
  
  // Handle help requests
  if (lowerMessage.includes('help') || lowerMessage.includes('what can you')) {
    return HELP_RESPONSES[Math.floor(Math.random() * HELP_RESPONSES.length)];
  }
  
  return DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)];
};

export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user._id;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Get or create chat history
    let chat = await Chat.findOne({ user: userId });
    if (!chat) {
      chat = await Chat.create({ user: userId, messages: [] });
    }

    // Add user message to history
    chat.messages.push({
      role: 'user',
      content: message
    });

    // Get all knowledge base entries
    const knowledgeEntries = await KnowledgeBase.find({});
    
    let assistantMessage = null;
    let matchedEntry = null;

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
      }
    }

    // If no good match found, use contextual default response
    if (!assistantMessage) {
      assistantMessage = getDefaultResponse(message);
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
      history: chat.messages
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