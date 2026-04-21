import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update, onDisconnect, set } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Firebase Config
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
let expandedSR = null;

const STATUS_OPTIONS = ["PENDING", "ITEM CREATION", "PR/MTR-RAISED", "PO-RAISED", "PAYMENT PENDING", "PART RECEIVED", "ALL RECEIVED"];

// --- UI ENGINE ---
window.refreshTable = () => {
    const q = document.getElementById('main-search').value.toUpperCase();
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');

    if (currentPage === 'YARD') {
        head.innerHTML = `<tr><th style="width:80px;">Slot</th><th>Vessel Details</th><th style="width:140px;">Owner</th><th style="width:130px;">Docked</th><th style="width:150px;">Status</th><th style="width:50px;"></th></tr>`;
        body.innerHTML = yardLogs.filter(l => l.name?.toUpperCase().includes(q) || l.slot?.toUpperCase().includes(q)).map(l => `
            <tr>
                <td><input class="cell-editor" style="font-weight:800; color:var(--brand);" value="${l.slot || ''}" onblur="updateYard('${l.id}', 'slot', this.value.toUpperCase())"></td>
                <td><textarea class="cell-editor" style="font-weight:700;" onblur="updateYard('${l.id}', 'name', this.value.toUpperCase())">${l.name || ''}</textarea></td>
                <td><input class="cell-editor" value="${l.owner || ''}" onblur="updateYard('${l.id}', 'owner', this.value.toUpperCase())"></td>
                <td><input type="date" class="cell-editor" value="${l.docked}" onchange="updateYard('${l.id}', 'docked', this.value)"></td>
                <td>
                    <select class="status-select ${l.status === 'Docked' ? 's-Docked' : ''}" onchange="updateYard('${l.id}', 'status', this.value)">
                        <option ${l.status=='Docked'?'selected':''}>Docked</option>
                        <option ${l.status=='Undocked'?'selected':''}>Undocked</option>
                    </select>
                </td>
                <td><button onclick="deleteYard('${l.id}')" style="border:none; background:none; color:var(--danger); cursor:pointer; font-size:18px;">&times;</button></td>
            </tr>`).join('');

    } else if (currentPage === 'DASH') {
        head.innerHTML = `<tr><th style="width:100px;">Date</th><th style="width:120px;">PRF #</th><th>Asset Details</th><th style="width:120px;">Workshop</th><th style="width:160px;">Status</th><th>Remarks</th><th style="width:50px;"></th></tr>`;
        body.innerHTML = logs.filter(l => l.prf?.toUpperCase().includes(q) || l.asset?.toUpperCase().includes(q)).map(l => `
            <tr>
                <td style="color:var(--text-muted); font-size:11px;">${l.date}</td>
                <td style="font-weight:800; color:var(--brand);">${l.prf}</td>
                <td><textarea class="cell-editor" style="font-weight:700;" onblur="updateField('${l.id}', 'asset', this.value.toUpperCase(), '${l.prf}')">${l.asset || ''}</textarea></td>
                <td><input class="cell-editor" value="${l.workshop}" onblur="updateField('${l.id}', 'workshop', this.value.toUpperCase(), '${l.prf}')"></td>
                <td>
                    <select class="status-select s-${l.status.replace(/[/ ]/g, '-')}" onchange="updateField('${l.id}', 'status', this.value, '${l.prf}')">
                        ${STATUS_OPTIONS.map(o => `<option ${l.status==o?'selected':''}>${o}</option>`).join('')}
                    </select>
                </td>
                <td><div class="cell-editor" contenteditable="true" style="min-height:20px; white-space:pre-wrap;" onblur="updateField('${l.id}', 'remarks', this.innerText.toUpperCase(), '${l.prf}')">${l.remarks || ''}</div></td>
                <td><button onclick="deleteRow('${l.id}')" style="border:none; background:none; color:var(--danger); cursor:pointer; font-size:18px;">&times;</button></td>
            </tr>`).join('');

    } else if (currentPage === 'TASKS') {
        head.innerHTML = `<tr><th style="width:130px;">SR #</th><th style="width:110px;">Date</th><th>Asset / Service</th><th style="width:100px;">Tasks</th><th style="width:80px;">Avg %</th><th style="width:50px;"></th></tr>`;
        const grouped = taskLogs.reduce((acc, t) => {
            if (!acc[t.sr]) acc[t.sr] = { sr: t.sr, date: t.srDate, asset: t.asset, items: [] };
            acc[t.sr].items.push(t);
            return acc;
        }, {});
        body.innerHTML = Object.keys(grouped).filter(k => k.includes(q) || grouped[k].asset.includes(q)).map(k => {
            const g = grouped[k];
            const avg = Math.round(g.items.reduce((s, i) => s + parseInt(i.progress || 0), 0) / g.items.length) || 0;
            let rows = `<tr onclick="toggleSR('${k}')" style="cursor:pointer; background: var(--brand-light);">
                <td style="font-weight:800; color:var(--brand);">${g.sr}</td>
                <td>${g.date}</td><td style="font-weight:700;">${g.asset}</td>
                <td>${g.items.length} Tasks</td><td style="font-weight:800; color:var(--brand);">${avg}%</td>
                <td><button onclick="deleteSR('${k}')" style="border:none; background:none; color:var(--danger);">&times;</button></td>
            </tr>`;
            if(expandedSR === k) {
                g.items.forEach(t => {
                    rows += `<tr style="background:var(--card-bg);">
                        <td colspan="2" style="padding-left:40px; font-size:11px; color:var(--text-muted);">${t.date || '-'}</td>
                        <td colspan="2"><input class="cell-editor" style="font-weight:600;" value="${t.details}" onblur="updateTask('${t.id}', 'details', this.value.toUpperCase())"></td>
                        <td><input type="number" class="cell-editor" style="width:60px;" value="${t.progress}" onblur="updateTask('${t.id}', 'progress', this.value)"></td>
                        <td><button onclick="deleteTask('${t.id}')" style="border:none; background:none; color:var(--text-muted);">&times;</button></td>
                    </tr>`;
                });
            }
            return rows;
        }).join('');

    } else if (currentPage === 'TRANS') {
        head.innerHTML = `<tr><th style="width:180px;">Time</th><th style="width:120px;">Ref</th><th>Action</th><th>Details</th><th>User</th></tr>`;
        body.innerHTML = transactionLogs.filter(t => t.prf?.includes(q)).map(t => `
            <tr><td style="font-size:11px; color:var(--text-muted);">${t.time}</td><td style="font-weight:800; color:var(--brand);">${t.prf}</td><td style="font-weight:700;">${t.action}</td><td style="font-style:italic;">${t.details}</td><td>${t.user}</td></tr>
        `).join('');
    }
};

// --- DATA HANDLERS ---
window.savePRF = () => {
    const p = document.getElementById('m-prf').value.toUpperCase(), a = document.getElementById('m-asset').value.toUpperCase(), w = document.getElementById('m-workshop').value;
    if(!p || !a) return alert("Required Fields Missing");
    push(ref(db, 'prf_logs'), { date: new Date().toLocaleDateString('en-GB'), prf: p, asset: a, workshop: w, status: 'PENDING', remarks: '' });
    closeModal();
};

window.saveYardEntry = () => {
    const slot = document.getElementById('y-slot').value.toUpperCase(), name = document.getElementById('y-vessel').value.toUpperCase(), owner = document.getElementById('y-owner').value.toUpperCase(), docked = document.getElementById('y-docked').value;
    if(!name || !docked) return alert("Missing Vessel/Date");
    push(ref(db, 'yard_logs'), { slot, name, owner, docked, status: 'Docked' });
    closeModal();
};

window.saveTaskEntry = () => {
    const sr = document.getElementById('t-sr').value.toUpperCase(), srDate = document.getElementById('t-sr-date').value, asset = document.getElementById('t-asset').value.toUpperCase();
    document.querySelectorAll('.task-input-row').forEach(row => {
        const d = row.querySelector('.t-row-date').value, dt = row.querySelector('.t-row-details').value.toUpperCase(), p = row.querySelector('.t-row-prog').value || 0;
        if(dt) push(ref(db, 'task_logs'), { sr, srDate, asset, date: d, details: dt, progress: p });
    });
    closeModal();
};

window.updateField = (id, field, val, prf) => {
    update(ref(db, `prf_logs/${id}`), { [field]: val });
    push(ref(db, 'transactions'), { time: new Date().toLocaleString(), user: auth.currentUser.email.split('@')[0].toUpperCase(), action: `Edit ${field}`, prf: prf, details: val.substring(0, 40) });
};

window.updateYard = (id, f, v) => update(ref(db, `yard_logs/${id}`), { [f]: v });
window.updateTask = (id, f, v) => update(ref(db, `task_logs/${id}`), { [f]: v });
window.deleteRow = (id) => confirm('Delete PRF?') && remove(ref(db, `prf_logs/${id}`));
window.deleteYard = (id) => confirm('Delete Vessel?') && remove(ref(db, `yard_logs/${id}`));
window.deleteTask = (id) => remove(ref(db, `task_logs/${id}`));
window.deleteSR = (sr) => confirm('Delete entire SR?') && taskLogs.filter(t => t.sr === sr).forEach(t => remove(ref(db, `task_logs/${t.id}`)));

// --- UI HELPERS ---
window.switchPage = (p) => { currentPage = p; expandedSR = null; refreshTable(); document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.id.includes(p.toLowerCase()))); document.getElementById('page-title').innerText = p.replace('DASH', 'PRF TRACKER').replace('TRANS', 'TRANSACTIONS').replace('YARD', 'BOAT YARD LOG').replace('TASKS', 'TASK MANAGER'); };
window.toggleSR = (sr) => { expandedSR = expandedSR === sr ? null : sr; refreshTable(); };
window.openModal = () => { 
    document.getElementById('entry-modal').style.display = 'flex'; 
    document.getElementById('prf-form').style.display = currentPage === 'DASH' ? 'block' : 'none';
    document.getElementById('yard-form').style.display = currentPage === 'YARD' ? 'block' : 'none';
    document.getElementById('task-form').style.display = currentPage === 'TASKS' ? 'block' : 'none';
    if(currentPage === 'TASKS') { document.getElementById('t-task-list').innerHTML = ''; addTaskRow(); }
};
window.closeModal = () => document.getElementById('entry-modal').style.display = 'none';
window.addTaskRow = () => {
    const div = document.createElement('div'); div.className = 'task-input-row'; div.style.cssText = "display:grid; grid-template-columns: 120px 1fr 60px 30px; gap:8px; margin-bottom:8px;";
    div.innerHTML = `<input type="date" class="cell-editor t-row-date" style="border:1px solid var(--border);"><textarea class="cell-editor t-row-details" style="border:1px solid var(--border);"></textarea><input type="number" class="cell-editor t-row-prog" placeholder="%" style="border:1px solid var(--border);"><button onclick="this.parentElement.remove()" style="border:none; background:none; color:var(--danger);">&times;</button>`;
    document.getElementById('t-task-list').appendChild(div);
};

// --- CORE ---
window.handleLogin = () => signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-pass').value).catch(e => alert("Auth Failed"));
window.handleLogout = () => signOut(auth);
window.toggleTheme = () => { const n = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; document.body.setAttribute('data-theme', n); localStorage.setItem('srd-theme', n); };

onAuthStateChanged(auth, user => {
    document.getElementById('auth-overlay').style.display = user ? 'none' : 'flex';
    if(user) {
        onValue(ref(db, 'prf_logs'), s => { logs = s.val() ? Object.keys(s.val()).map(k => ({id:k, ...s.val()[k]})) : []; refreshTable(); });
        onValue(ref(db, 'yard_logs'), s => { yardLogs = s.val() ? Object.keys(s.val()).map(k => ({id:k, ...s.val()[k]})) : []; refreshTable(); });
        onValue(ref(db, 'task_logs'), s => { taskLogs = s.val() ? Object.keys(s.val()).map(k => ({id:k, ...s.val()[k]})) : []; refreshTable(); });
        onValue(ref(db, 'transactions'), s => { transactionLogs = s.val() ? Object.values(s.val()).reverse() : []; refreshTable(); });
    }
});

// Init Theme
const st = localStorage.getItem('srd-theme') || 'light';
document.body.setAttribute('data-theme', st);
