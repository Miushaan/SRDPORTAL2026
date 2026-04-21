import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update, onDisconnect, set } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = { 
    apiKey: "AIzaSyD612DVL9xvsK1lWVyEB9TehpGJry6Rprw", 
    authDomain: "srd-portal-1234.firebaseapp.com", 
    projectId: "srd-portal-1234", 
    databaseURL: "https://srd-portal-1234-default-rtdb.firebaseio.com",
    storageBucket: "srd-portal-1234.firebasestorage.app", 
    messagingSenderId: "286585731956", 
    appId: "1:286585731956:web:47641bcf34033b014f4a21" 
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let logs = [], yardLogs = [], transactionLogs = [], taskLogs = [], currentPage = 'DASH';
let showCompleted = false, showUndocked = false, expandedSR = null;

const STATUS_OPTIONS = ["PENDING", "ITEM CREATION", "PR/MTR-RAISED", "PO-RAISED", "PAYMENT PENDING", "PART RECEIVED", "ALL RECEIVED", "OH-HOLD", "CANCELLED"];
const YARD_STATUS = ["Docked", "Undocked"];

// --- INITIALIZATION & AUTH ---
document.addEventListener('DOMContentLoaded', () => {
    // Handle Login Button Click
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-pass').value;
            if (!email || !pass) return alert("Please enter credentials");

            signInWithEmailAndPassword(auth, email, pass)
                .catch((error) => alert("Access Denied: " + error.message));
        });
    }

    // Set Initial Theme
    const savedTheme = localStorage.getItem('srd-theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.innerText = savedTheme === 'light' ? '🌙' : '☀️';
});

onAuthStateChanged(auth, user => {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = user ? 'none' : 'flex';
    if(user) { 
        initData(); 
        setupPresence(user); 
    }
});

// --- EXPOSED GLOBAL FUNCTIONS ---
window.handleLogout = () => signOut(auth);

window.toggleTheme = () => {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', next);
    document.getElementById('theme-icon').innerText = next === 'light' ? '🌙' : '☀️';
    localStorage.setItem('srd-theme', next);
};

window.switchPage = (page) => {
    currentPage = page;
    showCompleted = false; showUndocked = false; expandedSR = null;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-' + page.toLowerCase()).classList.add('active');
    
    document.getElementById('page-title').innerText = { 
        'YARD': 'BOAT YARD LOG', 'DASH': 'PRF TRACKER', 'TRANS': 'TRANSACTIONS', 'TASKS': 'TASK MANAGER'
    }[page];
    
    document.getElementById('btn-create').style.display = (page === 'TRANS') ? 'none' : 'block';
    document.getElementById('btn-toggle-comp').style.display = (page === 'DASH') ? 'flex' : 'none';
    document.getElementById('btn-toggle-undocked').style.display = (page === 'YARD') ? 'flex' : 'none';
    refreshTable();
};

// --- DATA CORE ---
function setupPresence(user) {
    const myStatusRef = ref(db, `/status/${user.uid}`);
    onValue(ref(db, '.info/connected'), (snap) => { 
        if (snap.val()) { 
            onDisconnect(myStatusRef).set({ state: 'offline', email: user.email })
                .then(() => set(myStatusRef, { state: 'online', email: user.email })); 
        }
    });
    onValue(ref(db, '/status'), (snap) => {
        const data = snap.val(); let html = '';
        for (let id in data) if (data[id].state === 'online') html += `<div class="u-row"><span class="u-dot"></span>${data[id].email.split('@')[0].toUpperCase()}</div>`;
        document.getElementById('online-list').innerHTML = html;
    });
}

function initData() {
    onValue(ref(db, 'prf_logs'), snap => {
        const val = snap.val();
        logs = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
        if(currentPage === 'DASH') refreshTable();
    });
    onValue(ref(db, 'yard_logs'), snap => {
        const val = snap.val();
        yardLogs = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
        if(currentPage === 'YARD') refreshTable();
    });
    onValue(ref(db, 'transactions'), snap => {
        const val = snap.val();
        transactionLogs = val ? Object.values(val).reverse() : [];
        if(currentPage === 'TRANS') refreshTable();
    });
    onValue(ref(db, 'task_logs'), snap => {
        const val = snap.val();
        taskLogs = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
        if(currentPage === 'TASKS') refreshTable();
    });
}

// --- UI & TABLE LOGIC ---
window.toggleSidebar = () => document.querySelector('.sidebar').classList.toggle('hidden');
window.toggleCompleted = () => { showCompleted = !showCompleted; document.getElementById('btn-toggle-comp').classList.toggle('active-toggle', showCompleted); refreshTable(); };
window.toggleUndocked = () => { showUndocked = !showUndocked; document.getElementById('btn-toggle-undocked').classList.toggle('active-toggle', showUndocked); refreshTable(); };

window.refreshTable = () => {
    const q = document.getElementById('main-search').value.toUpperCase();
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    if (!head || !body) return;

    if (currentPage === 'YARD') {
        head.innerHTML = `<tr><th style="width:80px;">Slot</th><th>Asset Name</th><th>Owner</th><th style="width:110px;">Docked</th><th style="width:110px;">Est. Undock</th><th style="width:150px;">Status</th><th style="width:80px;">Age</th><th>Actual Undock</th><th style="width:40px;"></th></tr>`;
        const filtered = yardLogs.filter(l => {
            const matches = l.name?.toUpperCase().includes(q) || l.owner?.toUpperCase().includes(q) || l.slot?.toUpperCase().includes(q);
            return showUndocked ? (matches && l.status === 'Undocked') : (matches && l.status !== 'Undocked');
        });
        body.innerHTML = filtered.map(l => {
            const start = new Date(l.docked), end = l.undocked ? new Date(l.undocked) : new Date();
            const age = Math.floor((end - start) / (1000 * 60 * 60 * 24)) || 0;
            return `<tr>
                <td><input class="remarks-editor" value="${l.slot}" onblur="updateYard('${l.id}', 'slot', this.value)"></td>
                <td><input class="remarks-editor" value="${l.name}" style="font-weight:700;" onblur="updateYard('${l.id}', 'name', this.value)"></td>
                <td><input class="remarks-editor" value="${l.owner}" onblur="updateYard('${l.id}', 'owner', this.value)"></td>
                <td><input type="date" value="${l.docked}" class="remarks-editor" onchange="updateYard('${l.id}', 'docked', this.value)"></td>
                <td><input type="date" value="${l.estUndock || ''}" class="remarks-editor" onchange="updateYard('${l.id}', 'estUndock', this.value)"></td>
                <td><select class="status-select ${l.status==='Docked'?'s-Docked':'s-Undocked'}" onchange="updateYard('${l.id}', 'status', this.value)">${YARD_STATUS.map(o=>`<option ${l.status==o?'selected':''}>${o}</option>`).join('')}</select></td>
                <td><span class="age-badge">${age}D</span></td>
                <td><input type="date" value="${l.undocked || ''}" class="remarks-editor" onchange="updateYard('${l.id}', 'undocked', this.value)"></td>
                <td><button onclick="deleteYard('${l.id}')" style="color:var(--danger); border:none; background:none; cursor:pointer; font-size:18px;">&times;</button></td>
            </tr>`;
        }).join('');
    } else if (currentPage === 'TASKS') {
        head.innerHTML = `<tr><th>SR #</th><th>SR Date</th><th>Asset/Service</th><th>WOs</th><th>Total Tasks</th><th>Avg. %</th><th></th></tr>`;
        const grouped = taskLogs.reduce((acc, task) => {
            if (!acc[task.sr]) acc[task.sr] = { sr: task.sr, srDate: task.srDate, asset: task.asset, wos: {}, totalItems: [] };
            if (!acc[task.sr].wos[task.wo]) acc[task.sr].wos[task.wo] = { wo: task.wo, woDate: task.woDate, items: [] };
            acc[task.sr].wos[task.wo].items.push(task);
            acc[task.sr].totalItems.push(task);
            return acc;
        }, {});
        const filteredKeys = Object.keys(grouped).filter(k => k.toUpperCase().includes(q) || grouped[k].asset?.toUpperCase().includes(q));
        body.innerHTML = filteredKeys.map(key => {
            const group = grouped[key];
            const avgProgress = Math.round(group.totalItems.reduce((sum, t) => sum + parseInt(t.progress || 0), 0) / group.totalItems.length) || 0;
            return `<tr style="cursor:pointer; background: var(--brand-light);" onclick="toggleSRRows('${key}')">
                <td style="font-weight:800; color:var(--brand);">${group.sr}</td>
                <td>${group.srDate || '-'}</td>
                <td>${group.asset}</td>
                <td>${Object.keys(group.wos).length}</td>
                <td>${group.totalItems.length}</td>
                <td><b>${avgProgress}%</b></td>
                <td><button onclick="event.stopPropagation(); deleteSR('${key}')" style="color:var(--danger); border:none; background:none; cursor:pointer;">&times;</button></td>
            </tr>` + (expandedSR === key ? Object.keys(group.wos).map(woKey => group.wos[woKey].items.map(t => `<tr><td colspan="2">${t.date}</td><td>${t.details}</td><td colspan="4">${t.progress}%</td></tr>`).join('')).join('') : '');
        }).join('');
    } else if (currentPage === 'TRANS') {
        head.innerHTML = `<tr><th>Timestamp</th><th>Reference</th><th>Action</th><th>Details</th><th>User</th></tr>`;
        body.innerHTML = transactionLogs.filter(a => a.prf?.toUpperCase().includes(q) || a.action?.toUpperCase().includes(q)).map(a => `<tr><td>${a.time}</td><td style="font-weight:800; color:var(--brand);">${a.prf}</td><td>${a.action}</td><td>${a.details}</td><td>${a.user}</td></tr>`).join('');
    } else {
        head.innerHTML = `<tr><th>Date</th><th>PRF #</th><th>Asset</th><th>Workshop</th><th>Status</th><th>Due Date</th><th>Remarks</th><th></th></tr>`;
        const filtered = logs.filter(l => (l.prf?.toUpperCase().includes(q) || l.asset?.toUpperCase().includes(q)) && (showCompleted ? l.status === 'ALL RECEIVED' : l.status !== 'ALL RECEIVED'));
        body.innerHTML = filtered.map(l => `<tr ><td>${l.date}</td><td style="font-weight:800; color:var(--brand);">${l.prf}</td><td>${l.asset}</td><td>${l.workshop}</td><td><select class="status-select s-${l.status.replace(/[/ ]/g, '-')}" onchange="updateField('${l.id}', 'status', this.value, '${l.prf}')">${STATUS_OPTIONS.map(o=>`<option ${l.status==o?'selected':''}>${o}</option>`).join('')}</select></td><td><input type="date" value="${l.eta||''}" class="remarks-editor" onchange="updateField('${l.id}', 'eta', this.value, '${l.prf}')"></td><td><div class="remarks-editor" contenteditable="true" onblur="updateField('${l.id}', 'remarks', this.innerText.trim().toUpperCase(), '${l.prf}')">${l.remarks||''}</div></td><td><button onclick="deleteRow('${l.id}')" style="color:var(--border); border:none; background:none; cursor:pointer;">&times;</button></td></tr>`).join('');
    }
};

// --- UPDATES & DELETIONS ---
window.updateField = (id, field, val, prf) => {
    update(ref(db, `prf_logs/${id}`), { [field]: val });
    push(ref(db, 'transactions'), { time: new Date().toLocaleString(), user: auth.currentUser.email.split('@')[0].toUpperCase(), action: `PRF Edit: ${field}`, prf: prf, details: val });
};
window.updateYard = (id, field, val) => {
    const upd = { [field]: val };
    if (field === 'undocked' && val !== "") upd.status = "Undocked";
    update(ref(db, `yard_logs/${id}`), upd);
};
window.updateTask = (id, field, val) => update(ref(db, `task_logs/${id}`), { [field]: val });

window.deleteRow = (id) => confirm('Delete permanently?') && remove(ref(db, `prf_logs/${id}`));
window.deleteYard = (id) => confirm('Delete vessel?') && remove(ref(db, `yard_logs/${id}`));
window.deleteSR = (sr) => confirm(`Delete SR: ${sr}?`) && taskLogs.filter(t => t.sr === sr).forEach(t => remove(ref(db, `task_logs/${t.id}`)));

// --- MODALS & FORMS ---
window.openModal = () => {
    document.getElementById('modal-title').innerText = {'YARD':'REGISTER VESSEL','DASH':'NEW PRF ENTRY','TASKS':'NEW SR & WO'}[currentPage];
    document.getElementById('inner-modal').className = (currentPage === 'TASKS') ? 'modal task-modal' : 'modal';
    document.getElementById('prf-form').style.display = currentPage === 'DASH' ? 'block' : 'none';
    document.getElementById('yard-form').style.display = currentPage === 'YARD' ? 'block' : 'none';
    document.getElementById('task-form').style.display = currentPage === 'TASKS' ? 'block' : 'none';
    if (currentPage === 'TASKS') { 
        document.getElementById('t-task-list').innerHTML = ''; 
        addTaskRow(); 
    }
    document.getElementById('entry-modal').style.display = 'flex';
};

window.closeModal = () => document.getElementById('entry-modal').style.display = 'none';

window.savePRF = (redirect) => {
    const p = document.getElementById('m-prf').value.toUpperCase(), a = document.getElementById('m-asset').value.toUpperCase(), w = document.getElementById('m-workshop').value;
    if(!p || !a || !w) return alert("Required");
    push(ref(db, 'prf_logs'), { date: new Date().toLocaleDateString('en-GB'), prf: p, asset: a, workshop: w, status: 'PENDING', eta: '', remarks: '' });
    closeModal();
    if(redirect) window.open("https://forms.office.com/pages/responsepage.aspx?id=rS-35FLkcEy4rMmBiUUcM-wq0ZU8I9BHssORFyfEW95UN0ZMM1gxR1YwUDZKMkNHMkhFMUdMRzlRSS4u", "_blank");
};

window.saveYardEntry = () => {
    const s = document.getElementById('y-slot').value, v = document.getElementById('y-vessel').value, d = document.getElementById('y-docked').value;
    if(!s || !v || !d) return alert("Required");
    push(ref(db, 'yard_logs'), { slot: s, name: v, owner: document.getElementById('y-owner').value, docked: d, estUndock: document.getElementById('y-est-undock').value, status: 'Docked', undocked: '' });
    closeModal();
};

window.addTaskRow = () => {
    const row = document.createElement('div');
    row.className = 'task-input-row';
    row.style.cssText = 'display:grid; grid-template-columns: 120px 1fr 80px 30px; gap:8px; margin-bottom:10px;';
    row.innerHTML = `<input type="date" class="remarks-editor t-row-date"><textarea class="remarks-editor t-row-details" placeholder="Task Details"></textarea><input type="number" class="remarks-editor t-row-prog" placeholder="%"><button onclick="this.parentElement.remove()" style="color:var(--danger); border:none; background:none;">&times;</button>`;
    document.getElementById('t-task-list').appendChild(row);
};

window.saveTaskEntry = () => {
    const sr = document.getElementById('t-sr').value.toUpperCase(), wo = document.getElementById('t-wo').value.toUpperCase(), asset = document.getElementById('t-asset').value.toUpperCase();
    const rows = document.querySelectorAll('.task-input-row');
    rows.forEach(row => {
        const details = row.querySelector('.t-row-details').value.toUpperCase();
        if (details) push(ref(db, 'task_logs'), { sr, srDate: document.getElementById('t-sr-date').value, wo, woDate: document.getElementById('t-wo-date').value, asset, date: row.querySelector('.t-row-date').value, details, progress: row.querySelector('.t-row-prog').value || 0, status: 'PLANNED', comments: '' });
    });
    closeModal();
};

window.toggleSRRows = (sr) => { expandedSR = expandedSR === sr ? null : sr; refreshTable(); };

// --- EXPORT ---
window.exportPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text(`SRD PORTAL: ${currentPage} REPORT`, 14, 15);
    doc.autoTable({ startY: 28, head: [['DATE', 'REF', 'ASSET', 'STATUS']], body: logs.map(l => [l.date, l.prf, l.asset, l.status]) });
    doc.save(`SRD_REPORT_${new Date().toISOString().split('T')[0]}.pdf`);
};
