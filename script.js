/* ============================================
   نظام صكوك الأضاحي - صناع الحياة
   خطة المعارف والأثر | حملة الأضاحي 2026
   ============================================ */

// ============================================
// DATA STORE
// ============================================
let saks = [];
let sakTypes = [];
let systemSettings = {
    orgName: 'صناع الحياة',
    pageTitle: 'نظام صكوك الأضاحي',
    darkMode: false
};

let deleteTarget = { type: null, sakId: null, participantId: null };
let deleteModal = null;
let settingsModal = null;
let sakTypeModal = null;

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
    sakTypeModal = new bootstrap.Modal(document.getElementById('sakTypeModal'));

    loadAllData();
    setupListeners();
    updateUI();

    // Date display
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('ar-EG', options);
    document.getElementById('year').textContent = now.getFullYear();

    // Apply dark mode if set
    if (systemSettings.darkMode) {
        document.body.classList.add('dark-mode');
    }
});

// ============================================
// LOCAL STORAGE
// ============================================
function loadAllData() {
    try {
        const storedSaks = localStorage.getItem('hayatSaks_2026');
        if (storedSaks) saks = JSON.parse(storedSaks);

        const storedTypes = localStorage.getItem('hayatSakTypes_2026');
        if (storedTypes) {
            sakTypes = JSON.parse(storedTypes);
        } else {
            // Default sak types with default targets
            sakTypes = [
                { id: 'st1', name: 'صك جاموسي', defaultPrice: 13500, defaultTarget: 13500, intention: '', deliveryDate: '' },
                { id: 'st2', name: 'صك بقري', defaultPrice: 15000, defaultTarget: 15000, intention: '', deliveryDate: '' },
                { id: 'st3', name: 'صك ضاني', defaultPrice: 15000, defaultTarget: 15000, intention: '', deliveryDate: '' },
                { id: 'st4', name: 'صك الخير', defaultPrice: 11500, defaultTarget: 11500, intention: '', deliveryDate: '' },
                { id: 'st5', name: 'لحوم صدقات', defaultPrice: 400, defaultTarget: 400, intention: '', deliveryDate: '' }
            ];
            saveSakTypes();
        }

        const storedSettings = localStorage.getItem('hayatSettings_2026');
        if (storedSettings) {
            systemSettings = JSON.parse(storedSettings);
        } else {
            saveSystemSettingsData();
        }
    } catch(e) {
        console.error('Error loading data:', e);
        saks = [];
    }
}

function saveSaks() {
    try {
        localStorage.setItem('hayatSaks_2026', JSON.stringify(saks));
        return true;
    } catch(e) {
        showToast('خطأ في حفظ بيانات الصكوك', 'danger');
        return false;
    }
}

function saveSakTypes() {
    try {
        localStorage.setItem('hayatSakTypes_2026', JSON.stringify(sakTypes));
        return true;
    } catch(e) {
        showToast('خطأ في حفظ أنواع الصكوك', 'danger');
        return false;
    }
}

function saveSystemSettingsData() {
    try {
        localStorage.setItem('hayatSettings_2026', JSON.stringify(systemSettings));
        return true;
    } catch(e) {
        showToast('خطأ في حفظ الإعدادات', 'danger');
        return false;
    }
}

function generateId() {
    return 'ID-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupListeners() {
    // Ensure modals are properly initialized
    document.querySelectorAll('.modal').forEach(modalEl => {
        modalEl.addEventListener('shown.bs.modal', function () {
            // Force modal to front if needed
            this.style.zIndex = '1055';
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.style.zIndex = '1050';
        });
    });

    // Sak type dropdown auto-fill target and other fields
    document.getElementById('sakType').addEventListener('change', function() {
        const typeId = this.value;
        const type = sakTypes.find(t => t.id === typeId);
        if (type) {
            document.getElementById('sakTarget').value = type.defaultTarget || type.defaultPrice || 0;
            document.getElementById('sakIntention').value = type.intention || '';
            document.getElementById('sakDeliveryDate').value = type.deliveryDate || '';
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
    document.getElementById('btnPdf').addEventListener('click', exportPDF);

    // Delete confirmation
    document.getElementById('confirmDelete').addEventListener('click', executeDelete);
}

// ============================================
// CREATE SAK
// ============================================
function createSak() {
    const typeId = document.getElementById('sakType').value;
    const targetAmount = parseFloat(document.getElementById('sakTarget').value);
    const intention = document.getElementById('sakIntention').value.trim();
    const deliveryDate = document.getElementById('sakDeliveryDate').value;

    if (!typeId) { showToast('يرجى اختيار نوع الصك', 'warning'); return; }
    if (!targetAmount || targetAmount <= 0) { showToast('يرجى إدخال تارجت صحيح', 'warning'); return; }

    const type = sakTypes.find(t => t.id === typeId);
    if (!type) { showToast('نوع الصك غير موجود', 'danger'); return; }

    const sak = {
        id: generateId(),
        typeId: typeId,
        typeName: type.name,
        targetAmount: targetAmount,
        intention: intention || (type.intention || ''),
        deliveryDate: deliveryDate || (type.deliveryDate || ''),
        participants: [],
        createdAt: new Date().toISOString(),
        collapsed: false
    };

    saks.unshift(sak);

    if (saveSaks()) {
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
    const amount = parseFloat(document.getElementById('partAmount-' + sakId).value);
    const intention = document.getElementById('partIntention-' + sakId).value.trim();
    const deliveryDate = document.getElementById('partDeliveryDate-' + sakId).value;
    const notes = document.getElementById('partNotes-' + sakId).value.trim();

    if (!name) { showToast('يرجى إدخال اسم المساهم', 'warning'); return; }
    if (!amount || amount <= 0) { showToast('يرجى إدخال مبلغ صحيح', 'warning'); return; }

    sak.participants.push({
        id: generateId(),
        name: name,
        amount: amount,
        intention: intention || sak.intention || '',
        deliveryDate: deliveryDate || sak.deliveryDate || '',
        notes: notes,
        createdAt: new Date().toISOString()
    });

    if (saveSaks()) {
        document.getElementById('partName-' + sakId).value = '';
        document.getElementById('partAmount-' + sakId).value = '';
        document.getElementById('partIntention-' + sakId).value = '';
        document.getElementById('partDeliveryDate-' + sakId).value = '';
        document.getElementById('partNotes-' + sakId).value = '';
        updateUI();
        showToast('تم إضافة المساهمة بنجاح', 'success');
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
            saveSaks();
            updateUI();
            showToast('تم حذف الصك بنجاح', 'success');
        }
    } else if (deleteTarget.type === 'participant') {
        const sak = saks.find(s => s.id === deleteTarget.sakId);
        if (sak) {
            const idx = sak.participants.findIndex(p => p.id === deleteTarget.participantId);
            if (idx !== -1) {
                sak.participants.splice(idx, 1);
                saveSaks();
                updateUI();
                showToast('تم حذف المساهمة بنجاح', 'success');
            }
        }
    } else if (deleteTarget.type === 'sakType') {
        const idx = sakTypes.findIndex(t => t.id === deleteTarget.sakTypeId);
        if (idx !== -1) {
            // Check if any sak uses this type
            const used = saks.some(s => s.typeId === deleteTarget.sakTypeId);
            if (used) {
                showToast('لا يمكن الحذف: نوع الصك مستخدم في صكوك مسجلة', 'warning');
                deleteModal.hide();
                return;
            }
            sakTypes.splice(idx, 1);
            saveSakTypes();
            renderSakTypesList();
            populateSakTypeDropdown();
            showToast('تم حذف نوع الصك بنجاح', 'success');
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
        saveSaks();
        renderSaks();
    }
}

// ============================================
// RENDER
// ============================================
function updateUI() {
    populateSakTypeDropdown();
    renderSaks();
    updateStats();
    updateCampaignProgress();
    updateHeaderInfo();
}

function populateSakTypeDropdown() {
    const select = document.getElementById('sakType');
    const currentValue = select.value;
    select.innerHTML = '<option value="" disabled selected>اختر نوع الصك</option>';
    sakTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name + ' - ' + formatNumber(type.defaultPrice) + ' ج';
        select.appendChild(option);
    });
    if (currentValue && sakTypes.find(t => t.id === currentValue)) {
        select.value = currentValue;
    }
}

function updateHeaderInfo() {
    document.getElementById('orgNameDisplay').textContent = systemSettings.orgName || 'صناع الحياة';
    document.getElementById('headerTitle').textContent = systemSettings.pageTitle || 'نظام صكوك الأضاحي';
    document.getElementById('footerOrgName').textContent = systemSettings.orgName || 'صناع الحياة';
    document.getElementById('pageTitle').textContent = (systemSettings.pageTitle || 'نظام صكوك الأضاحي') + ' | ' + (systemSettings.orgName || 'صناع الحياة');
}

function renderSaks() {
    const container = document.getElementById('saksContainer');
    const search = document.getElementById('searchInput').value.toLowerCase().trim();

    let filtered = saks;
    if (search) {
        filtered = saks.filter(sak => {
            const type = sakTypes.find(t => t.id === sak.typeId);
            const typeName = type ? type.name.toLowerCase() : '';
            const matchSak = typeName.includes(search) ||
                           sak.intention.toLowerCase().includes(search);
            const matchParticipant = sak.participants.some(p => 
                p.name.toLowerCase().includes(search) || 
                p.intention.toLowerCase().includes(search)
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
    const type = sakTypes.find(t => t.id === sak.typeId);
    const typeName = type ? type.name : sak.typeName || 'صك غير معروف';

    const collected = sak.participants.reduce((sum, p) => sum + p.amount, 0);
    const remaining = sak.targetAmount - collected;
    const percent = sak.targetAmount > 0 ? Math.min((collected / sak.targetAmount) * 100, 100) : 0;

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
                        ${escapeHtml(typeName)}
                    </h3>
                    <div class="sak-meta">
                        ${sak.intention ? `<span><i class="uil uil-heart"></i> ${escapeHtml(sak.intention)}</span>` : ''}
                        ${sak.deliveryDate ? `<span><i class="uil uil-calendar-alt"></i> ${formatDate(sak.deliveryDate)}</span>` : ''}
                        <span><i class="uil uil-users-alt"></i> ${sak.participants.length} مساهم</span>
                        <span><i class="uil uil-clock"></i> ${formatDateTime(sak.createdAt)}</span>
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
                        <span>نسبة الإنجاز</span>
                        <span class="percent" style="color:${percentColor}">${percent.toFixed(1)}%</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar ${progressClass}" style="width: ${percent}%"></div>
                    </div>
                </div>
                <div class="amounts-grid">
                    <div class="amount-item amount-required">
                        <span class="amount-value">${formatNumber(sak.targetAmount)}</span>
                        <span class="amount-label">التارجت (ج.م)</span>
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
                    <input type="text" class="form-control form-control-sm" id="partName-${sak.id}" placeholder="الاسم *">
                </div>
                <div class="col-sm-2">
                    <input type="number" class="form-control form-control-sm" id="partAmount-${sak.id}" placeholder="المبلغ *" min="1">
                </div>
                <div class="col-sm-2">
                    <input type="text" class="form-control form-control-sm" id="partIntention-${sak.id}" placeholder="النية" value="${escapeHtml(sak.intention || '')}">
                </div>
                <div class="col-sm-2">
                    <input type="date" class="form-control form-control-sm" id="partDeliveryDate-${sak.id}" value="${sak.deliveryDate || ''}">
                </div>
                <div class="col-sm-2">
                    <input type="text" class="form-control form-control-sm" id="partNotes-${sak.id}" placeholder="ملاحظات">
                </div>
                <div class="col-sm-1">
                    <button class="btn btn-add-participant btn-sm w-100" onclick="addParticipant('${sak.id}')">
                        <i class="uil uil-plus"></i>
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
            <td class="fw-bold text-green">${formatNumber(p.amount)} ج.م</td>
            <td>${escapeHtml(p.intention || '-')}</td>
            <td>${p.deliveryDate ? formatDate(p.deliveryDate) : '-'}</td>
            <td><small class="text-muted">${formatDateTime(p.createdAt)}</small></td>
            <td><small class="text-muted">${escapeHtml(p.notes || '-')}</small></td>
            <td>
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
                        <th>المبلغ</th>
                        <th>النية</th>
                        <th>تاريخ التسليم</th>
                        <th>وقت التسجيل</th>
                        <th>ملاحظات</th>
                        <th style="width:50px"></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

// ============================================
// CAMPAIGN PROGRESS - SUM OF ALL SAK TARGETS
// ============================================
function updateCampaignProgress() {
    // Campaign target = sum of all sak targets
    const totalTarget = saks.reduce((sum, s) => sum + s.targetAmount, 0);
    const totalCollected = saks.reduce((sum, s) => sum + s.participants.reduce((pSum, p) => pSum + p.amount, 0), 0);
    const percent = totalTarget > 0 ? Math.min((totalCollected / totalTarget) * 100, 100) : 0;

    document.getElementById('campaignTargetDisplay').textContent = formatNumber(totalTarget);
    document.getElementById('campaignTarget').textContent = formatNumber(totalTarget);
    document.getElementById('campaignCollected').textContent = formatNumber(totalCollected);
    document.getElementById('campaignProgressBar').style.width = percent + '%';
}

// ============================================
// STATISTICS
// ============================================
function updateStats() {
    const totalSaks = saks.length;
    const totalRequired = saks.reduce((sum, s) => sum + s.targetAmount, 0);
    const totalCollected = saks.reduce((sum, s) => sum + s.participants.reduce((pSum, p) => pSum + p.amount, 0), 0);
    const totalRemaining = totalRequired - totalCollected;
    const percent = totalRequired > 0 ? ((totalCollected / totalRequired) * 100).toFixed(1) : '0.0';

    animateNumber('statSaks', totalSaks);
    animateNumber('statRequired', totalRequired);
    animateNumber('statCollected', totalCollected);
    animateNumber('statRemaining', Math.max(totalRemaining, 0));
    document.getElementById('statPercent').textContent = percent + '%';
}

function animateNumber(id, target) {
    const el = document.getElementById(id);
    const current = parseInt(el.textContent.replace(/,/g, '').replace('%', '')) || 0;
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
// SETTINGS
// ============================================
function openSettings() {
    document.getElementById('settingOrgName').value = systemSettings.orgName || '';
    document.getElementById('settingPageTitle').value = systemSettings.pageTitle || '';
    document.getElementById('settingDarkMode').checked = systemSettings.darkMode || false;

    renderSakTypesList();

    settingsModal.show();
}

function saveSystemSettings() {
    systemSettings.orgName = document.getElementById('settingOrgName').value.trim() || 'صناع الحياة';
    systemSettings.pageTitle = document.getElementById('settingPageTitle').value.trim() || 'نظام صكوك الأضاحي';
    systemSettings.darkMode = document.getElementById('settingDarkMode').checked;

    if (saveSystemSettingsData()) {
        if (systemSettings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        updateHeaderInfo();
        showToast('تم حفظ الإعدادات بنجاح', 'success');
    }
}

// ============================================
// SAK TYPES MANAGEMENT
// ============================================
function renderSakTypesList() {
    const container = document.getElementById('sakTypesList');
    if (sakTypes.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">لا توجد أنواع صكوك</p>';
        return;
    }

    container.innerHTML = sakTypes.map(type => `
        <div class="settings-item">
            <div class="settings-item-info">
                <div class="settings-item-name">${escapeHtml(type.name)}</div>
                <div class="settings-item-meta">
                    السعر: ${formatNumber(type.defaultPrice)} ج.م | 
                    التارجت: ${formatNumber(type.defaultTarget || type.defaultPrice)} ج.م
                    ${type.intention ? ' | النية: ' + escapeHtml(type.intention) : ''}
                    ${type.deliveryDate ? ' | التسليم: ' + formatDate(type.deliveryDate) : ''}
                </div>
            </div>
            <div class="settings-item-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="editSakType('${type.id}')">
                    <i class="uil uil-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteSakType('${type.id}')">
                    <i class="uil uil-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openAddSakTypeModal() {
    document.getElementById('sakTypeModalTitle').innerHTML = '<i class="uil uil-plus-circle me-2"></i> إضافة نوع صك';
    document.getElementById('editSakTypeId').value = '';
    document.getElementById('sakTypeName').value = '';
    document.getElementById('sakTypePrice').value = '';
    document.getElementById('sakTypeTarget').value = '';
    document.getElementById('sakTypeIntention').value = '';
    document.getElementById('sakTypeDeliveryDate').value = '';
    sakTypeModal.show();
}

function editSakType(typeId) {
    const type = sakTypes.find(t => t.id === typeId);
    if (!type) return;

    document.getElementById('sakTypeModalTitle').innerHTML = '<i class="uil uil-edit me-2"></i> تعديل نوع الصك';
    document.getElementById('editSakTypeId').value = typeId;
    document.getElementById('sakTypeName').value = type.name;
    document.getElementById('sakTypePrice').value = type.defaultPrice;
    document.getElementById('sakTypeTarget').value = type.defaultTarget || type.defaultPrice;
    document.getElementById('sakTypeIntention').value = type.intention || '';
    document.getElementById('sakTypeDeliveryDate').value = type.deliveryDate || '';
    sakTypeModal.show();
}

function saveSakType() {
    const id = document.getElementById('editSakTypeId').value;
    const name = document.getElementById('sakTypeName').value.trim();
    const price = parseFloat(document.getElementById('sakTypePrice').value);
    const target = parseFloat(document.getElementById('sakTypeTarget').value) || price;
    const intention = document.getElementById('sakTypeIntention').value.trim();
    const deliveryDate = document.getElementById('sakTypeDeliveryDate').value;

    if (!name) { showToast('يرجى إدخال اسم الصك', 'warning'); return; }
    if (!price || price < 0) { showToast('يرجى إدخال سعر صحيح', 'warning'); return; }

    if (id) {
        const type = sakTypes.find(t => t.id === id);
        if (type) {
            type.name = name;
            type.defaultPrice = price;
            type.defaultTarget = target;
            type.intention = intention;
            type.deliveryDate = deliveryDate;
        }
    } else {
        sakTypes.push({
            id: generateId(),
            name: name,
            defaultPrice: price,
            defaultTarget: target,
            intention: intention,
            deliveryDate: deliveryDate
        });
    }

    if (saveSakTypes()) {
        sakTypeModal.hide();
        renderSakTypesList();
        populateSakTypeDropdown();
        showToast(id ? 'تم تعديل نوع الصك بنجاح' : 'تم إضافة نوع الصك بنجاح', 'success');
    }
}

function confirmDeleteSakType(typeId) {
    deleteTarget = { type: 'sakType', sakTypeId: typeId };
    document.getElementById('deleteMessage').textContent = 'سيتم حذف نوع الصك نهائياً';
    deleteModal.show();
}

// ============================================
// EXPORT EXCEL
// ============================================
function exportExcel() {
    if (saks.length === 0) {
        showToast('لا توجد بيانات للتصدير', 'warning');
        return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const totalRequired = saks.reduce((sum, s) => sum + s.targetAmount, 0);
    const totalCollected = saks.reduce((sum, s) => sum + s.participants.reduce((pSum, p) => pSum + p.amount, 0), 0);
    const totalRemaining = Math.max(totalRequired - totalCollected, 0);
    const totalParticipants = saks.reduce((sum, s) => sum + s.participants.length, 0);
    const percent = totalRequired > 0 ? ((totalCollected / totalRequired) * 100).toFixed(1) + '%' : '0%';

    const summaryRows = [
        [systemSettings.orgName + ' | ' + systemSettings.pageTitle, '', '', '', '', ''],
        ['حملة الأضاحي 2026', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['ملخص الحملة', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['إجمالي التارجت', 'إجمالي المجمع', 'إجمالي المتبقي', 'نسبة الإنجاز', 'عدد الصكوك', 'عدد المساهمين'],
        [totalRequired, totalCollected, totalRemaining, percent, saks.length, totalParticipants]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
    wsSummary['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص الحملة');

    // Sheet 2: Sak Details
    const sakRows = [
        ['تفاصيل الصكوك', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['نوع الصك', 'النية', 'تاريخ التسليم', 'التارجت', 'المجمع', 'المتبقي', 'نسبة الإنجاز', 'عدد المساهمين']
    ];

    saks.forEach(sak => {
        const type = sakTypes.find(t => t.id === sak.typeId);
        const typeName = type ? type.name : sak.typeName || 'غير معروف';
        const collected = sak.participants.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(sak.targetAmount - collected, 0);
        const pct = sak.targetAmount > 0 ? ((collected / sak.targetAmount) * 100).toFixed(1) + '%' : '0%';
        sakRows.push([
            typeName,
            sak.intention || '',
            sak.deliveryDate || '',
            sak.targetAmount,
            collected,
            remaining,
            pct,
            sak.participants.length
        ]);
    });

    const wsSaks = XLSX.utils.aoa_to_sheet(sakRows);
    wsSaks['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    wsSaks['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
    XLSX.utils.book_append_sheet(wb, wsSaks, 'تفاصيل الصكوك');

    // Sheet 3: Participants
    const partRows = [
        ['تفاصيل المساهمين', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['نوع الصك', 'اسم المساهم', 'المبلغ', 'النية', 'تاريخ التسليم', 'ملاحظات', 'تاريخ التسجيل']
    ];

    saks.forEach(sak => {
        const type = sakTypes.find(t => t.id === sak.typeId);
        const typeName = type ? type.name : sak.typeName || 'غير معروف';
        if (sak.participants.length === 0) {
            partRows.push([typeName, '(لا يوجد مساهمين)', '', '', '', '', '']);
        } else {
            sak.participants.forEach(p => {
                partRows.push([
                    typeName,
                    p.name,
                    p.amount,
                    p.intention || '-',
                    p.deliveryDate || '-',
                    p.notes || '-',
                    new Date(p.createdAt).toLocaleString('ar-EG')
                ]);
            });
        }
    });

    const wsParts = XLSX.utils.aoa_to_sheet(partRows);
    wsParts['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 22 }];
    wsParts['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    XLSX.utils.book_append_sheet(wb, wsParts, 'تفاصيل المساهمين');

    XLSX.writeFile(wb, 'حملة-الأضاحي-2026-' + new Date().toISOString().split('T')[0] + '.xlsx');
    showToast('تم تصدير Excel بنجاح', 'success');
}

// ============================================
// EXPORT PDF
// ============================================
function exportPDF() {
    if (saks.length === 0) {
        showToast('لا توجد بيانات للتصدير', 'warning');
        return;
    }

    const element = document.querySelector('.main-container');
    const opt = {
        margin: [10, 10, 10, 10],
        filename: 'حملة-الأضاحي-2026-' + new Date().toISOString().split('T')[0] + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Temporarily hide buttons for clean PDF
    const buttons = document.querySelectorAll('.btn, .btn-sak-action, .participant-form, .search-section, .create-section, .export-section');
    buttons.forEach(b => b.style.display = 'none');

    html2pdf().set(opt).from(element).save().then(() => {
        buttons.forEach(b => b.style.display = '');
        showToast('تم تصدير PDF بنجاح', 'success');
    }).catch(() => {
        buttons.forEach(b => b.style.display = '');
        showToast('خطأ في تصدير PDF', 'danger');
    });
}

// ============================================
// BACKUP & RESTORE
// ============================================
function exportBackup() {
    const backup = {
        version: '2.1',
        campaign: 'حملة الأضاحي 2026',
        org: systemSettings.orgName,
        date: new Date().toISOString(),
        data: {
            saks: saks,
            sakTypes: sakTypes,
            settings: systemSettings
        }
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'نسخة-احتياطية-حملة-الأضاحي-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('تم تصدير النسخة الاحتياطية', 'success');
}

function importBackup(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const backup = JSON.parse(ev.target.result);
            let data = backup.data || backup;

            if (confirm('استيراد البيانات؟ سيتم استبدال البيانات الحالية.')) {
                if (data.saks) saks = data.saks;
                if (data.sakTypes) sakTypes = data.sakTypes;
                if (data.settings) systemSettings = data.settings;

                saveSaks();
                saveSakTypes();
                saveSystemSettingsData();

                if (systemSettings.darkMode) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }

                updateUI();
                showToast('تم استيراد البيانات بنجاح', 'success');
            }
        } catch(err) { 
            showToast('خطأ في قراءة الملف', 'danger'); 
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function resetAllData() {
    if (confirm('هل أنت متأكد من إعادة ضبط جميع البيانات؟ سيتم حذف كل شيء نهائياً!')) {
        saks = [];
        sakTypes = [];
        systemSettings = {
            orgName: 'صناع الحياة',
            pageTitle: 'نظام صكوك الأضاحي',
            darkMode: false
        };

        saveSaks();
        saveSakTypes();
        saveSystemSettingsData();

        document.body.classList.remove('dark-mode');
        updateUI();
        showToast('تم إعادة ضبط البيانات', 'success');
        settingsModal.hide();
    }
}

// ============================================
// UTILITIES
// ============================================
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString('en-US');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch(e) { return dateStr; }
}

function formatDateTime(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch(e) { return iso; }
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
