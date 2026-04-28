document.addEventListener('DOMContentLoaded', function() {
    console.log("Admin & Auth Script Loaded!");

    const getToken = () => localStorage.getItem('token');
    const setAuth = (data, isAdmin = false) => {
        localStorage.setItem('token', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        if (isAdmin) localStorage.setItem('isAdmin', 'true');
    };

    // 1. Handling Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setAuth(data, true);
                    window.location.href = '/dashboard';
                } else {
                    return fetch('/api/user/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: username, password })
                    }).then(res => res.json());
                }
            })
            .then(data => {
                if (!data) return;
                if (data.success) {
                    setAuth(data, false);
                    window.location.href = '/user-dashboard';
                } else {
                    const msgDiv = document.getElementById('loginMsg');
                    if (msgDiv) {
                        msgDiv.innerText = data.message || "Invalid credentials.";
                        msgDiv.className = "result-msg error";
                    }
                }
            })
            .catch(err => console.error("Login Error:", err));
        });
    }

    // 2. Handling Signup
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupUser').value;
            const password = document.getElementById('signupPass').value;

            fetch('/api/user/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            })
            .then(res => res.json())
            .then(data => {
                const msgDiv = document.getElementById('signupMsg');
                if (data.success) {
                    setAuth(data, false);
                    if (msgDiv) {
                        msgDiv.innerText = "Welcome! Redirecting...";
                        msgDiv.className = "result-msg success";
                    }
                    setTimeout(() => window.location.href = '/user-dashboard', 1500);
                } else {
                    if (msgDiv) {
                        msgDiv.innerText = data.message || "Signup failed.";
                        msgDiv.className = "result-msg error";
                    }
                }
            })
            .catch(err => console.error("Signup Error:", err));
        });
    }

    // 3. Auth Protection for Dashboards
    const path = window.location.pathname;
    if (path.includes('/dashboard') && !path.includes('user-dashboard')) {
        if (localStorage.getItem('isAdmin') !== 'true' || !getToken()) {
            window.location.href = '/login';
        } else {
            refreshDashboard();
            setInterval(refreshDashboard, 30000); // Auto refresh
        }
    }
    
    if (path.includes('/user-dashboard')) {
        if (!localStorage.getItem('user') || !getToken()) {
            window.location.href = '/login';
        } else {
            // Fetch user orders if needed
        }
    }

    // 4. Update Booking (Admin Only)
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('editId').value;
            const updatedData = {
                customerName: document.getElementById('editName').value,
                numberOfPeople: document.getElementById('editGuests').value
            };

            fetch(`/api/admin/bookings/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(updatedData)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert("Booking updated!");
                    closeModal();
                    refreshDashboard();
                } else {
                    alert(data.message || "Update failed");
                }
            })
            .catch(err => console.error("Update error:", err));
        });
    }

    // 5. Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.clear();
            window.location.href = '/login';
        });
    }

    // 6. Refresh Button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshDashboard);
    }

    // 7. Modal Close
    const closeModals = document.querySelectorAll('.close-modal');
    closeModals.forEach(btn => btn.addEventListener('click', closeModal));
});

// GLOBAL FUNCTIONS

function refreshDashboard() {
    fetchStats();
    fetchBookings();
    fetchOrdersAdmin();
}

function fetchStats() {
    const token = localStorage.getItem('token');
    fetch('/api/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            if(document.getElementById('stat-bookings')) document.getElementById('stat-bookings').innerText = data.bookings;
            if(document.getElementById('stat-contacts')) document.getElementById('stat-contacts').innerText = data.contacts;
            if(document.getElementById('stat-menu')) document.getElementById('stat-menu').innerText = data.menuItems;
            if(document.getElementById('stat-orders')) document.getElementById('stat-orders').innerText = data.orders;
        }
    })
    .catch(err => console.error("Stats fetch error:", err));
}

function fetchBookings() {
    const tableBody = document.getElementById('bookingsTableBody');
    if (!tableBody) return;

    const token = localStorage.getItem('token');
    fetch('/api/admin/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        tableBody.innerHTML = '';
        const items = data.data || data;
        if (!Array.isArray(items) || items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No bookings found.</td></tr>';
            return;
        }

        items.forEach(booking => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${booking.customerName}</td>
                <td>${booking.bookingDate} at ${booking.bookingTime}</td>
                <td>${booking.numberOfPeople}</td>
                <td>${booking.phoneNumber}</td>
                <td class="action-btns">
                    <button class="edit-btn" data-id="${booking._id}" data-name="${booking.customerName}" data-guests="${booking.numberOfPeople}">Edit</button>
                    <button class="del-btn" data-id="${booking._id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        tableBody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                openEditModal(this.dataset.id, this.dataset.name, this.dataset.guests);
            });
        });
        tableBody.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteBooking(this.dataset.id);
            });
        });
    })
    .catch(err => console.error("Fetch bookings error:", err));
}

function fetchOrdersAdmin() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    const token = localStorage.getItem('token');
    fetch('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        tbody.innerHTML = '';
        const items = data.data || data;
        if (!Array.isArray(items)) return;
        
        items.forEach(o => {
            let itemsStr = "";
            try {
                const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                itemsStr = Array.isArray(items) ? items.map(i => i.name).join(', ') : "Mixed Items";
            } catch(e) { itemsStr = "Order Items"; }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${String(o._id).slice(-4)}</td>
                <td>${o.customerEmail}</td>
                <td style="font-size: 0.8rem;">${itemsStr}</td>
                <td>₹${o.totalAmount}</td>
                <td>
                    <select class="status-select" data-id="${o._id}" style="padding: 5px; border-radius: 4px;">
                        <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                        <option value="Out for Delivery" ${o.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                        <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
            `;
            tbody.appendChild(row);
        });

        tbody.querySelectorAll('.status-select').forEach(sel => {
            sel.addEventListener('change', function() {
                updateOrderStatus(this.dataset.id, this.value);
            });
        });
    })
    .catch(err => console.error("Fetch orders error:", err));
}

function updateOrderStatus(id, status) {
    const token = localStorage.getItem('token');
    fetch(`/api/admin/orders/${id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
    }).then(() => refreshDashboard());
}

function deleteBooking(id) {
    if (confirm("Are you sure you want to delete this booking?")) {
        const token = localStorage.getItem('token');
        fetch(`/api/admin/bookings/${id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            refreshDashboard();
        })
        .catch(err => console.error("Delete failed:", err));
    }
}

function openEditModal(id, name, guests) {
    const modal = document.getElementById('editModal');
    if (!modal) return;
    document.getElementById('editId').value = id;
    document.getElementById('editName').value = name;
    document.getElementById('editGuests').value = guests;
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
}
