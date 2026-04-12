const API_URL = 'http://localhost:5000/api';

class Database {
    static async getShoes() {
        try {
            const response = await fetch(`${API_URL}/shoes`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            // If DB is completely empty, we could still fall back to DEFAULT_SHOES if we wanted,
            // but for this deployment let's rely on adding them via Admin.
            return data;
        } catch (error) {
            console.error('Failed to fetch shoes:', error);
            UI.showToast('Failed to connect to database', 'error');
            return [];
        }
    }
    
    // Cart remains local for the session
    static getCart() { return JSON.parse(localStorage.getItem('cart')) || []; }
    static setCart(cart) { localStorage.setItem('cart', JSON.stringify(cart)); }
}

class AppState {
    static currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    
    static async login(username, password) {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data;
                localStorage.setItem('currentUser', JSON.stringify(data));
                return true;
            } else {
                UI.showToast(data.error || 'Login failed', 'error');
                return false;
            }
        } catch (error) {
            UI.showToast('Database connection error', 'error');
            return false;
        }
    }

    static async register(username, password, role) {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role })
            });
            const data = await response.json();
            
            if (response.ok) {
                return true;
            } else {
                UI.showToast(data.error || 'Registration failed', 'error');
                return false;
            }
        } catch (error) {
            UI.showToast('Database connection error', 'error');
            return false;
        }
    }

    static logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        Database.setCart([]);
    }

    static async addToCart(shoe) {
        // We pass the whole shoe object instead of just ID now since we might not have the full list cached synchronously
        const cart = Database.getCart();
        cart.push(shoe);
        Database.setCart(cart);
        return true;
    }

    static removeFromCart(index) {
        const cart = Database.getCart();
        cart.splice(index, 1);
        Database.setCart(cart);
    }

    static clearCart() { Database.setCart([]); }
    
    static async addShoe(shoe) {
        try {
            const response = await fetch(`${API_URL}/shoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(shoe)
            });
            if (!response.ok) throw new Error('Failed to add shoe');
            return await response.json();
        } catch (error) {
            UI.showToast('Failed to add shoe to DB', 'error');
            return null;
        }
    }

    static async removeShoe(id) {
        try {
            const response = await fetch(`${API_URL}/shoes/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete shoe');
            
            // Clean up cart
            let cart = Database.getCart();
            cart = cart.filter(s => s.id !== id);
            Database.setCart(cart);
            return true;
        } catch (error) {
            UI.showToast('Failed to remove shoe from DB', 'error');
            return false;
        }
    }
}


class UI {
    static async init() {
        this.setupNavigation();
        this.setupForms();
        this.updateAuthUI();
        await this.renderShoes();
        this.updateCartCount();
        
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
                e.target.classList.add('active');
                document.getElementById(`${e.target.dataset.form}-form`).classList.remove('hidden');
            });
        });

        document.getElementById('checkout-btn').addEventListener('click', () => {
            if (Database.getCart().length === 0) {
                UI.showToast('Your cart is empty!', 'error');
                return;
            }
            if (!AppState.currentUser) {
                UI.showToast('Please login to checkout', 'error');
                UI.switchView('auth-view');
                return;
            }
            AppState.clearCart();
            UI.renderCart();
            UI.updateCartCount();
            UI.showToast('Purchase successful! Thank you.', 'success');
        });
    }

    static async switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active', 'hidden'));
        document.querySelectorAll('.view').forEach(v => {
            if(v.id === viewId) v.classList.add('active');
            else v.classList.add('hidden');
        });
        
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
        if(btn) btn.classList.add('active');

        if(viewId === 'cart-view') this.renderCart();
        if(viewId === 'admin-view') await this.renderInventory();
        if(viewId === 'home-view') await this.renderShoes();
    }

    static setupNavigation() {
        document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.currentTarget.dataset.view));
        });
        
        document.getElementById('nav-logout-btn').addEventListener('click', () => {
            AppState.logout();
            this.updateAuthUI();
            this.switchView('home-view');
            this.showToast('Logged out successfully', 'success');
        });
    }

    static setupForms() {
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('login-username').value;
            const p = document.getElementById('login-password').value;
            if(await AppState.login(u, p)) {
                this.updateAuthUI();
                await this.switchView('home-view');
                this.showToast('Welcome back!', 'success');
                e.target.reset();
            }
        });

        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('reg-username').value;
            const p = document.getElementById('reg-password').value;
            const r = document.querySelector('input[name="role"]:checked').value;
            if(await AppState.register(u, p, r)) {
                this.showToast('Registration successful! Please login.', 'success');
                document.querySelector('.auth-tab[data-form="login"]').click();
                e.target.reset();
            }
        });

        document.getElementById('add-shoe-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('shoe-name').value;
            const brand = document.getElementById('shoe-brand').value;
            const price = parseFloat(document.getElementById('shoe-price').value);
            const image = document.getElementById('shoe-image').value;
            
            const newShoe = await AppState.addShoe({name, brand, price, image});
            if(newShoe) {
                this.showToast('Shoe added to inventory', 'success');
                e.target.reset();
                await this.renderInventory();
            }
        });
    }

    static updateAuthUI() {
        const user = AppState.currentUser;
        const authBtn = document.getElementById('nav-auth-btn');
        const logoutBtn = document.getElementById('nav-logout-btn');
        const adminBtn = document.getElementById('nav-admin-btn');

        if(user) {
            authBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            if(user.role === 'admin') adminBtn.classList.remove('hidden');
            else adminBtn.classList.add('hidden');
        } else {
            authBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            adminBtn.classList.add('hidden');
        }
    }

    static async renderShoes() {
        const grid = document.getElementById('product-grid');
        const shoes = await Database.getShoes();
        grid.innerHTML = shoes.map(shoe => `
            <div class="product-card glass">
                <img src="${shoe.image}" alt="${shoe.name}" class="product-image">
                <div class="product-info">
                    <span class="product-brand">${shoe.brand}</span>
                    <h3 class="product-title">${shoe.name}</h3>
                    <div class="product-footer">
                        <span class="product-price">$${shoe.price.toFixed(2)}</span>
                        <button class="btn btn-primary" onclick='UI.addToCart(${JSON.stringify(shoe).replace(/'/g, "&apos;")})'>
                            <i class="fa-solid fa-cart-plus"></i> Add
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    static async renderInventory() {
        const list = document.getElementById('inventory-list');
        const shoes = await Database.getShoes();
        if(shoes.length === 0) list.innerHTML = '<p>No shoes in inventory.</p>';
        else {
            list.innerHTML = shoes.map(shoe => `
                <div class="inventory-item">
                    <div class="inventory-info">
                        <img src="${shoe.image}" class="inventory-img" alt="${shoe.name}">
                        <div>
                            <strong>${shoe.name}</strong> (${shoe.brand})<br>
                            <span style="color:var(--secondary)">$${shoe.price.toFixed(2)}</span>
                        </div>
                    </div>
                    <button class="btn btn-danger" onclick="UI.removeShoe('${shoe.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }
    }

    static renderCart() {
        const list = document.getElementById('cart-items');
        const cart = Database.getCart();
        let subtotal = 0;
        
        if(cart.length === 0) list.innerHTML = '<p>Your cart is empty.</p>';
        else {
            list.innerHTML = cart.map((shoe, index) => {
                subtotal += shoe.price;
                return `
                <div class="cart-item">
                    <img src="${shoe.image}" alt="${shoe.name}">
                    <div class="cart-item-details">
                        <div class="cart-item-title">${shoe.name}</div>
                        <div class="cart-item-price">$${shoe.price.toFixed(2)}</div>
                    </div>
                    <button class="btn btn-danger" onclick="UI.removeFromCart(${index})">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `}).join('');
        }
        
        document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('cart-total').textContent = `$${(subtotal > 0 ? subtotal + 5 : 0).toFixed(2)}`;
    }

    static updateCartCount() {
        document.getElementById('cart-count').textContent = Database.getCart().length;
    }

    static async addToCart(shoe) {
        if(await AppState.addToCart(shoe)) {
            this.updateCartCount();
            this.showToast('Added to cart', 'success');
        }
    }
    
    static removeFromCart(index) {
        AppState.removeFromCart(index);
        this.renderCart();
        this.updateCartCount();
    }

    static async removeShoe(id) {
        if(confirm('Are you sure you want to remove this shoe?')) {
            if(await AppState.removeShoe(id)) {
                await this.renderInventory();
                await this.renderShoes();
                this.updateCartCount();
                this.showToast('Shoe removed', 'success');
            }
        }
    }

    static showToast(msg, type='success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation'}"></i> ${msg}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => UI.init());
window.UI = UI; // Expose UI globally for inline onclick handlers
