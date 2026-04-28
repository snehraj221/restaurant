document.addEventListener('DOMContentLoaded', function() {
    const getToken = () => localStorage.getItem('token');
    const isAdmin = () => localStorage.getItem('isAdmin') === 'true';

    if (!getToken() || !isAdmin()) {
        window.location.href = '/login';
        return;
    }

    const editModal = document.getElementById('editModal');
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => editModal.style.display = 'none');

    // Tab Logic
    const tabs = document.querySelectorAll('.tab');
    const sections = {
        'bookings': document.getElementById('bookings-section'),
        'orders': document.getElementById('orders-section'),
        'inquiries': document.getElementById('inquiries-section'),
        'menu': document.getElementById('menu-section')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            Object.values(sections).forEach(s => s.style.display = 'none');
            if (sections[target]) sections[target].style.display = 'block';
            
            refreshDashboard();
        });
    });

    // Modal close buttons
    const cancelAddMenuBtn = document.getElementById('cancelAddMenuBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelAddMenuBtn) cancelAddMenuBtn.addEventListener('click', () => document.getElementById('addMenuModal').style.display = 'none');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => document.getElementById('editModal').style.display = 'none');

    // Stats
    const fetchStats = () => {
        fetch('/api/stats', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const map = {
                    'stat-bookings': data.bookings,
                    'stat-orders': data.orders,
                    'stat-contacts': data.contacts,
                    'stat-menu': data.menuItems
                };
                for (const [id, val] of Object.entries(map)) {
                    const el = document.getElementById(id);
                    if (el) el.innerText = val;
                }
            }
        }).catch(err => console.error("Stats Error:", err));
    };

    // Bookings
    const fetchBookings = () => {
        const tableBody = document.getElementById('bookingsTableBody');
        if (!tableBody) return;

        fetch('/api/admin/bookings', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        })
        .then(res => res.json())
        .then(data => {
            tableBody.innerHTML = '';
            const items = data.data || data;
            if (!Array.isArray(items)) return;
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

            // Listeners for edit/delete
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
        });
    };

    // Orders
    const fetchOrdersAdmin = () => {
        fetch('/api/admin/orders', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        })
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('ordersTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';
            const items = data.data || data;
            if (!Array.isArray(items)) return;
            
            items.forEach(o => {
                let itemsStr = "";
                try {
                    const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                    itemsStr = items.map(i => i.name).join(', ');
                } catch(e) { itemsStr = o.items; }

                tbody.innerHTML += `
                    <tr>
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
                    </tr>
                `;
            });

            tbody.querySelectorAll('.status-select').forEach(select => {
                select.addEventListener('change', function() {
                    updateOrderStatus(this.dataset.id, this.value);
                });
            });
        });
    };

    window.openEditModal = (id, name, guests) => {
        document.getElementById('editId').value = id;
        document.getElementById('editName').value = name;
        document.getElementById('editGuests').value = guests;
        editModal.style.display = 'flex';
    };

    window.deleteBooking = (id) => {
        if (confirm("Are you sure?")) {
            fetch(`/api/admin/bookings/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            })
            .then(() => refreshDashboard());
        }
    };

    window.updateOrderStatus = (id, status) => {
        fetch(`/api/admin/orders/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ status })
        }).then(() => refreshDashboard());
    };

    window.refreshDashboard = () => {
        fetchStats();
        fetchBookings();
        fetchOrdersAdmin();
        fetchInquiries();
        fetchMenu();
    };

    const fetchInquiries = () => {
        const tbody = document.getElementById('contactsTableBody');
        if (!tbody) return;
        fetch('/api/admin/contacts', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        })
        .then(res => res.json())
        .then(data => {
            tbody.innerHTML = '';
            const items = data.data || [];
            items.forEach(c => {
                tbody.innerHTML += `
                    <tr>
                        <td style="font-size: 0.8rem;">${new Date(c.createdAt).toLocaleDateString()}</td>
                        <td>${c.fullName}</td>
                        <td>${c.subject}</td>
                        <td>${c.message}</td>
                    </tr>
                `;
            });
        });
    };

    // Global delegation for delete buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('del-menu-btn')) {
            const id = e.target.dataset.id;
            deleteMenuItem(id);
        }
    });

    const fetchMenu = () => {
        const tbody = document.getElementById('menuTableBody');
        if (!tbody) return;
        fetch('/api/menu').then(res => res.json()).then(data => {
            tbody.innerHTML = '';
            const items = data.data || data || [];
            if (!Array.isArray(items)) return;
            items.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>₹${item.price}</td>
                    <td>${item.description}</td>
                    <td><button class="del-btn del-menu-btn" data-id="${item._id}">Delete</button></td>
                `;
                tbody.appendChild(row);
            });
        }).catch(err => console.error("Menu fetch error:", err));
    };

    const deleteMenuItem = (id) => {
        if(confirm("Remove this dish?")) {
            fetch(`/api/admin/menu/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            }).then(() => fetchMenu());
        }
    };

    const addDishBtn = document.getElementById('addDishBtn');
    if (addDishBtn) {
        addDishBtn.addEventListener('click', () => {
            document.getElementById('addMenuModal').style.display = 'flex';
        });
    }

    const menuForm = document.getElementById('addMenuForm');
    const menuImgFile = document.getElementById('menuImgFile');
    const menuImgUrl = document.getElementById('menuImgUrl');
    const previewArea = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    if (menuImgFile) {
        menuImgFile.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                    previewArea.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (menuForm) {
        menuForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const saveBtn = document.getElementById('saveMenuBtn');
            saveBtn.innerText = "Saving...";
            saveBtn.disabled = true;

            let finalImageUrl = menuImgUrl.value.trim();
            
            // If file is uploaded, convert to base64
            const file = menuImgFile.files[0];
            if (file) {
                finalImageUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
            }

            const dish = {
                name: document.getElementById('menuName').value,
                price: document.getElementById('menuPrice').value,
                category: document.getElementById('menuCategory').value,
                description: document.getElementById('menuDesc').value,
                imageUrl: finalImageUrl
            };

            fetch('/api/admin/menu', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(dish)
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    const modal = document.getElementById('addMenuModal');
                    if (modal) modal.style.display = 'none';
                    menuForm.reset();
                    if (previewArea) previewArea.style.display = 'none';
                    fetchMenu();
                } else {
                    alert(data.message || "Failed to add dish");
                }
            })
            .finally(() => {
                if (saveBtn) {
                    saveBtn.innerText = "Save to Menu";
                    saveBtn.disabled = false;
                }
            });
        });
    }

    // Since I missed the inquiries route, I'll add it in the next step to api.js.
    // For now, refresh everything.
    // Edit Form Submission
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('editId').value;
            const data = {
                customerName: document.getElementById('editName').value,
                numberOfPeople: document.getElementById('editGuests').value
            };

            fetch(`/api/admin/bookings/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(data)
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    const modal = document.getElementById('editModal');
                    if (modal) modal.style.display = 'none';
                    refreshDashboard();
                } else {
                    alert(data.message || "Update failed");
                }
            });
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.innerText = "Refreshing...";
            refreshDashboard();
            setTimeout(() => {
                refreshBtn.innerText = "Refresh Data";
            }, 1000);
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('user');
            window.location.href = '/login';
        });
    }

    refreshDashboard();
    setInterval(refreshDashboard, 30000);
});
