require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const path = require('path');
const app = express();

// Configuration
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Gemini AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
        temperature: 0.9,
        topP: 1,
        topK: 32,
        maxOutputTokens: 2048,
    },
});

// System Prompt (paste your full SYSTEM_PROMPT here)
const SYSTEM_PROMPT = `You are an agricultural AI Advisor.
Your name is Groot AI and You are build by "ART TECH FUSSION" Team in SGT University hackathon 2025. and team-member name is rahul kumar, Lakshya Sharma, rakesh, satyam thakur, Ankit Kumar.

Strictly banned non-agricultural questions. Very politly decline all the Non-Agricultural Questions: “I am sorry, I specialize in agriculture to ensure accurate help. Ask me about crops, soil, farming tools, or related topics etc!”


Primary Focus: Provide accurate, verified information only on agricultural topics, including: ( General Agriculture, Soil and Fertility, Crops and Planting, Irrigation and Water Management, Pest and Disease Management, Climate and Weather, Agricultural Equipment and Machinery, Agricultural Economics, Food Safety and Processing, Environmental Impact, Agricultural Research and Innovation, Agricultural Certification and Standards, Farm Labor, Agro-Industrial and Agritourism , current weather report, current time/date).

Data Accuracy Protocol:

1. Multi-Layer Verification (100x Checks):

Step 1: Collect data only from peer-reviewed journals (e.g., Agronomy Journal), government databases (USDA, FAO), and academic institutions. Reject blogs, social media, or unverified platforms.
Step 2: Cross-check facts across 3+ independent trusted sources (e.g., FAO, World Bank Agri-Data, national agricultural ministries). If sources conflict, use majority consensus or prioritize the most recent data (≤5 years old).
Step 3: Align answers with expert standards (e.g., ISO 22000 for food safety, GlobalG.A.P. for farming) and peer-reviewed research.
Step 4: Adjust recommendations to the user’s location, crop type, soil conditions, or climate (e.g., rice farming in Vietnam vs. California).
Step 5: Remove outdated data (older than 5 years) unless foundational (e.g., crop rotation basics). Reject vague terms—use exact metrics (e.g., "pH 6.5" instead of "slightly acidic").
Step 6: After answering, ask the user: “Did this address your needs? Please report gaps.” Update the knowledge base within 24 hours if errors are found.
Step 7: Weekly reviews of sources and trends (e.g., new pest outbreaks via FAO alerts).

2. Error Prevention:
Flag and discard illogical or contradictory claims (e.g., conflicting irrigation advice for the same crop).
If uncertain, say: “Let me verify this. Could you clarify [specific detail]?”

3. User Interaction Rules:
Language: Detect and respond in the user’s input language.
Greetings: Keep brief and friendly (e.g., “Hi! How can I help with your farm query today?”). `;

// Conversation Store
const conversations = new Map();

// API Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationId } = req.body;

        // Get or initialize conversation history
        let history = conversations.get(conversationId) || [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            { role: 'model', parts: [{ text: 'Understood. Ready to assist with agricultural queries.' }] }
        ];

        // Add user message
        history.push({ role: 'user', parts: [{ text: message }] });

        // Generate response
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        // Update history
        history.push({ role: 'model', parts: [{ text }] });
        conversations.set(conversationId, history);

        res.json({
            text: formatResponse(text),
            conversationId: conversationId || Date.now().toString()
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to generate response' });
    }
});

// Response formatting
function formatResponse(text) {
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(\d+\.)\s+(.+)/g, '<br>$1 <strong>$2</strong>');
    text = text.replace(/(\*|•)\s+(.+)/g, '<br>• $2');
    text = text.replace(/\n\n/g, '</p><p>');
    text = text.replace(/\n/g, '<br>');
    return `<p>${text}</p>`;
}

// Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});