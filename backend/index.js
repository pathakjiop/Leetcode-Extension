require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
}));

// Constants
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';
const API_KEY = process.env.GEMINI_API_KEY;
const LEETCODE_BASE_URL = 'https://leetcode.com/problems/';

// Common LeetCode problems database (example - expand as needed)
const LEETCODE_PROBLEMS = {
    'arrays': {
        'easy': [
            { id: 1, title: 'Two Sum', slug: 'two-sum' },
            { id: 26, title: 'Remove Duplicates from Sorted Array', slug: 'remove-duplicates-from-sorted-array' }
        ],
        'medium': [
            { id: 15, title: '3Sum', slug: '3sum' },
            { id: 33, title: 'Search in Rotated Sorted Array', slug: 'search-in-rotated-sorted-array' }
        ],
        'hard': [
            { id: 41, title: 'First Missing Positive', slug: 'first-missing-positive' },
            { id: 4, title: 'Median of Two Sorted Arrays', slug: 'median-of-two-sorted-arrays' }
        ]
    }
    // Add more topics and problems as needed
};

// Simplified prompt template with specific problem request
const PROMPT_TEMPLATE = 
    "Based on: Problem '{last_problem}' ({difficulty}), Time: {time_taken}min, Topic: {topic}. " +
    "If time > expected: Focus on similar problems. If time < expected: Increase difficulty. " +
    "Generate ONE next problem suggestion in this exact format (include the problem ID if known): " +
    "Problem ID: [number]\n" +
    "Problem Title: [exact leetcode title]\n" +
    "Topic: [topic]\n" +
    "Difficulty: [easy/medium/hard]\n" +
    "Focus Area: [what to improve]\n" +
    "URL Slug: [leetcode-problem-slug]\n";

// Performance benchmarks for time evaluation
const TIME_BENCHMARKS = {
    'easy': 15,    // minutes
    'medium': 30,
    'hard': 45
};

// Track user performance by topic
const userPerformance = new Map();

// Helper to evaluate performance and adjust difficulty
const evaluatePerformance = (problem) => {
    const { topic, difficulty, time_taken } = problem;
    const expectedTime = TIME_BENCHMARKS[difficulty.toLowerCase()];
    const performanceRatio = time_taken / expectedTime;
    
    if (!userPerformance.has(topic)) {
        userPerformance.set(topic, []);
    }
    userPerformance.get(topic).push(performanceRatio);
    
    return performanceRatio;
};

// Helper to parse Gemini response and extract problem details
const parseProblemResponse = (response) => {
    const lines = response.split('\n');
    const problemDetails = {};
    
    lines.forEach(line => {
        if (line.includes(':')) {
            const [key, value] = line.split(':').map(s => s.trim());
            problemDetails[key.toLowerCase().replace(/\s+/g, '_')] = value;
        }
    });

    return {
        id: problemDetails.problem_id,
        title: problemDetails.problem_title,
        topic: problemDetails.topic,
        difficulty: problemDetails.difficulty,
        focus_area: problemDetails.focus_area,
        url_slug: problemDetails.url_slug
    };
};

// Validate request middleware
const validateRequest = (req, res, next) => {
    const { last_problem, difficulty, time_taken, topic } = req.body;
    if (!last_problem || !difficulty || !time_taken || !topic) {
        return res.status(400).json({
            success: false,
            error: 'Missing required parameters'
        });
    }
    next();
};

// Main endpoint for problem suggestions
app.post('/api/next-problem', validateRequest, async (req, res) => {
    try {
        const { last_problem, difficulty, time_taken, topic } = req.body;
        
        const performanceRatio = evaluatePerformance({
            topic,
            difficulty,
            time_taken: parseInt(time_taken)
        });

        let prompt = PROMPT_TEMPLATE
            .replace('{last_problem}', last_problem)
            .replace('{difficulty}', difficulty)
            .replace('{time_taken}', time_taken)
            .replace('{topic}', topic);

        if (performanceRatio > 1.5) {
            prompt += "User needs practice in this topic. Suggest similar difficulty level.";
        } else if (performanceRatio < 0.7) {
            prompt += "User is proficient. Increase difficulty or introduce new concepts.";
        }

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${API_KEY}`,
            {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            }
        );

        const suggestion = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!suggestion) {
            throw new Error('Invalid response from Gemini API');
        }

        // Parse the problem details from the response
        const problemDetails = parseProblemResponse(suggestion);
        
        // Construct the full LeetCode URL
        const problemUrl = `${LEETCODE_BASE_URL}${problemDetails.url_slug}`;

        res.json({
            success: true,
            problem: {
                ...problemDetails,
                url: problemUrl
            },
            performance: {
                topic,
                ratio: performanceRatio.toFixed(2),
                message: performanceRatio > 1.5 ? 
                    "Additional practice recommended in this topic" : 
                    performanceRatio < 0.7 ? 
                    "Ready for more challenging problems" : 
                    "Progressing well at current difficulty"
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

// Health check endpoint
app.get('/health', (_, res) => {
    res.status(200).json({ status: 'healthy' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});