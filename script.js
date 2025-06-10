// Konfigurasi Google Sheets
const scriptURL = 'URL_APPS_SCRIPT_ANDA'; // Ganti dengan URL Apps Script Anda
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

// DOM Elements
const expenseForm = document.getElementById('expenseForm');
const expensesList = document.getElementById('expensesList');
const searchInput = document.getElementById('searchInput');
const exportBtn = document.getElementById('exportBtn');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeBtn = document.querySelector('.close-btn');
const monthlyTotalEl = document.getElementById('monthlyTotal');
const dailyTotalEl = document.getElementById('dailyTotal');
const topCategoryEl = document.getElementById('topCategory');

// Format angka ke Rupiah
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

// Format tanggal ke format Indonesia
function formatTanggal(dateString) {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

// Hitung hari berdasarkan tanggal
function getHariFromDate(dateString) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const date = new Date(dateString);
    return days[date.getDay()];
}

// Update tabel pengeluaran
function updateExpensesTable(filteredExpenses = expenses) {
    expensesList.innerHTML = '';
    
    if (filteredExpenses.length === 0) {
        expensesList.innerHTML = '<tr><td colspan="7" style="text-align: center;">Tidak ada data pengeluaran</td></tr>';
        return;
    }
    
    filteredExpenses.forEach((expense, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${formatTanggal(expense.date)}</td>
            <td>${expense.day}</td>
            <td>${formatRupiah(expense.amount)}</td>
            <td>${expense.category}</td>
            <td>${expense.description}</td>
            <td>
                <button class="action-btn edit-btn" data-id="${expense.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${expense.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        expensesList.appendChild(row);
    });
    
    // Tambahkan event listener untuk tombol edit dan hapus
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openEditModal(e.target.closest('button').dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteExpense(e.target.closest('button').dataset.id));
    });
    
    updateSummary();
}

// Update ringkasan
function updateSummary() {
    // Hitung total bulan ini
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyTotal = expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        })
        .reduce((total, exp) => total + parseInt(exp.amount), 0);
    
    // Hitung total hari ini
    const today = new Date().toISOString().split('T')[0];
    const dailyTotal = expenses
        .filter(exp => exp.date === today)
        .reduce((total, exp) => total + parseInt(exp.amount), 0);
    
    // Hitung kategori terbanyak
    const categoryCount = {};
    expenses.forEach(exp => {
        categoryCount[exp.category] = (categoryCount[exp.category] || 0) + parseInt(exp.amount);
    });
    
    let topCategory = '-';
    let maxAmount = 0;
    for (const category in categoryCount) {
        if (categoryCount[category] > maxAmount) {
            maxAmount = categoryCount[category];
            topCategory = category;
        }
    }
    
    monthlyTotalEl.textContent = formatRupiah(monthlyTotal);
    dailyTotalEl.textContent = formatRupiah(dailyTotal);
    topCategoryEl.textContent = topCategory;
}

// Tambah pengeluaran
async function addExpense(e) {
    e.preventDefault();
    
    const date = document.getElementById('date').value;
    const day = document.getElementById('day').value;
    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    
    const newExpense = {
        id: Date.now().toString(),
        date,
        day,
        amount,
        description,
        category
    };
    
    expenses.push(newExpense);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    
    // Kirim ke Google Sheets
    try {
        await axios.post(scriptURL, {
            action: 'add',
            data: newExpense
        });
    } catch (error) {
        console.error('Gagal menyimpan ke Google Sheets:', error);
    }
    
    expenseForm.reset();
    updateExpensesTable();
}

// Buka modal edit
function openEditModal(id) {
    const expense = expenses.find(exp => exp.id === id);
    if (!expense) return;
    
    document.getElementById('editId').value = expense.id;
    document.getElementById('editDate').value = expense.date;
    document.getElementById('editDay').value = expense.day;
    document.getElementById('editAmount').value = expense.amount;
    document.getElementById('editDescription').value = expense.description;
    document.getElementById('editCategory').value = expense.category;
    
    editModal.style.display = 'flex';
}

// Update pengeluaran
async function updateExpense(e) {
    e.preventDefault();
    
    const id = document.getElementById('editId').value;
    const date = document.getElementById('editDate').value;
    const day = document.getElementById('editDay').value;
    const amount = document.getElementById('editAmount').value;
    const description = document.getElementById('editDescription').value;
    const category = document.getElementById('editCategory').value;
    
    const updatedExpense = {
        id,
        date,
        day,
        amount,
        description,
        category
    };
    
    expenses = expenses.map(exp => exp.id === id ? updatedExpense : exp);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    
    // Update di Google Sheets
    try {
        await axios.post(scriptURL, {
            action: 'update',
            data: updatedExpense
        });
    } catch (error) {
        console.error('Gagal mengupdate di Google Sheets:', error);
    }
    
    editModal.style.display = 'none';
    updateExpensesTable();
}

// Hapus pengeluaran
async function deleteExpense(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')) return;
    
    expenses = expenses.filter(exp => exp.id !== id);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    
    // Hapus dari Google Sheets
    try {
        await axios.post(scriptURL, {
            action: 'delete',
            id: id
        });
    } catch (error) {
        console.error('Gagal menghapus dari Google Sheets:', error);
    }
    
    updateExpensesTable();
}

// Ekspor ke Excel
function exportToExcel() {
    // Kirim permintaan ekspor ke Google Apps Script
    axios.post(scriptURL, {
        action: 'export',
        data: expenses
    })
    .then(response => {
        if (response.data.url) {
            window.open(response.data.url, '_blank');
        }
    })
    .catch(error => {
        console.error('Gagal mengekspor:', error);
        alert('Gagal mengekspor data. Silakan coba lagi.');
    });
}

// Event Listeners
expenseForm.addEventListener('submit', addExpense);
editForm.addEventListener('submit', updateExpense);
closeBtn.addEventListener('click', () => editModal.style.display = 'none');
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = expenses.filter(exp => 
        exp.description.toLowerCase().includes(searchTerm) || 
        exp.category.toLowerCase().includes(searchTerm) ||
        exp.day.toLowerCase().includes(searchTerm)
    );
    updateExpensesTable(filtered);
});
exportBtn.addEventListener('click', exportToExcel);

// Tutup modal saat klik di luar
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        editModal.style.display = 'none';
    }
});

// Otomatis set hari saat tanggal dipilih
document.getElementById('date').addEventListener('change', function() {
    const selectedDate = this.value;
    if (selectedDate) {
        document.getElementById('day').value = getHariFromDate(selectedDate);
    }
});

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    // Set tanggal default ke hari ini
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    document.getElementById('day').value = getHariFromDate(today);
    
    updateExpensesTable();
});

// Fungsi untuk sinkronisasi dengan Google Sheets
async function syncWithGoogleSheets() {
    try {
        const response = await axios.get(scriptURL + '?action=getAll');
        if (response.data && response.data.length > 0) {
            expenses = response.data;
            localStorage.setItem('expenses', JSON.stringify(expenses));
            updateExpensesTable();
        }
    } catch (error) {
        console.error('Gagal sinkronisasi dengan Google Sheets:', error);
    }
}

// Sinkronisasi saat pertama kali load
syncWithGoogleSheets();
