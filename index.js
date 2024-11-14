const express = require('express');
const axios = require('axios');

const app = express();
const port = 3000;

// Hugging Face model API details for stable-diffusion-v1-4
const HF_API_URL = 'https://api-inference.huggingface.co/models/CompVis/stable-diffusion-v1-4';
const HF_API_KEY = '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'; // Replace with your actual Hugging Face API key

// Helper function to make API request with retry logic for stable diffusion model
async function fetchImageWithRetry(prompt, retries = 5, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.post(
                HF_API_URL,
                { inputs: prompt },
                {
                    headers: {
                        Authorization: `Bearer ${HF_API_KEY}`,
                    },
                    responseType: 'arraybuffer'
                }
            );
            return response.data; // Return image data if successful
        } catch (error) {
            if (error.response?.status === 429) {
                console.log(`Rate limit exceeded (429). Waiting ${delay * 2}ms before retrying...`);
                await new Promise((resolve) => setTimeout(resolve, delay * 2));
            } else if (error.response?.status === 503 || error.response?.data?.error?.includes("is currently loading")) {
                console.log(`Service is temporarily unavailable or loading. Retrying in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
    throw new Error("Service unavailable or rate limit exceeded after multiple retry attempts.");
}

// Endpoint to handle prompt and return generated image
app.get('/generate', async (req, res) => {
    const prompt = req.query.prompt;

    if (!prompt) {
        return res.status(400).json({ error: "Prompt query parameter is required" });
    }

    try {
        const imageData = await fetchImageWithRetry(prompt);
        
        res.set('Content-Type', 'image/jpeg');
        res.send(imageData);
    } catch (error) {
        console.error("Error fetching data from Hugging Face API:", error.message);
        res.status(503).json({
            error: "The service is temporarily unavailable. Please try again later.",
            details: error.message
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
