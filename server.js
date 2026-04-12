require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB connection error:', err));

// --- Schemas & Models ---

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // In a real app, hash this!
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' }
});
const User = mongoose.model('User', userSchema);

const shoeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true }
});
const Shoe = mongoose.model('Shoe', shoeSchema);

// --- Routes ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const newUser = new User({ username, password, role });
        await newUser.save();
        
        // Don't send password back
        const userWithoutPassword = {
            id: newUser._id,
            username: newUser.username,
            role: newUser.role
        };
        res.status(201).json(userWithoutPassword);
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const userWithoutPassword = {
            id: user._id,
            username: user.username,
            role: user.role
        };
        res.json(userWithoutPassword);
    } catch (err) {
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Shoes Routes
app.get('/api/shoes', async (req, res) => {
    try {
        const shoes = await Shoe.find();
        // Map _id to id for frontend compatibility
        const formattedShoes = shoes.map(s => ({
            id: s._id,
            name: s.name,
            brand: s.brand,
            price: s.price,
            image: s.image
        }));
        res.json(formattedShoes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch shoes' });
    }
});

app.post('/api/shoes', async (req, res) => {
    try {
        const { name, brand, price, image } = req.body;
        const newShoe = new Shoe({ name, brand, price, image });
        await newShoe.save();
        res.status(201).json({
            id: newShoe._id,
            name: newShoe.name,
            brand: newShoe.brand,
            price: newShoe.price,
            image: newShoe.image
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add shoe' });
    }
});

app.delete('/api/shoes/:id', async (req, res) => {
    try {
        await Shoe.findByIdAndDelete(req.params.id);
        res.json({ message: 'Shoe deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete shoe' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
