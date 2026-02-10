const { Groq } = require('groq-sdk');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config()


const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function parseAndRepairJson(raw) {
  // 1. Try direct parse
  try { return JSON.parse(raw); } catch (_) {}

  let fixed = raw;

  // 2. Remove single-line comments (// ...)
  fixed = fixed.replace(/\/\/[^\n]*/g, '');

  // 3. Remove multi-line comments (/* ... */)
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');

  // 4. Remove trailing commas before } or ]
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');

  // 5. Replace single-quoted strings with double-quoted
  fixed = fixed.replace(/'([^']*?)'/g, '"$1"');

  // 6. Try parsing after fixes
  try { return JSON.parse(fixed); } catch (_) {}

  // 7. Try to fix truncated JSON by closing open brackets/braces
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;
  for (const ch of fixed) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    else if (ch === '}') openBraces--;
    else if (ch === '[') openBrackets++;
    else if (ch === ']') openBrackets--;
  }

  // Close unclosed strings/brackets/braces
  if (inString) fixed += '"';
  // Remove any trailing comma before closing
  fixed = fixed.replace(/,\s*$/, '');
  for (let i = 0; i < openBrackets; i++) fixed += ']';
  for (let i = 0; i < openBraces; i++) fixed += '}';
  // Clean trailing commas again after closing
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');

  try { return JSON.parse(fixed); } catch (e) {
    console.error('Failed to repair JSON:', e.message);
    console.error('Problematic JSON string:', raw.substring(0, 500));
    return null;
  }
}

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
      max_completion_tokens: 8192,
      top_p: 1,
      stream: false,
      stop: null
    });

    let raw = chatCompletion.choices[0].message.content;

    raw = raw.replace(/```json|```/g, '').trim();

    // Extract only the JSON portion (first [ or { to last ] or })
    const jsonStart = raw.search(/[\[{]/);
    if (jsonStart > 0) {
      raw = raw.slice(jsonStart);
    }
    const lastBracket = Math.max(raw.lastIndexOf(']'), raw.lastIndexOf('}'));
    if (lastBracket !== -1 && lastBracket < raw.length - 1) {
      raw = raw.slice(0, lastBracket + 1);
    }

    const parsedData = parseAndRepairJson(raw);

    if (!parsedData) {
      console.error('Failed to parse JSON from Groq response');
      return { name: "Error parsing response", children: [] };
    }

    // Validate structure — handle both array and object responses
    if (Array.isArray(parsedData)) {
      if (parsedData.length === 1) return parsedData[0];
      return { name: "Root", children: parsedData };
    }

    if (parsedData.name && Array.isArray(parsedData.children)) {
      return parsedData;
    }

    console.error('Invalid tree structure:', parsedData);
    return { name: "Invalid tree structure", children: [] };
  } catch (error) {
    console.error('Error processing image with Groq:', error);
    throw error;
  }
}

module.exports = { processImageWithGroq };