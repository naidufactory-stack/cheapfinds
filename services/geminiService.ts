import { GoogleGenAI, Content } from "@google/genai";
import { SearchResult, SearchMode, ChatMessage } from "../types";

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const searchProduct = async (
  imageFiles: File[], 
  description: string, 
  country: string,
  mode: SearchMode
): Promise<SearchResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use gemini-2.5-flash as it supports both multimodal input (images) and tools (search)
  const modelName = 'gemini-2.5-flash';

  const countryInstruction = country && country !== 'Global' 
    ? `Focus strictly on retailers available in or shipping to ${country}. Convert prices to the local currency of ${country} if possible. Include international retailers like Shein, Temu, or AliExpress ONLY if they deliver to ${country}.` 
    : 'Search globally for the best international rates.';

  let prompt = '';
  const isMulti = mode === SearchMode.MULTI;

  if (isMulti) {
    prompt = `
      You are an expert product analyst and price hunter.
      
      Step 1: PRECISE IDENTIFICATION
      Analyze the provided images and/or the description list: "${description}".
      Identify ALL distinct products mentioned or shown with EXTREME PRECISION.
      - For images: Look for logos, model names, specific design features, and text labels to identify the EXACT Make and Model. 
      - Do not guess generic names (e.g., instead of "Sony Headphones", identify "Sony WH-1000XM5 Silver").
      - Distinguish between Pro/Max/Plus versions and generations.

      Step 2: COMPREHENSIVE PRICE SEARCH
      For EACH identified product, perform a deep and comprehensive Google Search.
      - Check major marketplaces (Amazon, eBay, Walmart, AliExpress, Temu, Shein).
      - Check local retailers in ${country}.
      - Find the ABSOLUTE LOWEST prices available right now.
      ${countryInstruction}

      Structure the response as follows using Markdown:

      For every product found, create a section starting with:
      ## [Full Specific Product Name]

      Under each product section, list the Top 3 CHEAPEST Deals. You MUST rank them strictly by price (Lowest Price = Gold):
      ### 🥇 Gold Choice: [Price] - [Retailer Name](URL)
      [Absolute Lowest Price found - Brief details]
      ### 🥈 Silver Choice: [Price] - [Retailer Name](URL)
      [2nd Lowest Price found]
      ### 🥉 Bronze Choice: [Price] - [Retailer Name](URL)
      [3rd Lowest Price found]
      
      IMPORTANT: 
      1. The Gold Choice MUST be the cheapest option.
      2. Ensure the retailer name is a Markdown link to the product page.
      3. DO NOT include a general summary at the end, just list the products and their deals.
    `;
  } else {
    // Single Mode Prompt
    let identificationContext = "";
    if (imageFiles.length > 0 && description) {
      identificationContext = `Analyze the uploaded image in extreme detail and consider the user's description: "${description}".`;
    } else if (imageFiles.length > 0) {
      identificationContext = `Analyze this image in extreme detail.`;
    } else if (description) {
      identificationContext = `Analyze the product described as: "${description}".`;
    } else {
      throw new Error("Please provide an image or a description to start the search.");
    }

    prompt = `
      ${identificationContext}

      **Step 1: PRECISE IDENTIFICATION**
      - Identify the **Exact Brand, Model Name, Model Number, and Color/Variant** shown or described.
      - Look for subtle details like button layout, camera placement, text labels, or unique design elements to distinguish specific versions (e.g., "iPhone 15 Pro" vs "iPhone 15").
      - **CRITICAL**: If text is visible on the product, read it to confirm the identity.
      - Do not provide generic results (e.g., if it's a specific Nike Air Jordan colorway, do not just search for "Nike Shoes").

      **Step 2: COMPREHENSIVE PRICE SEARCH**
      - Once the specific product is identified, perform a deep Google Search to find the lowest price for *this exact specific model*.
      - Check major platforms (like Amazon, eBay, Walmart, Target, AliExpress, Temu, Shein) and specific local retailers in ${country}.
      ${countryInstruction}
      
      **Step 3: REPORT GENERATION**
      Structure the response exactly as follows:

      1. **Product Identification**: 
         - State the full, specific name of the product identified (Brand + Model + Specs).
         - Briefly mention the key visual cues used to identify it (e.g., "Identified as Sony WH-1000XM5 due to the hinge design and logo placement").
      
      2. **Top 3 Deals (The Podium)**:
         Identify the 3 absolute lowest prices available right now for this **EXACT** product.
         CRITICAL: Rank them STRICTLY by price from Lowest to Highest.
         
         ### 🥇 Gold Choice: [Price] - [Retailer Name](URL)
         [THE LOWEST PRICE FOUND. Brief description of condition/shipping if relevant]
         
         ### 🥈 Silver Choice: [Price] - [Retailer Name](URL)
         [2nd Lowest Price]
         
         ### 🥉 Bronze Choice: [Price] - [Retailer Name](URL)
         [3rd Lowest Price]
         
         IMPORTANT: Ensure the retailer name is a Markdown link to the product page.

      3. **🔮 AI Price Prediction**:
         Using historical data and real-time market signals, predict the price trajectory.
         - **Trend**: [Rising 📈 / Falling 📉 / Stable ➖]
         - **Best Time to Buy**: [e.g., "Buy Now - Historic Low", "Wait 2 weeks for sales"]
         - **Reasoning**: [Brief explanation]

      4. **Other Findings**: A comparison list of other retailers found.
      5. **Recommendation**: A final verdict on the best value.
    `;
  }

  const parts: any[] = [];

  // Process all images
  if (imageFiles && imageFiles.length > 0) {
    for (const file of imageFiles) {
      const base64Data = await fileToGenerativePart(file);
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      });
    }
  }

  parts.push({ text: prompt });

  // Retry Logic
  let attempts = 0;
  const maxRetries = 3;
  let delay = 1000; 

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: parts
        },
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      const text = response.text || "No text description found.";
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

      return {
        text,
        groundingMetadata
      };

    } catch (error: any) {
      attempts++;
      if (attempts > maxRetries) {
        console.error("Gemini API Error after retries:", error);
        throw error;
      }
      
      console.warn(`Gemini API attempt ${attempts} failed. Retrying in ${delay}ms...`, error);
      await wait(delay);
      delay *= 2; 
    }
  }
};

export const processChatMessage = async (
  history: ChatMessage[],
  newMessage: string,
  country: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-2.5-flash';

  const systemInstruction = `
    You are an expert AI Shopping Assistant dedicated to finding the absolute lowest prices for a user in ${country}.
    Your primary goal is to save the user money.
    
    1. ACCURACY FIRST: Before searching for prices, ensure you have identified the EXACT product model, version, and specs requested. If the user provides a vague description, ask for clarification or search for the most popular specific model.
    2. ALWAYS use the Google Search tool to find real-time prices across major retailers (Amazon, eBay, Walmart, etc.) and local stores in ${country}.
    3. When asked to find a product, ALWAYS sort options by price from Low to High.
    4. The "Best Option" is always the "Cheapest Option" unless the user asks for specific features.
    5. Highlight the absolute lowest price found clearly.
    6. Format product links as [Retailer Name](URL).
    7. Be concise and focus on the price data.
  `;

  const chat = ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: systemInstruction,
      tools: [{ googleSearch: {} }]
    },
    history: history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }))
  });

  try {
    const result = await chat.sendMessage({ message: newMessage });
    return result.text || "I'm having trouble connecting to the shopping network right now.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "I encountered an error while searching. Please try again.";
  }
};