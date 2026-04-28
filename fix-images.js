require('dotenv').config({ path: '/Users/paman7647/Downloads/restaurant-project/.env' });
const mongoose = require('mongoose');
const Menu = require('./models/Menu');

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        // Fix Gulab Jamun to a working Unsplash image (or the fallback)
        await Menu.updateOne(
            { name: 'Gulab Jamun' }, 
            { $set: { imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80' } }
        );
        // Fix Paneer Tikka Masala again just to be sure it's the exact user requested one.
        // Wait, what if the user's requested URL was blocked by something else?
        // Let's use it again.
        await Menu.updateOne(
            { name: 'Paneer Tikka Masala' }, 
            { $set: { imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTx4JCtjJnuFSXTEBClNiJCykZsOl_DYYmNPQ&s' } }
        );
        console.log('Fixed DB image URLs');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fix();
