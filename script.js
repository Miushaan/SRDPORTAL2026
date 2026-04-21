import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

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

let logs = [], yardLogs = [], transactionLogs = [], taskLogs = [];
let currentPage = 'DASH';
const YARD_STATUS = ['Docked', 'Undocked'];

// --- UI Navigation ---
window.switchPage = (page) => {
    currentPage = page;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    const titles = { 'DASH': 'PRF Tracker', 'YARD': 'Boat Yard Log', 'TASKS': 'Task Manager', 'TRANS': 'Transactions' };
    document.getElementById('page-title').innerText = titles[page];
    document.getElementById('search-input').value = '';
    
    refreshTable();
};

window.openModal = () => {
    document.getElementById('dash-form').style.display = 'none';
    document.getElementById('yard-form').style.display = 'none';
    document.getElementById('task-form').style.display = 'none';

    if (currentPage === 'DASH') {
        document.getElementById('modal-title').innerText = "New PRF Entry";
        document.getElementById('dash-form').style.display = 'block';
    } else if (currentPage === 'YARD') {
        document.getElementById('modal-title').innerText = "Register Vessel";
        document.getElementById('yard-form').style.display = 'block';
    } else if (currentPage === 'TASKS') {
        document.getElementById('modal-title').innerText = "New Task/Service Request";
        document.getElementById('task-form').style.display = 'block';
        document.getElementById('t-task-list').innerHTML = ''; // Clear old rows
        addTaskRow(); // Add default row
    } else {
        alert("Cannot add manual entries to this view.");
        return;
    }
    document.getElementById('entry-modal').style.display = 'flex';
};

window.closeModal = () => {
    document.getElementById('entry-modal').style.display = 'none';
};

// --- Task Row Management ---
window.addTaskRow = () => {
    const div = document.createElement('div');
    div.className = 'task-input-row';
    div.style.cssText = 'display:flex; gap:8px; margin-bottom:8px;';
    div.innerHTML = `
        <input type="text" class="t-row-details remarks-editor" placeholder="Task Detail..." style="flex:2; border:1px solid var(--border); border-radius:6px; padding:8px;">
        <input type="date" class="t-row-date remarks-editor" style="flex:1; border:1px solid var(--border); border-radius:6px; padding:8px;">
        <input type="number" class="t-row-prog remarks-editor" placeholder="%" min="0" max="100" style="width:60px; border:1px solid var(--border); border-radius:6px; padding:8px;">
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:var(--danger); cursor:pointer; font-weight:bold;">&times;</button>
    `;
    document.getElementById('t-task-list').appendChild(div);
};

// --- Firebase Listeners ---
onValue(ref(db, 'logs'), (snapshot) => { logs = []; snapshot.forEach(c => { logs.push({ id: c.key, ...c.val() }) }); refreshTable(); });
onValue(ref(db, 'yard_logs'), (snapshot) => { yardLogs = []; snapshot.forEach(c => { yardLogs.push({ id: c.key, ...c.val() }) }); refreshTable(); });
onValue(ref(db, 'task_logs'), (snapshot) => { taskLogs = []; snapshot.forEach(c => { taskLogs.push({ id: c.key, ...c.val() }) }); refreshTable(); });
onValue(ref(db, 'transactions'), (snapshot) => { transactionLogs = []; snapshot.forEach(c => { transactionLogs.push({ id: c.key, ...c.val() }) }); refreshTable(); });

// --- Save Functions ---
window.saveDashEntry = () => {
    const prf = document.getElementById('d-prf').value.toUpperCase();
    if(!prf) return alert("PRF Required");
    push(ref(db, 'logs'), {
        date: new Date().toISOString().split('T')[0],
        prf: prf,
        asset: document.getElementById('d-asset').value.toUpperCase(),
        workshop: document.getElementById('d-workshop').value.toUpperCase(),
        status: 'PENDING'
    });
    closeModal();
};

window.saveYardEntry = () => {
    const s = document.getElementById('y-slot').value, 
          v = document.getElementById('y-vessel').value, 
          d = document.getElementById('y-docked').value;
    if(!s || !v || !d) return alert("Required: Slot, Asset, and Dock Date");

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

window.saveTaskEntry = () => {
    const sr = document.getElementById('t-sr').value.toUpperCase();
    const wo = document.getElementById('t-wo').value.toUpperCase();
    const asset = document.getElementById('t-asset').value.toUpperCase();

    if(!sr || !wo || !asset) return alert("SR, WO, and Asset are required.");

    const taskRows = document.querySelectorAll('.task-input-row');
    taskRows.forEach(row => {
        const details = row.querySelector('.t-row-details').value.trim();
        if (details !== '') {
            push(ref(db, 'task_logs'), {
                sr: sr,
                srDate: document.getElementById('t-sr-date').value,
                wo: wo,
                asset: asset,
                date: row.querySelector('.t-row-date').value,
                details: details.toUpperCase(),
                progress: row.querySelector('.t-row-prog').value || 0,
                status: 'PLANNED',
                comments: ''
            });
        }
    });
    closeModal();
};

// --- Update & Delete Logic ---
window.updateYard = (id, field, value) => {
    update(ref(db, `yard_logs/${id}`), { [field]: value });
};

window.deleteYard = (id) => {
    if(confirm("Delete this yard entry?")) remove(ref(db, `yard_logs/${id}`));
};

// --- Main Table Render Logic ---
window.refreshTable = () => {
    const q = document.getElementById('search-input').value.toUpperCase();
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    
    if (currentPage === 'DASH') {
        head.innerHTML = `<tr><th>Date</th><th>PRF #</th><th>Asset Name</th><th>Workshop</th><th>Status</th></tr>`;
        body.innerHTML = logs.filter(l => l.prf?.toUpperCase().includes(q) || l.asset?.toUpperCase().includes(q)).map(l => `
            <tr>
                <td>${l.date}</td>
                <td style="font-weight:700;">${l.prf}</td>
                <td>${l.asset}</td>
                <td>${l.workshop}</td>
                <td>${l.status}</td>
            </tr>
        `).join('');
        
    } else if (currentPage === 'YARD') {
        head.innerHTML = `<tr><th style="width:80px;">Slot</th><th style="width:120px;">Ref (SR/WO)</th><th>Asset Name</th><th>Owner</th><th style="width:110px;">Docked</th><th style="width:150px;">Status</th><th style="width:80px;">Age</th><th style="width:40px;"></th></tr>`;
        
        body.innerHTML = yardLogs.filter(l => l.name?.toUpperCase().includes(q) || l.sr?.toUpperCase().includes(q) || l.wo?.toUpperCase().includes(q) || l.slot?.toUpperCase().includes(q)).map(l => {
            const start = new Date(l.docked);
            const end = (l.undocked && l.status === 'Undocked') ? new Date(l.undocked) : new Date();
            const age = Math.floor((end - start) / (1000 * 60 * 60 * 24)) || 0;
            
            return `<tr>
                <td style="font-weight:800; color:var(--brand);"><input class="remarks-editor" value="${l.slot}" onblur="updateYard('${l.id}', 'slot', this.value)"></td>
                <td>
                    <div style="font-weight:800; color:var(--brand); font-size:11px;">${l.sr || '-'}</div>
                    <div style="color:var(--text-muted); font-size:10px;">${l.wo || '-'}</div>
                </td>
                <td><input class="remarks-editor" value="${l.name}" style="font-weight:700;" onblur="updateYard('${l.id}', 'name', this.value)"></td>
                <td><input class="remarks-editor" value="${l.owner || ''}" onblur="updateYard('${l.id}', 'owner', this.value)"></td>
                <td><input type="date" value="${l.docked}" class="remarks-editor" onchange="updateYard('${l.id}', 'docked', this.value)"></td>
                <td>
                    <select class="status-select ${l.status === 'Docked' ? 's-Docked' : 's-Undocked'}" onchange="updateYard('${l.id}', 'status', this.value)">
                        ${YARD_STATUS.map(o => `<option ${l.status==o?'selected':''}>${o}</option>`).join('')}
                    </select>
                </td>
                <td><span class="age-badge">${age}D</span></td>
                <td><button onclick="deleteYard('${l.id}')" style="background:none; border:none; color:var(--danger); font-size:18px; cursor:pointer;">&times;</button></td>
            </tr>`;
        }).join('');

    } else if (currentPage === 'TASKS') {
        head.innerHTML = `<tr><th>SR #</th><th>WO #</th><th>Asset / Service</th><th>Task Date</th><th>Task Details</th><th>Status</th><th>Prog %</th></tr>`;
        body.innerHTML = taskLogs.filter(t => t.sr?.toUpperCase().includes(q) || t.wo?.toUpperCase().includes(q) || t.asset?.toUpperCase().includes(q)).map(t => `
            <tr>
                <td style="font-weight:700; color:var(--brand);">${t.sr}</td>
                <td style="color:var(--text-muted);">${t.wo || '-'}</td>
                <td style="font-weight:700;">${t.asset}</td>
                <td>${t.date || '-'}</td>
                <td>${t.details}</td>
                <td>${t.status}</td>
                <td><span class="age-badge">${t.progress}%</span></td>
            </tr>
        `).join('');

    } else if (currentPage === 'TRANS') {
        head.innerHTML = `<tr><th>Timestamp</th><th>Reference</th><th>Action</th><th>Details</th><th>User</th></tr>`;
        body.innerHTML = transactionLogs.filter(a => a.prf?.toUpperCase().includes(q)).map(a => `
            <tr>
                <td>${a.time}</td>
                <td style="font-weight:700;">${a.prf}</td>
                <td><span class="age-badge">${a.action}</span></td>
                <td>${a.details}</td>
                <td>${a.user}</td>
            </tr>
        `).join('');
    }
};

// Initial Render
refreshTable();