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

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Constants
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';
const API_KEY = process.env.GEMINI_API_KEY;

// Predefined prompt templates
const PROMPT_TEMPLATES = {
    "expert_coding_mentor": 
        "As a {coding_language} expert with 20+ years of experience, analyze my performance based on the time taken to solve my last question: {question} in {time}. " +
        "Time is the most crucial factor—if I take too long on an easy question, it indicates weakness in that topic, and I need more practice. " +
        "The second weightage factor is my starting skill level ({starting_difficulty}), which should help determine my next question. " +
        "Adjust difficulty naturally so I don’t notice the increase, reinforcing weak logic by mixing concepts without repeating topics. " +
        "Ensure my progress is smooth while covering all coding topics. Provide a structured response, and give me **one question at a time**. Do not give more than one question. \n\n" +
        
        "**Question Name:**\n" +
        "**Explanation:**\n" +
        "**Example Input & Output:**\n" +
        "**Difficulty Level:**\n" +
        "**Topic:**\n"+
        "**Recommendation:**\n"
};


// Validation middleware
const validatePromptRequest = (req, res, next) => {
    const { template, parameters } = req.body;
    
    if (!template || !PROMPT_TEMPLATES[template]) {
        return res.status(400).json({
            success: false,
            error: 'Invalid template. Available templates: ' + Object.keys(PROMPT_TEMPLATES).join(', ')
        });
    }

    if (!parameters || typeof parameters !== 'object') {
        return res.status(400).json({
            success: false,
            error: 'Parameters must be provided as an object'
        });
    }

    next();
};

// Function to replace parameters in template
const buildPrompt = (template, parameters) => {
    let prompt = PROMPT_TEMPLATES[template];
    
    // Replace all parameters in the template
    Object.entries(parameters).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        prompt = prompt.replace(placeholder, value);
    });

    // Check for any remaining unreplaced parameters
    if (prompt.includes('{{')) {
        throw new Error('Missing required parameters');
    }

    return prompt;
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Enhanced API endpoint with templates
app.post('/api/ask-gemini', validatePromptRequest, async (req, res) => {
    try {
        const { template, parameters } = req.body;

        // Check if API key is configured
        if (!API_KEY) {
            throw new Error('Gemini API key is not configured');
        }

        // Build the prompt from template and parameters
        const prompt = buildPrompt(template, parameters);

        // API request payload for Gemini
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        };

        // Make request to Gemini API
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${API_KEY}`,
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        // Extract and format the response
        const result = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!result) {
            throw new Error('Invalid response from Gemini API');
        }

        res.json({
            success: true,
            data: {
                template,
                parameters,
                response: result,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error processing request:', error);

        let statusCode = 500;
        let errorMessage = 'Internal server error';

        if (error.message === 'Missing required parameters') {
            statusCode = 400;
            errorMessage = error.message;
        } else if (error.response) {
            statusCode = error.response.status;
            errorMessage = error.response.data.error || 'Error from Gemini API';
        } else if (error.code === 'ECONNABORTED') {
            statusCode = 504;
            errorMessage = 'Request timeout';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Handle 404 routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
