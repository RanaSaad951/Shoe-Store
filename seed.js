require('dotenv').config();
const mongoose = require('mongoose');

// Define Schema locally so we can run standalone
const shoeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true }
});
const Shoe = mongoose.model('Shoe', shoeSchema);

const sampleShoes = [
    {
        name: "Air Max Nova",
        brand: "Nike",
        price: 189.99,
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=60"
    },
    {
        name: "UltraBoost Stealth",
        brand: "Adidas",
        price: 199.99,
        image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=60"
    },
    {
        name: "Retro High OG",
        brand: "Jordan",
        price: 210.00,
        image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=60"
    },
    {
        name: "Classic Leather",
        brand: "Reebok",
        price: 85.00,
        image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&auto=format&fit=crop&q=60"
    },
    {
        name: "Gel-Kayano Pro",
        brand: "ASICS",
        price: 160.00,
        image: "https://images.unsplash.com/photo-1623684225794-a8f1f5037f5c?w=600&auto=format&fit=crop&q=60"
    },
    {
        name: "Zoom X Invincible",
        brand: "Nike",
        price: 180.00,
        image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&auto=format&fit=crop&q=60"
    }
];

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to target DB. Seeding data...');
        // Clear out existing for a fresh slate
        await Shoe.deleteMany({});
        console.log('Cleared existing shoes.');
        
        await Shoe.insertMany(sampleShoes);
        console.log('Successfully inserted premium sample shoes!');
        
        mongoose.connection.close();
    })
    .catch(err => {
        console.error('Error seeding data:', err);
        mongoose.connection.close();
    });
