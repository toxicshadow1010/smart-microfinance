// client.js
document.addEventListener('DOMContentLoaded', () => {
    // IMPORTANT: Replace with your deployed Google Apps Script Web App URL
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwGvAAr3BRmHokLhSWJcnFmYJj_iSbl6A9bE125lo7xPHx9ns6W3tLwDB2_5vp7DCM/exec';

    // DOM Elements
    const views = document.querySelectorAll('.view');
    const loginView = document.getElementById('login-view');
    const adminLoginView = document.getElementById('admin-login-view');
    const signupView = document.getElementById('signup-view');
    const userDashboardView = document.getElementById('user-dashboard-view');
    const adminDashboardView = document.getElementById('admin-dashboard-view');

    const loginForm = document.getElementById('login-form');
    const adminLoginForm = document.getElementById('admin-login-form');
    const signupForm = document.getElementById('signup-form');
    
    const showSignupLink = document.getElementById('show-signup-link');
    const showLoginLink = document.getElementById('show-login-link');
    const showAdminLoginLink = document.getElementById('show-admin-login-link');
    const showUserLoginLinkFromAdmin = document.getElementById('show-user-login-link-from-admin');

    const logoutLink = document.getElementById('logout-link');
    const currentUserEmailSpan = document.getElementById('currentUserEmail');

    const themeToggle = document.getElementById('themeToggle');
    const bottomNav = document.getElementById('bottom-nav');
    const userNavItems = document.getElementById('user-nav-items');
    const adminNavItems = document.getElementById('admin-nav-items');

    const loanCatalogList = document.getElementById('loan-catalog-list');
    const loanCalculatorForm = document.getElementById('loan-calculator-form');
    const monthlyPaymentSpan = document.getElementById('monthly-payment');
    const calculatorResultDiv = document.getElementById('calculator-result');
    const userApplicationsList = document.getElementById('user-applications-list');
    
    const applyLoanModal = document.getElementById('apply-loan-modal');
    const closeModalButton = document.querySelector('.modal .close-button');
    const loanApplicationForm = document.getElementById('loan-application-form');
    const modalLoanNameSpan = document.getElementById('modal-loan-name');
    const modalMinAmountSpan = document.getElementById('modal-min-amount');
    const modalMaxAmountSpan = document.getElementById('modal-max-amount');
    const modalMaxTermSpan = document.getElementById('modal-max-term');
    const applyLoanTypeIdInput = document.getElementById('apply-loan-type-id');
    const applyLoanTypeNameInput = document.getElementById('apply-loan-type-name');
    const applyAmountInput = document.getElementById('apply-amount');
    const applyTermInput = document.getElementById('apply-term');

    const adminLoanApplicationsQueue = document.getElementById('admin-loan-applications-queue');
    const loadingSpinner = document.getElementById('loading-spinner');
    const toastMessage = document.getElementById('toast-message');

    let currentUser = null; // { userId, email, role }
    let currentLoanTypes = [];


    // --- Utility Functions ---
    function showView(viewId) {
        views.forEach(view => view.style.display = 'none');
        const activeView = document.getElementById(viewId);
        if (activeView) {
            activeView.style.display = 'block';
            updateBottomNavActiveState(viewId);
            if (viewId === 'user-dashboard-view') {
                // Default to loan catalog tab or last opened tab
                const activeTab = userDashboardView.querySelector('.tab-link.active')?.dataset.tab || 'loan-catalog';
                switchUserTab(activeTab);
            }
        }
    }
    
    function updateBottomNavActiveState(viewId, tabId = null) {
        document.querySelectorAll('#bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
        let targetButton;
        if (tabId) {
            targetButton = document.querySelector(`#bottom-nav .nav-item[data-tab="${tabId}"]`);
        } else {
            targetButton = document.querySelector(`#bottom-nav .nav-item[data-view="${viewId}"]`);
        }
        if (targetButton) {
            targetButton.classList.add('active');
        }
    }

    function showLoading(show = true) {
        loadingSpinner.style.display = show ? 'flex' : 'none';
    }

    function showToast(message, type = 'info', duration = 3000) {
        toastMessage.textContent = message;
        toastMessage.className = 'toast show'; // Reset classes
        if (type === 'success') toastMessage.classList.add('success');
        if (type === 'error') toastMessage.classList.add('error');
        
        setTimeout(() => {
            toastMessage.className = 'toast'; // Hide
        }, duration);
    }

    async function apiCall(action, method = 'GET', body = null, params = {}) {
        showLoading();
        let url = `${SCRIPT_URL}?action=${action}`;
        if (method === 'GET' && Object.keys(params).length > 0) {
           url += '&' + new URLSearchParams(params).toString();
        }

        const options = {
            method: method,
            // mode: 'cors', // Keep if deploying to different domain, often needed
            headers: {},
        };

        if (method === 'POST' && body) {
            options.body = JSON.stringify(body);
            // options.headers['Content-Type'] = 'application/json'; // Not needed for Apps Script text/plain
        }
        
        try {
            // Apps Script web apps expect POST body as a string, not necessarily JSON type header
            // For POST, Apps Script reads e.postData.contents
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}. Details: ${errorText}`);
            }
            const result = await response.json();
            showLoading(false);
            return result;
        } catch (error) {
            console.error('API Call Error:', error);
            showLoading(false);
            showToast(`Error: ${error.message}`, 'error');
            return { status: 'error', message: error.message };
        }
    }

    // --- Theme Switcher ---
    themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode', themeToggle.checked);
        localStorage.setItem('theme', themeToggle.checked ? 'dark' : 'light');
    });

    function loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            themeToggle.checked = false;
        }
    }

    // --- Authentication ---
    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); showView('signup-view'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showView('login-view'); });
    showAdminLoginLink.addEventListener('click', (e) => { e.preventDefault(); showView('admin-login-view'); });
    showUserLoginLinkFromAdmin.addEventListener('click', (e) => { e.preventDefault(); showView('login-view'); });


    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;

        if (password.length < 8) {
            showToast('Password must be at least 8 characters.', 'error');
            return;
        }
        if (password !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }

        const result = await apiCall('signup', 'POST', { action: 'signup', email, password });
        if (result.status === 'success') {
            showToast(result.message, 'success');
            loginUser(result); // Automatically log in the new user
        } else {
            showToast(result.message || 'Signup failed.', 'error');
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const result = await apiCall('login', 'POST', { action: 'login', email, password, isAdminLogin: false });
        handleLoginResult(result);
    });
    
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-login-email').value;
        const password = document.getElementById('admin-login-password').value;
        const result = await apiCall('login', 'POST', { action: 'login', email, password, isAdminLogin: true });
        handleLoginResult(result);
    });

    function handleLoginResult(result) {
        if (result.status === 'success') {
            showToast(result.message, 'success');
            loginUser(result);
        } else {
            showToast(result.message || 'Login failed.', 'error');
        }
    }

    function loginUser(userData) {
        currentUser = { userId: userData.userId, email: userData.email, role: userData.role };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUIForLoggedInUser();
    }
    
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        currentUser = null;
        localStorage.removeItem('currentUser');
        updateUIForLoggedInUser();
        showToast('Logged out successfully.', 'success');
    });

    function updateUIForLoggedInUser() {
        if (currentUser) {
            currentUserEmailSpan.textContent = currentUser.email;
            logoutLink.style.display = 'inline';
            document.querySelectorAll('#login-view, #signup-view, #admin-login-view').forEach(v => v.style.display = 'none');

            if (currentUser.role === 'admin') {
                showView('admin-dashboard-view');
                bottomNav.style.display = 'flex';
                userNavItems.style.display = 'none';
                adminNavItems.style.display = 'flex';
                loadAdminApplications();
            } else {
                showView('user-dashboard-view');
                bottomNav.style.display = 'flex';
                userNavItems.style.display = 'flex';
                adminNavItems.style.display = 'none';
                loadLoanTypes();
                loadUserApplications();
                switchUserTab('loan-catalog'); // Default to loan catalog
            }
        } else {
            currentUserEmailSpan.textContent = '';
            logoutLink.style.display = 'none';
            showView('login-view'); // Default to login view
            bottomNav.style.display = 'none';
        }
    }
    
    function checkLoggedInUser() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            updateUIForLoggedInUser();
        } else {
            showView('login-view');
        }
    }

    // --- User Dashboard ---
    document.querySelectorAll('#user-dashboard-view .tab-link').forEach(button => {
        button.addEventListener('click', () => {
            switchUserTab(button.dataset.tab);
        });
    });
    
    document.querySelectorAll('#bottom-nav #user-nav-items .nav-item').forEach(button => {
        button.addEventListener('click', () => {
            const viewId = button.dataset.view;
            const tabId = button.dataset.tab;
            showView(viewId); // Ensure the correct main view is shown
            if (viewId === 'user-dashboard-view' && tabId) {
                switchUserTab(tabId);
            }
             updateBottomNavActiveState(viewId, tabId);
        });
    });

    function switchUserTab(tabId) {
        document.querySelectorAll('#user-dashboard-view .tab-link').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#user-dashboard-view .tab-content').forEach(tc => tc.classList.remove('active'));
        
        const activeTabButton = document.querySelector(`#user-dashboard-view .tab-link[data-tab="${tabId}"]`);
        const activeTabContent = document.getElementById(tabId);

        if (activeTabButton) activeTabButton.classList.add('active');
        if (activeTabContent) activeTabContent.classList.add('active');
        updateBottomNavActiveState('user-dashboard-view', tabId);
    }


    async function loadLoanTypes() {
        const result = await apiCall('getLoanTypes', 'GET');
        if (result.status === 'success' && result.loanTypes) {
            currentLoanTypes = result.loanTypes;
            loanCatalogList.innerHTML = ''; // Clear existing
            result.loanTypes.forEach(loan => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h3>${loan.name}</h3>
                    <p>APR: ${(loan.apr * 100).toFixed(2)}%</p>
                    <p>Amount: $${loan.minAmount} - $${loan.maxAmount}</p>
                    <p>Term: Up to ${loan.maxTermMonths} months</p>
                    <p>${loan.description || ''}</p>
                    <button class="btn btn-secondary apply-loan-btn" data-loan-id="${loan.id}">Apply Now</button>
                `;
                loanCatalogList.appendChild(card);
            });
            document.querySelectorAll('.apply-loan-btn').forEach(btn => {
                btn.addEventListener('click', handleApplyLoanClick);
            });
        } else {
            loanCatalogList.innerHTML = '<p>Could not load loan types.</p>';
        }
    }

    loanCalculatorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const P = parseFloat(document.getElementById('calc-loan-amount').value);
        const N = parseInt(document.getElementById('calc-loan-term').value);
        const annualRate = parseFloat(document.getElementById('calc-interest-rate').value);

        if (isNaN(P) || isNaN(N) || isNaN(annualRate) || P <= 0 || N <= 0 || annualRate <= 0) {
            showToast('Please enter valid loan amount, term, and interest rate.', 'error');
            return;
        }

        const i = (annualRate / 100) / 12; // Monthly interest rate
        const M = P * (i * Math.pow(1 + i, N)) / (Math.pow(1 + i, N) - 1);

        if (isFinite(M)) {
            monthlyPaymentSpan.textContent = M.toFixed(2);
            calculatorResultDiv.style.display = 'block';
        } else {
            monthlyPaymentSpan.textContent = 'N/A';
            showToast('Could not calculate. Check inputs, especially interest rate (cannot be 0 for this formula).', 'error');
            calculatorResultDiv.style.display = 'block'; // Show it even if N/A
        }
    });
    
    function handleApplyLoanClick(event) {
        const loanId = event.target.dataset.loanId;
        const loan = currentLoanTypes.find(lt => lt.id === loanId);
        if (!loan) {
            showToast('Loan type not found.', 'error');
            return;
        }

        modalLoanNameSpan.textContent = loan.name;
        applyLoanTypeIdInput.value = loan.id;
        applyLoanTypeNameInput.value = loan.name; // Store name for submission
        modalMinAmountSpan.textContent = loan.minAmount;
        modalMaxAmountSpan.textContent = loan.maxAmount;
        modalMaxTermSpan.textContent = loan.maxTermMonths;
        
        applyAmountInput.min = loan.minAmount;
        applyAmountInput.max = loan.maxAmount;
        applyAmountInput.value = loan.minAmount; // Pre-fill with min amount
        
        applyTermInput.max = loan.maxTermMonths;
        applyTermInput.value = Math.min(12, loan.maxTermMonths); // Pre-fill with 12 months or max term

        applyLoanModal.style.display = 'block';
    }

    closeModalButton.addEventListener('click', () => {
        applyLoanModal.style.display = 'none';
    });
    window.addEventListener('click', (event) => { // Close if clicked outside
        if (event.target == applyLoanModal) {
            applyLoanModal.style.display = 'none';
        }
    });

    loanApplicationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!currentUser) {
            showToast('You must be logged in to apply.', 'error');
            return;
        }
        const loanTypeId = applyLoanTypeIdInput.value;
        const loanName = applyLoanTypeNameInput.value; // Get the name
        const amount = applyAmountInput.value;
        const term = applyTermInput.value;
        
        const loan = currentLoanTypes.find(lt => lt.id === loanTypeId);
        if(parseFloat(amount) < loan.minAmount || parseFloat(amount) > loan.maxAmount) {
            showToast(`Amount must be between ${loan.minAmount} and ${loan.maxAmount}.`, 'error');
            return;
        }
        if(parseInt(term) < 1 || parseInt(term) > loan.maxTermMonths) {
            showToast(`Term must be between 1 and ${loan.maxTermMonths} months.`, 'error');
            return;
        }

        const result = await apiCall('submitApplication', 'POST', {
            action: 'submitApplication',
            userId: currentUser.userId,
            userEmail: currentUser.email,
            loanTypeId: loanTypeId,
            loanName: loanName, // Send loan name
            amount: amount,
            term: term
        });

        if (result.status === 'success') {
            showToast(result.message, 'success');
            applyLoanModal.style.display = 'none';
            loanApplicationForm.reset();
            loadUserApplications(); // Refresh the list
            switchUserTab('my-applications'); // Switch to my applications tab
        } else {
            showToast(result.message || 'Application submission failed.', 'error');
        }
    });


    async function loadUserApplications() {
        if (!currentUser) return;
        const result = await apiCall('getApplicationStatus', 'GET', null, { email: currentUser.email });
        userApplicationsList.innerHTML = ''; // Clear
        if (result.status === 'success' && result.applications) {
            if (result.applications.length === 0) {
                userApplicationsList.innerHTML = '<p>You have no loan applications yet.</p>';
                return;
            }
            result.applications.forEach(app => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h3>${app.loanName || 'Loan'} (ID: ${app.applicationId.slice(-6)})</h3>
                    <p>Amount: $${app.amountRequested}</p>
                    <p>Term: ${app.termMonths} months</p>
                    <p>Status: <span class="status-${app.status.toLowerCase()}">${app.status}</span></p>
                    <p>Submitted: ${new Date(app.submissionDate).toLocaleDateString()}</p>
                    ${app.adminNotes ? `<p>Admin Notes: ${app.adminNotes}</p>` : ''}
                `;
                userApplicationsList.appendChild(card);
            });
        } else {
            userApplicationsList.innerHTML = '<p>Could not load your applications.</p>';
        }
    }

    // --- Admin Dashboard ---
     document.querySelectorAll('#bottom-nav #admin-nav-items .nav-item').forEach(button => {
        button.addEventListener('click', () => {
            const viewId = button.dataset.view;
            showView(viewId); // Ensure the correct main view is shown
            updateBottomNavActiveState(viewId);
             if (viewId === 'admin-dashboard-view') {
                loadAdminApplications();
            }
        });
    });

    async function loadAdminApplications() {
        if (!currentUser || currentUser.role !== 'admin') return;

        const result = await apiCall('getAdminApplications', 'GET', null, { adminEmail: currentUser.email });
        adminLoanApplicationsQueue.innerHTML = '<h3>Loan Applications Queue</h3>'; // Reset and add title
        
        if (result.status === 'success' && result.applications) {
            if (result.applications.length === 0) {
                adminLoanApplicationsQueue.innerHTML += '<p>No pending applications.</p>';
                return;
            }
            result.applications.sort((a,b) => new Date(b.submissionDate) - new Date(a.submissionDate)); // Show newest first
            
            result.applications.forEach(app => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h4>Application ID: ${app.applicationId}</h4>
                    <p>User: ${app.userEmail}</p>
                    <p>Loan: ${app.loanName || 'N/A'}</p>
                    <p>Amount: $${app.amountRequested}, Term: ${app.termMonths} months</p>
                    <p>Submitted: ${new Date(app.submissionDate).toLocaleDateString()}</p>
                    <p>Current Status: <strong class="status-${app.status.toLowerCase()}">${app.status}</strong></p>
                    ${app.adminNotes ? `<p>Previous Notes: ${app.adminNotes}</p>`: ''}
                    <div class="form-group">
                        <label for="admin-notes-${app.applicationId}">Admin Notes:</label>
                        <textarea id="admin-notes-${app.applicationId}" rows="2"></textarea>
                    </div>
                    <div class="admin-actions">
                        <button class="btn btn-approve" data-id="${app.applicationId}">Approve</button>
                        <button class="btn btn-hold" data-id="${app.applicationId}">Hold</button>
                        <button class="btn btn-reject" data-id="${app.applicationId}">Reject</button>
                    </div>
                `;
                adminLoanApplicationsQueue.appendChild(card);
            });
            
            // Add event listeners for new buttons
            adminLoanApplicationsQueue.querySelectorAll('.btn-approve, .btn-hold, .btn-reject').forEach(button => {
                button.addEventListener('click', handleAdminActionClick);
            });

        } else {
            adminLoanApplicationsQueue.innerHTML += '<p>Could not load applications.</p>';
        }
    }
    
    async function handleAdminActionClick(event) {
        if (!currentUser || currentUser.role !== 'admin') {
            showToast('Unauthorized action.', 'error');
            return;
        }
        const applicationId = event.target.dataset.id;
        let newStatus = '';
        if (event.target.classList.contains('btn-approve')) newStatus = 'Approved';
        else if (event.target.classList.contains('btn-hold')) newStatus = 'OnHold';
        else if (event.target.classList.contains('btn-reject')) newStatus = 'Rejected';

        const notesTextarea = document.getElementById(`admin-notes-${applicationId}`);
        const adminNotes = notesTextarea ? notesTextarea.value : '';

        if (newStatus === 'Rejected' && !adminNotes.trim()) {
            showToast('Rejection reason (admin notes) is required.', 'error');
            notesTextarea.focus();
            return;
        }
        
        const result = await apiCall('updateApplicationStatus', 'POST', {
            action: 'updateApplicationStatus',
            applicationId: applicationId,
            newStatus: newStatus,
            adminNotes: adminNotes,
            adminEmail: currentUser.email
        });

        if (result.status === 'success') {
            showToast(result.message, 'success');
            loadAdminApplications(); // Refresh the list
            // If current user is also an applicant and viewing their own app, refresh that too
            if (currentUser.email === result.affectedUserEmail) { // Assuming backend could return this
                 loadUserApplications();
            }
        } else {
            showToast(result.message || 'Failed to update status.', 'error');
        }
    }


    // --- Initial Load ---
    loadTheme();
    checkLoggedInUser(); // Check if user is already logged in
});