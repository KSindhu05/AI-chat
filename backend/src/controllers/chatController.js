/**
 * Chat Controller
 * Trigger restart
 * Chat Controller
 * 
 * Handles CRUD for chats, message sending with OpenAI streaming,
 * auto-title generation, and context management.
 */

const OpenAI = require('openai');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const { search, SafeSearchType } = require('duck-duck-scrape');
const pdfParse = require('pdf-parse');

// Initialize Groq client using OpenAI SDK compatibility
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

/**
 * POST /api/upload-pdf — Parse uploaded PDF and return text
 */
exports.uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const data = await pdfParse(req.file.buffer);
    const text = data.text.trim();
    
    res.status(200).json({ 
      success: true, 
      text,
      pages: data.numpages 
    });
  } catch (err) {
    console.error('Error parsing PDF:', err);
    res.status(500).json({ error: 'Failed to parse PDF file.' });
  }
};

// System prompts for different chat modes
const SYSTEM_PROMPTS = {
  general: `You are an advanced, highly capable AI assistant — similar to ChatGPT. Follow these rules strictly:

1. **Be contextual**: If the user sends a simple greeting (like "hi" or "hello") or a very short casual message, respond naturally and briefly. DO NOT use headers or long essays for simple greetings.
2. **Be comprehensive (for questions)**: When answering actual questions, give thorough, well-structured answers. Cover multiple angles when relevant.
3. **Use rich markdown**: For detailed answers, use headers (##), bold, bullet points, numbered lists, tables, and code blocks to make answers scannable and beautiful.
4. **Be practical**: Give real, runnable examples — not abstract theory. Use real-world scenarios.
5. **Multiple approaches**: When answering coding or technical questions, show 2-3 different methods/approaches when possible.
6. **Code must be complete**: Always write full, copy-pasteable code with proper imports, comments, and example usage.
7. **Explain your reasoning**: After code or answers, briefly explain why the approach works.
8. **Be conversational but professional**: Friendly tone, but never sacrifice accuracy.
9. **Image Generation Capability**: You have the ability to generate images! If the user asks you to "generate an image", "draw", or "create a picture", you MUST reply with EXACTLY this markdown format and nothing else:
![Generated Image](https://image.pollinations.ai/prompt/{URL_ENCODED_DETAILED_PROMPT}?width=1024&height=1024&nologo=true)
Replace {URL_ENCODED_DETAILED_PROMPT} with a very detailed, URL-encoded description of the image. DO NOT include any other text in your response, just the markdown image link.`,

  coding: `You are an elite senior software engineer AI assistant. Follow these rules strictly:

1. **Multiple solutions**: Always provide at least 2 different approaches when answering coding questions (e.g., "Approach 1: Using built-in functions", "Approach 2: Using manual logic").
2. **Complete, runnable code**: Every code example must be fully complete and immediately runnable. Include imports, example usage with print statements, and expected output.
3. **Practical code**: Write code that uses user input (like input() in Python) when appropriate, making it interactive and real-world ready.
4. **Rich formatting**: Use ## headers for each approach, use \`inline code\` for function names, add horizontal rules (---) between sections.
5. **Explain clearly**: After each code block, add a brief "How it works" explanation.
6. **Best practices**: Include error handling, edge cases, and mention time/space complexity when relevant.
7. **Always specify language** in code blocks (\`\`\`python, \`\`\`javascript, etc.).
8. **Output preview**: Show expected output as a separate code block when possible.`,

  summarizer: `You are an expert text analysis and summarization assistant. Follow these rules:

1. **Structured summaries**: Use headers, bullet points, and numbered lists.
2. **Key takeaways**: Always start with a "Key Takeaways" or "TL;DR" section.
3. **Detailed breakdown**: Follow with a more detailed section-by-section breakdown.
4. **Preserve important details**: Don't oversimplify — capture nuances.
5. **Use tables** when comparing multiple items or concepts.
6. **Be objective**: Summarize what was said, not your opinion.`,

  eli5: `You are an expert at explaining complex topics in the simplest possible way. Follow these rules:

1. **Use analogies**: Compare complex concepts to everyday things (e.g., "Think of RAM like a desk — the bigger the desk, the more papers you can spread out").
2. **Simple language**: Use short sentences, common words, and avoid all jargon.
3. **Visual examples**: Use emojis, bullet points, and numbered steps to make explanations visual.
4. **Build up gradually**: Start with the simplest explanation, then add layers of detail.
5. **Fun tone**: Be enthusiastic and encouraging, like a favorite teacher.
6. **Real-world examples**: Always connect concepts to things people encounter daily.`,

  study: `You are an expert academic tutor and study coach. Follow these rules strictly:

1. **Teach, don't just answer**: Explain the "why" behind every concept, not just the "what."
2. **Structured lessons**: Use ## headers to break topics into clear sections. Start with basics, then advance.
3. **Use examples and practice problems**: After explaining a concept, provide 2-3 practice questions with solutions.
4. **Memory aids**: Include mnemonics, acronyms, or memory tricks when possible (e.g., "ROY G. BIV for rainbow colors").
5. **Visual learning**: Use tables, bullet points, numbered steps, and diagrams described in text.
6. **Flashcard-style summaries**: End each response with a "Quick Review" section of key points in Q&A format.
7. **Exam tips**: When relevant, mention common exam questions or tricky areas students often get wrong.
8. **Encouraging tone**: Be supportive and motivating like a great tutor.`,

  writer: `You are a professional content writer and creative writing assistant. Follow these rules strictly:

1. **Adapt your style**: Match the tone and style to what the user needs — professional for emails, casual for social media, academic for essays, creative for stories.
2. **Rich, engaging prose**: Use vivid language, strong verbs, varied sentence structure. Avoid generic filler words.
3. **Structure content well**: Use headers, subheaders, bullet points, and proper paragraph breaks for readability.
4. **Multiple versions**: When asked to write something, offer 2 variations (e.g., "Formal Version" and "Casual Version") when appropriate.
5. **SEO-aware**: For blog posts and web content, naturally incorporate relevant keywords and write compelling titles.
6. **Grammar-perfect**: Ensure flawless grammar, punctuation, and spelling.
7. **Call-to-action**: For marketing/business content, always include a clear call-to-action.
8. **Word count awareness**: Try to match the expected length for the content type (tweets = short, blog posts = 500+ words, emails = concise).`,
};

/**
 * POST /api/chat — Create a new chat
 */
exports.createChat = async (req, res) => {
  try {
    const { mode = 'general', modelId = 'llama-3.1-8b-instant', customPrompt = '' } = req.body;

    const chat = new Chat({
      userId: req.user.id,
      mode,
      modelId,
      customPrompt,
      title: 'New Chat',
    });
    await chat.save();

    res.status(201).json(chat);
  } catch (err) {
    console.error('Create chat error:', err);
    res.status(500).json({ error: 'Failed to create chat.' });
  }
};

/**
 * GET /api/chats — List all chats for the user
 */
exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .lean();

    res.json(chats);
  } catch (err) {
    console.error('Get chats error:', err);
    res.status(500).json({ error: 'Failed to fetch chats.' });
  }
};

/**
 * GET /api/chat/:id — Get a single chat with its messages
 */
exports.getChatById = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    const messages = await Message.find({ chatId: chat._id })
      .sort({ timestamp: 1 })
      .lean();

    res.json({ chat, messages });
  } catch (err) {
    console.error('Get chat error:', err);
    res.status(500).json({ error: 'Failed to fetch chat.' });
  }
};

/**
 * DELETE /api/chat/:id — Delete a chat and its messages
 */
exports.deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    // Cascade delete messages
    await Message.deleteMany({ chatId: req.params.id });

    res.json({ message: 'Chat deleted successfully.' });
  } catch (err) {
    console.error('Delete chat error:', err);
    res.status(500).json({ error: 'Failed to delete chat.' });
  }
};

/**
 * PATCH /api/chat/:id — Rename a chat
 */
exports.renameChat = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title, updatedAt: new Date() },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    res.json(chat);
  } catch (err) {
    console.error('Rename chat error:', err);
    res.status(500).json({ error: 'Failed to rename chat.' });
  }
};

/**
 * POST /api/chat/:id/message — Send a message and get AI response via SSE streaming
 * 
 * This is the core endpoint. It:
 * 1. Saves the user's message
 * 2. Builds context from recent messages (last 20)
 * 3. Streams AI response token-by-token via SSE
 * 4. Saves the complete AI response
 * 5. Auto-generates chat title on first message exchange
 */
exports.sendMessage = async (req, res) => {
  try {
    const { content, image, webSearch } = req.body;
    const chatId = req.params.id;

    if (!content && !image) {
      return res.status(400).json({ error: 'Message content or image is required.' });
    }

    // Verify chat belongs to user
    const chat = await Chat.findOne({ _id: chatId, userId: req.user.id });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    // Save user message
    const userMessage = new Message({
      chatId,
      role: 'user',
      content: content || 'Image attached',
      image,
    });
    await userMessage.save();

    // Build context — last 20 messages
    const recentMessages = await Message.find({ chatId })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    // Reverse to get chronological order
    recentMessages.reverse();

    // Build Groq messages array (history)
    let systemPrompt = chat.customPrompt && chat.customPrompt.trim() !== '' 
      ? chat.customPrompt 
      : (SYSTEM_PROMPTS[chat.mode] || SYSTEM_PROMPTS.general);

    // Load user memories for cross-chat context
    const user = await User.findById(req.user.id);
    if (user && user.memories && user.memories.length > 0) {
      systemPrompt += `\n\nIMPORTANT — Things you remember about this user from previous conversations:\n${user.memories.map(m => `- ${m}`).join('\n')}\nUse this knowledge naturally. Do not tell the user you have a "memory system" — just reference it as if you always knew.`;
    }

    if (webSearch && content) {
      try {
        const searchResults = await search(content, { safeSearch: SafeSearchType.MODERATE });
        const topResults = searchResults.results.slice(0, 3).map(r => `${r.title}: ${r.description}`).join('\n\n');
        systemPrompt += `\n\nRecent Web Search Results regarding the user's query:\n${topResults}\n\nPlease use this context to inform your answer.`;
      } catch (err) {
        console.error('Web search error:', err);
      }
    }
    
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.map((msg) => {
        if (msg.image && msg.role === 'user') {
          return {
            role: msg.role,
            content: [
              { type: 'text', text: msg.content },
              { type: 'image_url', image_url: { url: msg.image } }
            ]
          };
        }
        return {
          role: msg.role,
          content: msg.content,
        };
      }),
    ];

    // Determine model
    let targetModel = chat.modelId || 'llama-3.1-8b-instant';
    if (image || recentMessages.some(m => m.image)) {
      targetModel = 'meta-llama/llama-4-scout-17b-16e-instruct'; // Use new Meta Llama 4 Vision model
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let fullResponse = '';

    try {
      // Stream response from Groq
      const stream = await openai.chat.completions.create({
        model: targetModel,
        messages: groqMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ token: delta })}\n\n`);
          // Add a small delay to simulate natural typing speed and make it readable
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
      }
    } catch (aiError) {
      console.error('API error:', aiError.message);
      fullResponse = 'I apologize, but I had an error connecting to Groq AI. Please check your GROQ_API_KEY.';
      res.write(`data: ${JSON.stringify({ token: fullResponse })}\n\n`);
    }

    // Save assistant message
    const assistantMessage = new Message({
      chatId,
      role: 'assistant',
      content: fullResponse,
    });
    await assistantMessage.save();

    // Update chat timestamp
    chat.updatedAt = new Date();
    await chat.save();

    // Auto-generate title on first message exchange
    const messageCount = await Message.countDocuments({ chatId });
    if (messageCount <= 2 && chat.title === 'New Chat') {
      generateChatTitle(chat, content, fullResponse).catch(console.error);
    }

    // Extract and save new memories from this conversation
    extractMemories(req.user.id, content, fullResponse).catch(console.error);

    // Send done signal and suggested follow-ups
    const suggestions = await generateSuggestions(chat.mode, content, fullResponse);
    res.write(`data: ${JSON.stringify({ done: true, messageId: assistantMessage._id, suggestions })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Send message error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process message.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted.' })}\n\n`);
      res.end();
    }
  }
};

/**
 * Auto-generate a descriptive chat title from the first exchange using AI.
 * Uses both the user message and the AI response for better context.
 */
async function generateChatTitle(chat, firstMessage, aiResponse) {
  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `Generate a short, descriptive title (3-6 words) for a conversation. The title should clearly describe the topic being discussed.

Rules:
- Return ONLY the title text, nothing else
- No quotes around the title
- No period or punctuation at the end
- Capitalize like a headline (e.g., "JavaScript Closures Explanation")
- Be specific, not generic (e.g., "Python Smallest Number Code" not "Coding Help")
- If the user asked a question, the title should reflect the topic, not the question format`,
        },
        { 
          role: 'user', 
          content: `User asked: "${firstMessage}"${aiResponse ? `\nAI discussed: "${aiResponse.substring(0, 200)}"` : ''}` 
        },
      ],
      max_tokens: 25,
      temperature: 0.5,
    });

    let title = response.choices[0]?.message?.content?.trim();
    if (title) {
      // Clean up — remove quotes, trailing punctuation
      title = title.replace(/^["']|["']$/g, '').replace(/[.!?]$/, '').trim();
      if (title.length > 0 && title.length <= 60) {
        chat.title = title;
        await chat.save();
      }
    }
  } catch (err) {
    console.error('Title generation failed:', err.message);
  }
}

/**
 * Generate contextual follow-up prompt suggestions based on mode and assistant response
 */
async function generateSuggestions(mode, lastMessage, fullResponse) {
  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are an AI that generates exactly 3 short, relevant follow-up questions a user could ask based on the provided assistant response. Return ONLY a JSON object with a single key "suggestions" containing an array of 3 strings. Example: {"suggestions": ["How does that work?", "Tell me more about X", "What are the benefits?"]}',
        },
        { role: 'user', content: `User Message: ${lastMessage}\nAssistant Response: ${fullResponse}\n\nGenerate 3 short follow-up questions.` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 150,
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (text) {
      const parsed = JSON.parse(text);
      if (parsed.suggestions && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
        return parsed.suggestions.slice(0, 3);
      }
    }
  } catch (err) {
    console.error('Suggestion generation failed:', err.message);
  }

  const staticSuggestions = {
    general: [
      'Tell me more about this',
      'Can you give an example?',
      'What are the pros and cons?',
    ],
    coding: [
      'Can you optimize this code?',
      'Add error handling',
      'Write unit tests for this',
    ],
    summarizer: [
      'Make it shorter',
      'List the key takeaways',
      'Explain the main argument',
    ],
    eli5: [
      'Can you use an analogy?',
      'Why does that matter?',
      'Give me a real-world example',
    ],
    study: [
      'Quiz me on this topic',
      'Explain it differently',
      'Give me practice problems',
    ],
    writer: [
      'Make it more formal',
      'Write a shorter version',
      'Add a call-to-action',
    ],
  };

  return staticSuggestions[mode] || staticSuggestions.general;
}

/**
 * Extract important facts from a conversation exchange and save to user memory.
 * This runs in the background (fire-and-forget) so it doesn't slow down the response.
 */
async function extractMemories(userId, userMessage, assistantResponse) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const existingMemories = user.memories || [];

    const response = await openai.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are a memory extraction system. Analyze the user's message and extract any important personal facts worth remembering for future conversations. 

Examples of things to remember:
- User's name, age, location, job, school
- Their preferences, hobbies, interests
- Important projects they're working on
- Technical skills or tools they use

Rules:
- Return ONLY a JSON object with key "facts" containing an array of short fact strings
- Each fact should be a single, clear sentence (e.g. "User's name is Sinviji")
- If no new facts are found, return {"facts": []}
- Do NOT repeat facts that are already known
- Maximum 3 new facts per message
- IMPORTANT: You must output ONLY valid JSON. No conversational text.

Already known facts:
${existingMemories.map(m => `- ${m}`).join('\n') || 'None yet'}`,
        },
        {
          role: 'user',
          content: `User said: "${userMessage}"\nAssistant replied: "${assistantResponse.substring(0, 500)}"`,
        },
      ],
      temperature: 0.3,
    });

    let text = response.choices[0]?.message?.content?.trim();
    if (text) {
      // Strip markdown code block if present
      if (text.startsWith('```json')) {
        text = text.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (text.startsWith('```')) {
        text = text.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(text);
      if (parsed.facts && Array.isArray(parsed.facts) && parsed.facts.length > 0) {
        // Deduplicate — don't add facts that are very similar to existing ones
        const newFacts = parsed.facts.filter(fact => {
          const factLower = fact.toLowerCase();
          return !existingMemories.some(existing => 
            existing.toLowerCase().includes(factLower) || factLower.includes(existing.toLowerCase())
          );
        });

        if (newFacts.length > 0) {
          // Keep total memories under 20 to avoid bloating the system prompt
          const updatedMemories = [...existingMemories, ...newFacts].slice(-20);
          user.memories = updatedMemories;
          await user.save();
          console.log(`💾 Saved ${newFacts.length} new memory/memories for user ${userId}:`, newFacts);
        }
      }
    }
  } catch (err) {
    console.error('Memory extraction failed:', err.message);
  }
}
