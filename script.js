// --- UPDATED REFRESH TABLE LOGIC ---
window.refreshTable = () => {
    const q = document.getElementById('main-search').value.toUpperCase();
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');

    if (currentPage === 'YARD') {
        // Updated Header: Added SR # and WO #
        head.innerHTML = `<tr>
            <th style="width:80px;">Slot</th>
            <th>Asset Name</th>
            <th>Owner</th>
            <th style="width:100px;">SR #</th>
            <th style="width:100px;">WO #</th>
            <th style="width:110px;">Docked</th>
            <th style="width:110px;">Est. Undock</th>
            <th style="width:150px;">Status</th>
            <th style="width:80px;">Age</th>
            <th>Actual Undock</th>
            <th style="width:40px;"></th>
        </tr>`;

        const filtered = yardLogs.filter(l => {
            // Search now includes SR and WO numbers
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
                <td style="font-weight:800; color:var(--brand);"><input class="remarks-editor" value="${l.slot || ''}" onblur="updateYard('${l.id}', 'slot', this.value.toUpperCase())"></td>
                <td><input class="remarks-editor" value="${l.name || ''}" style="font-weight:700;" onblur="updateYard('${l.id}', 'name', this.value.toUpperCase())"></td>
                <td><input class="remarks-editor" value="${l.owner || ''}" onblur="updateYard('${l.id}', 'owner', this.value.toUpperCase())"></td>
                
                <td><input class="remarks-editor" value="${l.sr || ''}" onblur="updateYard('${l.id}', 'sr', this.value.toUpperCase())" placeholder="SR #"></td>
                <td><input class="remarks-editor" value="${l.wo || ''}" onblur="updateYard('${l.id}', 'wo', this.value.toUpperCase())" placeholder="WO #"></td>
                
                <td><input type="date" value="${l.docked || ''}" class="remarks-editor" onchange="updateYard('${l.id}', 'docked', this.value)"></td>
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
        
    } 
    // ... rest of your if/else logic for DASH, TRANS, TASKS remains unchanged
};

// --- UPDATED SAVE YARD ENTRY ---
window.saveYardEntry = () => {
    const s = document.getElementById('y-slot').value.toUpperCase();
    const v = document.getElementById('y-vessel').value.toUpperCase();
    const d = document.getElementById('y-docked').value;
    const sr = document.getElementById('y-sr').value.toUpperCase(); // Captured from updated HTML
    const wo = document.getElementById('y-wo').value.toUpperCase(); // Captured from updated HTML

    if(!s || !v || !d) return alert("Slot, Asset Name, and Docking Date are required");

    push(ref(db, 'yard_logs'), { 
        slot: s, 
        name: v, 
        owner: document.getElementById('y-owner').value.toUpperCase(), 
        sr: sr,
        wo: wo,
        docked: d, 
        estUndock: document.getElementById('y-est-undock').value, 
        status: 'Docked', 
        undocked: '' 
    });
    
    // Clear inputs for next time
    document.getElementById('y-sr').value = '';
    document.getElementById('y-wo').value = '';
    
    closeModal();
};

// --- UPDATED PDF EXPORT FOR YARD ---
// Update the data mapping inside exportPDF to include the new columns
// Find the 'YARD' section in your exportPDF function and update it:
/* if(currentPage === 'YARD') {
    head = [['SLOT', 'Asset Name', 'OWNER', 'SR #', 'WO #', 'DOCKED', 'EST. UNDOCK', 'STATUS']];
    data = yardLogs.filter(l => l.name?.toUpperCase().includes(q)).map(l => [
        l.slot, l.name, l.owner, l.sr || '', l.wo || '', l.docked, l.estUndock, l.status
    ]);
}
*/
