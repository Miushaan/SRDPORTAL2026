import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update, onDisconnect, set } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// --- FIREBASE CONFIGURATION ---
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

// --- AUTHENTICATION ---
window.handleLogin = () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    signInWithEmailAndPassword(auth, email, pass).catch(() => alert("Access Denied: Invalid Credentials"));
};

window.handleLogout = () => signOut(auth);

onAuthStateChanged(auth, user => {
    document.getElementById('auth-overlay').style.display = user ? 'none' : 'flex';
    if(user) { 
        initData(); 
        setupPresence(user); 
    }
});

function setupPresence(user) {
    const myStatusRef = ref(db, `/status/${user.uid}`);
    onValue(ref(db, '.info/connected'), (snap) => {
        if (snap.val()) {
            onDisconnect(myStatusRef).set({ state: 'offline', email: user.email })
                .then(() => set(myStatusRef, { state: 'online', email: user.email }));
        }
    });
    onValue(ref(db, '/status'), (snap) => {
        const data = snap.val(); 
        let html = '';
        for (let id in data) {
            if (data[id].state === 'online') {
                html += `<div class="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase"><span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>${data[id].email.split('@')[0]}</div>`;
            }
        }
        document.getElementById('online-list').innerHTML = html;
    });
}

// --- DATA INITIALIZATION ---
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

// --- NAVIGATION & UI TOGGLES ---
window.switchPage = (page) => {
    currentPage = page;
    showCompleted = false; 
    showUndocked = false; 
    expandedSR = null;
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const navId = 'nav-' + page.toLowerCase();
    if(document.getElementById(navId)) document.getElementById(navId).classList.add('active');
    
    document.getElementById('page-title').innerText = { 
        'YARD': 'BOAT YARD LOG', 
        'DASH': 'PRF TRACKER', 
        'TRANS': 'TRANSACTIONS', 
        'TASKS': 'TASK MANAGER' 
    }[page];

    document.getElementById('btn-create').style.display = (page === 'TRANS') ? 'none' : 'block';
    document.getElementById('btn-toggle-comp').style.display = (page === 'DASH') ? 'flex' : 'none';
    document.getElementById('btn-toggle-undocked').style.display = (page === 'YARD') ? 'flex' : 'none';
    
    refreshTable();
};

window.toggleCompleted = () => { 
    showCompleted = !showCompleted; 
    document.getElementById('btn-toggle-comp').classList.toggle('active', showCompleted); 
    refreshTable(); 
};

window.toggleUndocked = () => { 
    showUndocked = !showUndocked; 
    document.getElementById('btn-toggle-undocked').classList.toggle('active', showUndocked); 
    refreshTable(); 
};

// --- CORE TABLE RENDERER ---
window.refreshTable = () => {
    const q = document.getElementById('main-search').value.toUpperCase();
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');

    // YARD LOG PAGE
    if (currentPage === 'YARD') {
        head.innerHTML = `<tr>
            <th style="width:70px;">Slot</th>
            <th>Asset Name</th>
            <th style="width:110px;">SR #</th>
            <th style="width:110px;">WO #</th>
            <th>Owner</th>
            <th style="width:110px;">Docked</th>
            <th style="width:150px;">Status</th>
            <th style="width:60px;">Age</th>
            <th style="width:40px;"></th>
        </tr>`;

        const filtered = yardLogs.filter(l => {
            const matches = l.name?.toUpperCase().includes(q) || 
                            l.owner?.toUpperCase().includes(q) || 
                            l.slot?.toUpperCase().includes(q) ||
                            l.sr?.toUpperCase().includes(q) ||
                            l.wo?.toUpperCase().includes(q);
            return showUndocked ? (matches && l.status === 'Undocked') : (matches && l.status !== 'Undocked');
        });

        body.innerHTML = filtered.map(l => {
            const start = new Date(l.docked), end = l.undocked ? new Date(l.undocked) : new Date();
            const age = Math.floor((end - start) / (1000 * 60 * 60 * 24)) || 0;
            return `<tr>
                <td style="font-weight:800; color:var(--brand);">
                    <input class="remarks-editor" value="${l.slot}" onblur="updateYard('${l.id}', 'slot', this.value.toUpperCase())">
                </td>
                <td>
                    <input class="remarks-editor" value="${l.name}" style="font-weight:700;" onblur="updateYard('${l.id}', 'name', this.value.toUpperCase())">
                </td>
                <td>
                    <input class="remarks-editor" value="${l.sr || ''}" placeholder="SR#" onblur="updateYard('${l.id}', 'sr', this.value.toUpperCase())">
                </td>
                <td>
                    <input class="remarks-editor" value="${l.wo || ''}" placeholder="WO#" onblur="updateYard('${l.id}', 'wo', this.value.toUpperCase())">
                </td>
                <td>
                    <input class="remarks-editor" value="${l.owner}" onblur="updateYard('${l.id}', 'owner', this.value.toUpperCase())">
                </td>
                <td>
                    <input type="date" value="${l.docked}" class="remarks-editor" onchange="updateYard('${l.id}', 'docked', this.value)">
                </td>
                <td>
                    <select class="status-select ${l.status === 'Docked' ? 's-Docked' : 's-Undocked'}" onchange="updateYard('${l.id}', 'status', this.value)">
                        ${YARD_STATUS.map(o => `<option ${l.status==o?'selected':''}>${o}</option>`).join('')}
                    </select>
                </td>
                <td><span class="age-badge">${age}D</span></td>
                <td><button onclick="deleteYard('${l.id}')" style="color:var(--danger); font-size:18px;">&times;</button></td>
            </tr>`;
        }).join('');
        
    // TASK MANAGER PAGE
    } else if (currentPage === 'TASKS') {
        head.innerHTML = `<tr><th style="width:140px;">SR #</th><th style="width:120px;">SR Date</th><th>Asset/Service</th><th style="width:100px;">WOs</th><th style="width:100px;">Total Tasks</th><th style="width:90px;">Avg. %</th><th style="width:40px;"></th></tr>`;
        
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
            
            let rows = `<tr class="cursor-pointer bg-slate-50" onclick="toggleSRRows('${key}')">
                <td style="font-weight:800; color:var(--brand);">${group.sr}</td>
                <td style="color:var(--text-muted); font-size:11px;">${group.srDate || '-'}</td>
                <td style="font-weight:700;">${group.asset}</td>
                <td><span class="age-badge">${Object.keys(group.wos).length} WOs</span></td>
                <td><span class="age-badge">${group.totalItems.length} Tasks</span></td>
                <td><b style="color:var(--brand)">${avgProgress}%</b></td>
                <td><button onclick="event.stopPropagation(); deleteSR('${key}')" style="color:var(--danger); font-size:18px;">&times;</button></td>
            </tr>`;

            if (expandedSR === key) {
                Object.keys(group.wos).forEach(woKey => {
                    const wo = group.wos[woKey];
                    rows += `<tr class="bg-slate-100"><td colspan="6" class="pl-10 text-[10px] font-black text-slate-500 uppercase">WO: ${wo.wo} (${wo.woDate})</td><td><button onclick="deleteWO('${key}', '${woKey}')" class="text-amber-500">&times;</button></td></tr>`;
                    wo.items.forEach(t => {
                        rows += `<tr>
                            <td colspan="2" class="pl-12 text-[10px]">${t.date}</td>
                            <td colspan="2"><input class="remarks-editor" value="${t.details}" onblur="updateTask('${t.id}', 'details', this.value.toUpperCase())"></td>
                            <td><input type="number" class="remarks-editor w-12" value="${t.progress}" onblur="updateTask('${t.id}', 'progress', this.value)">%</td>
                            <td colspan="2"></td>
                        </tr>`;
                    });
                });
            }
            return rows;
        }).join('');

    // TRANSACTIONS PAGE
    } else if (currentPage === 'TRANS') {
        head.innerHTML = `<tr><th>Timestamp</th><th>Reference</th><th>Action</th><th>Details</th><th>User</th></tr>`;
        body.innerHTML = transactionLogs.filter(a => a.prf?.toUpperCase().includes(q) || a.action?.toUpperCase().includes(q)).map(a => `
            <tr>
                <td>${a.time}</td>
                <td style="font-weight:800; color:var(--brand);">${a.prf}</td>
                <td style="font-weight:700;">${a.action}</td>
                <td class="italic text-slate-400">${a.details}</td>
                <td>${a.user}</td>
            </tr>
        `).join('');

    // DASHBOARD (PRF TRACKER) PAGE
    } else {
        head.innerHTML = `<tr><th style="width:100px;">Date</th><th style="width:120px;">PRF #</th><th>Asset</th><th style="width:100px;">Workshop</th><th style="width:160px;">Status</th><th style="width:140px;">Due Date</th><th>Remarks</th><th style="width:40px;"></th></tr>`;
        body.innerHTML = logs.filter(l => {
            const matches = l.prf?.toUpperCase().includes(q) || l.asset?.toUpperCase().includes(q);
            return showCompleted ? (matches && l.status === 'ALL RECEIVED') : (matches && l.status !== 'ALL RECEIVED');
        }).map(l => `
            <tr class="${l.status === 'ALL RECEIVED' ? 'opacity-50' : ''}">
                <td>${l.date}</td>
                <td style="font-weight:800; color:var(--brand);">${l.prf}</td>
                <td style="font-weight:700;">${l.asset}</td>
                <td class="text-[10px] font-bold text-slate-400">${l.workshop}</td>
                <td>
                    <select class="status-select s-${l.status.replace(/ /g,'-')}" onchange="updateField('${l.id}', 'status', this.value, '${l.prf}')">
                        ${STATUS_OPTIONS.map(o => `<option ${l.status==o?'selected':''}>${o}</option>`).join('')}
                    </select>
                </td>
                <td><input type="date" value="${l.eta || ''}" class="remarks-editor" onchange="updateField('${l.id}', 'eta', this.value, '${l.prf}')"></td>
                <td><div class="remarks-editor" contenteditable="true" onblur="updateField('${l.id}', 'remarks', this.innerText.toUpperCase(), '${l.prf}')">${l.remarks || ''}</div></td>
                <td><button onclick="deleteRow('${l.id}')" class="text-slate-300">&times;</button></td>
            </tr>
        `).join('');
    }
};

// --- CRUD OPERATIONS ---
window.savePRF = (erp) => {
    const p = document.getElementById('m-prf').value.toUpperCase();
    const a = document.getElementById('m-asset').value.toUpperCase();
    const w = document.getElementById('m-workshop').value;
    if(!p || !a || !w) return alert("Required Fields Missing");
    
    push(ref(db, 'prf_logs'), { 
        date: new Date().toLocaleDateString('en-GB'), 
        prf: p, 
        asset: a, 
        workshop: w, 
        status: 'PENDING', 
        eta: '', 
        remarks: '' 
    });
    
    closeModal();
    if(erp) window.open("https://forms.office.com/pages/responsepage.aspx?id=rS-35FLkcEy4rMmBiUUcM-wq0ZU8I9BHssORFyfEW95UN0ZMM1gxR1YwUDZKMkNHMkhFMUdMRzlRSS4u", "_blank");
};

window.saveYardEntry = () => {
    const s = document.getElementById('y-slot').value.toUpperCase();
    const v = document.getElementById('y-vessel').value.toUpperCase();
    const d = document.getElementById('y-docked').value;
    if(!s || !v || !d) return alert("Slot, Vessel, and Docking Date required.");
    
    push(ref(db, 'yard_logs'), { 
        slot: s, 
        name: v, 
        sr: document.getElementById('y-sr').value.toUpperCase(), 
        wo: document.getElementById('y-wo').value.toUpperCase(), 
        owner: document.getElementById('y-owner').value.toUpperCase(), 
        docked: d, 
        estUndock: document.getElementById('y-est-undock').value, 
        status: 'Docked', 
        undocked: '' 
    });
    closeModal();
};

window.addTaskRow = () => {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-[100px_1fr_60px_30px] gap-2 mb-2 task-input-row';
    row.innerHTML = `
        <input type="date" class="p-2 text-[10px] bg-slate-50 border border-slate-200 rounded-lg t-row-date">
        <textarea class="p-2 text-[10px] bg-slate-50 border border-slate-200 rounded-lg t-row-details" placeholder="Task details..."></textarea>
        <input type="number" class="p-2 text-[10px] bg-slate-50 border border-slate-200 rounded-lg t-row-prog" value="0">
        <button onclick="this.parentElement.remove()" class="text-red-500 font-bold">&times;</button>
    `;
    document.getElementById('t-task-list').appendChild(row);
};

window.saveTaskEntry = () => {
    const sr = document.getElementById('t-sr').value.toUpperCase();
    const wo = document.getElementById('t-wo').value.toUpperCase();
    const asset = document.getElementById('t-asset').value.toUpperCase();
    const rows = document.querySelectorAll('.task-input-row');
    
    if(!sr || !wo || !asset || rows.length === 0) return alert("Missing Header or Tasks");
    
    rows.forEach(r => {
        const details = r.querySelector('.t-row-details').value.toUpperCase();
        if(details) {
            push(ref(db, 'task_logs'), { 
                sr, 
                srDate: document.getElementById('t-sr-date').value, 
                wo, 
                woDate: document.getElementById('t-wo-date').value, 
                asset, 
                date: r.querySelector('.t-row-date').value, 
                details, 
                progress: r.querySelector('.t-row-prog').value, 
                status: 'PLANNED', 
                comments: '' 
            });
        }
    });
    closeModal();
};

window.updateYard = (id, f, v) => {
    const upd = { [f]: v };
    if(f === 'undocked' && v !== "") upd.status = "Undocked";
    update(ref(db, `yard_logs/${id}`), upd);
};

window.updateField = (id, f, v, prf) => {
    update(ref(db, `prf_logs/${id}`), { [f]: v });
    push(ref(db, 'transactions'), { 
        time: new Date().toLocaleString(), 
        user: auth.currentUser.email.split('@')[0].toUpperCase(), 
        action: `Edit: ${f}`, 
        prf: prf, 
        details: v 
    });
};

window.updateTask = (id, f, v) => update(ref(db, `task_logs/${id}`), { [f]: v });
window.toggleSRRows = (sr) => { expandedSR = expandedSR === sr ? null : sr; refreshTable(); };

// --- MODAL & UTILS ---
window.openModal = () => {
    document.getElementById('entry-modal').style.display = 'flex';
    document.getElementById('modal-title').innerText = { 
        'DASH': 'NEW PRF', 
        'YARD': 'DOCK VESSEL', 
        'TASKS': 'NEW SERVICE REQUEST' 
    }[currentPage];
    
    document.getElementById('prf-form').style.display = currentPage === 'DASH' ? 'block' : 'none';
    document.getElementById('yard-form').style.display = currentPage === 'YARD' ? 'block' : 'none';
    document.getElementById('task-form').style.display = currentPage === 'TASKS' ? 'block' : 'none';
    
    if(currentPage === 'TASKS') { 
        document.getElementById('t-task-list').innerHTML = ''; 
        addTaskRow(); 
    }
};

window.closeModal = () => document.getElementById('entry-modal').style.display = 'none';

window.deleteRow = (id) => confirm('Delete PRF?') && remove(ref(db, `prf_logs/${id}`));
window.deleteYard = (id) => confirm('Undock/Delete Vessel?') && remove(ref(db, `yard_logs/${id}`));
window.deleteSR = (sr) => confirm('Wipe Entire SR?') && taskLogs.filter(t => t.sr === sr).forEach(t => remove(ref(db, `task_logs/${t.id}`)));

window.toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', target);
    document.getElementById('theme-icon').innerText = target === 'light' ? '🌙' : '☀️';
};

window.exportPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const head = [['REF', 'ASSET', 'DETAILS', 'STATUS']];
    const data = currentPage === 'YARD' ? 
                 yardLogs.map(l => [l.slot, l.name, l.owner, l.status]) : 
                 logs.map(l => [l.prf, l.asset, l.remarks, l.status]);
    
    doc.text(`SRD REPORT - ${currentPage}`, 14, 15);
    doc.autoTable({ head, body: data, startY: 20, theme: 'grid', headStyles: { fillColor: [99, 102, 241] } });
    doc.save(`SRD_${currentPage}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Initial state
switchPage('DASH');
