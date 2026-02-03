const { Groq } = require('groq-sdk');
const fs = require('fs');
const dotenv = require('dotenv');
const { validateTreeData } = require('./validateTreeData');
dotenv.config()


const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function processImageWithGroq(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Generate React-D3-Tree compatible JSON from this org chart image and clearly see the nodes and edges and truly give data
                      Requirements:
                      - Each node must have:
                        - "name"
                        - "attributes": { key-value pairs shown in the chart (title, location, etc.) }
                        - "children": array of subordinates
                      - If multiple roots: wrap in { "name": "Start", "children": [...] }
                      - Ensure output is valid JSON (all braces & brackets closed)

                      Example format:
                      [
                        {
                          "name": "Start",
                          "children": [
                            {
                              "name": "John Doe",
                              "attributes": {
                                "title": "CEO",
                                "location": "NY"
                              },
                              "children": [] 
                              ans soon
                            }
                          ]
                        }
                      ]


                      IMPORTANT: Return JSON only. No extra text or comments.`
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.7,
      max_completion_tokens: 4024,
      top_p: 1,
      stream: false,
      stop: null
    });

    let raw = chatCompletion.choices[0].message.content;

    raw = raw.replace(/```json|```/g, '').trim();

    try {
      // Try to parse the response
      const parsedData = JSON.parse(raw);

      // Validate the structure
      if (!parsedData.name || !Array.isArray(parsedData.children)) {
        console.error('Invalid tree structure:', parsedData);
        return {
          name: "Invalid tree structure",
          children: []
        };
      }

      return parsedData;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Problematic JSON string:', raw);

      try {
        // Replace single quotes with double quotes
        const fixedJson = raw.replace(/'/g, '"');
        const parsedData = JSON.parse(fixedJson);

        if (!parsedData.name || !Array.isArray(parsedData.children)) {
          throw new Error('Invalid structure after fixing');
        }

        validateTreeData(parsedData);

        return parsedData;
      } catch (fixError) {
        console.error('Failed to fix JSON:', fixError);
        return {
          name: "Error parsing response",
          children: []
        };
      }
    }
  } catch (error) {
    console.error('Error processing image with Groq:', error);
    throw error;
  }
}

module.exports = { processImageWithGroq };