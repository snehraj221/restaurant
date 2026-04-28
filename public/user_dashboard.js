document.addEventListener('DOMContentLoaded', function() {
    const getToken = () => localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !getToken()) {
        window.location.href = '/login';
        return;
    }

    document.getElementById('userName').innerText = user.name;

    const showTab = (type) => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        const activeTab = document.querySelector(`.tab[data-tab="${type}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        // Sections
        document.getElementById('bookings-section').style.display = (type === 'bookings') ? 'block' : 'none';
        document.getElementById('orders-section').style.display = (type === 'orders') ? 'block' : 'none';
        document.getElementById('profile-section').style.display = (type === 'profile') ? 'block' : 'none';

        if (type === 'bookings') fetchBookings();
        else if (type === 'orders') fetchOrders();
        else if (type === 'profile') fetchProfile();
    };

    // Attach Tab Listeners
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            showTab(this.dataset.tab);
        });
    });

    const fetchBookings = () => {
        fetch('/api/user/bookings', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        })
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('bookingList');
            if (!list) return;
            const items = data.data || data;
            
            // Update Stats
            if (Array.isArray(items)) {
                document.getElementById('statVisits').innerText = items.length;
            }

            list.innerHTML = (Array.isArray(items) && items.length) ? '' : '<p>No bookings yet.</p>';
            if (!Array.isArray(items)) return;
            items.forEach(b => {
                const row = document.createElement('div');
                row.className = 'card';
                row.innerHTML = `
                    <div>
                        <h4 style="color: #800000;">${b.bookingDate} at ${b.bookingTime}</h4>
                        <p style="font-size: 0.9rem; color: #666;">${b.numberOfPeople} Guests • Ref: #${String(b._id).slice(-4)}</p>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button onclick="openEditModal('${b._id}', '${b.bookingDate}', '${b.bookingTime}')" class="status-badge" style="background: #e7f3ff; color: #007bff; border: none; cursor: pointer;">Edit</button>
                        <button onclick="cancelBooking('${b._id}')" class="status-badge" style="background: #ffebeb; color: #dc3545; border: none; cursor: pointer;">Cancel</button>
                        <div class="status-badge">Confirmed</div>
                    </div>
                `;
                list.appendChild(row);
            });
        })
        .catch(err => console.error("Fetch bookings error:", err));
    };

    const fetchOrders = () => {
        fetch('/api/user/orders', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        })
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('orderList');
            if (!list) return;
            const items = data.data || data;
            
            // Update Stats
            if (Array.isArray(items)) {
                const total = items.reduce((acc, o) => acc + (o.status !== 'Cancelled' ? Number(o.totalAmount || 0) : 0), 0);
                document.getElementById('statSpent').innerText = `₹${total}`;
            }

            list.innerHTML = (Array.isArray(items) && items.length) ? '' : '<p>No orders yet.</p>';
            if (!Array.isArray(items)) return;
            items.forEach(o => {
                let itemsStr = "";
                try {
                    const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                    itemsStr = Array.isArray(items) ? items.map(i => i.name).join(', ') : "Mixed Items";
                } catch(e) { itemsStr = "Order Items"; }
                
                const isCancellable = o.status === 'Pending';
                
                const row = document.createElement('div');
                row.className = 'card';
                row.innerHTML = `
                    <div>
                        <h4 style="color: #800000;">Order #${String(o._id).slice(-4)}</h4>
                        <p class="order-items">${itemsStr}</p>
                        <p style="font-weight: bold; margin-top: 5px;">Total: ₹${o.totalAmount}</p>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        ${isCancellable ? `<button onclick="cancelOrder('${o._id}')" class="status-badge" style="background: #ffebeb; color: #dc3545; border: none; cursor: pointer;">Cancel</button>` : ''}
                        <div class="status-badge" style="background: ${o.status === 'Cancelled' ? '#f8d7da' : '#fff3cd'}; color: ${o.status === 'Cancelled' ? '#721c24' : '#856404'};">${o.status}</div>
                    </div>
                `;
                list.appendChild(row);
            });
        })
        .catch(err => console.error("Fetch orders error:", err));
    };

    const fetchProfile = () => {
        document.getElementById('profileName').value = user.name;
        document.getElementById('profileEmail').value = user.email;
    };

    // --- Action Functions (Global for onclick) ---

    window.openEditModal = (id, date, time) => {
        document.getElementById('editBookingId').value = id;
        document.getElementById('editDate').value = date;
        document.getElementById('editTime').value = time;
        document.getElementById('editModal').style.display = 'flex';
    };

    window.closeEditModal = () => {
        document.getElementById('editModal').style.display = 'none';
    };

    window.cancelBooking = (id) => {
        if (!confirm("Are you sure you want to cancel this booking?")) return;
        fetch(`/api/user/bookings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("Booking cancelled successfully.");
                fetchBookings();
            } else alert(data.message);
        });
    };

    window.cancelOrder = (id) => {
        if (!confirm("Are you sure you want to cancel this order?")) return;
        fetch(`/api/user/orders/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}` 
            },
            body: JSON.stringify({ status: 'Cancelled' })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("Order cancelled.");
                fetchOrders();
            } else alert(data.message);
        });
    };

    // Forms Handling
    document.getElementById('editBookingForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('editBookingId').value;
        const date = document.getElementById('editDate').value;
        const time = document.getElementById('editTime').value;

        fetch(`/api/user/bookings/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}` 
            },
            body: JSON.stringify({ bookingDate: date, bookingTime: time })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("Timing updated!");
                closeEditModal();
                fetchBookings();
            } else alert(data.message);
        });
    });

    document.getElementById('profileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('profileName').value;
        // Profile update logic could be added here
        alert("Profile updated locally. Feature coming soon to cloud.");
    });

    // Initial Load
    fetchBookings();
    fetchOrders();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '/login';
        });
    }
});
