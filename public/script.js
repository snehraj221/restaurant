document.addEventListener('DOMContentLoaded', function() {
    
    // Auth Helper
    const getToken = () => localStorage.getItem('token');
    const getUser = () => JSON.parse(localStorage.getItem('user'));
    const isAdmin = () => localStorage.getItem('isAdmin') === 'true';

    // Update Navbar based on Auth
    const authLink = document.getElementById('authLink');
    const adminLink = document.getElementById('adminLink');
    const contactLinkLi = document.getElementById('contactLinkLi');
    const logoutLinkLi = document.getElementById('logoutLinkLi');
    const logoutBtnNav = document.getElementById('logoutBtnNav');

    const token = getToken();
    const adminStatus = isAdmin();
    const user = getUser();

    if (token) {
        if (adminStatus) {
            if (adminLink) {
                adminLink.style.display = 'block';
                adminLink.innerHTML = `<a href="/dashboard" class="admin-link" style="background: #FFD700; color: #800000; border: 2px solid #800000; padding: 5px 15px; border-radius: 20px; font-weight: bold;">Admin Panel</a>`;
            }
            if (contactLinkLi) contactLinkLi.style.display = 'none';
            if (authLink) authLink.style.display = 'none';
        } else {
            if (authLink) authLink.innerHTML = `<a href="/user-dashboard">My Account</a>`;
            if (contactLinkLi) contactLinkLi.style.display = 'block';
        }
        if (logoutLinkLi) logoutLinkLi.style.display = 'block';
    } else {
        if (authLink) {
            authLink.style.display = 'block';
            authLink.innerHTML = `<a href="/login">Login</a>`;
        }
        if (adminLink) adminLink.style.display = 'none';
        if (contactLinkLi) contactLinkLi.style.display = 'block';
        if (logoutLinkLi) logoutLinkLi.style.display = 'none';
    }

    if (logoutBtnNav) {
        logoutBtnNav.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '/login';
        });
    }

    // Pre-fill booking form
    if (user) {
        if (document.getElementById('custName')) document.getElementById('custName').value = user.name || '';
        if (document.getElementById('custEmail')) document.getElementById('custEmail').value = user.email || '';
    }

    // --- DYNAMIC MENU FETCH ---
    const menuContainer = document.querySelector('.menu-container');
    const fetchMenu = () => {
        if (!menuContainer) return;
        fetch('/api/menu')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data.length > 0) {
                menuContainer.innerHTML = ''; 
                data.data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'menu-item';
                    div.innerHTML = `
                        <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80'}" alt="${item.name}" class="menu-img">
                        <div class="menu-info">
                            <h3>${item.name}</h3>
                            <p>${item.description}</p>
                            <span class="price">₹${item.price}</span>
                            <button class="add-to-cart-btn" data-name="${item.name}" data-price="${item.price}">Add to Order</button>
                        </div>
                    `;
                    menuContainer.appendChild(div);
                });
                attachAddToCartListeners();
            }
        });
    };

    // --- CART LOGIC ---
    window.cart = [];
    const updateCartUI = () => {
        const countEl = document.getElementById('cart-count');
        const listEl = document.getElementById('cart-items-list');
        const summaryEl = document.getElementById('cart-summary');
        const totalEl = document.getElementById('cart-total');

        if (countEl) countEl.innerText = window.cart.length;
        if (listEl) {
            if (window.cart.length === 0) {
                listEl.innerHTML = '<p style="text-align: center; color: #999;">Your cart is empty.</p>';
                if (summaryEl) summaryEl.style.display = 'none';
            } else {
                listEl.innerHTML = window.cart.map((item, index) => `
                    <div class="cart-item">
                        <span>${item.name} - ₹${item.price}</span>
                        <button class="remove-item" data-index="${index}" style="background:none; border:none; color:red; cursor:pointer; font-size:1.2rem;">&times;</button>
                    </div>
                `).join('');
                if (summaryEl) summaryEl.style.display = 'block';
                const total = window.cart.reduce((sum, item) => sum + item.price, 0);
                if (totalEl) totalEl.innerText = total;

                // Add delete listeners
                listEl.querySelectorAll('.remove-item').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idx = e.target.getAttribute('data-index');
                        window.cart.splice(idx, 1);
                        updateCartUI();
                    });
                });
            }
        }
    };

    const attachAddToCartListeners = () => {
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const name = this.dataset.name || this.closest('.menu-info').querySelector('h3').innerText;
                const priceText = this.dataset.price || this.closest('.menu-info').querySelector('.price').innerText;
                const price = parseInt(String(priceText).replace('₹', ''));
                
                window.cart.push({ name, price });
                updateCartUI();
                
                // Feedback
                const originalText = this.innerText;
                this.innerText = "Added!";
                this.style.background = "#28a745";
                setTimeout(() => {
                    this.innerText = originalText;
                    this.style.background = "#800000";
                }, 1000);
            });
        });
    };

    // Initial listeners for hardcoded items
    attachAddToCartListeners();
    fetchMenu();

    // Cart Modal Toggles
    const cartBtn = document.getElementById('cart-btn');
    const orderModal = document.getElementById('order-modal');
    const closeOrderModal = document.getElementById('close-order-modal');
    
    if (cartBtn && orderModal) {
        cartBtn.addEventListener('click', () => {
            orderModal.style.display = 'flex';
            updateCartUI();
        });
    }
    if (closeOrderModal) {
        closeOrderModal.addEventListener('click', () => orderModal.style.display = 'none');
    }

    // Checkout Handling
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            const token = getToken();
            if (!token) {
                alert("Please login to place an order!");
                window.location.href = '/login';
                return;
            }
            
            checkoutBtn.disabled = true;
            checkoutBtn.innerText = "Processing...";

            const total = window.cart.reduce((sum, item) => sum + item.price, 0);
            fetch('/api/order', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ items: JSON.stringify(window.cart), total })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert("Order placed successfully!");
                    window.cart = [];
                    updateCartUI();
                    orderModal.style.display = 'none';
                    window.location.href = '/user-dashboard';
                } else {
                    alert("Order failed: " + data.message);
                }
            })
            .catch(err => alert("Server error during checkout."))
            .finally(() => {
                checkoutBtn.disabled = false;
                checkoutBtn.innerText = "Place Order";
            });
        });
    }

    // Booking Form
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const token = getToken();
            if (!token) {
                alert("Please login to book a table!");
                window.location.href = '/login';
                return;
            }

            const resultDiv = document.getElementById('bookingResult');
            resultDiv.innerText = "Booking in progress...";
            
            const data = {
                name: document.getElementById('custName').value,
                email: document.getElementById('custEmail').value,
                phone: document.getElementById('custPhone').value,
                guests: document.getElementById('custGuests').value,
                date: document.getElementById('bookDate').value,
                time: document.getElementById('bookTime').value,
                message: document.getElementById('custMsg').value
            };

            fetch('/api/book-table', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    resultDiv.innerText = data.message;
                    resultDiv.className = "result-msg success";
                    bookingForm.reset();
                } else {
                    resultDiv.innerText = data.message || "Booking failed.";
                    resultDiv.className = "result-msg error";
                }
            });
        });
    }

    // Contact Form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const resultDiv = document.getElementById('contactResult');
            const data = {
                name: document.getElementById('contName').value,
                email: document.getElementById('contEmail').value,
                subject: document.getElementById('contSub').value,
                message: document.getElementById('contMsg').value
            };

            fetch('/api/contact-us', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    resultDiv.innerText = data.message;
                    resultDiv.className = "result-msg success";
                    contactForm.reset();
                } else {
                    resultDiv.innerText = "Error sending message.";
                    resultDiv.className = "result-msg error";
                }
            });
        });
    }

    // Chatbot Logic
    const chatbotBubble = document.getElementById('chatbot-bubble');
    const chatbotWindow = document.getElementById('chatbot-window');
    const closeChatbot = document.getElementById('close-chatbot');
    const sendChat = document.getElementById('send-chat');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chatbot-messages');

    if (chatbotBubble && chatbotWindow) {
        chatbotBubble.addEventListener('click', () => {
            chatbotWindow.style.display = chatbotWindow.style.display === 'flex' ? 'none' : 'flex';
        });
        closeChatbot.addEventListener('click', () => chatbotWindow.style.display = 'none');

        const addMessage = (text, sender) => {
            const div = document.createElement('div');
            div.className = `message ${sender}`;
            div.innerText = text;
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };

        const processChat = () => {
            const msg = userInput.value.trim();
            if (!msg) return;
            addMessage(msg, 'user');
            userInput.value = '';

            fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            })
            .then(res => res.json())
            .then(data => addMessage(data.response, 'bot'))
            .catch(err => addMessage("I'm sorry, I'm having trouble connecting right now.", 'bot'));
        };

        sendChat.addEventListener('click', processChat);
        userInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') processChat(); });
    }
});
