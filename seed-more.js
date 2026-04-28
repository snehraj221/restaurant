require('dotenv').config({ path: '/Users/paman7647/Downloads/restaurant-project/.env' });
const mongoose = require('mongoose');
const Menu = require('./models/Menu');

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const dishes = [
            { name: 'Butter Chicken', description: 'Creamy tomato-based gravy with tender chicken pieces.', price: 450, category: 'Main Course', imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80' },
            { name: 'Paneer Tikka Masala', description: 'Grilled cottage cheese in spicy masala gravy.', price: 380, category: 'Main Course', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTx4JCtjJnuFSXTEBClNiJCykZsOl_DYYmNPQ&s' },
            { name: 'Dum Biryani', description: 'Fragrant basmati rice cooked with aromatic spices.', price: 550, category: 'Main Course', imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80' },
            { name: 'Punjabi Samosa', description: 'Crispy pastry filled with spiced potatoes and peas.', price: 120, category: 'Appetizer', imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80' },
            { name: 'Dal Makhani', description: 'Slow-cooked black lentils with butter and cream.', price: 320, category: 'Main Course', imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80' },
            { name: 'Gulab Jamun', description: 'Soft milk dumplings soaked in rose-flavored sugar syrup.', price: 150, category: 'Dessert', imageUrl: 'https://images.unsplash.com/photo-1593179505193-47ce43557e4e?auto=format&fit=crop&w=600&q=80' }
        ];

        for (const dish of dishes) {
            await Menu.updateOne({ name: dish.name }, { $set: dish }, { upsert: true });
        }
        console.log('Seeded successfully!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
seed();
