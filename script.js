/* ============================================
   خطة المعارف والأثر | حملة الأضاحي 2026
   صناع الحياة - نظام إدارة صكوك الأضاحي
   ============================================ */

// ============================================
// CONFIGURATION
// ============================================
const CAMPAIGN_TARGET = 200000;

const SAK_TYPES = {
    'صك جاموسي': { name: 'صك جاموسي', defaultAmount: 13500 },
    'صك بقري': { name: 'صك بقري', defaultAmount: 15000 },
    'صك ضاني': { name: 'صك ضاني', defaultAmount: 15000 },
    'صك الخير': { name: 'صك الخير', defaultAmount: 11500 },
    'لحوم صدقات': { name: 'لحوم صدقات', defaultAmount: 400, unit: 'كيلو' }
};

const ALLIANCES = ['تحالف 1', 'تحالف 2', 'تحالف 3', 'تحالف 4', 'تحالف 5'];

// ============================================
// DATA STORE
// ============================================
let saks = [];
let deleteTarget = { type: null, sakId: null, participantId: null };
let deleteModal = null;
let editModal = null;

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    editModal = new bootstrap.Modal(document.getElementById('editParticipantModal'));

    loadData();
    setupListeners();
    updateUI();

    // Date
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('ar-EG', options);
    document.getElementById('year').textContent = now.getFullYear();
    document.getElementById('campaignTarget').textContent = formatNumber(CAMPAIGN_TARGET);
    document.getElementById('campaignTargetDisplay').textContent = formatNumber(CAMPAIGN_TARGET);
});

// ============================================
// EVENT LISTENERS
// ============================================
function setupListeners() {
    // Sak type dropdown auto-fill amount
    document.getElementById('sakType').addEventListener('change', function() {
        const type = this.value;
        if (SAK_TYPES[type]) {
            document.getElementById('sakAmount').value = SAK_TYPES[type].defaultAmount;
        }
    });

    // Create sak form
    document.getElementById('createSakForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createSak();
    });

    // Search
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');

    searchInput.addEventListener('input', function() {
        clearBtn.style.display = this.value ? 'flex' : 'none';
        renderSaks();
    });

    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        renderSaks();
    });

    // Export buttons
    document.getElementById('btnPrint').addEventListener('click', () => window.print());
    document.getElementById('btnExcel').addEventListener('click', exportExcel);
    document.getElementById('btnBackup').addEventListener('click', exportBackup);
    document.getElementById('btnRestore').addEventListener('change', importBackup);

    // Delete confirmation
    document.getElementById('confirmDelete').addEventListener('click', executeDelete);

    // Amount input - numbers only
    document.getElementById('sakAmount').addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    // Edit modal phone
    document.getElementById('editPartPhone').addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 11);
    });
}

// ============================================
// LOCAL STORAGE
// ============================================
function loadData() {
    try {
        const stored = localStorage.getItem('hayatSakData_2026');
        if (stored) saks = JSON.parse(stored);
    } catch(e) { saks = []; }
}

function saveData() {
    try {
        localStorage.setItem('hayatSakData_2026', JSON.stringify(saks));
        return true;
    } catch(e) {
        showToast('خطأ في حفظ البيانات', 'danger');
        return false;
    }
}

function generateId() {
    return 'SAK-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

// ============================================
// CREATE SAK
// ============================================
function createSak() {
    const type = document.getElementById('sakType').value;
    const amount = parseFloat(document.getElementById('sakAmount').value);
    const alliance = document.getElementById('sakAlliance').value;
    const notes = document.getElementById('sakNotes').value.trim();

    if (!type) { showToast('يرجى اختيار نوع الصك', 'warning'); return; }
    if (!amount || amount <= 0) { showToast('يرجى إدخال مبلغ صحيح', 'warning'); return; }
    if (!alliance) { showToast('يرجى اختيار التحالف', 'warning'); return; }

    const sak = {
        id: generateId(),
        type: type,
        name: SAK_TYPES[type] ? SAK_TYPES[type].name : type,
        requiredAmount: amount,
        alliance: alliance,
        notes: notes,
        participants: [],
        createdAt: new Date().toISOString(),
        collapsed: false
    };

    saks.unshift(sak);

    if (saveData()) {
        document.getElementById('createSakForm').reset();
        updateUI();
        showToast('تم إنشاء الصك بنجاح', 'success');
    }
}

// ============================================
// ADD PARTICIPANT
// ============================================
function addParticipant(sakId) {
    const sak = saks.find(s => s.id === sakId);
    if (!sak) return;

    const name = document.getElementById('partName-' + sakId).value.trim();
    const phone = document.getElementById('partPhone-' + sakId).value.trim();
    const amount = parseFloat(document.getElementById('partAmount-' + sakId).value);
    const notes = document.getElementById('partNotes-' + sakId).value.trim();

    if (!name) { showToast('يرجى إدخال اسم المساهم', 'warning'); return; }
    if (!amount || amount <= 0) { showToast('يرجى إدخال مبلغ صحيح', 'warning'); return; }

    sak.participants.push({
        id: generateId(),
        name: name,
        phone: phone,
        amount: amount,
        notes: notes,
        createdAt: new Date().toISOString()
    });

    if (saveData()) {
        document.getElementById('partName-' + sakId).value = '';
        document.getElementById('partPhone-' + sakId).value = '';
        document.getElementById('partAmount-' + sakId).value = '';
        document.getElementById('partNotes-' + sakId).value = '';
        updateUI();
        showToast('تم إضافة المساهمة بنجاح', 'success');
    }
}

// ============================================
// EDIT PARTICIPANT
// ============================================
function editParticipant(sakId, participantId) {
    const sak = saks.find(s => s.id === sakId);
    if (!sak) return;
    const p = sak.participants.find(x => x.id === participantId);
    if (!p) return;

    document.getElementById('editSakId').value = sakId;
    document.getElementById('editParticipantId').value = participantId;
    document.getElementById('editPartName').value = p.name;
    document.getElementById('editPartPhone').value = p.phone || '';
    document.getElementById('editPartAmount').value = p.amount;
    document.getElementById('editPartNotes').value = p.notes || '';

    editModal.show();
}

function saveEditParticipant() {
    const sakId = document.getElementById('editSakId').value;
    const participantId = document.getElementById('editParticipantId').value;

    const sak = saks.find(s => s.id === sakId);
    if (!sak) return;
    const p = sak.participants.find(x => x.id === participantId);
    if (!p) return;

    const name = document.getElementById('editPartName').value.trim();
    const amount = parseFloat(document.getElementById('editPartAmount').value);

    if (!name) { showToast('يرجى إدخال الاسم', 'warning'); return; }
    if (!amount || amount <= 0) { showToast('يرجى إدخال مبلغ صحيح', 'warning'); return; }

    p.name = name;
    p.phone = document.getElementById('editPartPhone').value.trim();
    p.amount = amount;
    p.notes = document.getElementById('editPartNotes').value.trim();

    if (saveData()) {
        editModal.hide();
        updateUI();
        showToast('تم تحديث المساهمة بنجاح', 'success');
    }
}

// ============================================
// DELETE
// ============================================
function confirmDeleteSak(sakId) {
    deleteTarget = { type: 'sak', sakId: sakId };
    document.getElementById('deleteMessage').textContent = 'سيتم حذف الصك وجميع المساهمين نهائياً';
    deleteModal.show();
}

function confirmDeleteParticipant(sakId, participantId) {
    deleteTarget = { type: 'participant', sakId: sakId, participantId: participantId };
    document.getElementById('deleteMessage').textContent = 'سيتم حذف المساهمة نهائياً';
    deleteModal.show();
}

function executeDelete() {
    if (deleteTarget.type === 'sak') {
        const idx = saks.findIndex(s => s.id === deleteTarget.sakId);
        if (idx !== -1) {
            saks.splice(idx, 1);
            saveData();
            updateUI();
            showToast('تم حذف الصك بنجاح', 'success');
        }
    } else if (deleteTarget.type === 'participant') {
        const sak = saks.find(s => s.id === deleteTarget.sakId);
        if (sak) {
            const idx = sak.participants.findIndex(p => p.id === deleteTarget.participantId);
            if (idx !== -1) {
                sak.participants.splice(idx, 1);
                saveData();
                updateUI();
                showToast('تم حذف المساهمة بنجاح', 'success');
            }
        }
    }
    deleteModal.hide();
}

// ============================================
// TOGGLE COLLAPSE
// ============================================
function toggleSak(sakId) {
    const sak = saks.find(s => s.id === sakId);
    if (sak) {
        sak.collapsed = !sak.collapsed;
        saveData();
        renderSaks();
    }
}

// ============================================
// RENDER
// ============================================
function updateUI() {
    renderSaks();
    updateStats();
    renderAlliances();
    updateCampaignProgress();
}

function renderSaks() {
    const container = document.getElementById('saksContainer');
    const search = document.getElementById('searchInput').value.toLowerCase().trim();

    let filtered = saks;
    if (search) {
        filtered = saks.filter(sak => {
            const matchSak = sak.name.toLowerCase().includes(search) ||
                           sak.alliance.toLowerCase().includes(search) ||
                           sak.type.toLowerCase().includes(search);
            const matchParticipant = sak.participants.some(p => 
                p.name.toLowerCase().includes(search) || 
                p.phone.includes(search)
            );
            return matchSak || matchParticipant;
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="uil uil-clipboard-blank"></i></div>
                <h4>${saks.length === 0 ? 'لا توجد صكوك مسجلة' : 'لا توجد نتائج'}</h4>
                <p class="text-muted">${saks.length === 0 ? 'استخدم النموذج أعلاه لإنشاء أول صك' : 'جرب البحث بكلمات مختلفة'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(sak => renderSakCard(sak)).join('');
}

function renderSakCard(sak) {
    const collected = sak.participants.reduce((sum, p) => sum + p.amount, 0);
    const remaining = sak.requiredAmount - collected;
    const percent = sak.requiredAmount > 0 ? Math.min((collected / sak.requiredAmount) * 100, 100) : 0;

    let progressClass = 'low';
    if (percent >= 100) progressClass = 'complete';
    else if (percent >= 60) progressClass = 'near';

    const percentColor = percent >= 100 ? 'var(--green)' : percent >= 60 ? 'var(--yellow)' : 'var(--red)';

    const participantsHtml = sak.collapsed ? '' : renderParticipantsSection(sak);
    const toggleIcon = sak.collapsed ? 'uil-angle-down' : 'uil-angle-up';
    const toggleText = sak.collapsed ? 'عرض' : 'إخفاء';

    return `
        <div class="sak-card" id="sak-${sak.id}">
            <div class="sak-header">
                <div class="sak-info">
                    <h3 class="sak-name">
                        <i class="uil uil-award"></i>
                        ${escapeHtml(sak.name)}
                        <span class="badge-alliance">${escapeHtml(sak.alliance)}</span>
                    </h3>
                    <div class="sak-meta">
                        <span><i class="uil uil-tag"></i> ${escapeHtml(sak.type)}</span>
                        <span><i class="uil uil-calendar-alt"></i> ${formatDate(sak.createdAt)}</span>
                        <span><i class="uil uil-users-alt"></i> ${sak.participants.length} مساهم</span>
                        ${sak.notes ? `<span><i class="uil uil-notes"></i> ${escapeHtml(sak.notes)}</span>` : ''}
                    </div>
                </div>
                <div class="sak-actions">
                    <button class="btn-sak-action btn-toggle" onclick="toggleSak('${sak.id}')" title="${toggleText}">
                        <i class="uil ${toggleIcon}"></i>
                    </button>
                    <button class="btn-sak-action btn-delete-sak" onclick="confirmDeleteSak('${sak.id}')" title="حذف">
                        <i class="uil uil-trash-alt"></i>
                    </button>
                </div>
            </div>
            <div class="sak-body">
                <div class="sak-progress">
                    <div class="progress-label">
                        <span>نسبة الاكتمال</span>
                        <span class="percent" style="color:${percentColor}">${percent.toFixed(1)}%</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar ${progressClass}" style="width: ${percent}%"></div>
                    </div>
                </div>
                <div class="amounts-grid">
                    <div class="amount-item amount-required">
                        <span class="amount-value">${formatNumber(sak.requiredAmount)}</span>
                        <span class="amount-label">المطلوب (ج.م)</span>
                    </div>
                    <div class="amount-item amount-collected">
                        <span class="amount-value">${formatNumber(collected)}</span>
                        <span class="amount-label">المجمع (ج.م)</span>
                    </div>
                    <div class="amount-item amount-remaining">
                        <span class="amount-value">${formatNumber(Math.max(remaining, 0))}</span>
                        <span class="amount-label">المتبقي (ج.م)</span>
                    </div>
                </div>
                ${participantsHtml}
            </div>
        </div>
    `;
}

function renderParticipantsSection(sak) {
    const formHtml = `
        <div class="participant-form">
            <div class="participant-form-title">
                <i class="uil uil-user-plus"></i> إضافة مساهمة جديدة
            </div>
            <div class="row g-2">
                <div class="col-sm-3">
                    <input type="text" class="form-control form-control-sm" id="partName-${sak.id}" placeholder="اسم الشخص *">
                </div>
                <div class="col-sm-2">
                    <input type="tel" class="form-control form-control-sm" id="partPhone-${sak.id}" placeholder="رقم الهاتف" maxlength="11">
                </div>
                <div class="col-sm-2">
                    <input type="number" class="form-control form-control-sm" id="partAmount-${sak.id}" placeholder="المبلغ *" min="1">
                </div>
                <div class="col-sm-3">
                    <input type="text" class="form-control form-control-sm" id="partNotes-${sak.id}" placeholder="ملاحظات">
                </div>
                <div class="col-sm-2">
                    <button class="btn btn-add-participant btn-sm w-100" onclick="addParticipant('${sak.id}')">
                        <i class="uil uil-plus"></i> إضافة
                    </button>
                </div>
            </div>
        </div>
    `;

    if (sak.participants.length === 0) {
        return formHtml + `
            <div class="participant-empty">
                <i class="uil uil-users-alt"></i>
                <p class="mb-0">لا توجد مساهمات بعد. أضف أول مساهمة أعلاه.</p>
            </div>
        `;
    }

    const rows = sak.participants.map((p, idx) => `
        <tr>
            <td><strong>${escapeHtml(p.name)}</strong></td>
            <td dir="ltr">${p.phone || '-'}</td>
            <td class="fw-bold text-green">${formatNumber(p.amount)} ج.م</td>
            <td><small class="text-muted">${formatDateTime(p.createdAt)}</small></td>
            <td><small class="text-muted">${escapeHtml(p.notes || '-')}</small></td>
            <td>
                <button class="btn-edit-participant" onclick="editParticipant('${sak.id}', '${p.id}')" title="تعديل">
                    <i class="uil uil-edit"></i>
                </button>
                <button class="btn-delete-participant" onclick="confirmDeleteParticipant('${sak.id}', '${p.id}')" title="حذف">
                    <i class="uil uil-trash-alt"></i>
                </button>
            </td>
        </tr>
    `).join('');

    return formHtml + `
        <div class="table-responsive">
            <table class="table participants-table">
                <thead>
                    <tr>
                        <th>الاسم</th>
                        <th>الهاتف</th>
                        <th>المبلغ</th>
                        <th>الوقت</th>
                        <th>ملاحظات</th>
                        <th style="width:70px"></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

// ============================================
// ALLIANCES
// ============================================
function renderAlliances() {
    const container = document.getElementById('alliancesContainer');
    if (saks.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">لا توجد صكوك مسجلة</p>';
        return;
    }

    const allianceData = {};
    ALLIANCES.forEach(a => {
        allianceData[a] = { required: 0, collected: 0, count: 0, participants: 0 };
    });

    saks.forEach(sak => {
        if (allianceData[sak.alliance]) {
            const collected = sak.participants.reduce((sum, p) => sum + p.amount, 0);
            allianceData[sak.alliance].required += sak.requiredAmount;
            allianceData[sak.alliance].collected += collected;
            allianceData[sak.alliance].count += 1;
            allianceData[sak.alliance].participants += sak.participants.length;
        }
    });

    const activeAlliances = Object.entries(allianceData).filter(([_, d]) => d.count > 0);

    if (activeAlliances.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">لا توجد تحالفات نشطة</p>';
        return;
    }

    container.innerHTML = `<div class="alliance-grid">
        ${activeAlliances.map(([name, data]) => {
            const percent = data.required > 0 ? Math.min((data.collected / data.required) * 100, 100) : 0;
            let barColor = 'bg-danger';
            if (percent >= 100) barColor = 'bg-success';
            else if (percent >= 60) barColor = 'bg-warning';

            return `
                <div class="alliance-card">
                    <div class="alliance-name">
                        <i class="uil uil-users-alt"></i>
                        ${escapeHtml(name)}
                    </div>
                    <div class="alliance-stats">
                        <div class="alliance-stat">
                            <span class="value" style="color:#c2185b">${formatNumber(data.required)}</span>
                            <span class="label">المطلوب</span>
                        </div>
                        <div class="alliance-stat">
                            <span class="value" style="color:var(--green)">${formatNumber(data.collected)}</span>
                            <span class="label">المجمع</span>
                        </div>
                        <div class="alliance-stat">
                            <span class="value" style="color:#e65100">${formatNumber(Math.max(data.required - data.collected, 0))}</span>
                            <span class="label">المتبقي</span>
                        </div>
                        <div class="alliance-stat">
                            <span class="value" style="color:#1565c0">${data.participants}</span>
                            <span class="label">المساهمين</span>
                        </div>
                    </div>
                    <div class="alliance-progress">
                        <div class="progress">
                            <div class="progress-bar ${barColor}" style="width: ${percent}%"></div>
                        </div>
                        <small class="text-muted">${percent.toFixed(1)}% - ${data.count} صك</small>
                    </div>
                </div>
            `;
        }).join('')}
    </div>`;
}

// ============================================
// CAMPAIGN PROGRESS
// ============================================
function updateCampaignProgress() {
    const totalCollected = saks.reduce((sum, s) => sum + s.participants.reduce((pSum, p) => pSum + p.amount, 0), 0);
    const percent = Math.min((totalCollected / CAMPAIGN_TARGET) * 100, 100);

    document.getElementById('campaignCollected').textContent = formatNumber(totalCollected);
    document.getElementById('campaignProgressBar').style.width = percent + '%';
}

// ============================================
// STATISTICS
// ============================================
function updateStats() {
    const totalSaks = saks.length;
    const totalRequired = saks.reduce((sum, s) => sum + s.requiredAmount, 0);
    const totalCollected = saks.reduce((sum, s) => sum + s.participants.reduce((pSum, p) => pSum + p.amount, 0), 0);
    const totalRemaining = totalRequired - totalCollected;
    const totalParticipants = saks.reduce((sum, s) => sum + s.participants.length, 0);

    animateNumber('statSaks', totalSaks);
    animateNumber('statRequired', totalRequired);
    animateNumber('statCollected', totalCollected);
    animateNumber('statRemaining', Math.max(totalRemaining, 0));
    animateNumber('statParticipants', totalParticipants);
}

function animateNumber(id, target) {
    const el = document.getElementById(id);
    const current = parseInt(el.textContent.replace(/,/g, '')) || 0;
    if (current === target) return;

    const duration = 600;
    const start = performance.now();

    function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = formatNumber(Math.round(current + (target - current) * eased));
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ============================================
// EXPORT EXCEL - Professional
// ============================================
function exportExcel() {
    if (saks.length === 0) {
        showToast('لا توجد بيانات للتصدير', 'warning');
        return;
    }

    const wb = XLSX.utils.book_new();

    // ====== SHEET 1: ملخص الحملة ======
    const totalRequired = saks.reduce((sum, s) => sum + s.requiredAmount, 0);
    const totalCollected = saks.reduce((sum, s) => sum + s.participants.reduce((pSum, p) => pSum + p.amount, 0), 0);
    const totalRemaining = Math.max(totalRequired - totalCollected, 0);
    const totalParticipants = saks.reduce((sum, s) => sum + s.participants.length, 0);
    const campaignPercent = CAMPAIGN_TARGET > 0 ? ((totalCollected / CAMPAIGN_TARGET) * 100).toFixed(1) + '%' : '0%';

    const summaryRows = [
        ['خطة المعارف والأثر | حملة الأضاحي 2026', '', '', '', '', '', ''],
        ['صناع الحياة', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['ملخص الحملة', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['التارجت الكلي', 'المطلوب', 'المجمع', 'المتبقي', 'نسبة التارجت', 'عدد الصكوك', 'عدد المساهمين'],
        [CAMPAIGN_TARGET, totalRequired, totalCollected, totalRemaining, campaignPercent, saks.length, totalParticipants],
        ['', '', '', '', '', '', ''],
        ['ملخص التحالفات', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['التحالف', 'المطلوب', 'المجمع', 'المتبقي', 'عدد الصكوك', 'عدد المساهمين', 'نسبة الاكتمال']
    ];

    const allianceData = {};
    ALLIANCES.forEach(a => allianceData[a] = { required: 0, collected: 0, count: 0, participants: 0 });
    saks.forEach(sak => {
        if (allianceData[sak.alliance]) {
            const collected = sak.participants.reduce((sum, p) => sum + p.amount, 0);
            allianceData[sak.alliance].required += sak.requiredAmount;
            allianceData[sak.alliance].collected += collected;
            allianceData[sak.alliance].count += 1;
            allianceData[sak.alliance].participants += sak.participants.length;
        }
    });

    Object.entries(allianceData).filter(([_, d]) => d.count > 0).forEach(([name, data]) => {
        const pct = data.required > 0 ? ((data.collected / data.required) * 100).toFixed(1) + '%' : '0%';
        summaryRows.push([name, data.required, data.collected, Math.max(data.required - data.collected, 0), data.count, data.participants, pct]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    wsSummary['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
        { s: { r: 8, c: 0 }, e: { r: 8, c: 6 } }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص الحملة');

    // ====== SHEET 2: تفاصيل الصكوك ======
    const sakRows = [
        ['تفاصيل الصكوك', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['رقم الصك', 'نوع الصك', 'التحالف', 'المطلوب', 'المجمع', 'المتبقي', 'نسبة الاكتمال', 'عدد المساهمين']
    ];

    saks.forEach(sak => {
        const collected = sak.participants.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(sak.requiredAmount - collected, 0);
        const percent = sak.requiredAmount > 0 ? ((collected / sak.requiredAmount) * 100).toFixed(1) + '%' : '0%';
        sakRows.push([sak.id, sak.name, sak.alliance, sak.requiredAmount, collected, remaining, percent, sak.participants.length]);
    });

    const wsSaks = XLSX.utils.aoa_to_sheet(sakRows);
    wsSaks['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    wsSaks['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
    XLSX.utils.book_append_sheet(wb, wsSaks, 'تفاصيل الصكوك');

    // ====== SHEET 3: تفاصيل المساهمين ======
    const partRows = [
        ['تفاصيل المساهمين', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['نوع الصك', 'التحالف', 'اسم المساهم', 'رقم الهاتف', 'المبلغ', 'ملاحظات', 'تاريخ التسجيل']
    ];

    saks.forEach(sak => {
        if (sak.participants.length === 0) {
            partRows.push([sak.name, sak.alliance, '(لا يوجد مساهمين)', '', '', '', '']);
        } else {
            sak.participants.forEach(p => {
                partRows.push([
                    sak.name,
                    sak.alliance,
                    p.name,
                    p.phone || '-',
                    p.amount,
                    p.notes || '-',
                    new Date(p.createdAt).toLocaleString('ar-EG')
                ]);
            });
        }
    });

    const wsParts = XLSX.utils.aoa_to_sheet(partRows);
    wsParts['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 22 }];
    wsParts['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    XLSX.utils.book_append_sheet(wb, wsParts, 'تفاصيل المساهمين');

    // ====== Apply styling ======
    applyExcelStyling(wb);

    XLSX.writeFile(wb, 'حملة-الأضاحي-2026-صناع-الحياة-' + new Date().toISOString().split('T')[0] + '.xlsx');
    showToast('تم تصدير Excel بنجاح', 'success');
}

function applyExcelStyling(wb) {
    const darkGreen = { fgColor: { rgb: '0D4F3C' } };
    const green = { fgColor: { rgb: '1A6B4F' } };
    const gold = { fgColor: { rgb: 'C9A84C' } };
    const lightGreen = { fgColor: { rgb: 'E8F5F0' } };
    const white = { fgColor: { rgb: 'FFFFFF' } };

    wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        const range = XLSX.utils.decode_range(ws['!ref']);

        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellAddress];
                if (!cell) continue;
                if (!cell.s) cell.s = {};

                // Title rows (0, 1)
                if (R === 0) {
                    cell.s.font = { bold: true, sz: 16, color: { rgb: 'FFFFFF' } };
                    cell.s.fill = darkGreen;
                    cell.s.alignment = { horizontal: 'center', vertical: 'center' };
                } else if (R === 1) {
                    cell.s.font = { sz: 12, color: { rgb: 'FFFFFF' } };
                    cell.s.fill = green;
                    cell.s.alignment = { horizontal: 'center' };
                }
                // Section headers
                else if ((R === 3 || R === 8) && sheetName === 'ملخص الحملة') {
                    cell.s.font = { bold: true, sz: 13, color: { rgb: '0D4F3C' } };
                    cell.s.fill = lightGreen;
                    cell.s.alignment = { horizontal: 'center', vertical: 'center' };
                }
                else if (R === 0 && sheetName !== 'ملخص الحملة') {
                    cell.s.font = { bold: true, sz: 14, color: { rgb: 'FFFFFF' } };
                    cell.s.fill = darkGreen;
                    cell.s.alignment = { horizontal: 'center', vertical: 'center' };
                }
                // Table headers
                else if ((R === 5 || R === 10) && sheetName === 'ملخص الحملة') {
                    cell.s.font = { bold: true, sz: 11, color: { rgb: 'FFFFFF' } };
                    cell.s.fill = darkGreen;
                    cell.s.alignment = { horizontal: 'center', vertical: 'center' };
                    cell.s.border = {
                        top: { style: 'thin', color: { rgb: '0D4F3C' } },
                        bottom: { style: 'thin', color: { rgb: '0D4F3C' } },
                        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
                        right: { style: 'thin', color: { rgb: 'CCCCCC' } }
                    };
                }
                else if (R === 2 && sheetName !== 'ملخص الحملة') {
                    cell.s.font = { bold: true, sz: 11, color: { rgb: 'FFFFFF' } };
                    cell.s.fill = darkGreen;
                    cell.s.alignment = { horizontal: 'center', vertical: 'center' };
                    cell.s.border = {
                        top: { style: 'thin', color: { rgb: '0D4F3C' } },
                        bottom: { style: 'thin', color: { rgb: '0D4F3C' } },
                        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
                        right: { style: 'thin', color: { rgb: 'CCCCCC' } }
                    };
                }
                // Data rows
                else if (R > 5 || (sheetName !== 'ملخص الحملة' && R > 2)) {
                    if (R % 2 === 0) cell.s.fill = { fgColor: { rgb: 'F8FAF9' } };
                    cell.s.border = {
                        top: { style: 'thin', color: { rgb: 'E0E6E3' } },
                        bottom: { style: 'thin', color: { rgb: 'E0E6E3' } },
                        left: { style: 'thin', color: { rgb: 'E0E6E3' } },
                        right: { style: 'thin', color: { rgb: 'E0E6E3' } }
                    };

                    // Number formatting
                    const headerRow = sheetName === 'ملخص الحملة' ? (R > 10 ? 10 : 5) : 2;
                    const headerCell = ws[XLSX.utils.encode_cell({ r: headerRow, c: C })];
                    if (headerCell && headerCell.v) {
                        const text = String(headerCell.v);
                        if (text.includes('مبلغ') || text.includes('المتبقي') || text.includes('المطلوب') || text === 'المجمع') {
                            cell.s.numFmt = '#,##0';
                            cell.s.alignment = { horizontal: 'center' };
                        }
                        if (text.includes('نسبة') || text.includes('اكتمال')) {
                            cell.s.alignment = { horizontal: 'center' };
                        }
                    }

                    // Color remaining
                    if (sheetName === 'ملخص الحملة' && R === 6 && C === 3 && typeof cell.v === 'number' && cell.v > 0) {
                        cell.s.font = { color: { rgb: 'E65100' }, bold: true };
                    }
                    // Color campaign percent
                    if (sheetName === 'ملخص الحملة' && R === 6 && C === 4 && typeof cell.v === 'string') {
                        const pct = parseFloat(cell.v);
                        if (pct >= 100) cell.s.font = { color: { rgb: '155724' }, bold: true };
                        else if (pct >= 60) cell.s.font = { color: { rgb: '856404' }, bold: true };
                        else cell.s.font = { color: { rgb: '721C24' }, bold: true };
                    }
                }
                // Total row in campaign summary
                if (sheetName === 'ملخص الحملة' && R === 6) {
                    cell.s.font = { bold: true, sz: 11, color: { rgb: 'FFFFFF' } };
                    cell.s.fill = green;
                    cell.s.alignment = { horizontal: 'center' };
                    cell.s.border = {
                        top: { style: 'medium', color: { rgb: '0D4F3C' } },
                        bottom: { style: 'medium', color: { rgb: '0D4F3C' } }
                    };
                }
            }
        }

        if (!ws['!rows']) ws['!rows'] = [];
        ws['!rows'][0] = { hpt: 35 };
        ws['!rows'][1] = { hpt: 28 };
        if (sheetName === 'ملخص الحملة') {
            ws['!rows'][3] = { hpt: 28 };
            ws['!rows'][5] = { hpt: 25 };
            ws['!rows'][8] = { hpt: 28 };
            ws['!rows'][10] = { hpt: 25 };
        } else {
            ws['!rows'][2] = { hpt: 25 };
        }
    });
}

// ============================================
// BACKUP & RESTORE
// ============================================
function exportBackup() {
    if (saks.length === 0) { showToast('لا توجد بيانات', 'warning'); return; }
    const backup = { version: '1.0', campaign: 'حملة الأضاحي 2026', org: 'صناع الحياة', date: new Date().toISOString(), data: saks };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'حملة-الأضاحي-2026-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('تم تصدير النسخة الاحتياطية', 'success');
}

function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const backup = JSON.parse(ev.target.result);
            if (backup.data && Array.isArray(backup.data)) {
                if (confirm('استيراد ' + backup.data.length + ' صك؟ سيتم استبدال البيانات الحالية.')) {
                    saks = backup.data;
                    saveData();
                    updateUI();
                    showToast('تم استيراد البيانات بنجاح', 'success');
                }
            } else { showToast('ملف غير صالح', 'danger'); }
        } catch(err) { showToast('خطأ في قراءة الملف', 'danger'); }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ============================================
// UTILITIES
// ============================================
function formatNumber(num) {
    return num.toLocaleString('en-US');
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(iso) {
    return new Date(iso).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// TOAST
// ============================================
function showToast(message, type) {
    const container = document.getElementById('toastContainer');
    const id = 'toast-' + Date.now();

    const icons = {
        success: 'uil-check-circle',
        danger: 'uil-exclamation-triangle',
        warning: 'uil-exclamation-octagon',
        info: 'uil-info-circle'
    };
    const colors = {
        success: 'bg-success',
        danger: 'bg-danger',
        warning: 'bg-warning text-dark',
        info: 'bg-info'
    };
    const titles = {
        success: 'نجاح',
        danger: 'خطأ',
        warning: 'تحذير',
        info: 'معلومة'
    };

    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="toast custom-toast" data-bs-delay="3000">
            <div class="toast-header ${colors[type]} text-white">
                <i class="uil ${icons[type]} me-2"></i>
                <strong class="me-auto">${titles[type]}</strong>
                <button class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">${message}</div>
        </div>
    `);

    const el = document.getElementById(id);
    const toast = new bootstrap.Toast(el);
    toast.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
}
