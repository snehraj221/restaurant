require('dotenv').config({ path: '/Users/paman7647/Downloads/restaurant-project/.env' });
const mongoose = require('mongoose');
const Menu = require('./models/Menu');

async function updateMenu() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const result = await Menu.updateMany(
            { name: { $regex: /Paneer/i } },
            { $set: { imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTx4JCtjJnuFSXTEBClNiJCykZsOl_DYYmNPQ&s' } }
        );
        console.log('Updated documents:', result);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
updateMenu();
