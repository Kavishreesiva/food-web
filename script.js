/**
 * Crave Kitchen - Restaurant Website JavaScript
 * Handles navigation, menu filtering, form, and interactive features
 */

/**
 * Global Cart Utilities
 */
function updateCartBadge() {
    try {
        const cart = JSON.parse(localStorage.getItem('crave_cart') || '[]');
        const count = cart.reduce((total, item) => total + (item.quantity || 0), 0);
        const badge = document.getElementById('cart-count');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Badge Update Error:', e);
    }
}

/**
 * Authentication and User Display
 */
function initAuth() {
    const user = localStorage.getItem('crave_user');
    const authContainer = document.querySelector('.nav-auth');
    
    if (user && authContainer) {
        authContainer.innerHTML = `
            <a href="cart.html" title="View Cart" style="font-size: 1.5rem; text-decoration: none; margin-right: 15px; position: relative;">
                🛒<span id="cart-count" style="position: absolute; top: -5px; right: -10px; background: var(--color-primary); color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 50%; font-weight: bold; display: none;">0</span>
            </a>
            <div class="user-info" style="display: flex; align-items: center; gap: 10px; color: var(--color-secondary); font-weight: 600;">
                <a href="orders.html" style="text-decoration: none; color: inherit; font-size: 0.9rem; border-right: 1px solid #ccc; padding-right: 10px; margin-right: 5px;">My Orders</a>
                <span>Hi, ${user}!</span>
                <button id="logout-btn" style="background: none; border: 1px solid var(--color-primary); color: var(--color-primary); padding: 5px 10px; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.8rem;">Logout</button>
            </div>
        `;
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                localStorage.removeItem('crave_user');
                window.location.reload();
            };
        }
    }
    updateCartBadge();
}

/**
 * Advanced Floating Chatbot Logic (Tanglish + Voice STT/TTS + Fridge Feature)
 */
function initChatbot() {
    const toggle = document.getElementById('chatbot-toggle');
    const windowEl = document.getElementById('chat-window');
    const close = document.getElementById('close-chat');
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send');
    const messages = document.getElementById('chat-messages');
    const voiceBtn = document.getElementById('toggle-voice');
    const micBtn = document.getElementById('chat-mic');

    if (!toggle || !windowEl) return;

    let isVoiceEnabled = false;
    let recognition = null;

    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-IN'; // Works well for Indian English and some mixed terms

        recognition.onstart = () => {
            micBtn.classList.add('recording');
            micBtn.textContent = '🛑';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            input.value = transcript;
            micBtn.classList.remove('recording');
            micBtn.textContent = '🎤';
            send.click();
        };

        recognition.onerror = () => {
            micBtn.classList.remove('recording');
            micBtn.textContent = '🎤';
        };

        recognition.onend = () => {
            micBtn.classList.remove('recording');
            micBtn.textContent = '🎤';
        };
    } else {
        if (micBtn) micBtn.style.display = 'none';
    }

    if (micBtn) {
        micBtn.onclick = () => {
            if (micBtn.classList.contains('recording')) {
                recognition.stop();
            } else {
                recognition.start();
            }
        };
    }
    
    toggle.onclick = () => windowEl.classList.toggle('show');
    if (close) close.onclick = () => windowEl.classList.remove('show');
    
    if (voiceBtn) {
        voiceBtn.onclick = () => {
            isVoiceEnabled = !isVoiceEnabled;
            voiceBtn.textContent = isVoiceEnabled ? '🔊' : '🔇';
            voiceBtn.style.opacity = isVoiceEnabled ? '1' : '0.7';
            if (!isVoiceEnabled) window.speechSynthesis.cancel();
        };
    }

    function speak(text) {
        if (!isVoiceEnabled) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-IN';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
    }

    function addMessage(text, isUser = false) {
        if (!messages) return;
        const msg = document.createElement('div');
        msg.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        msg.textContent = text;
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
        if (!isUser) speak(text);
    }

    function getBotResponse(userText) {
        const text = userText.toLowerCase();
        
        // Order Tracking
        if (text.includes('track') || text.includes('order') || text.includes('status')) {
            const lastId = localStorage.getItem('last_order_id');
            const orderTime = parseInt(localStorage.getItem('last_order_time'));
            
            if (lastId && orderTime) {
                const diffMins = Math.floor((new Date().getTime() - orderTime) / 60000);
                let s = 'Preparing your food...';
                if (diffMins > 20) s = 'Delivered! Enjoy pannunga! 😋';
                else if (diffMins > 12) s = 'Out for Delivery! Road-la irukkum. 🛵';
                else if (diffMins > 5) s = 'Chef is cooking! Taste-a ready aagudhu. 👨‍🍳';
                return `Order #${lastId} Status: ${s}`;
            }
            return "Order list kaali! (Order list is empty!) Edhavadhu sapda order panna track pannalam. 🛒";
        }

        // Fridge Feature: Paneer + Butter
        if (text.includes('paneer') && text.includes('butter')) {
            return "Vaah! Paneer Butter Masala dhaan correct-a irukkum. Steps: 1. Sauté onions and tomatoes. 2. Blend to paste. 3. Add butter, paneer cubes, and cream. Super taste-a irukkum!";
        }

        // Fridge Feature: Egg + Bread
        if (text.includes('egg') && text.includes('bread')) {
            return "Bread Omelette or French Toast try pannunga! 🍞🍳 Quick-a mudinjidum. Spice venum-na konjam chilli powder add panni kalakkunga.";
        }

        // Fridge Feature: Rice + Dal
        if (text.includes('rice') && text.includes('dal')) {
            return "Comfort food alert! Paruppu Saadham (Dal Rice) best choice. Simple-a ghee and jeera add panni thaalingunga (temper). Romba healthy-um kooda!";
        }

        // Missing Ingredient: No Onion
        if (text.includes('no onion') || text.includes('onion illama')) {
            return "Onion illaiya? Problem-e illa! Neenga Jeera Aloo or Tomato Dal pannalam. Inji (Ginger) and Perungayam (Hing) add panna flavor nalla varum.";
        }

        // How to make Tea/Coffee
        if (text.includes('tea') || text.includes('coffee')) {
            return "Indian style Filter Coffee or Ginger Tea pannunga. Milk nalla boil panni, sugar and powder add panna perfect taste kidaikkum! ☕";
        }

        // Recommendations
        if (text.includes('recommend') || text.includes('enna sapdalam') || text.includes('suggest')) {
            return "Chef Choice: Namma special Dum Biryani or Hot Dosa try panni paarunga. Sweet-ku Berry Delight or Ice Cream super combination!";
        }

        if (text.includes('hello') || text.includes('hi') || text.includes('vanakkam')) {
            return "Vanakkam! (Hello!) En kitta Fridge-la enna irukku-nu sollunga, naa super recipes suggest panren! Or track your order status.";
        }

        return "Appadiya? (Is that so?) Enakku puriyala. Fridge ingredients sollunga, recipe tharen! Or ask to 'track order'.";
    }

    if (send && input) {
        send.onclick = () => {
            const val = input.value.trim();
            if (val) {
                addMessage(val, true);
                input.value = '';
                setTimeout(() => {
                    const response = getBotResponse(val);
                    addMessage(response);
                }, 600);
            }
        };
        input.onkeypress = (e) => { if (e.key === 'Enter') send.click(); };
    }
}

/**
 * Global Toast Notification System
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

/**
 * Add to cart functionality with prompt modal
 */
function initAddToCart() {
    const modal = document.getElementById('add-to-cart-modal');
    if (!modal) return;

    const pImg = document.getElementById('prompt-img');
    const pName = document.getElementById('prompt-name');
    const pPrice = document.getElementById('prompt-price');
    const pQty = document.getElementById('prompt-qty');
    const pTotal = document.getElementById('prompt-total');
    const pPlus = document.getElementById('prompt-plus');
    const pMinus = document.getElementById('prompt-minus');
    const confirmBtn = document.getElementById('confirm-add');
    const closeBtn = document.getElementById('close-add-modal');
    const cancelBtn = document.getElementById('cancel-add');

    if (!confirmBtn) return;

    let currentItem = null;
    let currentQty = 1;

    function updatePromptUI() {
        if (!currentItem || !pQty || !pTotal) return;
        pQty.textContent = currentQty;
        const priceNum = parseInt(String(currentItem.price).replace(/[^0-9]/g, '')) || 0;
        pTotal.textContent = `₹${priceNum * currentQty}`;
    }

    function openPrompt(item, isOrderNow = false) {
        currentItem = item;
        currentQty = 1;
        if (pImg) pImg.src = item.img;
        if (pName) pName.textContent = item.name;
        if (pPrice) pPrice.textContent = item.price;
        updatePromptUI();
        modal.classList.add('show');

        confirmBtn.onclick = () => {
            const selectedSpice = document.querySelector('input[name="spice"]:checked').value;
            const itemWithSpice = { ...currentItem, spice: selectedSpice };
            const success = addToLocalStorageCart(itemWithSpice, currentQty);
            modal.classList.remove('show');
            if (success && isOrderNow) {
                setTimeout(() => { window.location.href = 'cart.html'; }, 300);
            }
        };
    }

    function addToLocalStorageCart(item, qty) {
        try {
            let cart = JSON.parse(localStorage.getItem('crave_cart') || '[]');
            const existingItemIndex = cart.findIndex(i => i.name === item.name);
            if (existingItemIndex > -1) {
                cart[existingItemIndex].quantity += qty;
            } else {
                item.quantity = qty;
                cart.push(item);
            }
            const cartData = JSON.stringify(cart);
            localStorage.setItem('crave_cart', cartData);
            
            if (localStorage.getItem('crave_cart') === cartData) {
                updateCartBadge();
                showToast(`${qty}x ${item.name} added to cart!`);
                return true;
            }
            return false;
        } catch (e) {
            console.error('Save Error:', e);
            return false;
        }
    }

    document.addEventListener('click', function(e) {
        const addBtn = e.target.closest('.btn-add-cart');
        if (addBtn) {
            const card = addBtn.closest('.menu-card') || addBtn.closest('.special-card');
            if (card) {
                const name = (card.querySelector('.menu-card-title') || card.querySelector('h3')).textContent.trim();
                const price = (card.querySelector('.menu-card-price') || card.querySelector('.special-price')).textContent.trim();
                const imgEl = card.querySelector('img');
                const img = imgEl ? imgEl.src : '';
                openPrompt({ name, price, img }, false);
                addBtn.textContent = '✓ Added';
                setTimeout(() => { addBtn.textContent = 'Add to Cart'; }, 2000);
            }
            return;
        }

        const orderBtn = e.target.closest('.btn-order-now');
        if (orderBtn) {
            const card = orderBtn.closest('.menu-card') || orderBtn.closest('.special-card');
            if (card) {
                const name = (card.querySelector('.menu-card-title') || card.querySelector('h3')).textContent.trim();
                const price = (card.querySelector('.menu-card-price') || card.querySelector('.special-price')).textContent.trim();
                const imgEl = card.querySelector('img');
                const img = imgEl ? imgEl.src : '';
                openPrompt({ name, price, img }, true);
            }
            return;
        }
    });

    if (pPlus) pPlus.onclick = () => { if (currentQty < 10) { currentQty++; updatePromptUI(); } };
    if (pMinus) pMinus.onclick = () => { if (currentQty > 1) { currentQty--; updatePromptUI(); } };
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('show');
    if (cancelBtn) cancelBtn.onclick = () => modal.classList.remove('show');
}

/**
 * Navbar features
 */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });
}

function initMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const links = document.getElementById('nav-links');
    if (!toggle || !links) return;
    toggle.onclick = () => {
        toggle.classList.toggle('active');
        links.classList.toggle('active');
    };
}

function initMenuFilter() {
    const cards = document.querySelectorAll('.menu-card');
    const grid = document.getElementById('menu-grid');
    if (!grid || cards.length === 0) return;
    
    const tabs = document.querySelectorAll('.menu-tab');
    const sort = document.getElementById('menu-sort');
    
    function run() {
        const activeTab = document.querySelector('.menu-tab.active');
        if (!activeTab) return;
        const cat = activeTab.dataset.category;
        const sortBy = sort ? sort.value : 'default';
        
        let visible = Array.from(cards).filter(c => {
            const isMatch = cat === 'all' || c.dataset.category === cat;
            c.style.display = isMatch ? 'block' : 'none';
            return isMatch;
        });
        
        if (sortBy !== 'default') {
            visible.sort((a, b) => {
                if (sortBy === 'rating') return b.dataset.rating - a.dataset.rating;
                if (sortBy === 'time') return a.dataset.time - b.dataset.time;
                if (sortBy === 'price-low') return a.dataset.price - b.dataset.price;
                if (sortBy === 'price-high') return b.dataset.price - a.dataset.price;
                return 0;
            });
            visible.forEach(c => grid.appendChild(c));
        }
    }
    tabs.forEach(t => t.onclick = () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        run();
    });
    if (sort) sort.onchange = run;
}

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initAddToCart();
    initChatbot();
    initNavbar();
    initMobileMenu();
    initMenuFilter();
    updateCartBadge();
    
    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = document.getElementById('navbar') ? document.getElementById('navbar').offsetHeight : 0;
                window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
            }
        });
    });
});