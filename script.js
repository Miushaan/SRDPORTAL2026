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

// --- THEME LOGIC ---
window.toggleTheme = () => {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', next);
    document.getElementById('theme-icon').innerText = next === 'light' ? '🌙' : '☀️';
    localStorage.setItem('srd-theme', next);
};

const savedTheme = localStorage.getItem('srd-theme') || 'light';
document.body.setAttribute('data-theme', savedTheme);
document.getElementById('theme-icon').innerText = savedTheme === 'light' ? '🌙' : '☀️';

// --- AUTH & DATA ---
window.handleLogin = () => signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-pass').value).catch(() => alert("Access Denied"));
window.handleLogout = () => signOut(auth);

onAuthStateChanged(auth, user => {
    document.getElementById('auth-overlay').style.display = user ? 'none' : 'flex';
    if(user) { initData(); setupPresence(user); }
});

function setupPresence(user) {
    const myStatusRef = ref(db, `/status/${user.uid}`);
    onValue(ref(db, '.info/connected'), (snap) => { if (snap.val()) { onDisconnect(myStatusRef).set({ state: 'offline', email: user.email }).then(() => set(myStatusRef, { state: 'online', email: user.email })); }});
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

window.toggleSidebar = () => document.querySelector('.sidebar').classList.toggle('hidden');

window.switchPage = (page) => {
    currentPage = page;
    showCompleted = false; showUndocked = false; expandedSR = null;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-' + page.toLowerCase()).classList.add('active');
    
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

window.toggleCompleted = () => { showCompleted = !showCompleted; document.getElementById('btn-toggle-comp').classList.toggle('active-toggle', showCompleted); refreshTable(); };
window.toggleUndocked = () => { showUndocked = !showUndocked; document.getElementById('btn-toggle-undocked').classList.toggle('active-toggle', showUndocked); refreshTable(); };

window.refreshTable = () => {
    const q = document.getElementById('main-search').value.toUpperCase();
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');

    // UPDATE: YARD Page Table logic
    if (currentPage === 'YARD') {
        head.innerHTML = `<tr><th style="width:80px;">Slot</th><th style="width:110px;">Ref (SR/WO)</th><th>Asset Name</th><th>Owner</th><th style="width:110px;">Docked</th><th style="width:110px;">Est. Undock</th><th style="width:150px;">Status</th><th style="width:80px;">Age</th><th>Actual Undock</th><th style="width:40px;"></th></tr>`;
        const filtered = yardLogs.filter(l => {
            const matches = l.name?.toUpperCase().includes(q) || l.owner?.toUpperCase().includes(q) || l.slot?.toUpperCase().includes(q) || l.sr?.toUpperCase().includes(q) || l.wo?.toUpperCase().includes(q);
            return showUndocked ? (matches && l.status === 'Undocked') : (matches && l.status !== 'Undocked');
        });
        body.innerHTML = filtered.map(l => {
            const start = new Date(l.docked), end = l.undocked ? new Date(l.undocked) : new Date();
            const age = Math.floor((end - start) / (1000 * 60 * 60 * 24)) || 0;
            return `<tr>
                <td style="font-weight:800; color:var(--brand);"><input class="remarks-editor" value="${l.slot}" onblur="updateYard('${l.id}', 'slot', this.value)"></td>
                <td>
                    <div style="font-weight:800; color:var(--brand); font-size:11px;">${l.sr || '-'}</div>
                    <div style="color:var(--text-muted); font-size:10px;">${l.wo || '-'}</div>
                </td>
                <td><input class="remarks-editor" value="${l.name}" style="font-weight:700;" onblur="updateYard('${l.id}', 'name', this.value)"></td>
                <td><input class="remarks-editor" value="${l.owner}" onblur="updateYard('${l.id}', 'owner', this.value)"></td>
                <td><input type="date" value="${l.docked}" class="remarks-editor" onchange="updateYard('${l.id}', 'docked', this.value)"></td>
                <td><input type="date" value="${l.estUndock || ''}" class="remarks-editor" onchange="updateYard('${l.id}', 'estUndock', this.value)"></td>
                <td>
                    <select class="status-select ${l.status === 'Docked' ? 's-Docked' : 's-Undocked'}" onchange="updateYard('${l.id}', 'status', this.value)">
                        ${YARD_STATUS.map(o => `<option ${l.status==o?'selected':''}>${o}</option>`).join('')}
                    </select>
                </td>
                <td><span class="age-badge">${age}D</span></td>
                <td><input type="date" value="${l.undocked || ''}" class="remarks-editor" onchange="updateYard('${l.id}', 'undocked', this.value)"></td>
                <td><button onclick="deleteYard('${l.id}')" style="background:none; border:none; cursor:pointer; color:var(--danger); font-size:18px;">&times;</button></td>
            </tr>`;
        }).join('');
        
    } else if (currentPage === 'TRANS') {
        head.innerHTML = `<tr><th style="width:180px;">Timestamp</th><th style="width:120px;">Reference</th><th>Action Type</th><th>Details</th><th>User</th></tr>`;
        const filtered = transactionLogs.filter(a => a.prf?.toUpperCase().includes(q) || a.action?.toUpperCase().includes(q));
        body.innerHTML = filtered.map(a => `<tr>
            <td style="color:var(--text-muted); font-size:11px;">${a.time}</td>
            <td style="font-weight:800; color:var(--brand);">${a.prf}</td>
            <td style="font-weight:700;">${a.action}</td>
            <td style="font-style:italic; color:var(--text-muted);">${a.details}</td>
            <td style="font-weight:800;">${a.user}</td>
        </tr>`).join('');
        
    } else if (currentPage === 'TASKS') {
        head.innerHTML = `<tr><th style="width:140px; white-space:nowrap;">SR #</th><th style="width:120px; white-space:nowrap;">SR Date</th><th>Asset/Service</th><th style="width:100px; white-space:nowrap;">WOs</th><th style="width:100px; white-space:nowrap;">Total Tasks</th><th style="width:90px; white-space:nowrap;">Avg. %</th><th style="width:40px;"></th></tr>`;
        
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
            const woCount = Object.keys(group.wos).length;
            
            let rows = `<tr style="cursor:pointer; background: var(--brand-light);" onclick="toggleSRRows('${key}')">
                <td style="font-weight:800; color:var(--brand); white-space:nowrap;">${group.sr}</td>
                <td style="font-weight:700; color:var(--text-muted); font-size:11px;">${group.srDate || '-'}</td>
                <td style="font-weight:700;">${group.asset}</td>
                <td><span class="age-badge" style="background:#f1f5f9; color:#475569; border-color:#cbd5e1;">${woCount} WOs</span></td>
                <td><span class="age-badge">${group.totalItems.length} Tasks</span></td>
                <td><b style="color:var(--brand)">${avgProgress}%</b></td>
                <td><button onclick="event.stopPropagation(); deleteSR('${key}')" style="color:var(--danger); border:none; background:none; cursor:pointer; font-size:18px;" title="Delete Entire SR">&times;</button></td>
            </tr>`;

            if (expandedSR === key) {
                Object.keys(group.wos).forEach(woKey => {
                    const woGroup = group.wos[woKey];
                    
                    rows += `<tr style="background: #f1f5f9; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
                        <td colspan="3" style="padding-left:40px; font-weight:800; color:var(--text-main); font-size:11px;">
                            <span style="color:var(--brand)">WO #:</span> ${woGroup.wo}
                            <span style="margin-left:15px; color:var(--text-muted); font-weight:600;">DATE: ${woGroup.woDate || '-'}</span>
                        </td>
                        <td colspan="3"></td>
                        <td><button onclick="deleteWO('${key}', '${woKey}')" style="color:var(--warning); border:none; background:none; cursor:pointer; font-size:16px;" title="Delete WO">&times;</button></td>
                    </tr>`;

                    woGroup.items.forEach(t => {
                        let taskStatusClass = 's-PENDING';
                        if(t.status === 'ONGOING') taskStatusClass = 's-ONGOING';
                        if(t.status === 'COMPLETED') taskStatusClass = 's-COMPLETED';

                        rows += `<tr style="background: var(--card-bg);">
                            <td colspan="2" style="padding-left:60px; font-size:11px; color:var(--text-muted); border-left: 3px solid var(--brand-light);">
                                <strong style="color:var(--text-main);">Task Date:</strong><br>${t.date || '-'}
                            </td>
                            <td colspan="2">
                                <div style="font-weight:600; margin-bottom:6px;">${t.details}</div>
                                <div class="remarks-editor" contenteditable="true" style="font-size:11px; border-style:dashed;" 
                                     onblur="updateTask('${t.id}', 'comments', this.innerText.toUpperCase())" placeholder="Daily comments...">${t.comments || ''}</div>
                            </td>
                            <td>
                                 <select class="status-select ${taskStatusClass}" style="width:100px;" onchange="updateTask('${t.id}', 'status', this.value)">
                                    <option ${t.status=='PLANNED'?'selected':''}>PLANNED</option>
                                    <option ${t.status=='ONGOING'?'selected':''}>ONGOING</option>
                                    <option ${t.status=='COMPLETED'?'selected':''}>COMPLETED</option>
                                 </select>
                            </td>
                            <td>
                                <div style="display:flex; align-items:center; gap:5px;">
                                    <input type="number" value="${t.progress}" class="remarks-editor" style="width:60px; padding:6px;" onblur="updateTask('${t.id}', 'progress', this.value)"> %
                                </div>
                            </td>
                            <td><button onclick="deleteTask('${t.id}')" style="color:var(--text-muted); border:none; background:none; cursor:pointer; font-size:18px;">&times;</button></td>
                        </tr>`;
                    });
                });
            }
            return rows;
        }).join('');
        
    } else {
        head.innerHTML = `<tr><th style="width:100px;">Date</th><th style="width:120px;">PRF #</th><th>Asset Name</th><th style="width:100px;">Workshop</th><th style="width:160px;">Status</th><th style="width:140px;">Due Date</th><th style="min-width:300px;">Remarks</th><th style="width:40px;"></th></tr>`;
        const filtered = logs.filter(l => {
            const matches = (l.prf?.toUpperCase().includes(q) || l.asset?.toUpperCase().includes(q));
            return showCompleted ? (matches && l.status === 'ALL RECEIVED') : (matches && l.status !== 'ALL RECEIVED');
        });
        body.innerHTML = filtered.map(l => {
            const sClass = `s-${l.status.replace(/[/ ]/g, '-')}`;
            return `<tr>
                <td>${l.date}</td>
                <td style="font-weight:800; color:var(--brand);">${l.prf}</td>
                <td style="font-weight:700;">${l.asset}</td>
                <td style="font-size:10px; font-weight:700; color:var(--text-muted);">${l.workshop}</td>
                <td>
                    <select class="status-select ${sClass}" onchange="updateField('${l.id}', 'status', this.value, '${l.prf}')">
                        ${STATUS_OPTIONS.map(o => `<option ${l.status==o?'selected':''}>${o}</option>`).join('')}
                    </select>
                </td>
                <td><input type="date" value="${l.eta || ''}" class="remarks-editor" onchange="updateField('${l.id}', 'eta', this.value, '${l.prf}')"></td>
                <td><div class="remarks-editor" contenteditable="true" onblur="updateField('${l.id}', 'remarks', this.innerText.trim().toUpperCase(), '${l.prf}')">${l.remarks || ''}</div></td>
                <td><button onclick="deleteRow('${l.id}')" style="background:none; border:none; cursor:pointer; color:#cbd5e1; font-size:18px;">&times;</button></td>
            </tr>`;
        }).join('');
    }
};

// --- TASK MANAGER SPECIFIC FUNCTIONS ---
window.toggleSRRows = (sr) => {
    expandedSR = expandedSR === sr ? null : sr;
    refreshTable();
};

window.addTaskRow = () => {
    const list = document.getElementById('t-task-list');
    const row = document.createElement('div');
    row.className = 'task-input-row';
    row.style.cssText = 'display:grid; grid-template-columns: 120px 1fr 80px 30px; gap:8px; margin-bottom:10px; align-items:start;';
    
    row.innerHTML = `
        <input type="date" class="remarks-editor t-row-date" title="Task Date">
        <textarea class="remarks-editor t-row-details" placeholder="Specific Task Description" style="min-height:40px;"></textarea>
        <input type="number" class="remarks-editor t-row-prog" placeholder="Prog %" min="0" max="100">
        <button onclick="this.parentElement.remove()" style="color:var(--danger); background:none; border:none; cursor:pointer; font-size:18px; padding:6px; margin-top:2px;">&times;</button>
    `;
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
};

window.saveTaskEntry = () => {
    const sr = document.getElementById('t-sr').value.toUpperCase();
    const srDate = document.getElementById('t-sr-date').value;
    const wo = document.getElementById('t-wo').value.toUpperCase();
    const woDate = document.getElementById('t-wo-date').value;
    const asset = document.getElementById('t-asset').value.toUpperCase();

    if(!sr || !wo || !asset) return alert("SR, WO, and Asset/Service Name are heavily required.");

    const taskRows = document.querySelectorAll('.task-input-row');
    if (taskRows.length === 0) return alert("At least one task row is required.");

    let savedCount = 0;
    
    taskRows.forEach(row => {
        const date = row.querySelector('.t-row-date').value;
        const details = row.querySelector('.t-row-details').value.toUpperCase();
        const progress = row.querySelector('.t-row-prog').value || 0;

        if (details.trim() !== '') {
            push(ref(db, 'task_logs'), {
                sr: sr,
                srDate: srDate,
                wo: wo,
                woDate: woDate,
                asset: asset,
                date: date,
                details: details,
                progress: progress,
                status: 'PLANNED',
                comments: ''
            });
            savedCount++;
        }
    });

    if (savedCount === 0) return alert("Please enter the specific task descriptions.");
    closeModal();
};

window.updateTask = (id, field, val) => update(ref(db, `task_logs/${id}`), { [field]: val });

window.deleteTask = (id) => confirm('Remove this specific task?') && remove(ref(db, `task_logs/${id}`));

window.deleteWO = (sr, wo) => {
    if(confirm(`Delete Work Order (WO: ${wo}) and all its tasks?`)) {
        taskLogs.filter(t => t.sr === sr && t.wo === wo).forEach(t => remove(ref(db, `task_logs/${t.id}`)));
    }
};

window.deleteSR = (sr) => {
    if(confirm(`WARNING: Delete Entire Service Request (SR: ${sr})? This will wipe all associated WOs and Tasks permanently.`)) {
        taskLogs.filter(t => t.sr === sr).forEach(t => remove(ref(db, `task_logs/${t.id}`)));
    }
};

// --- STANDARD SAVE & UPDATE LOGIC ---
window.savePRF = (redirect) => {
    const p = document.getElementById('m-prf').value.toUpperCase(), a = document.getElementById('m-asset').value.toUpperCase(), w = document.getElementById('m-workshop').value;
    if(!p || !a || !w) return alert("Required");
    push(ref(db, 'prf_logs'), { date: new Date().toLocaleDateString('en-GB'), prf: p, asset: a, workshop: w, status: 'PENDING', eta: '', remarks: '' });
    closeModal();
    if(redirect) window.open("https://forms.office.com/pages/responsepage.aspx?id=rS-35FLkcEy4rMmBiUUcM-wq0ZU8I9BHssORFyfEW95UN0ZMM1gxR1YwUDZKMkNHMkhFMUdMRzlRSS4u", "_blank");
};

// UPDATE: Added SR and WO Saving to Yard Logs
window.saveYardEntry = () => {
    const s = document.getElementById('y-slot').value, v = document.getElementById('y-vessel').value, d = document.getElementById('y-docked').value;
    if(!s || !v || !d) return alert("Required");
    push(ref(db, 'yard_logs'), { 
        slot: s, 
        name: v, 
        sr: document.getElementById('y-sr').value.toUpperCase(),
        wo: document.getElementById('y-wo').value.toUpperCase(),
        owner: document.getElementById('y-owner').value, 
        docked: d, 
        estUndock: document.getElementById('y-est-undock').value, 
        status: 'Docked', 
        undocked: '' 
    });
    closeModal();
};

window.updateField = (id, field, val, prf) => {
    update(ref(db, `prf_logs/${id}`), { [field]: val });
    push(ref(db, 'transactions'), { time: new Date().toLocaleString(), user: auth.currentUser.email.split('@')[0].toUpperCase(), action: `PRF Edit: ${field}`, prf: prf, details: val });
};

window.updateYard = (id, field, val) => {
    const upd = { [field]: val };
    if (field === 'undocked' && val !== "") upd.status = "Undocked";
    update(ref(db, `yard_logs/${id}`), upd);
};

window.openModal = () => {
    document.getElementById('modal-title').innerText = {
        'YARD': 'REGISTER VESSEL',
        'DASH': 'NEW PRF ENTRY',
        'TASKS': 'NEW SERVICE REQUEST & WO'
    }[currentPage] || 'NEW ENTRY';
    
    document.getElementById('inner-modal').className = (currentPage === 'TASKS') ? 'modal task-modal' : 'modal';

    document.getElementById('prf-form').style.display = currentPage === 'DASH' ? 'block' : 'none';
    document.getElementById('yard-form').style.display = currentPage === 'YARD' ? 'block' : 'none';
    document.getElementById('task-form').style.display = currentPage === 'TASKS' ? 'block' : 'none';
    
    // Clear SR and WO for new Yard entry
    if(currentPage === 'YARD') {
        document.getElementById('y-sr').value = '';
        document.getElementById('y-wo').value = '';
    }

    if (currentPage === 'TASKS') {
        document.getElementById('t-sr').value = '';
        document.getElementById('t-sr-date').value = '';
        document.getElementById('t-wo').value = '';
        document.getElementById('t-wo-date').value = '';
        document.getElementById('t-asset').value = '';
        document.getElementById('t-task-list').innerHTML = '';
        addTaskRow(); 
    }

    document.getElementById('entry-modal').style.display = 'flex';
};

window.closeModal = () => document.getElementById('entry-modal').style.display = 'none';

window.deleteRow = (id) => confirm('Delete permanently?') && remove(ref(db, `prf_logs/${id}`));
window.deleteYard = (id) => confirm('Delete vessel?') && remove(ref(db, `yard_logs/${id}`));

// --- PDF EXPORT ---
// UPDATE: Added SR and WO to Yard Log Export
window.exportPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const q = document.getElementById('main-search').value.toUpperCase();
    let data, head;
    const dateStr = new Date().toLocaleString('en-GB');

    if(currentPage === 'YARD') {
        head = [['SLOT', 'SR', 'WO', 'Asset Name', 'OWNER', 'DOCKED', 'EST. UNDOCK', 'STATUS', 'AGE']];
        data = yardLogs.filter(l => l.name?.toUpperCase().includes(q) || l.sr?.toUpperCase().includes(q) || l.wo?.toUpperCase().includes(q)).map(l => {
            const age = Math.floor(((l.undocked ? new Date(l.undocked) : new Date()) - new Date(l.docked)) / (1000 * 60 * 60 * 24)) || 0;
            return [l.slot, l.sr || '-', l.wo || '-', l.name, l.owner, l.docked, l.estUndock, l.status, age + 'D'];
        });
    } else if (currentPage === 'TRANS') {
        head = [['TIMESTAMP', 'REF', 'ACTION', 'DETAILS', 'USER']];
        data = transactionLogs.filter(a => a.prf?.toUpperCase().includes(q)).map(a => [a.time, a.prf, a.action, a.details, a.user]);
    } else if (currentPage === 'TASKS') {
         head = [['SR #', 'WO #', 'ASSET / SERVICE', 'TASK DATE', 'TASK DETAILS', 'STATUS', 'PROGRESS']];
         data = taskLogs.filter(t => t.sr?.toUpperCase().includes(q) || t.wo?.toUpperCase().includes(q) || t.asset?.toUpperCase().includes(q)).map(t => [t.sr, t.wo, t.asset, t.date, t.details, t.status, t.progress + '%']);
    } else {
        head = [['DATE', 'PRF #', 'ASSET NAME', 'WORKSHOP', 'STATUS', 'DUE DATE', 'REMARKS']];
        data = logs.filter(l => l.prf?.toUpperCase().includes(q)).map(l => [l.date, l.prf, l.asset, l.workshop, l.status, l.eta, l.remarks]);
    }

    doc.setFontSize(18);
    doc.text(`SRD PORTAL: ${currentPage} REPORT`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Exported On: ${dateStr}`, 14, 22);
    doc.autoTable({ startY: 28, head: head, body: data, theme: 'grid', headStyles: { fillColor: [99, 102, 241] } });
    doc.save(`SRD_REPORT_${currentPage}_${new Date().toISOString().split('T')[0]}.pdf`);
};