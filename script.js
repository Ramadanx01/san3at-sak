/* ============================================
   صناع الحياة - نظام إدارة صكوك الأضاحي
   Complete JavaScript Application
   ============================================ */

// ============================================
// DATA STORE
// ============================================
let saks = [];
let deleteTarget = { type: null, sakId: null, participantId: null };
let deleteModal = null;

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    loadData();
    setupListeners();
    updateUI();

    // Date
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('ar-EG', options);
    document.getElementById('year').textContent = now.getFullYear();
});

// ============================================
// EVENT LISTENERS
// ============================================
function setupListeners() {
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
}

// ============================================
// LOCAL STORAGE
// ============================================
function loadData() {
    try {
        const stored = localStorage.getItem('san3atSakData');
        if (stored) saks = JSON.parse(stored);
    } catch(e) { saks = []; }
}

function saveData() {
    try {
        localStorage.setItem('san3atSakData', JSON.stringify(saks));
        return true;
    } catch(e) {
        showToast('خطأ في حفظ البيانات', 'danger');
        return false;
    }
}

function generateId() {
    return Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

// ============================================
// CREATE SAK
// ============================================
function createSak() {
    const name = document.getElementById('sakName').value.trim();
    const amount = parseFloat(document.getElementById('sakAmount').value);
    const notes = document.getElementById('sakNotes').value.trim();

    if (!name) {
        showToast('يرجى إدخال اسم الصك', 'warning');
        return;
    }
    if (!amount || amount <= 0) {
        showToast('يرجى إدخال مبلغ صحيح', 'warning');
        return;
    }

    const sak = {
        id: generateId(),
        name: name,
        requiredAmount: amount,
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

    const nameInput = document.getElementById('partName-' + sakId);
    const phoneInput = document.getElementById('partPhone-' + sakId);
    const amountInput = document.getElementById('partAmount-' + sakId);
    const notesInput = document.getElementById('partNotes-' + sakId);

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const notes = notesInput.value.trim();

    if (!name) {
        showToast('يرجى إدخال اسم المشارك', 'warning');
        return;
    }
    if (!amount || amount <= 0) {
        showToast('يرجى إدخال مبلغ صحيح', 'warning');
        return;
    }

    const participant = {
        id: generateId(),
        name: name,
        phone: phone,
        amount: amount,
        notes: notes,
        createdAt: new Date().toISOString()
    };

    sak.participants.push(participant);

    if (saveData()) {
        nameInput.value = '';
        phoneInput.value = '';
        amountInput.value = '';
        notesInput.value = '';
        updateUI();
        showToast('تم إضافة المساهمة بنجاح', 'success');
    }
}

// ============================================
// DELETE
// ============================================
function confirmDeleteSak(sakId) {
    deleteTarget = { type: 'sak', sakId: sakId };
    document.getElementById('deleteMessage').textContent = 'سيتم حذف الصك وجميع المشاركين نهائياً';
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
}

function renderSaks() {
    const container = document.getElementById('saksContainer');
    const search = document.getElementById('searchInput').value.toLowerCase().trim();

    let filtered = saks;
    if (search) {
        filtered = saks.filter(sak => {
            const matchSak = sak.name.toLowerCase().includes(search);
            const matchParticipant = sak.participants.some(p => 
                p.name.toLowerCase().includes(search) || 
                p.phone.includes(search)
            );
            return matchSak || matchParticipant;
        });
    }

    if (filtered.length === 0) {
        if (saks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="uil uil-clipboard-blank"></i></div>
                    <h4>لا توجد صكوك مسجلة</h4>
                    <p class="text-muted">استخدم النموذج أعلاه لإنشاء أول صك</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="uil uil-search"></i></div>
                    <h4>لا توجد نتائج</h4>
                    <p class="text-muted">جرب البحث بكلمات مختلفة</p>
                </div>
            `;
        }
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

    const participantsHtml = sak.collapsed ? '' : renderParticipantsTable(sak);
    const toggleIcon = sak.collapsed ? 'uil-angle-down' : 'uil-angle-up';
    const toggleText = sak.collapsed ? 'عرض' : 'إخفاء';

    return `
        <div class="sak-card" id="sak-${sak.id}">
            <div class="sak-header">
                <div class="sak-info">
                    <h3 class="sak-name">
                        <i class="uil uil-award"></i>
                        ${escapeHtml(sak.name)}
                    </h3>
                    <div class="sak-meta">
                        <span><i class="uil uil-calendar-alt"></i> ${formatDate(sak.createdAt)}</span>
                        <span><i class="uil uil-users-alt"></i> ${sak.participants.length} مشارك</span>
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
                <!-- Progress -->
                <div class="sak-progress">
                    <div class="progress-label">
                        <span>نسبة الاكتمال</span>
                        <span class="percent" style="color:${percentColor}">${percent.toFixed(1)}%</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar ${progressClass}" style="width: ${percent}%"></div>
                    </div>
                </div>

                <!-- Amounts -->
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

function renderParticipantsTable(sak) {
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
                        <th style="width:40px"></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
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
        const value = Math.round(current + (target - current) * eased);
        el.textContent = formatNumber(value);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ============================================
// EXPORT
// ============================================
function exportExcel() {
    if (saks.length === 0) {
        showToast('لا توجد بيانات للتصدير', 'warning');
        return;
    }

    const wb = XLSX.utils.book_new();

    // ====== SHEET 1: ملخص الصكوك ======
    const summaryRows = [];
    summaryRows.push(['نظام إدارة صكوك الأضاحي - صناع الحياة', '', '', '', '', '']);
    summaryRows.push(['تاريخ التقرير:', new Date().toLocaleDateString('ar-EG'), '', '', '', '']);
    summaryRows.push(['', '', '', '', '', '']);
    summaryRows.push(['ملخص الصكوك', '', '', '', '', '']);
    summaryRows.push(['', '', '', '', '', '']);
    summaryRows.push(['اسم الصك', 'المبلغ المطلوب', 'المبلغ المجمع', 'المتبقي', 'نسبة الاكتمال', 'عدد المشاركين']);

    let totalRequired = 0;
    let totalCollected = 0;
    let totalParticipants = 0;

    saks.forEach(sak => {
        const collected = sak.participants.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(sak.requiredAmount - collected, 0);
        const percent = sak.requiredAmount > 0 ? ((collected / sak.requiredAmount) * 100).toFixed(1) + '%' : '0%';
        totalRequired += sak.requiredAmount;
        totalCollected += collected;
        totalParticipants += sak.participants.length;

        summaryRows.push([
            sak.name,
            sak.requiredAmount,
            collected,
            remaining,
            percent,
            sak.participants.length
        ]);
    });

    summaryRows.push(['', '', '', '', '', '']);
    summaryRows.push(['الإجمالي', totalRequired, totalCollected, Math.max(totalRequired - totalCollected, 0), '', totalParticipants]);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

    // Styling for summary sheet
    wsSummary['!cols'] = [
        { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 18 }
    ];

    // Merge title cells
    wsSummary['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } }
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص الصكوك');

    // ====== SHEET 2: تفاصيل المشاركين ======
    const detailRows = [];
    detailRows.push(['تفاصيل المشاركين', '', '', '', '', '']);
    detailRows.push(['', '', '', '', '', '']);
    detailRows.push(['اسم الصك', 'اسم المشارك', 'رقم الهاتف', 'المبلغ المدفوع', 'ملاحظات', 'تاريخ التسجيل']);

    saks.forEach(sak => {
        if (sak.participants.length === 0) {
            detailRows.push([sak.name, '(لا يوجد مشاركين)', '', '', '', '']);
        } else {
            sak.participants.forEach(p => {
                detailRows.push([
                    sak.name,
                    p.name,
                    p.phone || '-',
                    p.amount,
                    p.notes || '-',
                    new Date(p.createdAt).toLocaleString('ar-EG')
                ]);
            });
        }
    });

    const wsDetails = XLSX.utils.aoa_to_sheet(detailRows);
    wsDetails['!cols'] = [
        { wch: 22 }, { wch: 20 }, { wch: 15 }, { wch: 16 }, { wch: 22 }, { wch: 22 }
    ];
    wsDetails['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }
    ];

    XLSX.utils.book_append_sheet(wb, wsDetails, 'تفاصيل المشاركين');

    // ====== Apply colors and styling ======
    applyExcelStyling(wb);

    XLSX.writeFile(wb, 'صكوك-الأضاحي-صناع-الحياة-' + new Date().toISOString().split('T')[0] + '.xlsx');
    showToast('تم تصدير Excel بنجاح', 'success');
}

function applyExcelStyling(wb) {
    // Green colors
    const darkGreen = { fgColor: { rgb: '0D4F3C' } };
    const lightGreen = { fgColor: { rgb: 'E8F5F0' } };
    const white = { fgColor: { rgb: 'FFFFFF' } };
    const gold = { fgColor: { rgb: 'C9A84C' } };
    const yellowSoft = { fgColor: { rgb: 'FFF3CD' } };
    const redSoft = { fgColor: { rgb: 'F8D7DA' } };
    const greenSoft = { fgColor: { rgb: 'D4EDDA' } };

    wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        const range = XLSX.utils.decode_range(ws['!ref']);

        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellAddress];
                if (!cell) continue;

                if (!cell.s) cell.s = {};

                // Title row (row 0)
                if (R === 0) {
                    cell.s.font = { bold: true, sz: 16, color: { rgb: 'FFFFFF' } };
                    cell.s.fill = darkGreen;
                    cell.s.alignment = { horizontal: 'center', vertical: 'center' };
                }
                // Date row (row 1)
                else if (R === 1) {
                    cell.s.font = { sz: 11, color: { rgb: '666666' } };
                    cell.s.alignment = { horizontal: 'center' };
                }
                // Section title (row 3 or 0 in details)
                else if ((sheetName === 'ملخص الصكوك' && R === 3) || (sheetName === 'تفاصيل المشاركين' && R === 0)) {
                    cell.s.font = { bold: true, sz: 14, color: { rgb: '0D4F3C' } };
                    cell.s.fill = lightGreen;
                    cell.s.alignment = { horizontal: 'center', vertical: 'center' };
                }
                // Header row
                else if ((sheetName === 'ملخص الصكوك' && R === 5) || (sheetName === 'تفاصيل المشاركين' && R === 2)) {
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
                else if (R > 5 || (sheetName === 'تفاصيل المشاركين' && R > 2)) {
                    // Alternating row colors
                    if (R % 2 === 0) {
                        cell.s.fill = { fgColor: { rgb: 'F8FAF9' } };
                    }

                    cell.s.border = {
                        top: { style: 'thin', color: { rgb: 'E0E6E3' } },
                        bottom: { style: 'thin', color: { rgb: 'E0E6E3' } },
                        left: { style: 'thin', color: { rgb: 'E0E6E3' } },
                        right: { style: 'thin', color: { rgb: 'E0E6E3' } }
                    };

                    // Number formatting for amount columns
                    const headerRow = sheetName === 'ملخص الصكوك' ? 5 : 2;
                    const headerCell = ws[XLSX.utils.encode_cell({ r: headerRow, c: C })];
                    if (headerCell && headerCell.v) {
                        const headerText = String(headerCell.v);
                        if (headerText.includes('مبلغ') || headerText.includes('المتبقي') || headerText === 'المبلغ المدفوع') {
                            cell.s.numFmt = '#,##0';
                            cell.s.alignment = { horizontal: 'center' };
                        }
                        if (headerText.includes('نسبة')) {
                            cell.s.alignment = { horizontal: 'center' };
                        }
                    }

                    // Color remaining amount cells
                    if (sheetName === 'ملخص الصكوك' && C === 3 && typeof cell.v === 'number' && cell.v > 0) {
                        cell.s.font = { color: { rgb: 'E65100' }, bold: true };
                    }
                    // Color completion percentage
                    if (sheetName === 'ملخص الصكوك' && C === 4 && typeof cell.v === 'string') {
                        const pct = parseFloat(cell.v);
                        if (pct >= 100) cell.s.font = { color: { rgb: '155724' }, bold: true };
                        else if (pct >= 60) cell.s.font = { color: { rgb: '856404' }, bold: true };
                        else cell.s.font = { color: { rgb: '721C24' }, bold: true };
                    }
                }
                // Total row (last row in summary)
                if (sheetName === 'ملخص الصكوك' && R === range.e.r && R > 5) {
                    cell.s.font = { bold: true, sz: 11, color: { rgb: 'FFFFFF' } };
                    cell.s.fill = { fgColor: { rgb: '1A6B4F' } };
                    cell.s.alignment = { horizontal: 'center' };
                    cell.s.border = {
                        top: { style: 'medium', color: { rgb: '0D4F3C' } },
                        bottom: { style: 'medium', color: { rgb: '0D4F3C' } }
                    };
                }
            }
        }

        // Set row heights
        if (!ws['!rows']) ws['!rows'] = [];
        ws['!rows'][0] = { hpt: 35 };
        if (sheetName === 'ملخص الصكوك') {
            ws['!rows'][3] = { hpt: 28 };
            ws['!rows'][5] = { hpt: 25 };
        } else {
            ws['!rows'][0] = { hpt: 28 };
            ws['!rows'][2] = { hpt: 25 };
        }
    });
}

function exportBackup() {
    if (saks.length === 0) {
        showToast('لا توجد بيانات', 'warning');
        return;
    }
    const backup = { version: '1.0', date: new Date().toISOString(), data: saks };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'san3at-sak-backup-' + new Date().toISOString().split('T')[0] + '.json';
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
            } else {
                showToast('ملف غير صالح', 'danger');
            }
        } catch(err) {
            showToast('خطأ في قراءة الملف', 'danger');
        }
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