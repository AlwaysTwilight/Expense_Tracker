// Data and state management
class ExpenseTracker {
    constructor() {
        // Initialize data structures
        this.expenses = [];
        this.budgets = [];
        this.miscExpenses = [];
        this.chartInstances = {};
        this.settings = {};
        
        // Load settings and data from localStorage
        this.loadSettings();
        this.loadData();
        
        // Set the current date information
        const now = new Date();
        this.currentMonth = now.toLocaleString('default', { month: 'long' });
        this.currentYear = now.getFullYear();
        this.currentDate = now;
        
        // Check if it's the start of the month (1-5th day)
        this.isStartOfMonth = now.getDate() <= 5;
        
        // Check if the month has been reset already to avoid resetting multiple times
        this.checkMonthlyReset();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.initUI();
        
        // Apply theme
        this.applyTheme(this.settings.theme || 'light');
        
        // Show initial page
        this.showPage('dashboard');
        this.updateDashboard();
    
        document.addEventListener('DOMContentLoaded', () => {
            const foodTab = document.getElementById('food-tab');
            if (foodTab) {
                foodTab.click(); // Programmatically click the food tab to ensure it's active
            }
            
            // Apply credit card visibility settings
            this.updateCreditCardVisibility();
        });
    }

    checkMonthlyReset() {
        try {
            // Check if we need to reset the month's budget
            if (this.isStartOfMonth) {
                // Get the last reset date from localStorage
                const lastReset = localStorage.getItem('lastMonthlyReset');
                const thisMonthKey = `${this.currentMonth}-${this.currentYear}`;
                
                // If no reset has been done this month or it's a new month
                if (!lastReset || lastReset !== thisMonthKey) {
                    // Create a new budget for this month with default values
                    let monthBudget = this.getMonthBudget(this.currentMonth, this.currentYear);
                    
                    if (!monthBudget) {
                        // If no budget exists, create a new one with default values from settings
                        monthBudget = {
                            Month: this.currentMonth,
                            Year: this.currentYear,
                            TotalBudget: this.settings.defaultCashBalance + this.settings.defaultBankBalance,
                            SIP: this.settings.defaultSIP,
                            Rent: this.settings.defaultRent,
                            CreditCard: 0,
                            Electricity: 0,
                            WaterBill: 0,
                            Laundry: 0,
                            CreditCardPaid: false,
                            ElectricityPaid: false,
                            WaterBillPaid: false,
                            LaundryPaid: false,
                            SIPPaid: false,
                            RentPaid: false,
                            SavingsGoal: this.settings.defaultSavingsGoal,
                            HasSavingsGoal: true,
                            CreditCardBalance: this.settings.defaultCreditLimit,
                            CreditCardUsed: 0,
                            PreviousMonthCredit: 0
                            // Don't set initialCashBalance or initialBankBalance by default
                            // They should only be set when explicitly changed in the budget page
                        };
                        this.budgets.push(monthBudget);
                        this.saveData();
                    } else {
                        // Reset values to defaults while keeping any user customizations
                        // Don't overwrite initialCashBalance or initialBankBalance if already set
                        monthBudget.TotalBudget = this.settings.defaultCashBalance + this.settings.defaultBankBalance;
                        monthBudget.SIP = this.settings.defaultSIP;
                        monthBudget.Rent = this.settings.defaultRent;
                        monthBudget.SavingsGoal = this.settings.defaultSavingsGoal;
                        monthBudget.CreditCardUsed = 0;
                        monthBudget.SIPPaid = false;
                        monthBudget.RentPaid = false;
                        
                        // Remove initial values to ensure they get defaults
                        delete monthBudget.initialCashBalance;
                        delete monthBudget.initialBankBalance;
                        
                        this.saveData();
                    }
                    
                    // Save that we've reset this month
                    localStorage.setItem('lastMonthlyReset', thisMonthKey);
                    
                    this.showToast(`Budget reset for new month: ${this.currentMonth} ${this.currentYear}`, 'info');
                }
            }
        } catch (error) {
            console.error('Error checking monthly reset:', error);
        }
    }
    
    // Settings management
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('settings');
            
            if (savedSettings) {
                this.settings = JSON.parse(savedSettings);
                
                // Ensure all required settings are present
                if (this.settings.creditCardEnabled === undefined) {
                    this.settings.creditCardEnabled = true;
                }
                
                // Make sure all needed settings have default values if missing
                this.settings.defaultCashBalance = this.settings.defaultCashBalance || 2000;
                this.settings.defaultBankBalance = this.settings.defaultBankBalance || 8000;
            } else {
                // Default settings
                this.settings = {
                    theme: 'light',
                    currency: '₹',
                    dateFormat: 'dd/mm/yyyy',
                    itemsPerPage: 25,
                    defaultBudget: 15000, // This will be calculated from cash + bank
                    defaultSIP: 2000,
                    defaultRent: 1900,
                    defaultCreditLimit: 10000,
                    defaultPaymentMethod: 'UPI',
                    defaultCashBalance: 2000,
                    defaultBankBalance: 8000,
                    defaultSavingsGoal: 1000,
                    creditCardEnabled: true // Setting for credit card toggle
                };
                this.saveSettings();
            }
            
            // Calculate default budget based on cash and bank balance
            this.settings.defaultBudget = this.settings.defaultCashBalance + this.settings.defaultBankBalance;
            this.saveSettings();
        } catch (error) {
            console.error('Error loading settings:', error);
            
            // Initialize with default settings if there's an error
            this.settings = {
                theme: 'light',
                currency: '₹',
                dateFormat: 'dd/mm/yyyy',
                itemsPerPage: 25,
                defaultSIP: 2000,
                defaultRent: 1900,
                defaultCreditLimit: 10000,
                defaultPaymentMethod: 'UPI',
                defaultCashBalance: 2000,
                defaultBankBalance: 8000,
                defaultSavingsGoal: 1000,
                creditCardEnabled: true
            };
            
            // Calculate default budget based on cash and bank balance
            this.settings.defaultBudget = this.settings.defaultCashBalance + this.settings.defaultBankBalance;
            this.saveSettings();
        }
    }
    
    saveSettings() {
        try {
            console.log('Saving settings:', JSON.stringify(this.settings));
            localStorage.setItem('settings', JSON.stringify(this.settings));
            console.log('Settings saved to localStorage successfully');
            
            // Update UI elements based on new settings
            if (this.currentPage === 'budget') {
                const month = document.getElementById('budgetMonth')?.value;
                const year = parseInt(document.getElementById('budgetYear')?.value);
                if (month && year) {
                    this.loadBudgetForm(month, year);
                }
            }
            
            // Update bill values with new defaults
            this.setDefaultBillValues();
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showToast('Error saving settings.', 'error');
        }
    }
    
    applyTheme(theme) {
        // Remove any existing theme classes
        document.body.classList.remove('dark-theme', 'blue-theme');
        
        // Apply the selected theme
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else if (theme === 'blue') {
            document.body.classList.add('blue-theme');
        }
        
        // Save the theme setting
        this.settings.theme = theme;
        this.saveSettings();
    }
    
    // Data loading and saving methods
    loadData() {
        try {
            const savedExpenses = localStorage.getItem('expenses');
            const savedBudgets = localStorage.getItem('budgets');
            
            if (savedExpenses) {
                this.expenses = JSON.parse(savedExpenses);
                // Convert string dates back to Date objects
                this.expenses.forEach(expense => {
                    expense.Date = new Date(expense.Date);
                });
            }
            
            if (savedBudgets) {
                this.budgets = JSON.parse(savedBudgets);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Error loading data. Initializing with empty data.', 'error');
            
            // Initialize with empty arrays if there's an error
            this.expenses = [];
            this.budgets = [];
            
            // Save the empty data to override any corrupted data
            this.saveData();
        }
    }
    
    saveData() {
        try {
            localStorage.setItem('expenses', JSON.stringify(this.expenses));
            localStorage.setItem('budgets', JSON.stringify(this.budgets));
        } catch (error) {
            console.error('Error saving data:', error);
            this.showToast('Error saving data. Please export your data for backup.', 'error');
        }
    }
    
    exportData() {
        const data = {
            expenses: this.expenses,
            budgets: this.budgets,
            settings: this.settings,
            exportDate: new Date()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `expense_tracker_export_${this.formatDateForFilename(new Date())}.json`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Release the object URL to free up memory
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    
    importData(file) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                // Validate data structure
                if (!data.expenses || !data.budgets) {
                    throw new Error('Invalid data format');
                }
                
                // Convert date strings back to Date objects
                data.expenses.forEach(expense => {
                    expense.Date = new Date(expense.Date);
                });
                
                // Backup current data before import
                const currentData = {
                    expenses: this.expenses,
                    budgets: this.budgets,
                    settings: this.settings
                };
                
                localStorage.setItem('dataBackup', JSON.stringify(currentData));
                
                // Import the data
                this.expenses = data.expenses;
                this.budgets = data.budgets;
                
                // Optionally import settings if available
                if (data.settings) {
                    this.settings = data.settings;
                }
                
                // Save the imported data
                this.saveData();
                this.saveSettings();
                
                this.showToast('Data imported successfully!', 'success');
                
                // Refresh UI
                this.updateDashboard();
                this.updateExpensesTable();
                if (this.currentPage === 'analysis') {
                    this.updateAnalysisPage();
                } else if (this.currentPage === 'budget') {
                    this.updateBudgetHistory();
                }
                
                // Apply theme
                this.applyTheme(this.settings.theme || 'light');
                
            } catch (error) {
                console.error('Error importing data:', error);
                this.showToast('Error importing data. Please check the file format.', 'error');
            }
        };
        
        reader.readAsText(file);
    }
    
    resetApplication() {
        // Clear all data
        this.expenses = [];
        this.budgets = [];
        
        // Reset to default settings
        this.settings = {
            theme: 'light',
            currency: '₹',
            dateFormat: 'dd/mm/yyyy',
            itemsPerPage: 25,
            defaultBudget: 15000,
            defaultSIP: 2000,
            defaultRent: 1900,
            defaultCreditLimit: 10000,
            defaultPaymentMethod: 'UPI',
            initialCashBalance: 2000,
            initialBankBalance: 8000,
            defaultSavingsGoal: 1000 // Default savings goal for each month
        };
        
        // Save reset data
        this.saveData();
        this.saveSettings();
        
        // Apply theme
        this.applyTheme('light');
        
        // Update UI
        this.updateDashboard();
        this.updateExpensesTable();
        
        this.showToast('Application has been reset to initial state.', 'success');
    }
    
    // Add a method to update balances based on payment method
    updateBalanceForExpense(amount, paymentMethod, date) {
        try {
            const month = date.toLocaleString('default', { month: 'long' });
            const year = date.getFullYear();
            let monthBudget = this.getMonthBudget(month, year);
            
            if (!monthBudget) {
                // Create new budget entry if it doesn't exist
                monthBudget = {
                    Month: month,
                    Year: year,
                    TotalBudget: this.settings.defaultCashBalance + this.settings.defaultBankBalance,
                    SIP: this.settings.defaultSIP,
                    Rent: this.settings.defaultRent,
                    CreditCard: 0,
                    Electricity: 0,
                    WaterBill: 0,
                    Laundry: 0,
                    CreditCardPaid: false,
                    ElectricityPaid: false,
                    WaterBillPaid: false,
                    LaundryPaid: false,
                    SIPPaid: false,
                    RentPaid: false,
                    SavingsGoal: 0,
                    HasSavingsGoal: false,
                    CreditCardBalance: this.settings.defaultCreditLimit,
                    CreditCardUsed: 0,
                    PreviousMonthCredit: 0
                    // Don't set initialCashBalance/initialBankBalance by default
                };
                this.budgets.push(monthBudget);
            }
            
            // Update the appropriate balance based on payment method
            if (paymentMethod === 'Credit Card') {
                // Add to credit card usage
                monthBudget.CreditCardUsed = (monthBudget.CreditCardUsed || 0) + amount;
            }
            
            this.saveData();
        } catch (error) {
            console.error('Error updating balance for expense:', error);
        }
    }


    updateCreditCardVisibility() {
        try {
            const creditCardEnabled = this.settings.creditCardEnabled;
            
            // Hide/show credit card related elements
            // FIX: Use proper selectors instead of :contains which isn't supported
            const creditCardElements = [
                // Dashboard elements - find by class or more specific selectors
                document.querySelectorAll('.credit-card')[2], // The third credit card element (assuming it's "Credit Available")
                // Expense page elements
                document.querySelectorAll('option[value="Credit Card"]'),
                // Budget page elements
                document.getElementById('creditCardLimit')?.closest('.mb-3'),
                document.getElementById('previousMonthCredit')?.closest('.mb-3')
            ];
            
            creditCardElements.forEach(element => {
                if (element) {
                    if (Array.isArray(element) || element instanceof NodeList) {
                        element.forEach(el => {
                            if (el) {
                                el.style.display = creditCardEnabled ? '' : 'none';
                            }
                        });
                    } else {
                        element.style.display = creditCardEnabled ? '' : 'none';
                    }
                }
            });
            
            // Update payment method options in all selects
            document.querySelectorAll('select').forEach(select => {
                if (select.id && select.id.includes('PaymentMethod')) {
                    const creditOption = Array.from(select.options).find(option => option.value === 'Credit Card');
                    if (creditOption) {
                        creditOption.disabled = !creditCardEnabled;
                        if (!creditCardEnabled && creditOption.selected) {
                            // Find UPI or Cash option
                            const upiOption = Array.from(select.options).find(option => option.value === 'UPI');
                            const cashOption = Array.from(select.options).find(option => option.value === 'Cash');
                            if (upiOption) {
                                upiOption.selected = true;
                            } else if (cashOption) {
                                cashOption.selected = true;
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error updating credit card visibility:', error);
        }
    }

    // UI Initialization
    initUI() {
        try {
            // Initialize the budget year dropdown
            const yearSelect = document.getElementById('budgetYear');
            const currentYear = new Date().getFullYear();
            
            if (yearSelect) {
                yearSelect.innerHTML = '';
                const currentYear = new Date().getFullYear();
                for (let year = 2020; year <= 2100; year++) {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    if (year === currentYear) {
                        option.selected = true;
                    }
                    yearSelect.appendChild(option);
                }
            }
            
            // Add Petrol option to Misc dropdown
            const miscTagSelect = document.getElementById('miscTag');
            if (miscTagSelect) {
                // Check if Petrol option already exists
                let petrolOptionExists = false;
                for (let i = 0; i < miscTagSelect.options.length; i++) {
                    if (miscTagSelect.options[i].value === 'Petrol') {
                        petrolOptionExists = true;
                        break;
                    }
                }
                
                // Add Petrol option if it doesn't exist
                if (!petrolOptionExists) {
                    const petrolOption = document.createElement('option');
                    petrolOption.value = 'Petrol';
                    petrolOption.textContent = 'Petrol';
                    
                    // Insert after the first option (if it exists)
                    if (miscTagSelect.options.length > 0) {
                        miscTagSelect.insertBefore(petrolOption, miscTagSelect.options[1]);
                    } else {
                        miscTagSelect.appendChild(petrolOption);
                    }
                }
            }
            
            // Set current month in dropdown
            const budgetMonth = document.getElementById('budgetMonth');
            if (budgetMonth) {
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                               'July', 'August', 'September', 'October', 'November', 'December'];
                budgetMonth.innerHTML = '';
                
                const currentMonth = new Date().toLocaleString('default', { month: 'long' });
                months.forEach(month => {
                    const option = document.createElement('option');
                    option.value = month;
                    option.textContent = month;
                    if (month === currentMonth) {
                        option.selected = true;
                    }
                    budgetMonth.appendChild(option);
                });
            }
            
            const expenseDateInput = document.getElementById('expenseDate');
            if (expenseDateInput) {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                expenseDateInput.value = `${year}-${month}-${day}`;
            }
            
            // Show savings goal container if it's the start of the month
            const savingsGoalContainer = document.getElementById('savingsGoalContainer');
            if (savingsGoalContainer && this.isStartOfMonth) {
                savingsGoalContainer.classList.remove('d-none');
                
                // Check if a savings goal has already been set for this month
                const monthBudget = this.getMonthBudget(this.currentMonth, this.currentYear);
                
                if (monthBudget && monthBudget.HasSavingsGoal) {
                    const setSavingsGoal = document.getElementById('setSavingsGoal');
                    const savingsGoalAmountContainer = document.getElementById('savingsGoalAmountContainer');
                    const savingsGoalAmount = document.getElementById('savingsGoalAmount');
                    
                    if (setSavingsGoal && savingsGoalAmountContainer && savingsGoalAmount) {
                        setSavingsGoal.checked = true;
                        savingsGoalAmountContainer.classList.remove('d-none');
                        savingsGoalAmount.value = monthBudget.SavingsGoal || 0;
                    }
                }
            }
            
            // Initialize the budget form with values for the current month/year
            this.loadBudgetForm(this.currentMonth, this.currentYear);
            
            // Initialize petrol tab based on day of week (Monday = 1)
            const today = new Date();
            const isMonday = today.getDay() === 1;
            
            const petrolWarning = document.getElementById('petrolWarning');
            const petrolForm = document.getElementById('petrolForm');
            
            if (petrolWarning && petrolForm) {
                if (isMonday) {
                    petrolWarning.classList.add('d-none');
                    petrolForm.classList.remove('d-none');
                } else {
                    petrolWarning.classList.remove('d-none');
                    petrolForm.classList.add('d-none');
                }
            }
            
            // Initialize bill payment switches based on current month's data
            this.updateBillPaymentStatus();
            
            // Calculate food items total when textarea changes
            const foodItemsList = document.getElementById('foodItemsList');
            const foodTotal = document.getElementById('foodTotal');
            
            if (foodItemsList && foodTotal) {
                foodItemsList.addEventListener('input', () => {
                    const total = this.calculateFoodTotal();
                    foodTotal.textContent = `${this.settings.currency}${total.toFixed(2)}`;
                });
            }
            
            // Show/hide custom tag input when "Others" is selected
            const miscTag = document.getElementById('miscTag');
            const customTagContainer = document.getElementById('customTagContainer');
            
            if (miscTag && customTagContainer) {
                miscTag.addEventListener('change', (e) => {
                    if (e.target.value === 'Others') {
                        customTagContainer.classList.remove('d-none');
                    } else {
                        customTagContainer.classList.add('d-none');
                    }
                });
            }
            
            // Initialize the expenses table
            this.updateExpensesTable();
            
            // Initialize dashboard charts
            this.updateDashboardCharts();
            
            // Populate settings form with current settings
            this.initSettingsForm();
            
            // Initialize analysis filters
            this.initAnalysisFilters();
            
            // NEW: Set default bill values
            this.setDefaultBillValues();
            
            // Ensure Food tab is active by default on the expenses page
            const foodTab = document.getElementById('food-tab');
            const foodContent = document.getElementById('food');
            const billsTab = document.getElementById('bills-tab');
            const billsContent = document.getElementById('bills');
            const miscTab = document.getElementById('misc-tab');
            const miscContent = document.getElementById('misc');
            
            if (foodTab && foodContent && billsTab && billsContent && miscTab && miscContent) {
                // Make sure Food tab has the active class
                foodTab.classList.add('active');
                foodTab.setAttribute('aria-selected', 'true');
                foodContent.classList.add('show', 'active');
                
                // Make sure Bills tab doesn't have the active class
                billsTab.classList.remove('active');
                billsTab.setAttribute('aria-selected', 'false');
                billsContent.classList.remove('show', 'active');
                
                // Make sure Misc tab doesn't have the active class
                miscTab.classList.remove('active');
                miscTab.setAttribute('aria-selected', 'false');
                miscContent.classList.remove('show', 'active');
                
                // Fix tabs not showing correctly when clicking between tabs
                document.querySelectorAll('#expenseTabs .nav-link').forEach(tab => {
                    tab.addEventListener('click', (e) => {
                        e.preventDefault();
                        
                        // Remove active class from all tabs
                        document.querySelectorAll('#expenseTabs .nav-link').forEach(t => {
                            t.classList.remove('active');
                            t.setAttribute('aria-selected', 'false');
                        });
                        
                        // Hide all tab panes
                        document.querySelectorAll('#expenseTabsContent .tab-pane').forEach(pane => {
                            pane.classList.remove('show', 'active');
                        });
                        
                        // Show the selected tab and its content
                        e.target.classList.add('active');
                        e.target.setAttribute('aria-selected', 'true');
                        
                        const target = document.querySelector(e.target.getAttribute('data-bs-target'));
                        if (target) {
                            target.classList.add('show', 'active');
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Error initializing UI:', error);
            this.showToast('Error initializing UI. Please refresh the page.', 'error');
        }
    }
    
    setDefaultBillValues() {
        // Get current month's budget for updated values
        const monthBudget = this.getMonthBudget(this.currentMonth, this.currentYear);
        
        // Set SIP amount from budget if available, otherwise from settings
        const sipAmountInput = document.getElementById('sipAmount');
        if (sipAmountInput) {
            if (monthBudget && monthBudget.SIP !== undefined) {
                sipAmountInput.value = monthBudget.SIP;
            } else {
                sipAmountInput.value = this.settings.defaultSIP;
            }
        }
        
        // Set Rent amount from budget if available, otherwise from settings
        const rentAmountInput = document.getElementById('rentAmount');
        if (rentAmountInput) {
            if (monthBudget && monthBudget.Rent !== undefined) {
                rentAmountInput.value = monthBudget.Rent;
            } else {
                rentAmountInput.value = this.settings.defaultRent;
            }
        }
    }

    initSettingsForm() {
        try {
            const defaultElements = {
                'defaultSIP': this.settings.defaultSIP || 2000,
                'defaultRent': this.settings.defaultRent || 1900,
                'defaultCreditLimit': this.settings.defaultCreditLimit || 10000,
                'defaultPaymentMethod': this.settings.defaultPaymentMethod || 'UPI',
                'themeSelector': this.settings.theme || 'light',
                'currencyFormat': this.settings.currency || '₹',
                'dateFormat': this.settings.dateFormat || 'dd/mm/yyyy',
                'itemsPerPage': this.settings.itemsPerPage || 25,
                'defaultCashBalance': this.settings.defaultCashBalance || 2000,
                'defaultBankBalance': this.settings.defaultBankBalance || 8000,
                'defaultSavingsGoal': this.settings.defaultSavingsGoal || 1000
            };
            
            // Set values for each element if it exists
            Object.entries(defaultElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value;
                }
            });
            
            // Set credit card enabled checkbox
            const creditCardEnabledCheckbox = document.getElementById('creditCardEnabled');
            if (creditCardEnabledCheckbox) {
                creditCardEnabledCheckbox.checked = this.settings.creditCardEnabled !== false;
            }
            
            // Calculate and set default budget (read-only)
            const defaultBudgetInput = document.getElementById('defaultBudget');
            if (defaultBudgetInput) {
                defaultBudgetInput.value = (this.settings.defaultCashBalance + this.settings.defaultBankBalance).toFixed(0);
                defaultBudgetInput.readOnly = true;
                defaultBudgetInput.classList.add('bg-light');
            }
        } catch (error) {
            console.error('Error initializing settings form:', error);
        }
    }
    
    initAnalysisFilters() {
        try {
            // Populate subcategory filters
            const subcategories = new Set();
            this.expenses.forEach(expense => {
                if (expense.Subcategory) {
                    subcategories.add(expense.Subcategory);
                }
            });
            
            const subcategoryContainer = document.getElementById('subcategoryFilters');
            const allSubcategoriesCheckbox = document.getElementById('subcategory-all');
            
            if (subcategoryContainer && allSubcategoriesCheckbox) {
                // Clear existing subcategories (except the "All" option)
                const checkboxes = subcategoryContainer.querySelectorAll('.subcategory-filter');
                checkboxes.forEach(checkbox => checkbox.parentNode.remove());
                
                // Add subcategories from expenses
                subcategories.forEach(subcategory => {
                    if (!subcategory) return; // Skip empty subcategories
                    
                    const formCheck = document.createElement('div');
                    formCheck.className = 'form-check';
                    
                    const checkbox = document.createElement('input');
                    checkbox.className = 'form-check-input subcategory-filter';
                    checkbox.type = 'checkbox';
                    checkbox.id = `subcategory-${subcategory.toLowerCase().replace(/\s+/g, '-')}`;
                    checkbox.value = subcategory;
                    checkbox.checked = true;
                    
                    const label = document.createElement('label');
                    label.className = 'form-check-label';
                    label.htmlFor = checkbox.id;
                    label.textContent = subcategory;
                    
                    formCheck.appendChild(checkbox);
                    formCheck.appendChild(label);
                    subcategoryContainer.appendChild(formCheck);
                    
                    // Add event listener to toggle 'All' checkbox
                    checkbox.addEventListener('change', () => {
                        this.updateAllCheckbox('subcategory');
                    });
                });
                
                // Setup 'All' checkbox event listeners for category filters
                document.querySelectorAll('.category-filter').forEach(checkbox => {
                    checkbox.addEventListener('change', () => {
                        this.updateAllCheckbox('category');
                    });
                });
                
                // Setup 'All' checkbox event listeners for payment method filters
                document.querySelectorAll('.payment-filter').forEach(checkbox => {
                    checkbox.addEventListener('change', () => {
                        this.updateAllCheckbox('payment');
                    });
                });
                
                // Setup 'All' checkbox event handlers
                document.getElementById('category-all')?.addEventListener('change', (e) => {
                    document.querySelectorAll('.category-filter').forEach(checkbox => {
                        checkbox.checked = e.target.checked;
                    });
                });
                
                document.getElementById('payment-all')?.addEventListener('change', (e) => {
                    document.querySelectorAll('.payment-filter').forEach(checkbox => {
                        checkbox.checked = e.target.checked;
                    });
                });
                
                document.getElementById('subcategory-all')?.addEventListener('change', (e) => {
                    document.querySelectorAll('.subcategory-filter').forEach(checkbox => {
                        checkbox.checked = e.target.checked;
                    });
                });
    
                // Find min and max amounts in expenses for range slider
                let minAmount = 0;
                let maxAmount = 5000; // Default
                
                if (this.expenses.length > 0) {
                    const amounts = this.expenses.map(expense => expense.Amount);
                    minAmount = Math.min(...amounts);
                    maxAmount = Math.max(...amounts);
                    // Round to nearest convenient values
                    minAmount = Math.floor(minAmount / 100) * 100;
                    maxAmount = Math.ceil(maxAmount / 1000) * 1000;
                }
                
                // Get range slider elements
                const minAmountEl = document.getElementById('minAmountInput');
                const maxAmountEl = document.getElementById('maxAmountInput');
                const minAmountDisplay = document.getElementById('minAmount');
                const maxAmountDisplay = document.getElementById('maxAmount');
                
                if (minAmountEl && maxAmountEl && minAmountDisplay && maxAmountDisplay) {
                    // Set initial range and values
                    minAmountEl.min = minAmount;
                    minAmountEl.max = maxAmount;
                    minAmountEl.value = minAmount;
                    
                    maxAmountEl.min = minAmount;
                    maxAmountEl.max = maxAmount;
                    maxAmountEl.value = maxAmount;
                    
                    // Update displays
                    minAmountDisplay.textContent = `${this.settings.currency}${minAmount}`;
                    maxAmountDisplay.textContent = `${this.settings.currency}${maxAmount}`;
                    
                    // Add event listeners for real-time updates
                    minAmountEl.addEventListener('input', () => {
                        const value = parseInt(minAmountEl.value);
                        minAmountDisplay.textContent = `${this.settings.currency}${value}`;
                        
                        // Ensure min doesn't exceed max
                        if (value > parseInt(maxAmountEl.value)) {
                            maxAmountEl.value = value;
                            maxAmountDisplay.textContent = `${this.settings.currency}${value}`;
                        }
                    });
                    
                    maxAmountEl.addEventListener('input', () => {
                        const value = parseInt(maxAmountEl.value);
                        maxAmountDisplay.textContent = `${this.settings.currency}${value}`;
                        
                        // Ensure max doesn't go below min
                        if (value < parseInt(minAmountEl.value)) {
                            minAmountEl.value = value;
                            minAmountDisplay.textContent = `${this.settings.currency}${value}`;
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error initializing analysis filters:', error);
        }
    }
    
    updateAllCheckbox(type) {
        try {
            const allCheckbox = document.querySelector(`.${type}-all`);
            const filterCheckboxes = document.querySelectorAll(`.${type}-filter`);
            
            if (allCheckbox && filterCheckboxes.length > 0) {
                const allChecked = Array.from(filterCheckboxes).every(checkbox => checkbox.checked);
                allCheckbox.checked = allChecked;
            }
        } catch (error) {
            console.error('Error updating all checkbox:', error);
        }
    }
    
    // Event listeners setup
    setupEventListeners() {
        try {
            // Navigation event listeners
            document.querySelectorAll('[data-page]').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = e.currentTarget.getAttribute('data-page');
                    this.showPage(page);
                    
                    // Update UI for specific pages
                    if (page === 'analysis') {
                        this.updateAnalysisPage();
                    } else if (page === 'dashboard') {
                        this.updateDashboard();
                    } else if (page === 'budget') {
                        this.updateBudgetHistory();
                    }
                });
            });
            
            // Savings goal toggle
            const setSavingsGoal = document.getElementById('setSavingsGoal');
            const savingsGoalAmountContainer = document.getElementById('savingsGoalAmountContainer');
            
            if (setSavingsGoal && savingsGoalAmountContainer) {
                setSavingsGoal.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        savingsGoalAmountContainer.classList.remove('d-none');
                    } else {
                        savingsGoalAmountContainer.classList.add('d-none');
                    }
                });
            }
            
            // Update savings goal button
            const updateSavingsGoalBtn = document.getElementById('updateSavingsGoalBtn');
            if (updateSavingsGoalBtn) {
                updateSavingsGoalBtn.addEventListener('click', () => {
                    this.updateSavingsGoal();
                });
            }
            
            // Cash and bank balance events to update monthly budget
            const initialCashBalanceInput = document.getElementById('initialCashBalance');
            const initialBankBalanceInput = document.getElementById('initialBankBalance');
            const monthlyBudgetInput = document.getElementById('monthlyBudget');
    
            if (initialCashBalanceInput && initialBankBalanceInput && monthlyBudgetInput) {
                // Function to update monthly budget when cash or bank is changed
                const updateTotal = () => {
                    const cashBalance = parseFloat(initialCashBalanceInput.value) || 0;
                    const bankBalance = parseFloat(initialBankBalanceInput.value) || 0;
                    monthlyBudgetInput.value = (cashBalance + bankBalance).toFixed(0);
                    this.validateBudgetInputs();
                };
                
                initialCashBalanceInput.addEventListener('input', updateTotal);
                initialBankBalanceInput.addEventListener('input', updateTotal);
            }
    
            // Update budget button
            const updateBudgetBtn = document.getElementById('updateBudgetBtn');
            if (updateBudgetBtn) {
                updateBudgetBtn.addEventListener('click', () => {
                    this.updateBudget();
                });
            }
            
            // Date range filter change
            const dateRangeFilter = document.getElementById('dateRangeFilter');
            const customDateFields = document.querySelectorAll('#customDateStart, #customDateEnd');
            
            if (dateRangeFilter && customDateFields.length > 0) {
                dateRangeFilter.addEventListener('change', (e) => {
                    if (e.target.value === 'custom') {
                        customDateFields.forEach(field => field.style.display = 'block');
                    } else {
                        customDateFields.forEach(field => field.style.display = 'none');
                    }
                });
            }
            
            // Apply analysis filters button
            const applyFilters = document.getElementById('applyFilters');
            if (applyFilters) {
                applyFilters.addEventListener('click', () => {
                    this.updateAnalysisPage();
                });
            }
            
            // UPDATED: Download analysis button to handle async PDF generation
            const downloadAnalysisBtn = document.getElementById('downloadAnalysisBtn');
            if (downloadAnalysisBtn) {
                downloadAnalysisBtn.addEventListener('click', async () => {
                    const downloadFormat = document.querySelector('input[name="downloadFormat"]:checked')?.value || 'csv';
                    if (downloadFormat === 'pdf') {
                        await this.downloadAnalysisPDF();
                    } else {
                        this.downloadAnalysisCSV();
                    }
                });
            }
            
            // NEW: Add simplified download options to analysis page
            const downloadSection = document.querySelector('.card-body:has(#downloadAnalysisBtn)');
            if (downloadSection && !document.getElementById('downloadCsv')) {
                // Remove any existing download format options
                const existingOptions = downloadSection.querySelectorAll('input[name="downloadFormat"], input[name="fileType"]');
                existingOptions.forEach(option => option.closest('.form-check')?.remove());
                
                // Add new simplified options
                const downloadOptionsHTML = `
                <div class="form-check mb-3">
                    <input class="form-check-input" type="radio" name="downloadFormat" id="downloadCsv" value="csv" checked>
                    <label class="form-check-label" for="downloadCsv">
                        Download as CSV (All Data)
                    </label>
                </div>
                <div class="form-check mb-3">
                    <input class="form-check-input" type="radio" name="downloadFormat" id="downloadPdf" value="pdf">
                    <label class="form-check-label" for="downloadPdf">
                        Download as PDF (Tables & Visualizations)
                    </label>
                </div>
                `;
                
                const fileTypeDiv = document.createElement('div');
                fileTypeDiv.innerHTML = downloadOptionsHTML;
                downloadSection.insertBefore(fileTypeDiv, document.getElementById('downloadAnalysisBtn'));
            }
            
            // Expense form submission handlers
            const addFoodExpense = document.getElementById('addFoodExpense');
            if (addFoodExpense) {
                addFoodExpense.addEventListener('click', () => {
                    this.addFoodExpense();
                });
            }
            
            const addPetrolExpense = document.getElementById('addPetrolExpense');
            if (addPetrolExpense) {
                addPetrolExpense.addEventListener('click', () => {
                    this.addPetrolExpense();
                });
            }
            
            const addMiscExpense = document.getElementById('addMiscExpense');
            if (addMiscExpense) {
                addMiscExpense.addEventListener('click', () => {
                    this.addMiscExpense();
                });
            }
            
            const saveMiscExpenses = document.getElementById('saveMiscExpenses');
            if (saveMiscExpenses) {
                saveMiscExpenses.addEventListener('click', () => {
                    this.saveMiscExpenses();
                });
            }
            
            // Bill payment handlers
            const billButtons = {
                'addCreditCardBill': 'Credit Card',
                'addElectricityBill': 'Electricity',
                'addWaterBill': 'Water Bill',
                'addLaundryExpense': 'Laundry',
                'addSipExpense': 'SIP',
                'addRentExpense': 'Rent'
            };
            
            Object.entries(billButtons).forEach(([buttonId, billType]) => {
                const button = document.getElementById(buttonId);
                if (button) {
                    button.addEventListener('click', () => {
                        this.addBillExpense(billType);
                    });
                }
            });
            
            // Bill payment status toggle handlers
            const billToggles = {
                'creditCardBillPaid': 'creditCardBill',
                'electricityBillPaid': 'electricityBill',
                'waterBillPaid': 'waterBill',
                'laundryPaid': 'laundry',
                'sipPaid': 'sip',
                'rentPaid': 'rent'
            };
            
            Object.entries(billToggles).forEach(([toggleId, formId]) => {
                const toggle = document.getElementById(toggleId);
                if (toggle) {
                    toggle.addEventListener('change', (e) => {
                        this.toggleBillPaymentForm(formId, e.target.checked);
                        
                        if (e.target.checked) {
                            // If checked ("Already Paid"), update the status without adding expense
                            const billType = formId === 'creditCardBill' ? 'Credit Card' :
                                           formId === 'electricityBill' ? 'Electricity' :
                                           formId === 'waterBill' ? 'Water Bill' :
                                           formId === 'laundry' ? 'Laundry' :
                                           formId === 'sip' ? 'SIP' :
                                           formId === 'rent' ? 'Rent' : '';
                                           
                            if (billType) {
                                const date = new Date();
                                const month = date.toLocaleString('default', { month: 'long' });
                                const year = date.getFullYear();
                                
                                this.updateBillPaymentStatus(billType, true, 0, month, year);
                                this.saveData();
                                
                                this.showToast(`Marked ${billType} as already paid.`, 'success');
                                
                                // Update dashboard if visible
                                if (this.currentPage === 'dashboard') {
                                    this.updateDashboard();
                                }
                            }
                        }
                    });
                }
            });
            
            // Month/Year selection for budget
            const budgetMonth = document.getElementById('budgetMonth');
            const budgetYear = document.getElementById('budgetYear');
            
            if (budgetMonth && budgetYear) {
                budgetMonth.addEventListener('change', () => {
                    const month = budgetMonth.value;
                    const year = parseInt(budgetYear.value);
                    this.loadBudgetForm(month, year);
                });
                
                budgetYear.addEventListener('change', () => {
                    const month = budgetMonth.value;
                    const year = parseInt(budgetYear.value);
                    this.loadBudgetForm(month, year);
                });
            }
            
            // Expense search
            const expenseSearchButton = document.getElementById('expenseSearchButton');
            const expenseSearchInput = document.getElementById('expenseSearchInput');
            
            if (expenseSearchButton && expenseSearchInput) {
                expenseSearchButton.addEventListener('click', () => {
                    this.updateExpensesTable();
                });
                
                expenseSearchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.updateExpensesTable();
                    }
                });
            }
            
            // Delete confirmation
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', () => {
                    const expenseId = confirmDeleteBtn.getAttribute('data-expense-id');
                    if (expenseId) {
                        this.deleteExpense(parseInt(expenseId));
                        
                        // Close modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
                        if (modal) {
                            modal.hide();
                        }
                    }
                });
            }
            
            // Settings page events
            const saveDefaultsBtn = document.getElementById('saveDefaultsBtn');
            if (saveDefaultsBtn) {
                saveDefaultsBtn.addEventListener('click', () => {
                    // Get values from form
                    const defaultSIP = parseFloat(document.getElementById('defaultSIP')?.value) || 2000;
                    const defaultRent = parseFloat(document.getElementById('defaultRent')?.value) || 1900;
                    const defaultCreditLimit = parseFloat(document.getElementById('defaultCreditLimit')?.value) || 10000;
                    const defaultPaymentMethod = document.getElementById('defaultPaymentMethod')?.value || 'UPI';
                    const defaultCashBalance = parseFloat(document.getElementById('defaultCashBalance')?.value) || 2000;
                    const defaultBankBalance = parseFloat(document.getElementById('defaultBankBalance')?.value) || 8000;
                    const defaultSavingsGoal = parseFloat(document.getElementById('defaultSavingsGoal')?.value) || 1000;
                    const creditCardEnabled = document.getElementById('creditCardEnabled')?.checked !== false;
                    
                    // Calculate default budget based on cash + bank balance
                    const defaultBudget = defaultCashBalance + defaultBankBalance;
                    
                    // Update settings
                    this.settings.defaultSIP = defaultSIP;
                    this.settings.defaultRent = defaultRent;
                    this.settings.defaultCreditLimit = defaultCreditLimit;
                    this.settings.defaultPaymentMethod = defaultPaymentMethod;
                    this.settings.defaultCashBalance = defaultCashBalance;
                    this.settings.defaultBankBalance = defaultBankBalance;
                    this.settings.defaultBudget = defaultBudget;
                    this.settings.defaultSavingsGoal = defaultSavingsGoal;
                    this.settings.creditCardEnabled = creditCardEnabled;
                    
                    this.saveSettings();
                    this.showToast('Default values saved successfully!', 'success');
                    
                    // Update any open forms with new default values
                    if (this.currentPage === 'budget') {
                        const month = document.getElementById('budgetMonth')?.value;
                        const year = parseInt(document.getElementById('budgetYear')?.value);
                        if (month && year) {
                            this.loadBudgetForm(month, year);
                        }
                    }
                    
                    // Update bill values with new defaults
                    this.setDefaultBillValues();
                    
                    // Update credit card visibility
                    this.updateCreditCardVisibility();
                    
                    // Update dashboard if needed
                    if (this.currentPage === 'dashboard') {
                        this.updateDashboard();
                    }
                });
            }
            
            const saveDisplaySettingsBtn = document.getElementById('saveDisplaySettingsBtn');
            if (saveDisplaySettingsBtn) {
                saveDisplaySettingsBtn.addEventListener('click', () => {
                    const themeSelector = document.getElementById('themeSelector');
                    const currencyFormat = document.getElementById('currencyFormat');
                    const dateFormat = document.getElementById('dateFormat');
                    const itemsPerPage = document.getElementById('itemsPerPage');
                    
                    if (themeSelector && currencyFormat && dateFormat && itemsPerPage) {
                        const theme = themeSelector.value;
                        this.settings.theme = theme;
                        this.settings.currency = currencyFormat.value;
                        this.settings.dateFormat = dateFormat.value;
                        this.settings.itemsPerPage = parseInt(itemsPerPage.value);
                        
                        this.saveSettings();
                        this.applyTheme(theme);
                        this.showToast('Display settings saved successfully!', 'success');
                        
                        // Refresh UI to update currency symbols
                        this.updateDashboard();
                    }
                });
            }
            
            // Data management events
            const exportDataBtn = document.getElementById('exportDataBtn');
            if (exportDataBtn) {
                exportDataBtn.addEventListener('click', () => {
                    this.exportData();
                });
            }
            
            const importDataBtn = document.getElementById('importDataBtn');
            const importDataFile = document.getElementById('importDataFile');
            
            if (importDataBtn && importDataFile) {
                importDataBtn.addEventListener('click', () => {
                    if (importDataFile.files.length > 0) {
                        this.importData(importDataFile.files[0]);
                    } else {
                        this.showToast('Please select a file to import.', 'warning');
                    }
                });
            }
            
            // Enable/disable reset button based on checkbox
            const resetConfirmCheck = document.getElementById('resetConfirmCheck');
            const confirmResetBtn = document.getElementById('confirmResetBtn');
            
            if (resetConfirmCheck && confirmResetBtn) {
                resetConfirmCheck.addEventListener('change', (e) => {
                    confirmResetBtn.disabled = !e.target.checked;
                });
            }
            
            // Reset app button
            if (confirmResetBtn) {
                confirmResetBtn.addEventListener('click', () => {
                    this.resetApplication();
                    
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('resetConfirmModal'));
                    if (modal) {
                        modal.hide();
                    }
                });
            }
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            this.showToast('Error setting up application. Please refresh the page.', 'error');
        }
    }
    
    // Page navigation
    showPage(pageName) {
        try {
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.add('d-none');
            });
            
            // Show selected page
            const selectedPage = document.getElementById(`${pageName}-page`);
            if (selectedPage) {
                selectedPage.classList.remove('d-none');
            }
            
            // Update active navigation link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            
            const activeLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
            
            // Store current page
            this.currentPage = pageName;
        } catch (error) {
            console.error('Error showing page:', error);
        }
    }
    
    // Dashboard update
    updateDashboard() {
        try {
            // Get budget details for current month
            const budgetDetails = this.getBudgetDetails(this.currentMonth, this.currentYear);
            
            // Update budget metrics, showing available budget after savings goal
            const remainingBudget = document.getElementById('remainingBudget');
            const dailyAllowance = document.getElementById('dailyAllowance');
            const daysLeft = document.getElementById('daysLeft');
            const budgetUsed = document.getElementById('budgetUsed');
            const totalBudget = document.getElementById('totalBudget');
            
            if (remainingBudget) remainingBudget.textContent = `${this.settings.currency}${budgetDetails.remaining_budget.toFixed(2)}`;
            if (dailyAllowance) dailyAllowance.textContent = `${this.settings.currency}${budgetDetails.daily_allowance.toFixed(2)}`;
            if (daysLeft) daysLeft.textContent = `${budgetDetails.days_left || 0} days left`;
            if (budgetUsed) budgetUsed.textContent = `${budgetDetails.budget_used_pct.toFixed(1)}%`;
            if (totalBudget) totalBudget.textContent = `Total: ${this.settings.currency}${budgetDetails.effective_total.toFixed(2)}`;
            
            // Update payment method cards
            const cashBalance = document.getElementById('cashBalance');
            const bankBalance = document.getElementById('bankBalance');
            const creditAvailable = document.getElementById('creditAvailable');
            
            if (cashBalance) cashBalance.textContent = `${this.settings.currency}${budgetDetails.cash_balance.toFixed(2)}`;
            if (bankBalance) bankBalance.textContent = `${this.settings.currency}${budgetDetails.bank_balance.toFixed(2)}`;
            if (creditAvailable) creditAvailable.textContent = `${this.settings.currency}${budgetDetails.credit_card_remaining.toFixed(2)}`;
            
            // Update used amounts
            const currentBalances = this.getCurrentBalances(this.currentMonth, this.currentYear);
            
            const cashUsed = document.getElementById('cashUsed');
            const bankUsed = document.getElementById('bankUsed');
            const creditUsed = document.getElementById('creditUsed');
            
            if (cashUsed) cashUsed.textContent = `${this.settings.currency}${currentBalances.cashUsed.toFixed(2)}`;
            if (bankUsed) bankUsed.textContent = `${this.settings.currency}${currentBalances.bankUsed.toFixed(2)}`;
            if (creditUsed) creditUsed.textContent = `${this.settings.currency}${currentBalances.creditUsed.toFixed(2)}`;
            
            // Update progress bar
            const progressBar = document.getElementById('budgetProgressBar');
            if (progressBar) {
                progressBar.style.width = `${Math.min(100, budgetDetails.budget_used_pct)}%`;
                
                // Change progress bar color based on percentage used
                if (budgetDetails.budget_used_pct > 90) {
                    progressBar.className = 'progress-bar bg-danger';
                } else if (budgetDetails.budget_used_pct > 75) {
                    progressBar.className = 'progress-bar bg-warning';
                } else {
                    progressBar.className = 'progress-bar bg-success';
                }
            }
            
            // Update recent transactions
            this.updateRecentTransactions();
            
            // Update charts
            this.updateDashboardCharts();
            
        } catch (error) {
            console.error('Error updating dashboard:', error);
            this.showToast('Error updating dashboard.', 'error');
        }
    }
    
    // Add this new method to calculate current balances
    getCurrentBalances(month, year) {
        try {
            const monthBudget = this.getMonthBudget(month, year);
            if (!monthBudget) {
                return {
                    cashUsed: 0,
                    bankUsed: 0,
                    creditUsed: 0
                };
            }
            
            // Get current month's expenses
            const monthExpenses = this.expenses.filter(expense => 
                expense.Month === month && expense.Year === year
            );
            
            // Calculate totals by payment method
            const cashExpenses = monthExpenses
                .filter(expense => expense.PaymentMethod === 'Cash')
                .reduce((sum, expense) => sum + expense.Amount, 0);
                
            const upiExpenses = monthExpenses
                .filter(expense => expense.PaymentMethod === 'UPI')
                .reduce((sum, expense) => sum + expense.Amount, 0);
                
            const creditCardExpenses = monthBudget.CreditCardUsed || 0;
            
            return {
                cashUsed: cashExpenses,
                bankUsed: upiExpenses,
                creditUsed: creditCardExpenses
            };
        } catch (error) {
            console.error('Error calculating current balances:', error);
            return {
                cashUsed: 0,
                bankUsed: 0,
                creditUsed: 0
            };
        }
    }
    
    
    // Calculate metrics for each payment method
    calculatePaymentMethodMetrics(month, year) {
        try {
            // Get the month's budget with cash balance
            const monthBudget = this.getMonthBudget(month, year);
            let initialCashBalance = this.settings.initialCashBalance;
            
            if (monthBudget && monthBudget.initialCashBalance !== undefined) {
                initialCashBalance = monthBudget.initialCashBalance;
            }
            
            // Get expenses for the current month
            const monthExpenses = this.expenses.filter(expense => 
                expense.Month === month && expense.Year === year
            );
            
            // Calculate totals for each payment method
            const cashExpenses = monthExpenses
                .filter(expense => expense.PaymentMethod === 'Cash')
                .reduce((sum, expense) => sum + expense.Amount, 0);
            
            const upiExpenses = monthExpenses
                .filter(expense => expense.PaymentMethod === 'UPI')
                .reduce((sum, expense) => sum + expense.Amount, 0);
            
            const creditCardExpenses = monthExpenses
                .filter(expense => expense.PaymentMethod === 'Credit Card')
                .reduce((sum, expense) => sum + expense.Amount, 0);
            
            // Calculate remaining cash balance
            const cashBalance = initialCashBalance - cashExpenses;
            
            return {
                cashTotal: cashExpenses,
                upiTotal: upiExpenses,
                creditCardTotal: creditCardExpenses,
                cashBalance: cashBalance
            };
        } catch (error) {
            console.error('Error calculating payment method metrics:', error);
            return {
                cashTotal: 0,
                upiTotal: 0,
                creditCardTotal: 0,
                cashBalance: this.settings.initialCashBalance
            };
        }
    }
    
    // Recent transactions
    updateRecentTransactions() {
        try {
            const table = document.getElementById('recentTransactionsTable')?.getElementsByTagName('tbody')[0];
            if (!table) return;
            
            table.innerHTML = '';
            
            // Get 5 most recent transactions
            const recentExpenses = this.expenses
                .sort((a, b) => new Date(b.Date) - new Date(a.Date))
                .slice(0, 5);
            
            if (recentExpenses.length === 0) {
                const row = table.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 3;
                cell.textContent = 'No recent transactions';
                cell.className = 'text-center text-muted';
                return;
            }
            
            recentExpenses.forEach(expense => {
                const row = table.insertRow();
                
                // Date cell
                const dateCell = row.insertCell(0);
                dateCell.textContent = this.formatDate(expense.Date);
                
                // Category cell with tag styling
                const categoryCell = row.insertCell(1);
                const categorySpan = document.createElement('span');
                categorySpan.className = `category-tag category-${expense.Category.toLowerCase()}`;
                categorySpan.textContent = expense.Subcategory;
                categoryCell.appendChild(categorySpan);
                
                // Amount cell
                const amountCell = row.insertCell(2);
                amountCell.textContent = `${this.settings.currency}${expense.Amount.toFixed(2)}`;
                amountCell.className = 'text-end';
            });
        } catch (error) {
            console.error('Error updating recent transactions:', error);
        }
    }
    
    // Dashboard charts
    updateDashboardCharts() {
        try {
            // Filter expenses for current month
            const currentMonthExpenses = this.expenses.filter(expense => {
                const expenseDate = new Date(expense.Date);
                return expenseDate.getMonth() === this.currentDate.getMonth() &&
                       expenseDate.getFullYear() === this.currentDate.getFullYear();
            });
            
            // Destroy existing charts
            if (this.chartInstances.expenseCategoryChart) {
                this.chartInstances.expenseCategoryChart.destroy();
            }
            
            if (this.chartInstances.expenseTrendChart) {
                this.chartInstances.expenseTrendChart.destroy();
            }
            
            // Create category pie chart
            this.createCategoryChart(currentMonthExpenses, 'expenseCategoryChart');
            
            // Create daily expense trend chart
            this.createTrendChart(currentMonthExpenses, 'expenseTrendChart');
        } catch (error) {
            console.error('Error updating dashboard charts:', error);
        }
    }
    
    // Category chart creation
    createCategoryChart(expenses, chartId) {
        try {
            if (expenses.length === 0) return;
            
            const chartCanvas = document.getElementById(chartId);
            if (!chartCanvas) return;
            
            // Group expenses by category
            const categoryTotals = {};
            expenses.forEach(expense => {
                if (!categoryTotals[expense.Category]) {
                    categoryTotals[expense.Category] = 0;
                }
                categoryTotals[expense.Category] += expense.Amount;
            });
            
            // Prepare data for chart
            const categories = Object.keys(categoryTotals);
            const values = Object.values(categoryTotals);
            
            // Color mapping for categories
            const colorMap = {
                Food: 'rgba(54, 162, 235, 0.8)',
                Transportation: 'rgba(255, 99, 132, 0.8)',
                Bills: 'rgba(75, 192, 192, 0.8)',
                Services: 'rgba(0, 204, 204, 0.8)',
                Entertainment: 'rgba(255, 159, 64, 0.8)',
                Miscellaneous: 'rgba(153, 102, 255, 0.8)'
            };
            
            const colors = categories.map(category => colorMap[category] || 'rgba(201, 203, 207, 0.8)');
            
            // Create chart
            const ctx = chartCanvas.getContext('2d');
            this.chartInstances[chartId] = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: values,
                        backgroundColor: colors,
                        borderColor: 'white',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                font: {
                                    size: 12
                                },
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${context.label}: ${this.settings.currency}${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating category chart:', error);
        }
    }
    
    // Trend chart creation
    createTrendChart(expenses, chartId) {
        try {
            if (expenses.length === 0) return;
            
            const chartCanvas = document.getElementById(chartId);
            if (!chartCanvas) return;
            
            // Group expenses by date
            const dateExpenses = {};
            expenses.forEach(expense => {
                const dateStr = this.formatDate(expense.Date);
                if (!dateExpenses[dateStr]) {
                    dateExpenses[dateStr] = 0;
                }
                dateExpenses[dateStr] += expense.Amount;
            });
            
            // Create an array of all dates in the month
            const currentYear = this.currentDate.getFullYear();
            const currentMonth = this.currentDate.getMonth();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            
            const allDates = [];
            const allValues = [];
            
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(currentYear, currentMonth, day);
                if (date > this.currentDate) break; // Don't show future dates
                
                const dateStr = this.formatDate(date);
                allDates.push(dateStr);
                allValues.push(dateExpenses[dateStr] || 0);
            }
            
            // Create chart
            const ctx = chartCanvas.getContext('2d');
            this.chartInstances[chartId] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: allDates,
                    datasets: [{
                        label: 'Daily Expenses',
                        data: allValues,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: true,
                        tension: 0.1,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => {
                                    return this.settings.currency + value;
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `${this.settings.currency}${context.raw.toFixed(2)}`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating trend chart:', error);
        }
    }
    
    // Expense adding methods
    addFoodExpense() {
        try {
            const dateInput = document.getElementById('expenseDate');
            const foodSourceSelect = document.getElementById('foodSource');
            const foodDescInput = document.getElementById('foodDescription');
            const paymentMethodSelect = document.getElementById('paymentMethod');
            
            if (!dateInput || !foodSourceSelect || !foodDescInput || !paymentMethodSelect) {
                this.showToast('Some form elements are missing.', 'error');
                return;
            }
            
            const date = new Date(dateInput.value);
            const foodSource = foodSourceSelect.value;
            
            // If Quick Commerce is selected, categorize as Miscellaneous, not Food
            let category = 'Food';
            if (foodSource === 'Quick Commerce') {
                category = 'Miscellaneous';
            }
            
            const description = foodDescInput.value || `${foodSource} food expenses`;
            const paymentMethod = paymentMethodSelect.value;
            const foodTotal = this.calculateFoodTotal();
            
            if (foodTotal <= 0) {
                this.showToast('Please enter at least one valid food expense.', 'warning');
                return;
            }
            
            // Check if there's enough balance for this expense
            const monthBudget = this.getMonthBudget(date.toLocaleString('default', { month: 'long' }), date.getFullYear());
            
            if (paymentMethod === 'Cash') {
                const cashBalance = monthBudget ? monthBudget.defaultCashBalance || 0 : this.settings.defaultCashBalance;
                const cashUsed = this.getCurrentBalances(date.toLocaleString('default', { month: 'long' }), date.getFullYear()).cashUsed;
                const remainingCash = cashBalance - cashUsed;
                
                if (foodTotal > remainingCash) {
                    this.showToast(`Not enough cash balance! Available: ${this.settings.currency}${remainingCash.toFixed(2)}`, 'error');
                    return;
                } else if (remainingCash - foodTotal < 200) {
                    this.showToast(`Warning: Cash balance will be low after this expense! Remaining: ${this.settings.currency}${(remainingCash - foodTotal).toFixed(2)}`, 'warning');
                }
            } else if (paymentMethod === 'UPI') {
                const bankBalance = monthBudget ? monthBudget.defaultBankBalance || 0 : this.settings.defaultBankBalance;
                const bankUsed = this.getCurrentBalances(date.toLocaleString('default', { month: 'long' }), date.getFullYear()).bankUsed;
                const remainingBank = bankBalance - bankUsed;
                
                if (foodTotal > remainingBank) {
                    this.showToast(`Not enough bank balance! Available: ${this.settings.currency}${remainingBank.toFixed(2)}`, 'error');
                    return;
                } else if (remainingBank - foodTotal < 500) {
                    this.showToast(`Warning: Bank balance will be low after this expense! Remaining: ${this.settings.currency}${(remainingBank - foodTotal).toFixed(2)}`, 'warning');
                }
            } else if (paymentMethod === 'Credit Card') {
                if (!this.settings.creditCardEnabled) {
                    this.showToast('Credit card payments are disabled in settings.', 'error');
                    return;
                }
                
                const creditUsed = monthBudget ? monthBudget.CreditCardUsed || 0 : 0;
                const creditLimit = monthBudget ? monthBudget.CreditCardBalance || this.settings.defaultCreditLimit : this.settings.defaultCreditLimit;
                const remainingCredit = creditLimit - creditUsed;
                
                if (foodTotal > remainingCredit) {
                    this.showToast(`Not enough credit limit! Available: ${this.settings.currency}${remainingCredit.toFixed(2)}`, 'error');
                    return;
                } else if (remainingCredit - foodTotal < 1000) {
                    this.showToast(`Warning: Credit limit will be low after this expense! Remaining: ${this.settings.currency}${(remainingCredit - foodTotal).toFixed(2)}`, 'warning');
                }
            }
            
            // Create new expense
            const newExpense = {
                Date: date,
                Category: category,
                Subcategory: foodSource,
                Amount: foodTotal,
                Description: description,
                Month: date.toLocaleString('default', { month: 'long' }),
                Year: date.getFullYear(),
                PaymentMethod: paymentMethod
            };
            
            // Update balance based on payment method
            this.updateBalanceForExpense(foodTotal, paymentMethod, date);
            
            // Add to expenses array
            this.expenses.push(newExpense);
            this.saveData();
            
            // Reset form
            document.getElementById('foodItemsList').value = '';
            document.getElementById('foodDescription').value = '';
            document.getElementById('foodTotal').textContent = `${this.settings.currency}0.00`;
            
            this.showToast(`Added ${foodSource} ${category} expense of ${this.settings.currency}${foodTotal.toFixed(2)}!`, 'success');
            
            // Update UI
            this.updateExpensesTable();
            if (this.currentPage === 'dashboard') {
                this.updateDashboard();
            }
        } catch (error) {
            console.error('Error adding food expense:', error);
            this.showToast('Error adding food expense.', 'error');
        }
    }
    
    
    addPetrolExpense() {
        try {
            const dateInput = document.getElementById('expenseDate');
            const petrolAmountInput = document.getElementById('petrolAmount');
            const petrolDescInput = document.getElementById('petrolDescription');
            const paymentMethodSelect = document.getElementById('paymentMethod');
            
            if (!dateInput || !petrolAmountInput || !petrolDescInput || !paymentMethodSelect) {
                this.showToast('Some form elements are missing.', 'error');
                return;
            }
            
            const date = new Date(dateInput.value);
            const amount = parseFloat(petrolAmountInput.value) || 0;
            const description = petrolDescInput.value || 'Weekly petrol';
            const paymentMethod = paymentMethodSelect.value;
            
            // Check if selected date is a Monday
            const isMonday = date.getDay() === 1;
            
            if (!isMonday) {
                this.showToast('Petrol expenses can only be added on Mondays.', 'warning');
                return;
            }
            
            if (amount <= 0) {
                this.showToast('Please enter a valid petrol expense amount.', 'warning');
                return;
            }
            
            // Check if there's enough balance for this expense
            const monthBudget = this.getMonthBudget(date.toLocaleString('default', { month: 'long' }), date.getFullYear());
            
            if (paymentMethod === 'Cash') {
                const cashBalance = monthBudget ? monthBudget.initialCashBalance || 0 : this.settings.initialCashBalance;
                const cashUsed = this.getCurrentBalances(date.toLocaleString('default', { month: 'long' }), date.getFullYear()).cashUsed;
                const remainingCash = cashBalance - cashUsed;
                
                if (amount > remainingCash) {
                    this.showToast(`Not enough cash balance! Available: ${this.settings.currency}${remainingCash.toFixed(2)}`, 'error');
                    return;
                } else if (remainingCash - amount < 200) {
                    this.showToast(`Warning: Cash balance will be low after this expense! Remaining: ${this.settings.currency}${(remainingCash - amount).toFixed(2)}`, 'warning');
                }
            } else if (paymentMethod === 'UPI') {
                const bankBalance = monthBudget ? monthBudget.initialBankBalance || 0 : this.settings.initialBankBalance;
                const bankUsed = this.getCurrentBalances(date.toLocaleString('default', { month: 'long' }), date.getFullYear()).bankUsed;
                const remainingBank = bankBalance - bankUsed;
                
                if (amount > remainingBank) {
                    this.showToast(`Not enough bank balance! Available: ${this.settings.currency}${remainingBank.toFixed(2)}`, 'error');
                    return;
                } else if (remainingBank - amount < 500) {
                    this.showToast(`Warning: Bank balance will be low after this expense! Remaining: ${this.settings.currency}${(remainingBank - amount).toFixed(2)}`, 'warning');
                }
            } else if (paymentMethod === 'Credit Card') {
                if (!this.settings.creditCardEnabled) {
                    this.showToast('Credit card payments are disabled in settings.', 'error');
                    return;
                }
                
                const creditUsed = monthBudget ? monthBudget.CreditCardUsed || 0 : 0;
                const creditLimit = monthBudget ? monthBudget.CreditCardBalance || this.settings.defaultCreditLimit : this.settings.defaultCreditLimit;
                const remainingCredit = creditLimit - creditUsed;
                
                if (amount > remainingCredit) {
                    this.showToast(`Not enough credit limit! Available: ${this.settings.currency}${remainingCredit.toFixed(2)}`, 'error');
                    return;
                } else if (remainingCredit - amount < 1000) {
                    this.showToast(`Warning: Credit limit will be low after this expense! Remaining: ${this.settings.currency}${(remainingCredit - amount).toFixed(2)}`, 'warning');
                }
            }
            
            // Create new expense
            const newExpense = {
                Date: date,
                Category: 'Transportation',
                Subcategory: 'Petrol',
                Amount: amount,
                Description: description,
                Month: date.toLocaleString('default', { month: 'long' }),
                Year: date.getFullYear(),
                PaymentMethod: paymentMethod
            };
            
            // Update balance based on payment method
            this.updateBalanceForExpense(amount, paymentMethod, date);
            
            // Add to expenses array
            this.expenses.push(newExpense);
            this.saveData();
            
            // Reset form
            petrolAmountInput.value = '';
            petrolDescInput.value = '';
            
            this.showToast(`Added Petrol expense of ${this.settings.currency}${amount.toFixed(2)}!`, 'success');
            
            // Update UI
            this.updateExpensesTable();
            if (this.currentPage === 'dashboard') {
                this.updateDashboard();
            }
        } catch (error) {
            console.error('Error adding petrol expense:', error);
            this.showToast('Error adding petrol expense.', 'error');
        }
    }
    
    addMiscExpense() {
        try {
            const miscAmountInput = document.getElementById('miscAmount');
            const miscTagSelect = document.getElementById('miscTag');
            const miscDescInput = document.getElementById('miscDescription');
            const miscNotesInput = document.getElementById('miscNotes');
            const paymentMethodSelect = document.getElementById('paymentMethod');
            const customTagInput = document.getElementById('customTag');
            
            if (!miscAmountInput || !miscTagSelect || !miscDescInput || !miscNotesInput || !paymentMethodSelect) {
                this.showToast('Some form elements are missing.', 'error');
                return;
            }
            
            const amount = parseFloat(miscAmountInput.value) || 0;
            let tag = miscTagSelect.value;
            const description = miscDescInput.value || tag;
            const notes = miscNotesInput.value || '';
            const paymentMethod = paymentMethodSelect.value;
            
            if (amount <= 0) {
                this.showToast('Please enter a valid amount.', 'warning');
                return;
            }
            
            // Check if it's "Others" and get custom tag
            if (tag === 'Others' && customTagInput) {
                const customTag = customTagInput.value.trim();
                if (customTag) {
                    tag = customTag;
                }
            }
            
            // Determine category based on tag
            let category = 'Miscellaneous';
            if (['Movie', 'Concert', 'Dining Out', 'Shopping', 'Games', 'Other Entertainment'].includes(tag)) {
                category = 'Entertainment';
            }
            
            // For credit card, validate if it's enabled
            if (paymentMethod === 'Credit Card' && !this.settings.creditCardEnabled) {
                this.showToast('Credit card payments are disabled in settings.', 'error');
                return;
            }
            
            // Add to misc expenses array
            this.miscExpenses.push({
                Amount: amount,
                Tag: tag,
                Category: category,
                Description: description,
                Notes: notes,
                PaymentMethod: paymentMethod
            });
            
            // Reset form
            miscAmountInput.value = '';
            miscDescInput.value = '';
            miscNotesInput.value = '';
            if (customTagInput) customTagInput.value = '';
            
            // Reset the select to first option
            miscTagSelect.selectedIndex = 0;
            
            // Hide custom tag container
            const customTagContainer = document.getElementById('customTagContainer');
            if (customTagContainer) {
                customTagContainer.classList.add('d-none');
            }
            
            // Update misc expenses list
            this.updateMiscExpensesList();
        } catch (error) {
            console.error('Error adding miscellaneous expense:', error);
            this.showToast('Error adding miscellaneous expense.', 'error');
        }
    }
    
    updateMiscExpensesList() {
        try {
            const container = document.getElementById('miscExpensesList');
            const table = document.getElementById('miscExpensesTable')?.getElementsByTagName('tbody')[0];
            const totalElement = document.getElementById('miscExpensesTotal');
            
            if (!container || !table || !totalElement) return;
            
            if (this.miscExpenses.length === 0) {
                container.classList.add('d-none');
                return;
            }
            
            container.classList.remove('d-none');
            table.innerHTML = '';
            
            // Calculate total
            let total = 0;
            
            this.miscExpenses.forEach((expense, index) => {
                total += expense.Amount;
                
                const row = table.insertRow();
                
                // Tag cell
                const tagCell = row.insertCell(0);
                const categoryClass = expense.Category === 'Entertainment' ? 'category-entertainment' : 'category-miscellaneous';
                tagCell.innerHTML = `<span class="category-tag ${categoryClass}">${expense.Tag}</span>`;
                
                // Description cell
                const descCell = row.insertCell(1);
                if (expense.Notes) {
                    descCell.textContent = `${expense.Description} - ${expense.Notes}`;
                } else {
                    descCell.textContent = expense.Description;
                }
                
                // Amount cell
                const amountCell = row.insertCell(2);
                amountCell.textContent = `${this.settings.currency}${expense.Amount.toFixed(2)}`;
                amountCell.className = 'text-end';
                
                // Actions cell
                const actionsCell = row.insertCell(3);
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-sm btn-outline-danger';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteBtn.onclick = () => this.removeMiscExpense(index);
                actionsCell.appendChild(deleteBtn);
            });
            
            // Update total
            totalElement.textContent = `${this.settings.currency}${total.toFixed(2)}`;
        } catch (error) {
            console.error('Error updating miscellaneous expenses list:', error);
        }
    }
    
    removeMiscExpense(index) {
        try {
            this.miscExpenses.splice(index, 1);
            this.updateMiscExpensesList();
        } catch (error) {
            console.error('Error removing miscellaneous expense:', error);
        }
    }
    
    saveMiscExpenses() {
        try {
            if (this.miscExpenses.length === 0) {
                this.showToast('No expenses to save.', 'warning');
                return;
            }
            
            const dateInput = document.getElementById('expenseDate');
            if (!dateInput) {
                this.showToast('Date input is missing.', 'error');
                return;
            }
            
            const date = new Date(dateInput.value);
            const month = date.toLocaleString('default', { month: 'long' });
            const year = date.getFullYear();
            
            // Get month budget for balance checks
            const monthBudget = this.getMonthBudget(month, year);
            const currentBalances = this.getCurrentBalances(month, year);
            
            // Group by payment method for balance checks
            const expensesByMethod = {
                'Cash': [],
                'UPI': [],
                'Credit Card': []
            };
            
            this.miscExpenses.forEach(expense => {
                expensesByMethod[expense.PaymentMethod].push(expense);
            });
            
            // Check cash balance
            const cashExpenses = expensesByMethod['Cash'];
            if (cashExpenses.length > 0) {
                const cashTotal = cashExpenses.reduce((sum, expense) => sum + expense.Amount, 0);
                const cashBalance = monthBudget ? monthBudget.initialCashBalance || 0 : this.settings.initialCashBalance;
                const cashUsed = currentBalances.cashUsed;
                const remainingCash = cashBalance - cashUsed;
                
                if (cashTotal > remainingCash) {
                    this.showToast(`Not enough cash balance! Available: ${this.settings.currency}${remainingCash.toFixed(2)}`, 'error');
                    return;
                } else if (remainingCash - cashTotal < 200) {
                    this.showToast(`Warning: Cash balance will be low after these expenses! Remaining: ${this.settings.currency}${(remainingCash - cashTotal).toFixed(2)}`, 'warning');
                }
            }
            
            // Check bank balance
            const upiExpenses = expensesByMethod['UPI'];
            if (upiExpenses.length > 0) {
                const upiTotal = upiExpenses.reduce((sum, expense) => sum + expense.Amount, 0);
                const bankBalance = monthBudget ? monthBudget.initialBankBalance || 0 : this.settings.initialBankBalance;
                const bankUsed = currentBalances.bankUsed;
                const remainingBank = bankBalance - bankUsed;
                
                if (upiTotal > remainingBank) {
                    this.showToast(`Not enough bank balance! Available: ${this.settings.currency}${remainingBank.toFixed(2)}`, 'error');
                    return;
                } else if (remainingBank - upiTotal < 500) {
                    this.showToast(`Warning: Bank balance will be low after these expenses! Remaining: ${this.settings.currency}${(remainingBank - upiTotal).toFixed(2)}`, 'warning');
                }
            }
            
            // Check credit card limit
            const creditExpenses = expensesByMethod['Credit Card'];
            if (creditExpenses.length > 0) {
                if (!this.settings.creditCardEnabled) {
                    this.showToast('Credit card payments are disabled in settings.', 'error');
                    return;
                }
                
                const creditTotal = creditExpenses.reduce((sum, expense) => sum + expense.Amount, 0);
                const creditUsed = monthBudget ? monthBudget.CreditCardUsed || 0 : 0;
                const creditLimit = monthBudget ? monthBudget.CreditCardBalance || this.settings.defaultCreditLimit : this.settings.defaultCreditLimit;
                const remainingCredit = creditLimit - creditUsed;
                
                if (creditTotal > remainingCredit) {
                    this.showToast(`Not enough credit limit! Available: ${this.settings.currency}${remainingCredit.toFixed(2)}`, 'error');
                    return;
                } else if (remainingCredit - creditTotal < 1000) {
                    this.showToast(`Warning: Credit limit will be low after these expenses! Remaining: ${this.settings.currency}${(remainingCredit - creditTotal).toFixed(2)}`, 'warning');
                }
            }
            
            // If all checks pass, add all expenses
            this.miscExpenses.forEach(expense => {
                const newExpense = {
                    Date: date,
                    Category: expense.Category,
                    Subcategory: expense.Tag,
                    Amount: expense.Amount,
                    Description: expense.Notes ? `${expense.Description} - ${expense.Notes}` : expense.Description,
                    Month: month,
                    Year: year,
                    PaymentMethod: expense.PaymentMethod
                };
                
                this.expenses.push(newExpense);
                
                // Update balance based on payment method
                this.updateBalanceForExpense(expense.Amount, expense.PaymentMethod, date);
            });
            
            // Save data and reset misc expenses
            this.saveData();
            this.miscExpenses = [];
            this.updateMiscExpensesList();
            
            this.showToast(`Saved all expenses for ${this.formatDate(date)}!`, 'success');
            
            // Update UI
            this.updateExpensesTable();
            if (this.currentPage === 'dashboard') {
                this.updateDashboard();
            }
        } catch (error) {
            console.error('Error saving miscellaneous expenses:', error);
            this.showToast('Error saving miscellaneous expenses.', 'error');
        }
    }
    
    addBillExpense(billType) {
        try {
            let amountElementId, descriptionText;
            let category = 'Bills';
            
            switch(billType) {
                case 'Credit Card':
                    amountElementId = 'creditCardBillAmount';
                    descriptionText = 'Monthly credit card bill';
                    break;
                case 'Electricity':
                    amountElementId = 'electricityBillAmount';
                    descriptionText = 'Monthly electricity bill';
                    break;
                case 'Water Bill':
                    amountElementId = 'waterBillAmount';
                    descriptionText = 'Monthly water bill';
                    break;
                case 'Laundry':
                    amountElementId = 'laundryAmount';
                    descriptionText = 'Monthly laundry expense';
                    category = 'Services';
                    break;
                case 'SIP':
                    amountElementId = 'sipAmount';
                    descriptionText = 'Monthly SIP payment';
                    break;
                case 'Rent':
                    amountElementId = 'rentAmount';
                    descriptionText = 'Monthly rent payment';
                    break;
                default:
                    return;
            }
            
            // Check if "Already Paid" is toggled on
            const checkboxId = billType === 'SIP' ? 'sipPaid' :
                            billType === 'Rent' ? 'rentPaid' :
                            billType === 'Laundry' ? 'laundryPaid' : 
                            billType === 'Water Bill' ? 'waterBillPaid' : 
                            billType.toLowerCase().replace(' ', '') + 'BillPaid';
            
            const paidCheckbox = document.getElementById(checkboxId);
            const alreadyPaid = paidCheckbox ? paidCheckbox.checked : false;
            
            // If already paid, just update the status and don't add expense
            if (alreadyPaid) {
                // Update budget data for bill payment status without adding expense
                const date = new Date();
                const month = date.toLocaleString('default', { month: 'long' });
                const year = date.getFullYear();
                
                this.updateBillPaymentStatus(billType, true, 0, month, year);
                this.saveData();
                
                // Disable the form
                const formId = billType === 'SIP' ? 'sip' : 
                            billType === 'Rent' ? 'rent' :
                            billType === 'Laundry' ? 'laundry' : 
                            billType === 'Water Bill' ? 'waterBill' : 
                            billType.toLowerCase().replace(' ', '') + 'Bill';
                            
                this.toggleBillPaymentForm(formId, true);
                
                this.showToast(`Marked ${billType} as already paid.`, 'success');
                
                // Update UI if necessary
                if (this.currentPage === 'dashboard') {
                    this.updateDashboard();
                }
                
                return;
            }
            
            const amountInput = document.getElementById(amountElementId);
            const dateInput = document.getElementById('expenseDate');
            
            // Get the payment method from the corresponding dropdown
            const formId = billType === 'SIP' ? 'sip' : 
                        billType === 'Rent' ? 'rent' :
                        billType === 'Laundry' ? 'laundry' : 
                        billType === 'Water Bill' ? 'waterBill' : 
                        billType.toLowerCase().replace(' ', '') + 'Bill';
                        
            const methodSelect = document.getElementById(`${formId}PaymentMethod`);
            const paymentMethod = methodSelect ? methodSelect.value : 'UPI';
            
            if (!amountInput || !dateInput) {
                this.showToast('Some form elements are missing.', 'error');
                return;
            }
            
            const amount = parseFloat(amountInput.value) || 0;
            
            if (amount <= 0) {
                this.showToast(`Please enter a valid ${billType} amount.`, 'warning');
                return;
            }
            
            const date = new Date(dateInput.value);
            const month = date.toLocaleString('default', { month: 'long' });
            const year = date.getFullYear();
            
            // Create new expense
            const newExpense = {
                Date: date,
                Category: category,
                Subcategory: billType,
                Amount: amount,
                Description: descriptionText,
                Month: month,
                Year: year,
                PaymentMethod: paymentMethod
            };
            
            // Add to expenses array
            this.expenses.push(newExpense);
            
            // Update balance based on payment method
            this.updateBalanceForExpense(amount, paymentMethod, date);
            
            // Update budget data for bill payment status
            // For SIP and Rent, also update the amount in the budget to maintain
            // the custom amount for the month
            if (billType === 'SIP' || billType === 'Rent') {
                let monthBudget = this.getMonthBudget(month, year);
                if (monthBudget) {
                    if (billType === 'SIP') {
                        monthBudget.SIP = amount;
                    } else if (billType === 'Rent') {
                        monthBudget.Rent = amount;
                    }
                }
            }
            
            this.updateBillPaymentStatus(billType, true, amount, month, year);
            
            // Save data
            this.saveData();
            
            // Reset form
            amountInput.value = '';
            
            this.showToast(`Added ${billType} of ${this.settings.currency}${amount.toFixed(2)}!`, 'success');
            
            // Update UI
            this.updateExpensesTable();
            if (this.currentPage === 'dashboard') {
                this.updateDashboard();
            }
            
            // Disable the form
            this.toggleBillPaymentForm(formId, true);
            
            // Update checkbox
            if (paidCheckbox) {
                paidCheckbox.checked = true;
            }
        } catch (error) {
            console.error('Error adding bill expense:', error);
            this.showToast('Error adding bill expense.', 'error');
        }
    }
    
    // Bill payment status management
    updateBillPaymentStatus(billType = null, isPaid = false, amount = 0, month = null, year = null) {
        try {
            // If no specific bill type, update all bill payment status UI
            if (!billType) {
                const monthBudget = this.getMonthBudget(this.currentMonth, this.currentYear);
                
                if (monthBudget) {
                    // Credit Card
                    const creditCardBillPaid = document.getElementById('creditCardBillPaid');
                    if (creditCardBillPaid && monthBudget.CreditCardPaid) {
                        creditCardBillPaid.checked = true;
                        this.toggleBillPaymentForm('creditCardBill', true);
                    }
                    
                    // Electricity
                    const electricityBillPaid = document.getElementById('electricityBillPaid');
                    if (electricityBillPaid && monthBudget.ElectricityPaid) {
                        electricityBillPaid.checked = true;
                        this.toggleBillPaymentForm('electricityBill', true);
                    }
                    
                    // Water Bill
                    const waterBillPaid = document.getElementById('waterBillPaid');
                    if (waterBillPaid && monthBudget.WaterBillPaid) {
                        waterBillPaid.checked = true;
                        this.toggleBillPaymentForm('waterBill', true);
                    }
                    
                    // Laundry
                    const laundryPaid = document.getElementById('laundryPaid');
                    if (laundryPaid && monthBudget.LaundryPaid) {
                        laundryPaid.checked = true;
                        this.toggleBillPaymentForm('laundry', true);
                    }
                    
                    // SIP
                    const sipPaid = document.getElementById('sipPaid');
                    if (sipPaid && monthBudget.SIPPaid) {
                        sipPaid.checked = true;
                        this.toggleBillPaymentForm('sip', true);
                    } else {
                        // Set SIP amount from budget if not paid
                        const sipAmountInput = document.getElementById('sipAmount');
                        if (sipAmountInput) {
                            sipAmountInput.value = monthBudget.SIP || this.settings.defaultSIP;
                        }
                    }
                    
                    // Rent
                    const rentPaid = document.getElementById('rentPaid');
                    if (rentPaid && monthBudget.RentPaid) {
                        rentPaid.checked = true;
                        this.toggleBillPaymentForm('rent', true);
                    } else {
                        // Set Rent amount from budget if not paid
                        const rentAmountInput = document.getElementById('rentAmount');
                        if (rentAmountInput) {
                            rentAmountInput.value = monthBudget.Rent || this.settings.defaultRent;
                        }
                    }
                } else {
                    // No budget found, so set default values from settings
                    const sipAmountInput = document.getElementById('sipAmount');
                    if (sipAmountInput) {
                        sipAmountInput.value = this.settings.defaultSIP;
                    }
                    
                    const rentAmountInput = document.getElementById('rentAmount');
                    if (rentAmountInput) {
                        rentAmountInput.value = this.settings.defaultRent;
                    }
                }
                return;
            }
            
            // Update specific bill payment status in budget data
            month = month || this.currentMonth;
            year = year || this.currentYear;
            
            let monthBudget = this.getMonthBudget(month, year);
            
            if (!monthBudget) {
                // Create a new budget entry with default values
                monthBudget = {
                    Month: month,
                    Year: year,
                    TotalBudget: this.settings.defaultCashBalance + this.settings.defaultBankBalance,
                    SIP: this.settings.defaultSIP,
                    Rent: this.settings.defaultRent,
                    CreditCard: 0,
                    Electricity: 0,
                    WaterBill: 0,
                    Laundry: 0,
                    CreditCardPaid: false,
                    ElectricityPaid: false,
                    WaterBillPaid: false,
                    LaundryPaid: false,
                    SIPPaid: false,
                    RentPaid: false,
                    SavingsGoal: this.settings.defaultSavingsGoal,
                    HasSavingsGoal: false,
                    CreditCardBalance: this.settings.defaultCreditLimit,
                    CreditCardUsed: 0,
                    PreviousMonthCredit: 0
                };
                this.budgets.push(monthBudget);
            }
            
            // Update the specific bill status
            switch(billType) {
                case 'Credit Card':
                    monthBudget.CreditCard = amount;
                    monthBudget.CreditCardPaid = isPaid;
                    break;
                case 'Electricity':
                    monthBudget.Electricity = amount;
                    monthBudget.ElectricityPaid = isPaid;
                    break;
                case 'Water Bill':
                    monthBudget.WaterBill = amount;
                    monthBudget.WaterBillPaid = isPaid;
                    break;
                case 'Laundry':
                    monthBudget.Laundry = amount;
                    monthBudget.LaundryPaid = isPaid;
                    break;
                case 'SIP':
                    // Only update the amount if it's provided and non-zero
                    if (amount > 0) {
                        monthBudget.SIP = amount;
                    }
                    monthBudget.SIPPaid = isPaid;
                    break;
                case 'Rent':
                    // Only update the amount if it's provided and non-zero
                    if (amount > 0) {
                        monthBudget.Rent = amount;
                    }
                    monthBudget.RentPaid = isPaid;
                    break;
            }
            
            this.saveData();
        } catch (error) {
            console.error('Error updating bill payment status:', error);
        }
    }
    
    toggleBillPaymentForm(formId, isDisabled) {
        try {
            const formElement = document.getElementById(formId + 'Form');
            if (formElement) {
                if (isDisabled) {
                    formElement.classList.add('d-none');
                } else {
                    formElement.classList.remove('d-none');
                }
            }
        } catch (error) {
            console.error('Error toggling bill payment form:', error);
        }
    }
    
    // Update credit card usage
    updateCreditCardUsage(month, year, amount) {
        try {
            const monthBudget = this.getMonthBudget(month, year);
            
            if (monthBudget) {
                // Add to current credit card usage
                monthBudget.CreditCardUsed = (monthBudget.CreditCardUsed || 0) + amount;
                this.saveData();
            }
        } catch (error) {
            console.error('Error updating credit card usage:', error);
        }
    }
    
    // Budget and savings goal updates
    updateSavingsGoal() {
        try {
            const setSavingsGoal = document.getElementById('setSavingsGoal');
            const savingsGoalAmount = document.getElementById('savingsGoalAmount');
            
            if (!setSavingsGoal || !savingsGoalAmount) {
                this.showToast('Savings goal form elements are missing.', 'error');
                return;
            }
            
            const setSavings = setSavingsGoal.checked;
            const savingsAmount = setSavings ? parseFloat(savingsGoalAmount.value) || 0 : 0;
            
            let monthBudget = this.getMonthBudget(this.currentMonth, this.currentYear);
            
            if (!monthBudget) {
                // Create a new budget entry with default values
                monthBudget = {
                    Month: this.currentMonth,
                    Year: this.currentYear,
                    TotalBudget: this.settings.defaultBudget,
                    SIP: this.settings.defaultSIP,
                    Rent: this.settings.defaultRent,
                    CreditCard: 0,
                    Electricity: 0,
                    WaterBill: 0,
                    Laundry: 0,
                    CreditCardPaid: false,
                    ElectricityPaid: false,
                    WaterBillPaid: false,
                    LaundryPaid: false,
                    SIPPaid: false,
                    RentPaid: false,
                    SavingsGoal: savingsAmount,
                    HasSavingsGoal: setSavings,
                    CreditCardBalance: this.settings.defaultCreditLimit,
                    CreditCardUsed: 0,
                    PreviousMonthCredit: 0,
                    initialCashBalance: this.settings.initialCashBalance
                };
                this.budgets.push(monthBudget);
            } else {
                // Update existing budget
                monthBudget.SavingsGoal = savingsAmount;
                monthBudget.HasSavingsGoal = setSavings;
            }
            
            this.saveData();
            this.showToast(`Savings goal ${setSavings ? 'set to ' + this.settings.currency + savingsAmount : 'removed'} for ${this.currentMonth}!`, 'success');
            
            // Update dashboard if visible
            if (this.currentPage === 'dashboard') {
                this.updateDashboard();
            }
        } catch (error) {
            console.error('Error updating savings goal:', error);
            this.showToast('Error updating savings goal.', 'error');
        }
    }
    
    updateBudget() {
        try {
            const monthInput = document.getElementById('budgetMonth');
            const yearInput = document.getElementById('budgetYear');
            const monthlyBudgetInput = document.getElementById('monthlyBudget');
            const monthlySavingsGoalInput = document.getElementById('monthlySavingsGoal');
            const creditCardLimitInput = document.getElementById('creditCardLimit');
            const previousMonthCreditInput = document.getElementById('previousMonthCredit');
            const initialCashBalanceInput = document.getElementById('initialCashBalance');
            const initialBankBalanceInput = document.getElementById('initialBankBalance');
            
            if (!monthInput || !yearInput || !monthlyBudgetInput || !creditCardLimitInput || 
                !previousMonthCreditInput || !initialCashBalanceInput || !initialBankBalanceInput) {
                this.showToast('Some budget form elements are missing.', 'error');
                return;
            }
            
            // Validate that cash + bank equals monthly budget
            if (!this.validateBudgetInputs()) {
                this.showToast('Cash + Bank should equal Monthly Budget.', 'warning');
                return;
            }
            
            const month = monthInput.value;
            const year = parseInt(yearInput.value);
            
            const initialCashBalance = parseFloat(initialCashBalanceInput.value);
            const initialBankBalance = parseFloat(initialBankBalanceInput.value);
            
            const defaultCashBalance = this.settings.defaultCashBalance;
            const defaultBankBalance = this.settings.defaultBankBalance;
            
            const monthlyBudget = parseFloat(monthlyBudgetInput.value) || (defaultCashBalance + defaultBankBalance);
            const savingsGoal = parseFloat(monthlySavingsGoalInput.value) || this.settings.defaultSavingsGoal;
            const creditCardLimit = parseFloat(creditCardLimitInput.value) || this.settings.defaultCreditLimit;
            const previousMonthCredit = parseFloat(previousMonthCreditInput.value) || 0;
            
            // Update or add new budget entry
            let monthBudget = this.getMonthBudget(month, year);
            
            if (monthBudget) {
                // Only set initialCashBalance/initialBankBalance if they differ from defaults
                if (initialCashBalance !== defaultCashBalance) {
                    monthBudget.initialCashBalance = initialCashBalance;
                } else {
                    // If value matches default, remove the property to use default
                    delete monthBudget.initialCashBalance;
                }
                
                if (initialBankBalance !== defaultBankBalance) {
                    monthBudget.initialBankBalance = initialBankBalance;
                } else {
                    // If value matches default, remove the property to use default
                    delete monthBudget.initialBankBalance;
                }
                
                // Update other budget properties
                monthBudget.TotalBudget = monthlyBudget;
                monthBudget.SavingsGoal = savingsGoal;
                monthBudget.HasSavingsGoal = savingsGoal > 0;
                monthBudget.CreditCardBalance = creditCardLimit;
                monthBudget.PreviousMonthCredit = previousMonthCredit;
            } else {
                // Create new budget entry
                monthBudget = {
                    Month: month,
                    Year: year,
                    TotalBudget: monthlyBudget,
                    SIP: this.settings.defaultSIP,
                    Rent: this.settings.defaultRent,
                    CreditCard: 0,
                    Electricity: 0,
                    WaterBill: 0,
                    Laundry: 0,
                    CreditCardPaid: false,
                    ElectricityPaid: false,
                    WaterBillPaid: false,
                    LaundryPaid: false,
                    SIPPaid: false,
                    RentPaid: false,
                    SavingsGoal: savingsGoal,
                    HasSavingsGoal: savingsGoal > 0,
                    CreditCardBalance: creditCardLimit,
                    CreditCardUsed: 0,
                    PreviousMonthCredit: previousMonthCredit
                };
                
                // Only set initialCashBalance/initialBankBalance if they differ from defaults
                if (initialCashBalance !== defaultCashBalance) {
                    monthBudget.initialCashBalance = initialCashBalance;
                }
                
                if (initialBankBalance !== defaultBankBalance) {
                    monthBudget.initialBankBalance = initialBankBalance;
                }
                
                this.budgets.push(monthBudget);
            }
            
            this.saveData();
            this.showToast(`Budget updated for ${month} ${year}!`, 'success');
            
            // Update dashboard if it's for the current month
            if (month === this.currentMonth && year === this.currentYear && this.currentPage === 'dashboard') {
                this.updateDashboard();
            }
            
            // Update budget history if on budget page
            if (this.currentPage === 'budget') {
                this.updateBudgetHistory();
            }
        } catch (error) {
            console.error('Error updating budget:', error);
            this.showToast('Error updating budget.', 'error');
        }
    }

validateBudgetInputs() {
    try {
        const initialCashBalanceInput = document.getElementById('initialCashBalance');
        const initialBankBalanceInput = document.getElementById('initialBankBalance');
        const monthlyBudgetInput = document.getElementById('monthlyBudget');
        
        if (!initialCashBalanceInput || !initialBankBalanceInput || !monthlyBudgetInput) {
            return false;
        }
        
        const cashBalance = parseFloat(initialCashBalanceInput.value) || 0;
        const bankBalance = parseFloat(initialBankBalanceInput.value) || 0;
        const totalCashBank = cashBalance + bankBalance;
        
        const totalCashBankElement = document.getElementById('totalCashBank');
        if (totalCashBankElement) {
            totalCashBankElement.textContent = `Total: ${this.settings.currency}${totalCashBank.toFixed(2)}`;
            totalCashBankElement.classList.remove('text-danger');
            totalCashBankElement.classList.add('text-success');
        }
        
        // Update monthly budget to match cash + bank
        monthlyBudgetInput.value = totalCashBank.toFixed(0);
        
        return true;
    } catch (error) {
        console.error('Error validating budget inputs:', error);
        return false;
    }
}
    
    // Budget calculations
    getBudgetDetails(month, year) {
        try {
            // Get month's budget
            const monthBudget = this.getMonthBudget(month, year);
            
            if (!monthBudget) {
                return {
                    total_budget: this.settings.defaultBudget,
                    daily_allowance: 500,
                    remaining_budget: this.settings.defaultBudget,
                    budget_used_pct: 0,
                    fixed_expenses: 0,
                    variable_expenses: 0,
                    daily_expenses: 0,
                    savings_goal: 0,
                    has_savings_goal: false,
                    effective_total: this.settings.defaultBudget,
                    days_left: 30,
                    credit_card_balance: this.settings.defaultCreditLimit,
                    credit_card_used: 0,
                    credit_card_remaining: this.settings.defaultCreditLimit,
                    cash_balance: this.settings.defaultCashBalance,
                    bank_balance: this.settings.defaultBankBalance
                };
            }
            
            const totalBudget = monthBudget.TotalBudget || this.settings.defaultBudget;
            
            // Use initialCashBalance/initialBankBalance if set in budget, otherwise use defaults
            const cashBalance = monthBudget.initialCashBalance !== undefined ? 
                monthBudget.initialCashBalance : this.settings.defaultCashBalance;
                
            const bankBalance = monthBudget.initialBankBalance !== undefined ?
                monthBudget.initialBankBalance : this.settings.defaultBankBalance;
            
            // Credit card details
            const creditCardBalance = monthBudget.CreditCardBalance || this.settings.defaultCreditLimit;
            const creditCardUsed = monthBudget.CreditCardUsed || 0;
            const creditCardRemaining = creditCardBalance - creditCardUsed;
            
            // Check if savings goal exists
            const hasSavingsGoal = monthBudget.HasSavingsGoal || false;
            const savingsGoal = hasSavingsGoal ? monthBudget.SavingsGoal || 0 : 0;
            
            // Calculate effective total (budget minus savings)
            let effectiveTotal = totalBudget;
            if (hasSavingsGoal) {
                effectiveTotal = totalBudget - savingsGoal;
            }
            
            // Get all expenses from the expense data for the current month
            const allExpenses = this.expenses.filter(expense => 
                expense.Month === month && expense.Year === year
            );
            
            // Don't include SIP and rent automatically as fixed expenses
            // Instead, we'll only count them if they appear in the actual expenses
            const fixedExpenses = allExpenses
                .filter(expense => 
                    (expense.Subcategory === 'SIP' || expense.Subcategory === 'Rent')
                )
                .reduce((sum, expense) => sum + expense.Amount, 0);
            
            // Filter only Cash/UPI expenses for budget calculations (exclude credit card)
            const cashUpiExpenses = allExpenses.filter(expense => 
                expense.PaymentMethod === 'Cash' || expense.PaymentMethod === 'UPI'
            );
            
            // For UI display, categorize expenses from the expense data
            const variableExpenses = cashUpiExpenses
                .filter(expense => 
                    ['Bills', 'Services'].includes(expense.Category) && 
                    !['SIP', 'Rent'].includes(expense.Subcategory) // Exclude SIP and Rent as they're counted in fixedExpenses
                )
                .reduce((sum, expense) => sum + expense.Amount, 0);
            
            const dailyExpenses = cashUpiExpenses
                .filter(expense => !['Bills', 'Services'].includes(expense.Category))
                .reduce((sum, expense) => sum + expense.Amount, 0);
            
            // Total of all Cash/UPI expenses from the expense data
            const totalExpensesFromData = variableExpenses + dailyExpenses + fixedExpenses;
            
            // Calculate remaining budget
            const remainingBudget = effectiveTotal - totalExpensesFromData;
            
            // Calculate daily spending allowance for the remaining days in the month
            const today = new Date();
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const daysLeft = Math.max(0, lastDayOfMonth - today.getDate() + 1);
            
            let dailyAllowance = 0;
            if (daysLeft > 0) {
                dailyAllowance = remainingBudget / daysLeft;
            }
            
            // Calculate budget used percentage
            const budgetUsedPct = effectiveTotal > 0 ? 100 - (remainingBudget / effectiveTotal * 100) : 0;
            
            return {
                total_budget: totalBudget,
                daily_allowance: dailyAllowance,
                remaining_budget: remainingBudget,
                budget_used_pct: budgetUsedPct,
                fixed_expenses: fixedExpenses,
                variable_expenses: variableExpenses,
                daily_expenses: dailyExpenses,
                savings_goal: savingsGoal,
                has_savings_goal: hasSavingsGoal,
                effective_total: effectiveTotal,
                days_left: daysLeft,
                credit_card_balance: creditCardBalance,
                credit_card_used: creditCardUsed,
                credit_card_remaining: creditCardRemaining,
                cash_balance: cashBalance,
                bank_balance: bankBalance
            };
        } catch (error) {
            console.error('Error getting budget details:', error);
            return {
                total_budget: this.settings.defaultBudget,
                daily_allowance: 500,
                remaining_budget: this.settings.defaultBudget,
                budget_used_pct: 0,
                fixed_expenses: 0,
                variable_expenses: 0,
                daily_expenses: 0,
                savings_goal: 0,
                has_savings_goal: false,
                effective_total: this.settings.defaultBudget,
                days_left: 30,
                credit_card_balance: this.settings.defaultCreditLimit,
                credit_card_used: 0,
                credit_card_remaining: this.settings.defaultCreditLimit,
                cash_balance: this.settings.defaultCashBalance,
                bank_balance: this.settings.defaultBankBalance
            };
        }
    }
    
    // Get month's budget data
    getMonthBudget(month, year) {
        return this.budgets.find(budget => 
            budget.Month === month && budget.Year === year
        );
    }
    
    // Load budget form with values for selected month/year
    loadBudgetForm(month, year) {
        try {
            const monthBudget = this.getMonthBudget(month, year);
            
            const monthlyBudgetInput = document.getElementById('monthlyBudget');
            const monthlySavingsGoalInput = document.getElementById('monthlySavingsGoal');
            const creditCardLimitInput = document.getElementById('creditCardLimit');
            const previousMonthCreditInput = document.getElementById('previousMonthCredit');
            const initialCashBalanceInput = document.getElementById('initialCashBalance');
            const initialBankBalanceInput = document.getElementById('initialBankBalance');
            
            if (!monthlyBudgetInput || !creditCardLimitInput || !previousMonthCreditInput || 
                !initialCashBalanceInput || !initialBankBalanceInput || !monthlySavingsGoalInput) {
                return;
            }
            
            // Make monthly budget read-only
            if (monthlyBudgetInput) {
                monthlyBudgetInput.readOnly = true;
                monthlyBudgetInput.classList.add('bg-light');
            }
            
            // Always use defaultCashBalance/defaultBankBalance as initial values
            // unless custom values have been set for this month
            let cashBalance = this.settings.defaultCashBalance;
            let bankBalance = this.settings.defaultBankBalance;
            
            if (monthBudget) {
                // Only use custom values if they have been explicitly set
                if (monthBudget.initialCashBalance !== undefined) {
                    cashBalance = monthBudget.initialCashBalance;
                }
                
                if (monthBudget.initialBankBalance !== undefined) {
                    bankBalance = monthBudget.initialBankBalance;
                }
                
                // Set form values from budget
                initialCashBalanceInput.value = cashBalance;
                initialBankBalanceInput.value = bankBalance;
                
                // Calculate total budget (this should match TotalBudget if it hasn't been modified)
                const totalBudget = cashBalance + bankBalance;
                monthlyBudgetInput.value = totalBudget;
                
                // Set other form fields
                monthlySavingsGoalInput.value = monthBudget.SavingsGoal || this.settings.defaultSavingsGoal;
                creditCardLimitInput.value = monthBudget.CreditCardBalance || this.settings.defaultCreditLimit;
                previousMonthCreditInput.value = monthBudget.PreviousMonthCredit || 0;
            } else {
                // No budget exists, use settings defaults
                initialCashBalanceInput.value = cashBalance;
                initialBankBalanceInput.value = bankBalance;
                monthlyBudgetInput.value = cashBalance + bankBalance;
                monthlySavingsGoalInput.value = this.settings.defaultSavingsGoal;
                creditCardLimitInput.value = this.settings.defaultCreditLimit;
                previousMonthCreditInput.value = 0;
            }
            
            this.validateBudgetInputs();
            
            // Update credit card visibility
            setTimeout(() => this.updateCreditCardVisibility(), 0);
        } catch (error) {
            console.error('Error loading budget form:', error);
        }
    }
      
    // Budget history update
    updateBudgetHistory() {
        try {
            // Get unique month/year combinations from budgets
            const budgetMonths = this.budgets.map(budget => ({
                month: budget.Month,
                year: budget.Year
            }));
            
            // Sort by year and month
            budgetMonths.sort((a, b) => {
                if (a.year !== b.year) {
                    return b.year - a.year; // Most recent year first
                }
                
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                               'July', 'August', 'September', 'October', 'November', 'December'];
                return months.indexOf(b.month) - months.indexOf(a.month); // Most recent month first
            });
            
            // Update budget history table
            const table = document.getElementById('budgetHistoryTable')?.getElementsByTagName('tbody')[0];
            if (!table) return;
            
            table.innerHTML = '';
            
            // Data for chart
            const chartMonths = [];
            const budgetData = [];
            const expenseData = [];
            const savingsData = [];
            
            budgetMonths.forEach(({month, year}) => {
                const monthBudget = this.getMonthBudget(month, year);
                if (!monthBudget) return;
                
                const budgetDetails = this.getBudgetDetails(month, year);
                
                // Calculate actual expenses
                const monthExpenses = this.expenses.filter(expense => 
                    expense.Month === month && expense.Year === year
                );
                
                const totalExpenses = monthExpenses.reduce((sum, expense) => sum + expense.Amount, 0) + 
                                    budgetDetails.fixed_expenses;
                
                // Calculate savings
                const actualSavings = Math.max(0, monthBudget.TotalBudget - totalExpenses);
                
                // Create row
                const row = table.insertRow();
                
                // Month/Year cell
                const monthYearCell = row.insertCell(0);
                monthYearCell.textContent = `${month} ${year}`;
                
                // Total Budget cell
                const budgetCell = row.insertCell(1);
                budgetCell.textContent = `${this.settings.currency}${(monthBudget.TotalBudget || 0).toFixed(2)}`;
                budgetCell.className = 'text-end';
                
                // Expenses cell
                const expensesCell = row.insertCell(2);
                expensesCell.textContent = `${this.settings.currency}${totalExpenses.toFixed(2)}`;
                expensesCell.className = 'text-end';
                
                // Savings cell
                const savingsCell = row.insertCell(3);
                savingsCell.textContent = `${this.settings.currency}${actualSavings.toFixed(2)}`;
                savingsCell.className = 'text-end';
                
                // Savings Goal cell
                const savingsGoalCell = row.insertCell(4);
                if (monthBudget.HasSavingsGoal) {
                    savingsGoalCell.textContent = `${this.settings.currency}${(monthBudget.SavingsGoal || 0).toFixed(2)}`;
                } else {
                    savingsGoalCell.textContent = 'Not set';
                    savingsGoalCell.className = 'text-muted';
                }
                savingsGoalCell.className = 'text-end';
                
                // Status cell
                const statusCell = row.insertCell(5);
                if (monthBudget.HasSavingsGoal && actualSavings >= monthBudget.SavingsGoal) {
                    statusCell.innerHTML = '<span class="badge bg-success">Goal Achieved</span>';
                } else if (monthBudget.HasSavingsGoal) {
                    statusCell.innerHTML = '<span class="badge bg-danger">Goal Not Met</span>';
                } else {
                    statusCell.innerHTML = '<span class="badge bg-secondary">No Goal Set</span>';
                }
                
                // Add data for chart
                chartMonths.push(`${month.substring(0, 3)} ${year}`);
                budgetData.push(monthBudget.TotalBudget || 0);
                expenseData.push(totalExpenses);
                savingsData.push(actualSavings);
            });
            
            // Create budget history chart
            this.createBudgetHistoryChart(chartMonths.reverse(), 
                                        budgetData.reverse(), 
                                        expenseData.reverse(), 
                                        savingsData.reverse());
        } catch (error) {
            console.error('Error updating budget history:', error);
        }
    }
    
    // Budget history chart
    createBudgetHistoryChart(months, budgetData, expenseData, savingsData) {
        try {
            // Destroy existing chart
            if (this.chartInstances.budgetHistoryChart) {
                this.chartInstances.budgetHistoryChart.destroy();
            }
            
            if (months.length === 0) return;
            
            const chartCanvas = document.getElementById('budgetHistoryChart');
            if (!chartCanvas) return;
            
            const ctx = chartCanvas.getContext('2d');
            this.chartInstances.budgetHistoryChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Total Budget',
                            data: budgetData,
                            backgroundColor: 'rgba(54, 162, 235, 0.5)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Expenses',
                            data: expenseData,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Savings',
                            data: savingsData,
                            backgroundColor: 'rgba(75, 192, 192, 0.5)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => {
                                    return this.settings.currency + value;
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `${context.dataset.label}: ${this.settings.currency}${context.raw.toFixed(2)}`;
                                }
                            }
                        },
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating budget history chart:', error);
        }
    }
    
    // Analysis page
    updateAnalysisPage() {
        try {
            // Get date range
            const dateRangeFilter = document.getElementById('dateRangeFilter').value;
            let startDate, endDate;
            
            const today = new Date();
            
            switch(dateRangeFilter) {
                case 'thisMonth':
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = today;
                    break;
                case 'lastMonth':
                    const lastMonth = today.getMonth() - 1;
                    const lastMonthYear = lastMonth < 0 ? today.getFullYear() - 1 : today.getFullYear();
                    const lastMonthIndex = lastMonth < 0 ? 11 : lastMonth;
                    const lastMonthDays = new Date(lastMonthYear, lastMonthIndex + 1, 0).getDate();
                    startDate = new Date(lastMonthYear, lastMonthIndex, 1);
                    endDate = new Date(lastMonthYear, lastMonthIndex, lastMonthDays);
                    break;
                case 'last30Days':
                    startDate = new Date(today);
                    startDate.setDate(startDate.getDate() - 30);
                    endDate = today;
                    break;
                case 'last7Days':
                    startDate = new Date(today);
                    startDate.setDate(startDate.getDate() - 7);
                    endDate = today;
                    break;
                case 'thisYear':
                    startDate = new Date(today.getFullYear(), 0, 1);
                    endDate = today;
                    break;
                case 'custom':
                    const startDateInput = document.getElementById('startDate');
                    const endDateInput = document.getElementById('endDate');
                    
                    if (startDateInput && endDateInput) {
                        startDate = new Date(startDateInput.value);
                        endDate = new Date(endDateInput.value);
                        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                            this.showToast('Please select valid start and end dates.', 'warning');
                            return;
                        }
                    } else {
                        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                        endDate = today;
                    }
                    break;
                default:
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = today;
            }
            
            // Get selected categories
            const selectedCategories = [];
            document.querySelectorAll('.category-filter:checked').forEach(checkbox => {
                selectedCategories.push(checkbox.value);
            });
            
            // Get selected payment methods
            const selectedPaymentMethods = [];
            document.querySelectorAll('.payment-filter:checked').forEach(checkbox => {
                selectedPaymentMethods.push(checkbox.value);
            });
            
            // Get selected subcategories
            const selectedSubcategories = [];
            document.querySelectorAll('.subcategory-filter:checked').forEach(checkbox => {
                selectedSubcategories.push(checkbox.value);
            });
            
            // Get description search term
            const descriptionSearch = document.getElementById('descriptionSearch')?.value.toLowerCase() || '';
            
            // Get amount range values
            const minAmountEl = document.getElementById('minAmountInput');
            const maxAmountEl = document.getElementById('maxAmountInput');
            let minAmount = 0;
            let maxAmount = Number.MAX_SAFE_INTEGER;
            
            if (minAmountEl && maxAmountEl) {
                minAmount = parseFloat(minAmountEl.value) || 0;
                maxAmount = parseFloat(maxAmountEl.value) || Number.MAX_SAFE_INTEGER;
            }
            
            // Filter expenses
            let filteredExpenses = this.expenses.filter(expense => {
                const expenseDate = new Date(expense.Date);
                return expenseDate >= startDate && expenseDate <= endDate &&
                       (selectedCategories.length === 0 || selectedCategories.includes(expense.Category)) &&
                       (selectedPaymentMethods.length === 0 || selectedPaymentMethods.includes(expense.PaymentMethod)) &&
                       (selectedSubcategories.length === 0 || selectedSubcategories.includes(expense.Subcategory)) &&
                       (descriptionSearch === '' || expense.Description.toLowerCase().includes(descriptionSearch)) &&
                       expense.Amount >= minAmount && expense.Amount <= maxAmount;
            });
            
            // Save filtered expenses for use in other methods
            this.filteredExpenses = filteredExpenses;
            
            // Update summary statistics
            const analysisTotalExpenses = document.getElementById('analysisTotalExpenses');
            const analysisAvgDailyExpense = document.getElementById('analysisAvgDailyExpense');
            const analysisHighestExpense = document.getElementById('analysisHighestExpense');
            const highestExpenseCategory = document.getElementById('highestExpenseCategory');
            const analysisNumTransactions = document.getElementById('analysisNumTransactions');
            
            if (!analysisTotalExpenses || !analysisAvgDailyExpense || !analysisHighestExpense || 
                !highestExpenseCategory || !analysisNumTransactions) {
                this.showToast('Analysis page elements are missing.', 'error');
                return;
            }
            
            if (filteredExpenses.length === 0) {
                analysisTotalExpenses.textContent = `${this.settings.currency}0.00`;
                analysisAvgDailyExpense.textContent = `${this.settings.currency}0.00`;
                analysisHighestExpense.textContent = `${this.settings.currency}0.00`;
                highestExpenseCategory.textContent = '-';
                analysisNumTransactions.textContent = '0';
                
                // Clear charts
                this.clearAnalysisCharts();
                
                // Hide food analysis section
                const foodAnalysisSection = document.getElementById('foodAnalysisSection');
                if (foodAnalysisSection) {
                    foodAnalysisSection.classList.add('d-none');
                }
                
                this.showToast('No expenses found for the selected filters.', 'info');
                return;
            }
            
            // Calculate summary statistics
            const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.Amount, 0);
            const daysDiff = Math.max(1, Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
            const avgDailyExpense = totalExpenses / daysDiff;
            
            // Find highest expense
            const highestExpense = filteredExpenses.reduce((max, expense) => 
                expense.Amount > max.amount ? { amount: expense.Amount, category: expense.Subcategory } : max, 
                { amount: 0, category: '' }
            );
            
            // Update UI
            analysisTotalExpenses.textContent = `${this.settings.currency}${totalExpenses.toFixed(2)}`;
            analysisAvgDailyExpense.textContent = `${this.settings.currency}${avgDailyExpense.toFixed(2)}`;
            analysisHighestExpense.textContent = `${this.settings.currency}${highestExpense.amount.toFixed(2)}`;
            highestExpenseCategory.textContent = highestExpense.category;
            analysisNumTransactions.textContent = filteredExpenses.length.toString();
            
            // Update charts
            this.updateAnalysisCharts(filteredExpenses, startDate, endDate);
            
            // Check for food expenses and update food analysis section if needed
            const foodExpenses = filteredExpenses.filter(expense => expense.Category === 'Food');
            const foodAnalysisSection = document.getElementById('foodAnalysisSection');
            if (foodAnalysisSection) {
                if (foodExpenses.length > 0) {
                    this.updateFoodAnalysis(foodExpenses, totalExpenses);
                    foodAnalysisSection.classList.remove('d-none');
                } else {
                    foodAnalysisSection.classList.add('d-none');
                }
            }
            
            // Update payment method analysis
            this.updatePaymentMethodAnalysis(filteredExpenses, totalExpenses);
            
        } catch (error) {
            console.error('Error updating analysis page:', error);
            this.showToast('Error updating analysis. Please try again.', 'error');
        }
    }

    updateCategoryAnalysis(expenses, totalExpenses) {
        try {
            // Group by category
            const categoryData = {};
            
            expenses.forEach(expense => {
                const category = expense.Category;
                if (!categoryData[category]) {
                    categoryData[category] = {
                        total: 0,
                        count: 0,
                        subcategories: {}
                    };
                }
                
                categoryData[category].total += expense.Amount;
                categoryData[category].count++;
                
                // Track subcategories
                const subcategory = expense.Subcategory;
                if (!categoryData[category].subcategories[subcategory]) {
                    categoryData[category].subcategories[subcategory] = {
                        total: 0,
                        count: 0
                    };
                }
                
                categoryData[category].subcategories[subcategory].total += expense.Amount;
                categoryData[category].subcategories[subcategory].count++;
            });
            
            // Now categoryData contains all the analysis information
            // You can use this to update UI elements for each category
            
            // For example, if you have sections for each category:
            Object.entries(categoryData).forEach(([category, data]) => {
                const categorySection = document.getElementById(`${category.toLowerCase()}AnalysisSection`);
                if (categorySection) {
                    categorySection.classList.remove('d-none');
                    
                    // Update category metrics if they exist
                    const totalElement = document.getElementById(`${category.toLowerCase()}TotalExpenses`);
                    if (totalElement) {
                        totalElement.textContent = `${this.settings.currency}${data.total.toFixed(2)}`;
                    }
                    
                    const percentageElement = document.getElementById(`${category.toLowerCase()}BudgetPercentage`);
                    if (percentageElement) {
                        const percentage = (data.total / totalExpenses * 100);
                        percentageElement.textContent = `${percentage.toFixed(1)}%`;
                    }
                    
                    const avgElement = document.getElementById(`${category.toLowerCase()}AvgExpense`);
                    if (avgElement) {
                        const avg = data.count > 0 ? data.total / data.count : 0;
                        avgElement.textContent = `${this.settings.currency}${avg.toFixed(2)}`;
                    }
                    
                    // Update subcategory table if it exists
                    const tableBody = document.getElementById(`${category.toLowerCase()}SourceTable`)?.getElementsByTagName('tbody')[0];
                    if (tableBody) {
                        tableBody.innerHTML = '';
                        
                        Object.entries(data.subcategories)
                            .sort((a, b) => b[1].total - a[1].total)
                            .forEach(([subcategory, subData]) => {
                                const percentage = (subData.total / data.total * 100);
                                
                                const row = tableBody.insertRow();
                                const subcategoryCell = row.insertCell(0);
                                subcategoryCell.textContent = subcategory;
                                
                                const amountCell = row.insertCell(1);
                                amountCell.textContent = `${this.settings.currency}${subData.total.toFixed(2)}`;
                                amountCell.className = 'text-end';
                                
                                const percentageCell = row.insertCell(2);
                                percentageCell.textContent = `${percentage.toFixed(1)}%`;
                                percentageCell.className = 'text-end';
                            });
                    }
                }
            });
        } catch (error) {
            console.error('Error updating category analysis:', error);
        }
    }
    // Analysis charts
    updateAnalysisCharts(expenses, startDate, endDate) {
        try {
            // Clear existing charts
            this.clearAnalysisCharts();
            
            // Category chart
            this.createAnalysisCategoryChart(expenses);
            
            // Subcategory chart
            this.createAnalysisSubcategoryChart(expenses);
            
            // Trend chart
            this.createAnalysisTrendChart(expenses, startDate, endDate);
            
            // Weekly pattern chart
            this.createAnalysisWeeklyChart(expenses);
        } catch (error) {
            console.error('Error updating analysis charts:', error);
        }
    }
    
    clearAnalysisCharts() {
        try {
            // Destroy existing charts
            if (this.chartInstances.analysisCategoryChart) {
                this.chartInstances.analysisCategoryChart.destroy();
            }
            
            if (this.chartInstances.analysisSubcategoryChart) {
                this.chartInstances.analysisSubcategoryChart.destroy();
            }
            
            if (this.chartInstances.analysisTrendChart) {
                this.chartInstances.analysisTrendChart.destroy();
            }
            
            if (this.chartInstances.analysisWeeklyChart) {
                this.chartInstances.analysisWeeklyChart.destroy();
            }
            
            if (this.chartInstances.foodSourceChart) {
                this.chartInstances.foodSourceChart.destroy();
            }
            
            if (this.chartInstances.paymentMethodChart) {
                this.chartInstances.paymentMethodChart.destroy();
            }
        } catch (error) {
            console.error('Error clearing analysis charts:', error);
        }
    }
    
    createAnalysisCategoryChart(expenses) {
        try {
            if (expenses.length === 0) return;
            
            const chartCanvas = document.getElementById('analysisCategoryChart');
            if (!chartCanvas) return;
            
            // Group expenses by category
            const categoryTotals = {};
            expenses.forEach(expense => {
                if (!categoryTotals[expense.Category]) {
                    categoryTotals[expense.Category] = 0;
                }
                categoryTotals[expense.Category] += expense.Amount;
            });
            
            // Prepare data for chart
            const categories = Object.keys(categoryTotals);
            const values = Object.values(categoryTotals);
            
            // Color mapping for categories
            const colorMap = {
                Food: 'rgba(54, 162, 235, 0.8)',
                Transportation: 'rgba(255, 99, 132, 0.8)',
                Bills: 'rgba(75, 192, 192, 0.8)',
                Services: 'rgba(0, 204, 204, 0.8)',
                Entertainment: 'rgba(255, 159, 64, 0.8)',
                Miscellaneous: 'rgba(153, 102, 255, 0.8)'
            };
            
            const colors = categories.map(category => colorMap[category] || 'rgba(201, 203, 207, 0.8)');
            
            // Create chart
            const ctx = chartCanvas.getContext('2d');
            this.chartInstances.analysisCategoryChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: values,
                        backgroundColor: colors,
                        borderColor: 'white',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                font: {
                                    size: 12
                                },
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${context.label}: ${this.settings.currency}${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating analysis category chart:', error);
        }
    }
    
    createAnalysisSubcategoryChart(expenses) {
        try {
            if (expenses.length === 0) return;
            
            const chartCanvas = document.getElementById('analysisSubcategoryChart');
            if (!chartCanvas) return;
            
            // Group expenses by subcategory
            const subcategoryTotals = {};
            expenses.forEach(expense => {
                if (!subcategoryTotals[expense.Subcategory]) {
                    subcategoryTotals[expense.Subcategory] = 0;
                }
                subcategoryTotals[expense.Subcategory] += expense.Amount;
            });
            
            // Sort subcategories by total and get top 10
            const sortedSubcategories = Object.entries(subcategoryTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            
            // Prepare data for chart
            const subcategories = sortedSubcategories.map(item => item[0]);
            const values = sortedSubcategories.map(item => item[1]);
            
            // Create chart
            const ctx = chartCanvas.getContext('2d');
            this.chartInstances.analysisSubcategoryChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: subcategories,
                    datasets: [{
                        data: values,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.8)',
                            'rgba(54, 162, 235, 0.8)',
                            'rgba(255, 206, 86, 0.8)',
                            'rgba(75, 192, 192, 0.8)',
                            'rgba(153, 102, 255, 0.8)',
                            'rgba(255, 159, 64, 0.8)',
                            'rgba(199, 199, 199, 0.8)',
                            'rgba(83, 102, 255, 0.8)',
                            'rgba(40, 159, 64, 0.8)',
                            'rgba(240, 120, 120, 0.8)'
                        ],
                        borderColor: 'white',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                font: {
                                    size: 12
                                },
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${context.label}: ${this.settings.currency}${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating analysis subcategory chart:', error);
        }
    }
    
    createAnalysisTrendChart(expenses, startDate, endDate) {
        try {
            if (expenses.length === 0) return;
            
            const chartCanvas = document.getElementById('analysisTrendChart');
            if (!chartCanvas) return;
            
            // Group expenses by date
            const dateExpenses = {};
            expenses.forEach(expense => {
                const dateStr = this.formatDate(expense.Date);
                if (!dateExpenses[dateStr]) {
                    dateExpenses[dateStr] = 0;
                }
                dateExpenses[dateStr] += expense.Amount;
            });
            
            // Create an array of all dates in the range
            const allDates = [];
            const allValues = [];
            
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dateStr = this.formatDate(currentDate);
                allDates.push(dateStr);
                allValues.push(dateExpenses[dateStr] || 0);
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Create chart
            const ctx = chartCanvas.getContext('2d');
            this.chartInstances.analysisTrendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: allDates,
                    datasets: [{
                        label: 'Daily Expenses',
                        data: allValues,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: true,
                        tension: 0.1,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => {
                                    return this.settings.currency + value;
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `${this.settings.currency}${context.raw.toFixed(2)}`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating analysis trend chart:', error);
        }
    }
    
    createAnalysisWeeklyChart(expenses) {
        try {
            if (expenses.length === 0) return;
            
            const chartCanvas = document.getElementById('analysisWeeklyChart');
            if (!chartCanvas) return;
            
            // Add day of week
            const dayTotals = {
                'Monday': 0,
                'Tuesday': 0,
                'Wednesday': 0,
                'Thursday': 0,
                'Friday': 0,
                'Saturday': 0,
                'Sunday': 0
            };
            
            const dayCounts = {
                'Monday': 0,
                'Tuesday': 0,
                'Wednesday': 0,
                'Thursday': 0,
                'Friday': 0,
                'Saturday': 0,
                'Sunday': 0
            };
            
            expenses.forEach(expense => {
                const date = new Date(expense.Date);
                const dayName = date.toLocaleString('en-US', { weekday: 'long' });
                dayTotals[dayName] += expense.Amount;
                dayCounts[dayName]++;
            });
            
            // Prepare data for chart
            const days = Object.keys(dayTotals);
            const values = Object.values(dayTotals);
            
            // Create chart
            const ctx = chartCanvas.getContext('2d');
            this.chartInstances.analysisWeeklyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Total Expense',
                        data: values,
                        backgroundColor: 'rgba(255, 99, 132, 0.8)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => {
                                    return this.settings.currency + value;
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const day = context.label;
                                    return [
                                        `Total: ${this.settings.currency}${context.raw.toFixed(2)}`,
                                        `Transactions: ${dayCounts[day]}`
                                    ];
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating analysis weekly chart:', error);
        }
    }
    
    // Payment method analysis
    updatePaymentMethodAnalysis(expenses, totalExpenses) {
        try {
            // Group by payment method
            const paymentMethods = {};
            const paymentCounts = {};
            
            expenses.forEach(expense => {
                const method = expense.PaymentMethod;
                if (!paymentMethods[method]) {
                    paymentMethods[method] = 0;
                    paymentCounts[method] = 0;
                }
                paymentMethods[method] += expense.Amount;
                paymentCounts[method]++;
            });
            
            // Update payment method table
            const table = document.getElementById('paymentMethodTable')?.getElementsByTagName('tbody')[0];
            if (!table) return;
            
            table.innerHTML = '';
            
            Object.keys(paymentMethods).forEach(method => {
                const amount = paymentMethods[method];
                const percentage = (amount / totalExpenses * 100);
                const count = paymentCounts[method];
                
                const row = table.insertRow();
                
                // Method cell
                const methodCell = row.insertCell(0);
                methodCell.textContent = method;
                
                // Amount cell
                const amountCell = row.insertCell(1);
                amountCell.textContent = `${this.settings.currency}${amount.toFixed(2)}`;
                amountCell.className = 'text-end';
                
                // Percentage cell
                const percentageCell = row.insertCell(2);
                percentageCell.textContent = `${percentage.toFixed(1)}%`;
                percentageCell.className = 'text-end';
                
                // Count cell
                const countCell = row.insertCell(3);
                countCell.textContent = count;
                countCell.className = 'text-end';
            });
            
            // Create payment method chart
            this.createPaymentMethodChart(paymentMethods);
        } catch (error) {
            console.error('Error updating payment method analysis:', error);
        }
    }
    
    createPaymentMethodChart(paymentMethods) {
        try {
            if (this.chartInstances.paymentMethodChart) {
                this.chartInstances.paymentMethodChart.destroy();
            }
            
            const chartCanvas = document.getElementById('paymentMethodChart');
            if (!chartCanvas) return;
            
            const methods = Object.keys(paymentMethods);
            const values = Object.values(paymentMethods);
            
            // Create chart
            const ctx = chartCanvas.getContext('2d');
            this.chartInstances.paymentMethodChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: methods,
                    datasets: [{
                        data: values,
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.8)',
                            'rgba(54, 162, 235, 0.8)',
                            'rgba(255, 99, 132, 0.8)'
                        ],
                        borderColor: 'white',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${context.label}: ${this.settings.currency}${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating payment method chart:', error);
        }
    }
    
    // Food analysis
    updateFoodAnalysis(foodExpenses, totalExpenses) {
        try {
            const foodSection = document.getElementById('foodAnalysisSection');
            if (!foodSection) return;
            
            foodSection.classList.remove('d-none');
            
            // Calculate food metrics
            const foodTotal = foodExpenses.reduce((sum, expense) => sum + expense.Amount, 0);
            const foodCount = foodExpenses.length;
            const foodAvg = foodCount > 0 ? foodTotal / foodCount : 0;
            const foodPercentage = totalExpenses > 0 ? (foodTotal / totalExpenses * 100) : 0;
            
            // Update metrics
            document.getElementById('foodTotalExpenses').textContent = `${this.settings.currency}${foodTotal.toFixed(2)}`;
            document.getElementById('foodBudgetPercentage').textContent = `${foodPercentage.toFixed(1)}%`;
            document.getElementById('foodAvgExpense').textContent = `${this.settings.currency}${foodAvg.toFixed(2)}`;
            
            // Group by food source (subcategory)
            const foodSources = {};
            foodExpenses.forEach(expense => {
                if (!foodSources[expense.Subcategory]) {
                    foodSources[expense.Subcategory] = 0;
                }
                foodSources[expense.Subcategory] += expense.Amount;
            });
            
            // Sort food sources by amount
            const sortedSources = Object.entries(foodSources)
                .sort((a, b) => b[1] - a[1]);
            
            // Update food sources table
            const table = document.getElementById('foodSourceTable')?.getElementsByTagName('tbody')[0];
            if (!table) return;
            
            table.innerHTML = '';
            
            sortedSources.forEach(([source, amount]) => {
                const percentage = (amount / foodTotal * 100);
                
                const row = table.insertRow();
                
                // Source cell
                const sourceCell = row.insertCell(0);
                sourceCell.textContent = source;
                
                // Amount cell
                const amountCell = row.insertCell(1);
                amountCell.textContent = `${this.settings.currency}${amount.toFixed(2)}`;
                amountCell.className = 'text-end';
                
                // Percentage cell
                const percentageCell = row.insertCell(2);
                percentageCell.textContent = `${percentage.toFixed(1)}%`;
                percentageCell.className = 'text-end';
            });
            
            // Create food sources chart
            this.createFoodSourceChart(sortedSources);
        } catch (error) {
            console.error('Error updating food analysis:', error);
        }
    }
    
    createFoodSourceChart(sources) {
        try {
            // Destroy existing chart
            if (this.chartInstances.foodSourceChart) {
                this.chartInstances.foodSourceChart.destroy();
            }
            
            const chartCanvas = document.getElementById('foodSourceChart');
            if (!chartCanvas || sources.length === 0) return;
            
            // Prepare data for chart
            const labels = sources.map(s => s[0]);
            const values = sources.map(s => s[1]);
            
            // Create chart
            const ctx = chartCanvas.getContext('2d');
            this.chartInstances.foodSourceChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.8)',
                            'rgba(54, 162, 235, 0.8)',
                            'rgba(255, 206, 86, 0.8)',
                            'rgba(75, 192, 192, 0.8)',
                            'rgba(153, 102, 255, 0.8)',
                            'rgba(255, 159, 64, 0.8)',
                            'rgba(199, 199, 199, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${context.label}: ${this.settings.currency}${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating food source chart:', error);
        }
    }
    
    // Download analysis CSV
    downloadAnalysisCSV() {
        try {
            // Check if PDF is selected
            const downloadFormat = document.querySelector('input[name="downloadFormat"]:checked')?.value || 'csv';
            
            if (downloadFormat === 'pdf') {
                this.downloadAnalysisPDF(); // Call PDF download instead
                return;
            }
            
            // Get date range information
            const dateRangeFilter = document.getElementById('dateRangeFilter')?.value || 'thisMonth';
            
            // Get filtered expenses from current analysis (or filter again if needed)
            let filteredExpenses = this.filteredExpenses;
            if (!filteredExpenses || filteredExpenses.length === 0) {
                // If no filtered expenses exist, we need to get the date range and filter again
                let startDate, endDate;
                const today = new Date();
                
                switch(dateRangeFilter) {
                    case 'thisMonth':
                        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                        endDate = today;
                        break;
                    case 'lastMonth':
                        const lastMonth = today.getMonth() - 1;
                        const lastMonthYear = lastMonth < 0 ? today.getFullYear() - 1 : today.getFullYear();
                        const lastMonthIndex = lastMonth < 0 ? 11 : lastMonth;
                        const lastMonthDays = new Date(lastMonthYear, lastMonthIndex + 1, 0).getDate();
                        startDate = new Date(lastMonthYear, lastMonthIndex, 1);
                        endDate = new Date(lastMonthYear, lastMonthIndex, lastMonthDays);
                        break;
                    case 'last30Days':
                        startDate = new Date(today);
                        startDate.setDate(startDate.getDate() - 30);
                        endDate = today;
                        break;
                    case 'last7Days':
                        startDate = new Date(today);
                        startDate.setDate(startDate.getDate() - 7);
                        endDate = today;
                        break;
                    case 'thisYear':
                        startDate = new Date(today.getFullYear(), 0, 1);
                        endDate = today;
                        break;
                    case 'custom':
                        const startDateInput = document.getElementById('startDate');
                        const endDateInput = document.getElementById('endDate');
                        
                        if (startDateInput && endDateInput) {
                            startDate = new Date(startDateInput.value);
                            endDate = new Date(endDateInput.value);
                            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                                this.showToast('Please select valid start and end dates.', 'warning');
                                return;
                            }
                        } else {
                            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                            endDate = today;
                        }
                        break;
                    default:
                        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                        endDate = today;
                }
                
                // Get all selected filters
                const selectedCategories = [];
                document.querySelectorAll('.category-filter:checked').forEach(checkbox => {
                    selectedCategories.push(checkbox.value);
                });
                
                const selectedPaymentMethods = [];
                document.querySelectorAll('.payment-filter:checked').forEach(checkbox => {
                    selectedPaymentMethods.push(checkbox.value);
                });
                
                const selectedSubcategories = [];
                document.querySelectorAll('.subcategory-filter:checked').forEach(checkbox => {
                    selectedSubcategories.push(checkbox.value);
                });
                
                const descriptionSearch = document.getElementById('descriptionSearch')?.value.toLowerCase() || '';
                
                // Filter expenses
                filteredExpenses = this.expenses.filter(expense => {
                    const expenseDate = new Date(expense.Date);
                    return expenseDate >= startDate && expenseDate <= endDate &&
                           (selectedCategories.length === 0 || selectedCategories.includes(expense.Category)) &&
                           (selectedPaymentMethods.length === 0 || selectedPaymentMethods.includes(expense.PaymentMethod)) &&
                           (selectedSubcategories.length === 0 || selectedSubcategories.includes(expense.Subcategory)) &&
                           (descriptionSearch === '' || expense.Description.toLowerCase().includes(descriptionSearch));
                });
            }
            
            if (filteredExpenses.length === 0) {
                this.showToast('No expenses found for the selected date range.', 'warning');
                return;
            }
            
            // Create CSV content
            let csvContent = '';
            
            // Determine date range from filtered expenses
            const dates = filteredExpenses.map(expense => new Date(expense.Date));
            const startDate = new Date(Math.min(...dates));
            const endDate = new Date(Math.max(...dates));
            
            // SECTION 1: OVERALL SUMMARY
            csvContent += 'EXPENSE ANALYSIS SUMMARY\n';
            csvContent += 'Metric,Value\n';
            
            // Calculate overall totals
            const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.Amount, 0);
            const daysDiff = Math.max(1, Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
            const avgDailyExpense = totalExpenses / daysDiff;
            
            csvContent += `Total Expenses,${this.settings.currency}${totalExpenses.toFixed(2)}\n`;
            csvContent += `Average Daily Expense,${this.settings.currency}${avgDailyExpense.toFixed(2)}\n`;
            csvContent += `Number of Transactions,${filteredExpenses.length}\n`;
            csvContent += `Date Range,${this.formatDate(startDate)} to ${this.formatDate(endDate)}\n`;
            csvContent += `Generated On,${this.formatDate(new Date())}\n\n`;
            
            // SECTION 2: CATEGORY SUMMARY
            csvContent += 'CATEGORY SUMMARY\n';
            csvContent += 'Category,Total Amount,Average Amount,Count,Percentage of Total\n';
            
            // Calculate category totals
            const categoryTotals = {};
            filteredExpenses.forEach(expense => {
                if (!categoryTotals[expense.Category]) {
                    categoryTotals[expense.Category] = {
                        totalAmount: 0,
                        count: 0
                    };
                }
                categoryTotals[expense.Category].totalAmount += expense.Amount;
                categoryTotals[expense.Category].count++;
            });
            
            // Add category data
            Object.entries(categoryTotals)
                .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
                .forEach(([category, data]) => {
                    const avgAmount = data.totalAmount / data.count;
                    const percentage = (data.totalAmount / totalExpenses * 100).toFixed(2);
                    csvContent += `${category},${this.settings.currency}${data.totalAmount.toFixed(2)},${this.settings.currency}${avgAmount.toFixed(2)},${data.count},${percentage}%\n`;
                });
            
            csvContent += '\n';
            
            // SECTION 3: SUBCATEGORY SUMMARY
            csvContent += 'SUBCATEGORY SUMMARY\n';
            csvContent += 'Subcategory,Category,Total Amount,Average Amount,Count,Percentage of Total\n';
            
            // Calculate subcategory totals
            const subcategoryTotals = {};
            filteredExpenses.forEach(expense => {
                const key = expense.Subcategory;
                if (!subcategoryTotals[key]) {
                    subcategoryTotals[key] = {
                        category: expense.Category,
                        totalAmount: 0,
                        count: 0
                    };
                }
                subcategoryTotals[key].totalAmount += expense.Amount;
                subcategoryTotals[key].count++;
            });
            
            // Add subcategory data
            Object.entries(subcategoryTotals)
                .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
                .forEach(([subcategory, data]) => {
                    const avgAmount = data.totalAmount / data.count;
                    const percentage = (data.totalAmount / totalExpenses * 100).toFixed(2);
                    csvContent += `${subcategory},${data.category},${this.settings.currency}${data.totalAmount.toFixed(2)},${this.settings.currency}${avgAmount.toFixed(2)},${data.count},${percentage}%\n`;
                });
            
            csvContent += '\n';
            
            // SECTION 4: PAYMENT METHOD SUMMARY
            csvContent += 'PAYMENT METHOD SUMMARY\n';
            csvContent += 'Payment Method,Total Amount,Count,Percentage of Total\n';
            
            // Calculate payment method totals
            const paymentMethodTotals = {};
            filteredExpenses.forEach(expense => {
                if (!paymentMethodTotals[expense.PaymentMethod]) {
                    paymentMethodTotals[expense.PaymentMethod] = {
                        totalAmount: 0,
                        count: 0
                    };
                }
                paymentMethodTotals[expense.PaymentMethod].totalAmount += expense.Amount;
                paymentMethodTotals[expense.PaymentMethod].count++;
            });
            
            // Add payment method data
            Object.entries(paymentMethodTotals)
                .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
                .forEach(([method, data]) => {
                    const percentage = (data.totalAmount / totalExpenses * 100).toFixed(2);
                    csvContent += `${method},${this.settings.currency}${data.totalAmount.toFixed(2)},${data.count},${percentage}%\n`;
                });
            
            csvContent += '\n';
            
            // SECTION 5: DAILY BREAKDOWN
            csvContent += 'DAILY EXPENSE BREAKDOWN\n';
            
            // Group expenses by date
            const expensesByDate = {};
            filteredExpenses.forEach(expense => {
                const dateStr = this.formatDate(expense.Date);
                if (!expensesByDate[dateStr]) {
                    expensesByDate[dateStr] = [];
                }
                expensesByDate[dateStr].push(expense);
            });
            
            // Sort dates chronologically
            const sortedDates = Object.keys(expensesByDate).sort((a, b) => {
                const dateA = this.parseDate(a);
                const dateB = this.parseDate(b);
                return dateA - dateB;
            });
            
            // For each date, list all expenses and category totals
            sortedDates.forEach(dateStr => {
                const dayExpenses = expensesByDate[dateStr];
                const dayTotal = dayExpenses.reduce((sum, expense) => sum + expense.Amount, 0);
                
                csvContent += `\nDate: ${dateStr}\n`;
                csvContent += `Daily Total: ${this.settings.currency}${dayTotal.toFixed(2)}\n`;
                
                // Calculate category totals for the day
                const dayCategoryTotals = {};
                dayExpenses.forEach(expense => {
                    if (!dayCategoryTotals[expense.Category]) {
                        dayCategoryTotals[expense.Category] = 0;
                    }
                    dayCategoryTotals[expense.Category] += expense.Amount;
                });
                
                // Add category breakdown for the day
                csvContent += 'Category Breakdown:\n';
                Object.entries(dayCategoryTotals)
                    .sort((a, b) => b[1] - a[1])
                    .forEach(([category, amount]) => {
                        const percentage = (amount / dayTotal * 100).toFixed(2);
                        csvContent += `${category},${this.settings.currency}${amount.toFixed(2)},${percentage}%\n`;
                    });
                
                // List all transactions for the day
                csvContent += 'Transactions:\n';
                csvContent += 'Category,Subcategory,Amount,Description,Payment Method\n';
                
                dayExpenses.forEach(expense => {
                    csvContent += `${expense.Category},${expense.Subcategory},${this.settings.currency}${expense.Amount.toFixed(2)},"${expense.Description}",${expense.PaymentMethod}\n`;
                });
            });
            
            // SECTION 6: RAW DATA (ALL EXPENSES)
            csvContent += '\nALL EXPENSES (RAW DATA)\n';
            csvContent += 'Date,Category,Subcategory,Amount,Description,PaymentMethod\n';
            
            filteredExpenses
                .sort((a, b) => new Date(a.Date) - new Date(b.Date))
                .forEach(expense => {
                    csvContent += `${this.formatDate(expense.Date)},${expense.Category},${expense.Subcategory},`;
                    csvContent += `${this.settings.currency}${expense.Amount.toFixed(2)},"${expense.Description}",${expense.PaymentMethod}\n`;
                });
            
            // Helper method to parse date if needed
            if (!this.parseDate) {
                this.parseDate = (dateStr) => {
                    // Assuming the format is dd/mm/yyyy or similar
                    const parts = dateStr.split(/[\/\-\.]/);
                    if (parts.length === 3) {
                        // Check format based on settings
                        if (this.settings.dateFormat === 'mm/dd/yyyy') {
                            return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
                        } else if (this.settings.dateFormat === 'yyyy-mm-dd') {
                            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                        } else { // Default to dd/mm/yyyy
                            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                        }
                    }
                    return new Date(dateStr); // Fallback
                };
            }
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `expense_analysis_${this.formatDateForFilename(startDate)}_to_${this.formatDateForFilename(endDate)}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Release the object URL to free up memory
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            this.showToast('Detailed expense analysis CSV downloaded successfully!', 'success');
        } catch (error) {
            console.error('Error downloading analysis CSV:', error);
            this.showToast('Error downloading analysis CSV.', 'error');
        }
    }

    async downloadAnalysisPDF() {
        try {
            this.showToast('Generating PDF, please wait...', 'info');
            
            // Check if jsPDF is available
            if (!window.jspdf) {
                throw new Error('jsPDF library not found. Make sure to include it in your HTML.');
            }
            
            // Create a new jsPDF instance
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Set title
            pdf.setFontSize(18);
            pdf.text('Expense Analysis Report', 15, 15);
            
            // Add date range and generation info
            pdf.setFontSize(11);
            
            // Get filtered expenses
            let filteredExpenses = this.filteredExpenses;
            if (!filteredExpenses || filteredExpenses.length === 0) {
                // If no expenses are filtered yet, use all expenses
                filteredExpenses = this.expenses;
            }
            
            if (filteredExpenses.length === 0) {
                this.showToast('No expenses to include in PDF.', 'warning');
                return;
            }
            
            // Calculate date range
            const dates = filteredExpenses.map(expense => new Date(expense.Date));
            const startDate = new Date(Math.min(...dates));
            const endDate = new Date(Math.max(...dates));
            
            pdf.text(`Date Range: ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`, 15, 25);
            pdf.text(`Generated On: ${this.formatDate(new Date())}`, 15, 30);
            
            // Add summary section
            let yPosition = 40;
            
            pdf.setFontSize(14);
            pdf.text('Summary Statistics', 15, yPosition);
            yPosition += 8;
            
            pdf.setFontSize(10);
            const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.Amount, 0);
            pdf.text(`Total Expenses: ${this.settings.currency}${totalExpenses.toFixed(2)}`, 15, yPosition);
            yPosition += 6;
            
            const transactionCount = filteredExpenses.length;
            pdf.text(`Number of Transactions: ${transactionCount}`, 15, yPosition);
            yPosition += 6;
            
            const daysDiff = Math.max(1, Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
            const avgDailyExpense = totalExpenses / daysDiff;
            pdf.text(`Average Daily Expense: ${this.settings.currency}${avgDailyExpense.toFixed(2)}`, 15, yPosition);
            yPosition += 10;
            
            // Add category data
            pdf.setFontSize(14);
            pdf.text('Expense Categories', 15, yPosition);
            yPosition += 8;
            
            // Table headers
            pdf.setFontSize(10);
            pdf.text('Category', 15, yPosition);
            pdf.text('Amount', 60, yPosition);
            pdf.text('Percentage', 90, yPosition);
            pdf.text('Count', 130, yPosition);
            yPosition += 4;
            
            // Add a line
            pdf.line(15, yPosition, 180, yPosition);
            yPosition += 6;
            
            // Calculate category data
            const categoryTotals = {};
            filteredExpenses.forEach(expense => {
                if (!categoryTotals[expense.Category]) {
                    categoryTotals[expense.Category] = {
                        totalAmount: 0,
                        count: 0
                    };
                }
                categoryTotals[expense.Category].totalAmount += expense.Amount;
                categoryTotals[expense.Category].count++;
            });
            
            // Add category rows
            Object.entries(categoryTotals).forEach(([category, data]) => {
                const percentage = (data.totalAmount / totalExpenses * 100).toFixed(1);
                pdf.text(category, 15, yPosition);
                pdf.text(`${this.settings.currency}${data.totalAmount.toFixed(2)}`, 60, yPosition);
                pdf.text(`${percentage}%`, 90, yPosition);
                pdf.text(data.count.toString(), 130, yPosition);
                yPosition += 6;
                
                // Check if we need a new page
                if (yPosition > 280) {
                    pdf.addPage();
                    yPosition = 20;
                }
            });
            
            yPosition += 10;
            
            // Add a line before subcategory data
            pdf.line(15, yPosition, 180, yPosition);
            yPosition += 6;
            
            // Subcategory Data
            pdf.setFontSize(14);
            pdf.text('Top Subcategories', 15, yPosition);
            yPosition += 8;
            
            // Table headers
            pdf.setFontSize(10);
            pdf.text('Subcategory', 15, yPosition);
            pdf.text('Amount', 60, yPosition);
            pdf.text('Percentage', 90, yPosition);
            pdf.text('Count', 130, yPosition);
            yPosition += 4;
            
            // Add a line
            pdf.line(15, yPosition, 180, yPosition);
            yPosition += 6;
            
            // Calculate subcategory data
            const subcategoryTotals = {};
            filteredExpenses.forEach(expense => {
                if (!subcategoryTotals[expense.Subcategory]) {
                    subcategoryTotals[expense.Subcategory] = {
                        totalAmount: 0,
                        count: 0
                    };
                }
                subcategoryTotals[expense.Subcategory].totalAmount += expense.Amount;
                subcategoryTotals[expense.Subcategory].count++;
            });
            
            // Sort subcategories by amount and get top 10
            const sortedSubcategories = Object.entries(subcategoryTotals)
                .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
                .slice(0, 10);
            
            // Add subcategory rows
            sortedSubcategories.forEach(([subcategory, data]) => {
                const percentage = (data.totalAmount / totalExpenses * 100).toFixed(1);
                pdf.text(subcategory, 15, yPosition);
                pdf.text(`${this.settings.currency}${data.totalAmount.toFixed(2)}`, 60, yPosition);
                pdf.text(`${percentage}%`, 90, yPosition);
                pdf.text(data.count.toString(), 130, yPosition);
                yPosition += 6;
                
                // Check if we need a new page
                if (yPosition > 280) {
                    pdf.addPage();
                    yPosition = 20;
                }
            });
            
            // Start a new page for charts
            pdf.addPage();
            yPosition = 20;
            
            // Utility function to capture charts
            const addChartToPdf = async (chartId, title) => {
                const chartCanvas = document.getElementById(chartId);
                if (!chartCanvas) return false;
                
                // Add chart title
                pdf.setFontSize(14);
                pdf.text(title, 15, yPosition);
                yPosition += 8;
                
                try {
                    // Convert chart to image using html2canvas
                    const canvas = await html2canvas(chartCanvas);
                    const imgData = canvas.toDataURL('image/png');
                    
                    // Check if we need a new page
                    if (yPosition > 200) {
                        pdf.addPage();
                        yPosition = 20;
                        // Re-add chart title on new page
                        pdf.text(title, 15, yPosition);
                        yPosition += 8;
                    }
                    
                    // Add chart image to PDF - adjust width and height as needed
                    pdf.addImage(imgData, 'PNG', 15, yPosition, 180, 90);
                    yPosition += 100;
                    return true;
                } catch (error) {
                    console.error(`Error capturing chart ${chartId}:`, error);
                    return false;
                }
            };
            
            // Add charts - since we're using await, the function needs to be async
            try {
                await addChartToPdf('analysisCategoryChart', 'Expenses by Category');
                
                if (yPosition > 200) {
                    pdf.addPage();
                    yPosition = 20;
                }
                
                await addChartToPdf('analysisSubcategoryChart', 'Expenses by Subcategory');
                
                if (yPosition > 200) {
                    pdf.addPage();
                    yPosition = 20;
                }
                
                await addChartToPdf('analysisTrendChart', 'Daily Expense Trend');
                
                if (yPosition > 200) {
                    pdf.addPage();
                    yPosition = 20;
                }
                
                await addChartToPdf('analysisWeeklyChart', 'Weekly Expense Pattern');
                
                // If there's a payment method chart, add it too
                if (document.getElementById('paymentMethodChart')) {
                    if (yPosition > 200) {
                        pdf.addPage();
                        yPosition = 20;
                    }
                    
                    await addChartToPdf('paymentMethodChart', 'Payment Method Distribution');
                }
                
                // If there's a food source chart, add it too
                if (document.getElementById('foodSourceChart')) {
                    if (yPosition > 200) {
                        pdf.addPage();
                        yPosition = 20;
                    }
                    
                    await addChartToPdf('foodSourceChart', 'Food Sources Distribution');
                }
            } catch (error) {
                console.error('Error adding charts to PDF:', error);
                this.showToast('Error adding charts to PDF. Some visualizations may be missing.', 'warning');
            }
            
            // Save PDF with date range in filename
            pdf.save(`expense_analysis_${this.formatDateForFilename(startDate)}_to_${this.formatDateForFilename(endDate)}.pdf`);
            
            this.showToast('PDF downloaded successfully!', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showToast('Error generating PDF. Falling back to CSV format.', 'error');
            
            // Fall back to CSV in case of error
            setTimeout(() => {
                // Set CSV radio button as checked
                const csvOption = document.getElementById('downloadCsv');
                if (csvOption) csvOption.checked = true;
                this.downloadAnalysisCSV();
            }, 1000);
        }
    }
    
    // Expenses table management
    updateExpensesTable() {
        try {
            const table = document.getElementById('allExpensesTable')?.getElementsByTagName('tbody')[0];
            if (!table) return;
            
            table.innerHTML = '';
            
            // Get search term
            const searchInput = document.getElementById('expenseSearchInput');
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            
            // Filter expenses based on search term
            const filteredExpenses = this.expenses.filter(expense => {
                if (searchTerm === '') return true;
                
                return expense.Category.toLowerCase().includes(searchTerm) ||
                       expense.Subcategory.toLowerCase().includes(searchTerm) ||
                       expense.Description.toLowerCase().includes(searchTerm) ||
                       this.formatDate(expense.Date).includes(searchTerm) ||
                       expense.Amount.toString().includes(searchTerm) ||
                       expense.PaymentMethod.toLowerCase().includes(searchTerm);
            });
            
            // Sort expenses by date (newest first)
            const sortedExpenses = filteredExpenses.sort((a, b) => new Date(b.Date) - new Date(a.Date));
            
            if (sortedExpenses.length === 0) {
                const row = table.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 7;
                cell.textContent = searchTerm ? 'No expenses found matching your search.' : 'No expenses recorded yet.';
                cell.className = 'text-center text-muted py-3';
                return;
            }
            
            // Add expenses to table
            sortedExpenses.forEach((expense, index) => {
                const row = table.insertRow();
                
                // Date cell
                const dateCell = row.insertCell(0);
                dateCell.textContent = this.formatDate(expense.Date);
                
                // Category cell with tag styling
                const categoryCell = row.insertCell(1);
                const categorySpan = document.createElement('span');
                categorySpan.className = `category-tag category-${expense.Category.toLowerCase()}`;
                categorySpan.textContent = expense.Category;
                categoryCell.appendChild(categorySpan);
                
                // Subcategory cell
                const subcategoryCell = row.insertCell(2);
                subcategoryCell.textContent = expense.Subcategory;
                
                // Amount cell
                const amountCell = row.insertCell(3);
                amountCell.textContent = `${this.settings.currency}${expense.Amount.toFixed(2)}`;
                amountCell.className = 'text-end';
                
                // Description cell
                const descriptionCell = row.insertCell(4);
                descriptionCell.textContent = expense.Description;
                
                // Payment method cell
                const paymentCell = row.insertCell(5);
                paymentCell.textContent = expense.PaymentMethod;
                
                // Actions cell
                const actionsCell = row.insertCell(6);
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-sm btn-outline-danger';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteBtn.setAttribute('data-bs-toggle', 'modal');
                deleteBtn.setAttribute('data-bs-target', '#deleteConfirmModal');
                deleteBtn.onclick = () => {
                    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
                    if (confirmDeleteBtn) {
                        confirmDeleteBtn.setAttribute('data-expense-id', index.toString());
                    }
                };
                actionsCell.appendChild(deleteBtn);
            });
        } catch (error) {
            console.error('Error updating expenses table:', error);
        }
    }
    
    deleteExpense(index) {
        try {
            // Delete expense
            this.expenses.splice(index, 1);
            this.saveData();
            
            this.showToast('Expense deleted successfully!', 'success');
            
            // Update UI
            this.updateExpensesTable();
            if (this.currentPage === 'dashboard') {
                this.updateDashboard();
            } else if (this.currentPage === 'analysis') {
                this.updateAnalysisPage();
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            this.showToast('Error deleting expense.', 'error');
        }
    }
    
    // Helper functions
    calculateFoodTotal() {
        try {
            const itemsText = document.getElementById('foodItemsList')?.value || '';
            if (!itemsText) return 0;
            
            const lines = itemsText.trim().split('\n');
            let total = 0;
            
            for (const line of lines) {
                const amount = parseFloat(line.trim());
                if (!isNaN(amount)) {
                    total += amount;
                }
            }
            
            return total;
        } catch (error) {
            console.error('Error calculating food total:', error);
            return 0;
        }
    }
    
    formatDate(date) {
        try {
            const d = new Date(date);
            
            switch(this.settings.dateFormat) {
                case 'mm/dd/yyyy':
                    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
                case 'yyyy-mm-dd':
                    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                case 'dd/mm/yyyy':
                default:
                    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
            }
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    }
    
    formatDateForFilename(date) {
        try {
            const d = new Date(date);
            return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        } catch (error) {
            console.error('Error formatting date for filename:', error);
            return 'invalid-date';
        }
    }
    
    showToast(message, type = 'info') {
        try {
            const toastContainer = document.getElementById('toastContainer');
            if (!toastContainer) return;
            
            const toastId = 'toast-' + Date.now();
            const toast = document.createElement('div');
            toast.className = `toast show`;
            toast.id = toastId;
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            toast.setAttribute('aria-atomic', 'true');
            
            // Set background color based on type
            let bgClass = 'bg-primary';
            let icon = 'info-circle';
            
            switch(type) {
                case 'success':
                    bgClass = 'bg-success';
                    icon = 'check-circle';
                    break;
                case 'warning':
                    bgClass = 'bg-warning text-dark';
                    icon = 'exclamation-triangle';
                    break;
                case 'danger':
                case 'error':
                    bgClass = 'bg-danger';
                    icon = 'exclamation-circle';
                    break;
                case 'info':
                default:
                    bgClass = 'bg-primary';
                    icon = 'info-circle';
            }
            
            toast.innerHTML = `
                <div class="toast-header ${bgClass} text-white">
                    <i class="fas fa-${icon} me-2"></i>
                    <strong class="me-auto">Expense Tracker</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            `;
            
            toastContainer.appendChild(toast);
            
            // Auto hide after 3 seconds
            setTimeout(() => {
                const toastElement = document.getElementById(toastId);
                if (toastElement) {
                    toastElement.classList.remove('show');
                    setTimeout(() => {
                        toastElement.remove();
                    }, 500);
                }
            }, 3000);
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    try {
        const app = new ExpenseTracker();
    } catch (error) {
        console.error('Error initializing application:', error);
        alert('Error initializing the application. Please refresh the page and try again.');
    }
});

