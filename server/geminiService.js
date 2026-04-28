const { GoogleGenerativeAI } = require("@google/generative-ai");
const Menu = require("../models/Menu");

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function getChatResponse(userMessage) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return "I'm sorry, my AI brain isn't connected yet (Missing API Key). But I can tell you that our Butter Chicken is amazing!";
        }

        // Fetch current menu to give context to Gemini
        const menuItems = await Menu.find();
        const menuContext = menuItems.map(item =>
            `${item.name}: ${item.description} (₹${item.price})`
        ).join("\n");

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            You are "Rasoi Buddy", the friendly AI assistant for Royal Indian Rasoi, an authentic Indian restaurant.
            Your goal is to help customers with their questions about our dishes, ingredients, and restaurant.
            
            Current Menu:
            ${menuContext || "Menu is being updated, but we serve classic Indian delicacies like Butter Chicken and Biryani."}
            
            Guidelines:
            - Be polite, welcoming, and "Desi" in your tone.
            - If someone asks about a dish not on the menu, recommend something similar from our menu.
            - Keep responses concise and appetizing.
            - If asked about bookings, tell them to use the "Book Table" section on our website.
            
            Customer: ${userMessage}
            Rasoi Buddy:
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini 2.5 Error:", error.message);
        
        // Return a fallback message without trying another model
        return "I'm having a little trouble thinking right now. Could you ask me again in a moment?";
    }
}

module.exports = { getChatResponse };
