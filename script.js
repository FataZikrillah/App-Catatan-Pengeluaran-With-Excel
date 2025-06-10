document.addEventListener('DOMContentLoaded', function() {
    // Inisialisasi data dari localStorage
    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    
    // Elemen form
    const expenseForm = document.getElementById('expenseForm');
    const dateInput = document.getElementById('date');
    const dayInput = document.getElementById('day');
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const descriptionInput = document.getElementById('description');
    
    // Elemen tabel
    const expenseTableBody = document.getElementById('expenseTableBody');
    const totalAmountElement = document.getElementById('totalAmount');
    const searchInput = document.getElementById('searchInput');
    const exportBtn = document.getElementById('exportBtn');
    
    // Set tanggal default ke hari ini
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    // Set hari berdasarkan tanggal
    dateInput.addEventListener('change', function() {
        const selectedDate = new Date(this.value);
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const dayName = days[selectedDate.getDay()];
        dayInput.value = dayName;
    });
    
    // Submit form
    expenseForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const expense = {
            id: Date.now(),
            date: dateInput.value,
            day: dayInput.value,
            amount: parseFloat(amountInput.value),
            category: categoryInput.value,
            description: descriptionInput.value
        };
        
        expenses.push(expense);
        saveExpenses();
        renderExpenses();
        updateSummary();
        
        // Reset form
        expenseForm.reset();
        dateInput.value = today;
    });
    
    // Render data ke tabel
    function renderExpenses(filteredExpenses = null) {
        const dataToRender = filteredExpenses || expenses;
        
        expenseTableBody.innerHTML = '';
        
        if (dataToRender.length === 0) {
            expenseTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Tidak ada data pengeluaran</td></tr>';
            return;
        }
        
        dataToRender.forEach((expense, index) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${formatDate(expense.date)}</td>
                <td>${expense.day}</td>
                <td>Rp ${expense.amount.toLocaleString('id-ID')}</td>
                <td>${expense.category}</td>
                <td>${expense.description || '-'}</td>
                <td class="actions">
                    <button class="btn-edit" data-id="${expense.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" data-id="${expense.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            
            expenseTableBody.appendChild(row);
        });
        
        // Tambahkan event listener untuk tombol edit dan delete
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', handleEdit);
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });
    }
    
    // Format tanggal
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    }
    
    // Handle edit
    function handleEdit(e) {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        const expense = expenses.find(exp => exp.id === id);
        
        if (expense) {
            dateInput.value = expense.date;
            dayInput.value = expense.day;
            amountInput.value = expense.amount;
            categoryInput.value = expense.category;
            descriptionInput.value = expense.description || '';
            
            // Hapus data yang akan diedit
            expenses = expenses.filter(exp => exp.id !== id);
            saveExpenses();
            renderExpenses();
            updateSummary();
        }
    }
    
    // Handle delete
    function handleDelete(e) {
        if (confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')) {
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            expenses = expenses.filter(exp => exp.id !== id);
            saveExpenses();
            renderExpenses();
            updateSummary();
        }
    }
    
    // Update summary
    function updateSummary() {
        const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        totalAmountElement.textContent = `Rp ${total.toLocaleString('id-ID')}`;
    }
    
    // Save to localStorage
    function saveExpenses() {
        localStorage.setItem('expenses', JSON.stringify(expenses));
    }
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredExpenses = expenses.filter(expense => 
            expense.day.toLowerCase().includes(searchTerm) ||
            expense.category.toLowerCase().includes(searchTerm) ||
            (expense.description && expense.description.toLowerCase().includes(searchTerm)) ||
            expense.amount.toString().includes(searchTerm)
        );
        renderExpenses(filteredExpenses);
    });
    
    // Export to Google Sheets
    // Export to Google Sheets
exportBtn.addEventListener('click', function() {
    if (expenses.length === 0) {
        alert('Tidak ada data untuk diexport!');
        return;
    }
    
    // Gunakan URL Google Apps Script Anda
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbzfmow0AGHwEDJAsv8otlxfxrqruc3rdCYF_5kBhsfyRgOFqvouJXh18tTG0X6WcSmN0A/exec';
    
    const data = {
        expenses: expenses,
        sheetName: 'Pengeluaran_' + new Date().toISOString().slice(0, 10)
    };
    
    exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengekspor...';
    exportBtn.disabled = true;
    
    axios.post(scriptUrl, data)
        .then(response => {
            alert('Data berhasil diexport ke Google Sheets!\nAnda dapat mengaksesnya di: ' + response.data.url);
            console.log('Response:', response.data);
            
            // Buka tab baru dengan URL spreadsheet (opsional)
            window.open(response.data.url, '_blank');
        })
        .catch(error => {
            alert('Gagal mengekspor data: ' + error.message);
            console.error('Error:', error);
        })
        .finally(() => {
            exportBtn.innerHTML = '<i class="fas fa-file-export"></i> Export ke Google Sheets';
            exportBtn.disabled = false;
        });
});
    
    // Inisialisasi tampilan awal
    renderExpenses();
    updateSummary();
});
