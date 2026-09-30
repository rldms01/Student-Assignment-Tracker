/*
 * Assignment Tracker
 * Everything is saved in this browser's localStorage. Nothing is ever sent anywhere.
 */
'use strict';

// ============================================================
// Settings
// ============================================================

const STORAGE_KEY = 'assignmentTracker.v2';
const OLD_STORAGE_KEY = 'assignmentTracker.v1'; // before classes existed; moved into "My Class"

// The order a status button cycles through. '' means "not marked yet".
const STATUS_ORDER = ['', 'done', 'late', 'absent'];
const STATUS_LABELS = { '': 'Not marked', done: 'Done', late: 'Late', absent: 'Absent' };

// Small line icons. This markup is fixed here and never built from typed text.
const ICONS = {
  done: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  late: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  absent: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/></svg>',
};

// ============================================================
// App state
// ============================================================

// store = {
//   currentClassId,
//   classes: [{
//     id, name, createdAt, sample?,
//     students:    [{ id, name, sample? }],
//     assignments: [{ id, name, date: 'YYYY-MM-DD', createdAt, sample? }],
//     marks:       { [assignmentId]: { [studentId]: 'done' | 'late' | 'absent' } }
//   }]
// }
let store = { classes: [], currentClassId: null };
let data = null; // the class that's open right now (one of store.classes)
let currentView = 'assignments';
let currentAssignmentId = null; // assignment shown on the Assignments tab
let currentStudentId = null; // student whose summary is open (null = the list)
let editingAssignmentId = null; // null while the form is adding a new assignment
let classFormMode = null; // 'new', 'rename', or 'copy' while the class form is open
let toastTimer = null;

const $ = (id) => document.getElementById(id);
const el = {
  tabs: $('tabs'),
  tabAssignments: $('tab-assignments'),
  tabStudents: $('tab-students'),
  tabOverview: $('tab-overview'),
  viewAssignments: $('view-assignments'),
  viewStudents: $('view-students'),
  viewOverview: $('view-overview'),
  classContent: $('class-content'),
  sampleBanner: $('sample-banner'),
  removeSampleBtn: $('remove-sample-btn'),

  classBar: $('class-bar'),
  classSelect: $('class-select'),
  renameClassBtn: $('rename-class-btn'),
  copyClassBtn: $('copy-class-btn'),
  deleteClassBtn: $('delete-class-btn'),
  newClassBtn: $('new-class-btn'),
  classForm: $('class-form'),
  classFormTitle: $('class-form-title'),
  classFormIntro: $('class-form-intro'),
  className: $('class-name'),
  copyOptions: $('copy-options'),
  copySourceName: $('copy-source-name'),
  copyStudents: $('copy-students'),
  copyAssignments: $('copy-assignments'),
  classCancel: $('class-cancel'),

  newAssignmentBtn: $('new-assignment-btn'),
  assignmentForm: $('assignment-form'),
  assignmentFormTitle: $('assignment-form-title'),
  assignmentName: $('assignment-name'),
  assignmentDate: $('assignment-date'),
  assignmentCancel: $('assignment-cancel'),
  getStarted: $('get-started'),
  noAssignments: $('no-assignments'),
  assignmentArea: $('assignment-area'),
  assignmentSelect: $('assignment-select'),
  olderBtn: $('older-btn'),
  newerBtn: $('newer-btn'),
  assignmentDateText: $('assignment-date-text'),
  editAssignmentBtn: $('edit-assignment-btn'),
  deleteAssignmentBtn: $('delete-assignment-btn'),
  legend: $('legend'),
  noStudentsNote: $('no-students-note'),
  markingList: $('marking-list'),

  studentListPanel: $('student-list-panel'),
  addStudentForm: $('add-student-form'),
  newStudentName: $('new-student-name'),
  addStudentNote: $('add-student-note'),
  studentCount: $('student-count'),
  noStudents: $('no-students'),
  studentList: $('student-list'),
  studentSummary: $('student-summary'),
  backToStudents: $('back-to-students'),
  summaryHead: $('summary-head'),
  summaryName: $('summary-name'),
  renameStudentBtn: $('rename-student-btn'),
  deleteStudentBtn: $('delete-student-btn'),
  renameForm: $('rename-form'),
  renameInput: $('rename-input'),
  renameCancel: $('rename-cancel'),
  summaryCounts: $('summary-counts'),
  summaryEmpty: $('summary-empty'),
  summaryList: $('summary-list'),

  overviewEmpty: $('overview-empty'),
  overviewArea: $('overview-area'),
  overviewTable: $('overview-table'),

  exportBtn: $('export-btn'),
  importBtn: $('import-btn'),
  importFile: $('import-file'),
  toast: $('toast'),
  toastText: $('toast-text'),
  toastClose: $('toast-close'),
};

// ============================================================
// Small helpers
// ============================================================

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function newClass(name) {
  return { id: newId(), name, createdAt: Date.now(), students: [], assignments: [], marks: {} };
}

function findStudent(id) {
  return data.students.find((s) => s.id === id);
}

function findAssignment(id) {
  return data.assignments.find((a) => a.id === id);
}

function getMark(assignmentId, studentId, cls = data) {
  const marks = cls.marks[assignmentId];
  const status = marks ? marks[studentId] : '';
  return status === 'done' || status === 'late' || status === 'absent' ? status : '';
}

function setMark(assignmentId, studentId, status) {
  if (!data.marks[assignmentId]) data.marks[assignmentId] = {};
  if (status) data.marks[assignmentId][studentId] = status;
  else delete data.marks[assignmentId][studentId];
}

function nextStatus(status) {
  return STATUS_ORDER[(STATUS_ORDER.indexOf(status) + 1) % STATUS_ORDER.length];
}

function byName(a, b) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
}

function sortedClasses() {
  return [...store.classes].sort(byName);
}

function sortedStudents(cls = data) {
  return [...cls.students].sort(byName);
}

// Newest first. Two assignments on the same day: the one added last comes first.
function sortedAssignments(cls = data) {
  return [...cls.assignments].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function hasSampleData() {
  return store.classes.some((c) =>
    c.sample || c.students.some((s) => s.sample) || c.assignments.some((a) => a.sample)
  );
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function makeSpan(className, text) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

// Shows a status as a colored box with an icon and (unless iconOnly) a word.
// Used for the big buttons, the legend, the Student Summary, and the Overview grid.
function fillStatus(target, status, { blankText = '', iconOnly = false } = {}) {
  target.dataset.status = status || 'none';
  target.replaceChildren();
  if (status) {
    const icon = makeSpan('icon', '');
    icon.innerHTML = ICONS[status]; // fixed markup from ICONS above
    target.append(icon);
  }
  const text = status ? STATUS_LABELS[status] : blankText;
  if (text && !iconOnly) target.append(makeSpan('', text));
}

// ============================================================
// Dates (always local time, so "today" never turns into tomorrow)
// ============================================================

function pad(number) {
  return String(number).padStart(2, '0');
}

function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayString() {
  return toDateString(new Date());
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateString(date);
}

function fromDateString(text) {
  const [year, month, day] = text.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// "Tuesday, September 29, 2026"
function formatLongDate(text) {
  return fromDateString(text).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

// "Sep 29" (the year is added if it isn't this year)
function formatShortDate(text) {
  const date = fromDateString(text);
  const options = { month: 'short', day: 'numeric' };
  if (date.getFullYear() !== new Date().getFullYear()) options.year = 'numeric';
  return date.toLocaleDateString(undefined, options);
}

// Accepts 2026-09-29 (how the app saves dates) or 9/29/2026 (how Google Sheets may save them).
function parseDate(text) {
  let year, month, day;
  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    [year, month, day] = match.slice(1).map(Number);
  } else {
    match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    [month, day, year] = match.slice(1).map(Number);
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return toDateString(date);
}

// ============================================================
// Saving and loading
// ============================================================

function loadData() {
  let saved;
  let old = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) old = localStorage.getItem(OLD_STORAGE_KEY);
  } catch (err) {
    store = makeSampleStore();
    showMessage('This browser is blocking the app from saving. Your changes will be lost when you close this tab.', true);
    return;
  }

  if (saved === null && old !== null) {
    // Data from before classes existed: move it into one class.
    // (The old copy is left in place as a spare.)
    try {
      const cls = { ...newClass('My Class'), ...cleanClassData(JSON.parse(old)) };
      const allSample = cls.students.every((s) => s.sample) && cls.assignments.every((a) => a.sample);
      if (allSample && (cls.students.length || cls.assignments.length)) {
        cls.name = 'Sample Class';
        cls.sample = true;
      }
      store = { classes: [cls], currentClassId: cls.id };
    } catch (err) {
      store = { classes: [], currentClassId: null };
    }
    saveData();
  } else if (saved === null) {
    // Very first visit: start with sample classes to try out.
    store = makeSampleStore();
    saveData();
  } else {
    try {
      store = cleanStore(JSON.parse(saved));
    } catch (err) {
      // Keep the unreadable copy so it isn't overwritten, then start empty.
      try { localStorage.setItem(STORAGE_KEY + '.unreadable', saved); } catch (e) { /* ignore */ }
      store = { classes: [], currentClassId: null };
      showMessage('Your saved data couldn’t be read, so the app started empty. If you have a backup, use “Import from CSV”.', true);
    }
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    showMessage('Your last change couldn’t be saved in this browser. Use “Export to CSV” to keep a copy of your data.', true);
  }
}

// Makes sure saved data has the shape the app expects.
function cleanStore(saved) {
  if (!saved || typeof saved !== 'object' || !Array.isArray(saved.classes)) throw new Error('Not app data');
  const classes = saved.classes
    .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
    .map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: Number(c.createdAt) || 0,
      ...(c.sample ? { sample: true } : {}),
      ...cleanClassData(c),
    }));
  return { classes, currentClassId: typeof saved.currentClassId === 'string' ? saved.currentClassId : null };
}

function cleanClassData(saved) {
  if (!saved || typeof saved !== 'object') throw new Error('Not app data');
  const clean = { students: [], assignments: [], marks: {} };
  if (Array.isArray(saved.students)) {
    clean.students = saved.students.filter((s) => s && typeof s.id === 'string' && typeof s.name === 'string');
  }
  if (Array.isArray(saved.assignments)) {
    clean.assignments = saved.assignments
      .filter((a) => a && typeof a.id === 'string' && typeof a.name === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.date))
      .map((a) => ({ ...a, createdAt: Number(a.createdAt) || 0 }));
  }
  if (saved.marks && typeof saved.marks === 'object') {
    for (const [assignmentId, marks] of Object.entries(saved.marks)) {
      if (marks && typeof marks === 'object') clean.marks[assignmentId] = { ...marks };
    }
  }
  return clean;
}

// ============================================================
// Sample data (added only the very first time the app is opened)
// ============================================================

function makeSampleStore() {
  // One letter per student: D = Done, L = Late, A = Absent, - = not marked
  const period1 = makeSampleClass('Sample: Period 1',
    ['Ava Martinez', 'Ben Carter', 'Chloe Nguyen', 'Diego Ramirez', 'Emma Johnson', 'Liam Patel'],
    ['DDLDDA', 'DLDDAD', 'DDDLDD', 'DD-L-A']);
  const period2 = makeSampleClass('Sample: Period 2',
    ['Noah Kim', 'Olivia Brown', 'Mateo Silva', 'Sophia Lee', 'Jackson Wright'],
    ['DDDLD', 'ADDDL', 'DLDAD', '-D-DD']);
  return { classes: [period1, period2], currentClassId: period1.id };
}

function makeSampleClass(className, studentNames, patterns) {
  const cls = { ...newClass(className), sample: true };
  cls.students = studentNames.map((name) => ({ id: newId(), name, sample: true }));

  const assignments = [
    ['Reading Log, Week 1', 12],
    ['Fractions Worksheet', 8],
    ['Science Lab Report', 5],
    ['Vocabulary Quiz Corrections', 1],
  ];
  const letters = { D: 'done', L: 'late', A: 'absent' };
  const now = Date.now();

  assignments.forEach(([name, ago], index) => {
    const assignment = { id: newId(), name, date: daysAgo(ago), createdAt: now + index, sample: true };
    cls.assignments.push(assignment);
    cls.marks[assignment.id] = {};
    [...patterns[index]].forEach((letter, studentIndex) => {
      if (letters[letter]) cls.marks[assignment.id][cls.students[studentIndex].id] = letters[letter];
    });
  });
  return cls;
}

function removeSampleData() {
  const ok = confirm('Remove the sample classes, students, and assignments?\n\nAnything you added yourself will stay.');
  if (!ok) return;

  for (const cls of store.classes) {
    const sampleStudentIds = cls.students.filter((s) => s.sample).map((s) => s.id);
    cls.assignments.filter((a) => a.sample).forEach((a) => delete cls.marks[a.id]);
    cls.students = cls.students.filter((s) => !s.sample);
    cls.assignments = cls.assignments.filter((a) => !a.sample);
    for (const marks of Object.values(cls.marks)) {
      sampleStudentIds.forEach((id) => delete marks[id]);
    }
  }
  // A sample class is removed too, unless you added your own students or assignments to it.
  store.classes = store.classes.filter((c) => !(c.sample && !c.students.length && !c.assignments.length));
  store.classes.forEach((c) => delete c.sample);

  openClass(store.currentClassId);
  saveData();
  renderAll();
  showMessage('Sample data removed.');
}

// ============================================================
// Classes
// ============================================================

// Makes a class the open one. Falls back to the first class (or none).
function openClass(id) {
  const cls = store.classes.find((c) => c.id === id) || sortedClasses()[0] || null;
  if (cls !== data) {
    currentAssignmentId = null;
    currentStudentId = null;
    closeAssignmentForm();
    closeRenameForm();
    el.addStudentNote.textContent = '';
  }
  data = cls;
  store.currentClassId = cls ? cls.id : null;
}

function switchClass(id) {
  openClass(id);
  closeClassForm();
  saveData(); // remembers which class was open
  renderAll();
}

function renderClassBar() {
  const hasClasses = store.classes.length > 0;
  el.classBar.hidden = !hasClasses;
  if (!hasClasses) return;
  el.classSelect.replaceChildren(...sortedClasses().map((c) => new Option(c.name, c.id)));
  el.classSelect.value = data.id;
}

function openClassForm(mode) {
  classFormMode = mode;
  const titles = { new: 'New class', rename: 'Rename class', copy: 'Copy class' };
  el.classFormTitle.textContent = titles[mode];
  el.classFormIntro.hidden = store.classes.length > 0;
  el.classCancel.hidden = store.classes.length === 0;
  el.copyOptions.hidden = mode !== 'copy';
  if (mode === 'rename') el.className.value = data.name;
  else if (mode === 'copy') el.className.value = `Copy of ${data.name}`;
  else el.className.value = '';
  if (mode === 'copy') {
    el.copySourceName.textContent = data.name;
    el.copyStudents.checked = false;
    el.copyAssignments.checked = true;
  }
  el.classForm.hidden = false;
  el.className.focus();
  el.className.select();
}

function closeClassForm() {
  classFormMode = null;
  el.classForm.hidden = true;
}

function saveClassForm(event) {
  event.preventDefault();
  const name = el.className.value.trim();
  if (!name) {
    el.className.value = '';
    el.className.reportValidity();
    return;
  }

  if (classFormMode === 'rename' && data) {
    data.name = name;
    delete data.sample; // once renamed, it's yours
    closeClassForm();
    saveData();
    renderAll();
    return;
  }

  const cls = newClass(name);
  if (classFormMode === 'copy' && data) {
    // Copies names and dates only. Statuses always start blank.
    if (el.copyStudents.checked) {
      cls.students = data.students.map((s) => ({ id: newId(), name: s.name }));
    }
    if (el.copyAssignments.checked) {
      cls.assignments = data.assignments.map((a) => ({ id: newId(), name: a.name, date: a.date, createdAt: a.createdAt }));
    }
  }
  store.classes.push(cls);
  const copied = classFormMode === 'copy';
  switchClass(cls.id);
  showMessage(copied ? `Created “${name}” as a copy.` : `Created “${name}”.`);
}

function deleteCurrentClass() {
  if (!data) return;
  const ok = confirm(
    `Delete the class “${data.name}”?\n\n` +
    `Its ${plural(data.students.length, 'student')}, ${plural(data.assignments.length, 'assignment')}, ` +
    'and all their marks will be deleted. This can’t be undone.'
  );
  if (!ok) return;
  const name = data.name;
  store.classes = store.classes.filter((c) => c !== data);
  switchClass(null);
  showMessage(`The class “${name}” was deleted.`);
}

// ============================================================
// Switching between the tabs
// ============================================================

function showView(view) {
  currentView = view;
  const views = {
    assignments: [el.tabAssignments, el.viewAssignments],
    students: [el.tabStudents, el.viewStudents],
    overview: [el.tabOverview, el.viewOverview],
  };
  for (const [name, [tab, section]] of Object.entries(views)) {
    section.hidden = name !== view;
    if (name === view) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  document.body.classList.toggle('wide', view === 'overview');

  if (view === 'students') {
    // The Students tab always opens on the list of names.
    currentStudentId = null;
    closeRenameForm();
    el.addStudentNote.textContent = '';
  }
  renderAll();
  window.scrollTo(0, 0);
}

function renderAll() {
  renderClassBar();
  el.sampleBanner.hidden = !hasSampleData();

  // No classes yet: the only thing to do is create one.
  const hasClass = Boolean(data);
  el.classContent.hidden = !hasClass;
  el.tabs.hidden = !hasClass;
  if (!hasClass) {
    if (classFormMode !== 'new') openClassForm('new');
    return;
  }
  renderAssignmentsView();
  renderStudentsView();
  renderOverview();
}

// ============================================================
// Assignments tab
// ============================================================

function renderAssignmentsView() {
  const assignments = sortedAssignments();
  if (!assignments.some((a) => a.id === currentAssignmentId)) {
    currentAssignmentId = assignments.length ? assignments[0].id : null;
  }

  const formOpen = !el.assignmentForm.hidden;
  const noStudents = data.students.length === 0;
  el.getStarted.hidden = formOpen || assignments.length > 0 || !noStudents;
  el.noAssignments.hidden = formOpen || assignments.length > 0 || noStudents;
  el.assignmentArea.hidden = assignments.length === 0;
  if (!assignments.length) return;

  el.assignmentSelect.replaceChildren(
    ...assignments.map((a) => new Option(`${a.name} · ${formatShortDate(a.date)}`, a.id))
  );
  el.assignmentSelect.value = currentAssignmentId;

  const index = assignments.findIndex((a) => a.id === currentAssignmentId);
  el.newerBtn.disabled = index === 0;
  el.olderBtn.disabled = index === assignments.length - 1;

  const assignment = assignments[index];
  el.assignmentDateText.textContent = `Given ${formatLongDate(assignment.date)}`;
  renderMarkingList(assignment);
}

function renderMarkingList(assignment) {
  const students = sortedStudents();
  el.noStudentsNote.hidden = students.length > 0;
  el.legend.hidden = students.length === 0;
  el.markingList.hidden = students.length === 0;

  el.markingList.replaceChildren(
    ...students.map((student) => {
      const row = document.createElement('li');
      row.className = 'row';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'status-btn';
      paintStatusButton(button, student, getMark(assignment.id, student.id));

      // One click moves to the next status. Only this button is redrawn,
      // so the page doesn't jump around.
      button.addEventListener('click', () => {
        const status = nextStatus(getMark(assignment.id, student.id));
        setMark(assignment.id, student.id, status);
        saveData();
        paintStatusButton(button, student, status);
      });

      row.append(makeSpan('row-name', student.name), button);
      return row;
    })
  );
}

function paintStatusButton(button, student, status) {
  fillStatus(button, status);
  button.setAttribute('aria-label', `${student.name}: ${STATUS_LABELS[status]}`);
}

function selectAssignment(id) {
  currentAssignmentId = id;
  if (editingAssignmentId) closeAssignmentForm();
  renderAssignmentsView();
}

// step = +1 for older, -1 for newer (the list is newest first)
function stepAssignment(step) {
  const assignments = sortedAssignments();
  const index = assignments.findIndex((a) => a.id === currentAssignmentId);
  const next = assignments[index + step];
  if (next) selectAssignment(next.id);
}

function openAssignmentForm(assignment) {
  editingAssignmentId = assignment ? assignment.id : null;
  el.assignmentFormTitle.textContent = assignment ? 'Edit assignment' : 'New assignment';
  el.assignmentName.value = assignment ? assignment.name : '';
  el.assignmentDate.value = assignment ? assignment.date : todayString();
  el.assignmentForm.hidden = false;
  el.newAssignmentBtn.hidden = true;
  renderAssignmentsView();
  el.assignmentName.focus();
}

function closeAssignmentForm() {
  editingAssignmentId = null;
  el.assignmentForm.hidden = true;
  el.newAssignmentBtn.hidden = false;
}

function saveAssignmentForm(event) {
  event.preventDefault();
  const name = el.assignmentName.value.trim();
  if (!name) {
    el.assignmentName.value = '';
    el.assignmentName.reportValidity();
    return;
  }
  const date = el.assignmentDate.value || todayString();

  const existing = editingAssignmentId && findAssignment(editingAssignmentId);
  if (existing) {
    existing.name = name;
    existing.date = date;
    delete existing.sample; // once edited, it's yours
    currentAssignmentId = existing.id;
  } else {
    const assignment = { id: newId(), name, date, createdAt: Date.now() };
    data.assignments.push(assignment);
    currentAssignmentId = assignment.id;
  }

  closeAssignmentForm();
  saveData();
  renderAll();
}

function deleteCurrentAssignment() {
  const assignment = findAssignment(currentAssignmentId);
  if (!assignment) return;
  const ok = confirm(
    `Delete the assignment “${assignment.name}” (${formatShortDate(assignment.date)})?\n\n` +
    'All the marks for this assignment will be deleted too. This can’t be undone.'
  );
  if (!ok) return;

  const index = sortedAssignments().findIndex((a) => a.id === assignment.id);
  data.assignments = data.assignments.filter((a) => a.id !== assignment.id);
  delete data.marks[assignment.id];

  // Show the next older assignment (or the oldest one left).
  const remaining = sortedAssignments();
  currentAssignmentId = remaining.length ? remaining[Math.min(index, remaining.length - 1)].id : null;
  if (editingAssignmentId === assignment.id) closeAssignmentForm();

  saveData();
  renderAll();
}

// ============================================================
// Students tab
// ============================================================

function renderStudentsView() {
  const student = findStudent(currentStudentId);
  if (!student) currentStudentId = null;
  el.studentListPanel.hidden = Boolean(student);
  el.studentSummary.hidden = !student;
  if (student) renderStudentSummary(student);
  else renderStudentList();
}

function renderStudentList() {
  const students = sortedStudents();
  el.noStudents.hidden = students.length > 0;
  el.studentList.hidden = students.length === 0;
  el.studentCount.hidden = students.length === 0;
  el.studentCount.textContent = plural(students.length, 'student');

  el.studentList.replaceChildren(
    ...students.map((student) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'student-link';
      button.dataset.id = student.id;
      const chevron = makeSpan('chevron', '›');
      chevron.setAttribute('aria-hidden', 'true');
      button.append(makeSpan('', student.name), chevron);
      button.addEventListener('click', () => openStudentSummary(student.id));
      item.append(button);
      return item;
    })
  );
}

function openStudentSummary(id) {
  currentStudentId = id;
  closeRenameForm();
  renderStudentsView();
  window.scrollTo(0, 0);
  el.summaryName.focus();
}

function closeStudentSummary() {
  const id = currentStudentId;
  currentStudentId = null;
  closeRenameForm();
  renderStudentsView();
  const button = el.studentList.querySelector(`[data-id="${id}"]`);
  if (button) button.focus();
}

function renderStudentSummary(student) {
  el.summaryName.textContent = student.name;

  const assignments = sortedAssignments();
  const counts = { done: 0, late: 0, absent: 0, '': 0 };

  el.summaryList.replaceChildren(
    ...assignments.map((assignment) => {
      const status = getMark(assignment.id, student.id);
      counts[status] += 1;

      const row = document.createElement('li');
      row.className = 'summary-row';
      const chip = makeSpan('chip', '');
      fillStatus(chip, status, { blankText: 'Not marked' });
      row.append(
        makeSpan('summary-date', formatShortDate(assignment.date)),
        makeSpan('summary-assignment', assignment.name),
        chip
      );
      return row;
    })
  );

  // "12 done, 2 late, 1 absent, 3 not marked"
  const parts = [[counts.done, 'done'], [counts.late, 'late'], [counts.absent, 'absent'], [counts[''], 'not marked']];
  el.summaryCounts.replaceChildren();
  parts.forEach(([count, word], index) => {
    const number = document.createElement('strong');
    number.textContent = count;
    el.summaryCounts.append(number, ` ${word}${index < parts.length - 1 ? ', ' : ''}`);
  });

  el.summaryCounts.hidden = assignments.length === 0;
  el.summaryList.hidden = assignments.length === 0;
  el.summaryEmpty.hidden = assignments.length > 0;
}

function addStudent(event) {
  event.preventDefault();
  const name = el.newStudentName.value.trim();
  if (!name) {
    el.newStudentName.value = '';
    el.newStudentName.reportValidity();
    return;
  }
  data.students.push({ id: newId(), name });
  saveData();
  renderAll();
  el.newStudentName.value = '';
  el.newStudentName.focus(); // ready for the next name
  el.addStudentNote.textContent = `Added ${name}.`;
}

function openRenameForm() {
  const student = findStudent(currentStudentId);
  if (!student) return;
  el.summaryHead.hidden = true;
  el.renameForm.hidden = false;
  el.renameInput.value = student.name;
  el.renameInput.focus();
  el.renameInput.select();
}

function closeRenameForm() {
  el.renameForm.hidden = true;
  el.summaryHead.hidden = false;
}

function saveRename(event) {
  event.preventDefault();
  const student = findStudent(currentStudentId);
  const name = el.renameInput.value.trim();
  if (!name) {
    el.renameInput.value = '';
    el.renameInput.reportValidity();
    return;
  }
  if (student) {
    student.name = name;
    delete student.sample; // once renamed, it's yours
  }
  closeRenameForm();
  saveData();
  renderAll();
}

function deleteCurrentStudent() {
  const student = findStudent(currentStudentId);
  if (!student) return;
  const ok = confirm(
    `Delete ${student.name}?\n\n` +
    'Their marks on every assignment will be deleted too. This can’t be undone.'
  );
  if (!ok) return;

  data.students = data.students.filter((s) => s.id !== student.id);
  for (const marks of Object.values(data.marks)) delete marks[student.id];
  currentStudentId = null;
  saveData();
  renderAll();
  showMessage(`${student.name} was deleted.`);
}

// ============================================================
// Overview tab: every student and assignment in one grid
// ============================================================

function renderOverview() {
  const students = sortedStudents();
  const assignments = sortedAssignments();

  if (!students.length || !assignments.length) {
    el.overviewEmpty.textContent = !students.length
      ? 'Add students on the Students tab to see them here.'
      : 'Add an assignment on the Assignments tab to see it here.';
    el.overviewEmpty.hidden = false;
    el.overviewArea.hidden = true;
    el.overviewTable.replaceChildren();
    return;
  }
  el.overviewEmpty.hidden = true;
  el.overviewArea.hidden = false;

  // Top row: one column per assignment, newest on the left.
  const headRow = document.createElement('tr');
  const corner = document.createElement('th');
  corner.scope = 'col';
  corner.textContent = 'Student';
  headRow.append(corner);
  for (const assignment of assignments) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.title = `${assignment.name} (${formatShortDate(assignment.date)})`;
    th.append(makeSpan('grid-name', assignment.name), makeSpan('grid-date', formatShortDate(assignment.date)));
    headRow.append(th);
  }
  const head = document.createElement('thead');
  head.append(headRow);

  // One row per student.
  const body = document.createElement('tbody');
  for (const student of students) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('th');
    nameCell.scope = 'row';
    nameCell.textContent = student.name;
    row.append(nameCell);

    for (const assignment of assignments) {
      const cell = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'grid-cell';
      paintGridCell(button, student, assignment, getMark(assignment.id, student.id));
      button.addEventListener('click', () => {
        const status = nextStatus(getMark(assignment.id, student.id));
        setMark(assignment.id, student.id, status);
        saveData();
        paintGridCell(button, student, assignment, status);
      });
      cell.append(button);
      row.append(cell);
    }
    body.append(row);
  }
  el.overviewTable.replaceChildren(head, body);
}

function paintGridCell(button, student, assignment, status) {
  fillStatus(button, status, { iconOnly: true });
  const label = `${student.name}, ${assignment.name}: ${STATUS_LABELS[status]}`;
  button.setAttribute('aria-label', label);
  button.title = label;
}

// ============================================================
// Export and import (CSV)
// ============================================================
//
// The file holds every class, one after another. Each class looks like this,
// with one column per assignment (oldest on the left):
//
//   Class,Period 1
//   Assignment,Book Report,Math Worksheet
//   Date,2026-09-26,2026-09-29
//   Maya Lopez,Done,Late
//   Jordan Kim,,Absent

function exportCsv() {
  const rows = [];
  sortedClasses().forEach((cls, index) => {
    if (index > 0) rows.push([]); // a blank line between classes
    const assignments = sortedAssignments(cls).reverse();
    rows.push(['Class', cls.name]);
    rows.push(['Assignment', ...assignments.map((a) => a.name)]);
    rows.push(['Date', ...assignments.map((a) => a.date)]);
    for (const student of sortedStudents(cls)) {
      rows.push([
        student.name,
        ...assignments.map((a) => {
          const status = getMark(a.id, student.id, cls);
          return status ? STATUS_LABELS[status] : '';
        }),
      ]);
    }
  });
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';

  // The "﻿" at the start helps spreadsheet programs read accented names correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `assignment-tracker-backup-${todayString()}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  showMessage('Your backup file (all classes) was downloaded. Keep it somewhere safe, like Google Drive.');
}

function csvCell(value) {
  const text = String(value);
  if (/[",\r\n]/.test(text) || text !== text.trim()) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

// Turns CSV text into a list of rows, each a list of cells.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  text = text.replace(/^﻿/, '');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') inQuotes = false;
      else cell += char;
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const cellText = (row, index) => (row[index] || '').trim();

// Reads a backup file. Throws an Error with a friendly message if it can't.
// Returns { classes, fullBackup, unrecognized }. fullBackup is false for an
// older one-class file (no "Class" rows), which gets added as a new class.
function parseBackup(text) {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim() !== ''));
  const firstCell = rows.length ? cellText(rows[0], 0).toLowerCase() : '';

  const blocks = [];
  if (firstCell === 'class') {
    for (const row of rows) {
      if (cellText(row, 0).toLowerCase() === 'class') blocks.push({ name: cellText(row, 1) || 'Untitled class', rows: [] });
      else blocks[blocks.length - 1].rows.push(row);
    }
  } else {
    blocks.push({ name: null, rows });
  }

  let unrecognized = 0;
  const classes = blocks.map((block) => {
    try {
      const result = parseClassRows(block.rows);
      unrecognized += result.unrecognized;
      return { ...newClass(block.name || 'Imported class'), ...result.classData };
    } catch (err) {
      throw new Error(block.name ? `In the class “${block.name}”: ${err.message}` : err.message);
    }
  });
  return { classes, fullBackup: firstCell === 'class', unrecognized };
}

// Reads one class: an "Assignment" row, a "Date" row, then one row per student.
function parseClassRows(rows) {
  if (rows.length < 2 ||
      cellText(rows[0], 0).toLowerCase() !== 'assignment' ||
      cellText(rows[1], 0).toLowerCase() !== 'date') {
    throw new Error('This file doesn’t look like a backup from this app. Each class should start with an “Assignment” row and a “Date” row.');
  }

  const [nameRow, dateRow, ...studentRows] = rows;
  const classData = { students: [], assignments: [], marks: {} };
  const columns = [];
  const width = Math.max(nameRow.length, dateRow.length);
  const now = Date.now();

  for (let col = 1; col < width; col++) {
    const name = cellText(nameRow, col);
    const rawDate = cellText(dateRow, col);
    if (!name && !rawDate) continue; // empty column
    const label = name ? `“${name}”` : `column ${col + 1}`;
    if (!rawDate) throw new Error(`The assignment ${label} is missing its date.`);
    const date = parseDate(rawDate);
    if (!date) throw new Error(`The date for ${label} (“${rawDate}”) couldn’t be read. Dates should look like 2026-09-29.`);

    const assignment = { id: newId(), name: name || 'Untitled assignment', date, createdAt: now + col };
    classData.assignments.push(assignment);
    classData.marks[assignment.id] = {};
    columns.push({ col, id: assignment.id });
  }

  let unrecognized = 0;
  for (const row of studentRows) {
    const name = cellText(row, 0);
    if (!name) continue;
    const student = { id: newId(), name };
    classData.students.push(student);
    for (const { col, id } of columns) {
      const value = cellText(row, col).toLowerCase();
      if (!value || value === 'not marked') continue;
      if (value === 'done' || value === 'late' || value === 'absent') classData.marks[id][student.id] = value;
      else unrecognized += 1;
    }
  }
  return { classData, unrecognized };
}

async function importCsv() {
  const file = el.importFile.files[0];
  el.importFile.value = ''; // so choosing the same file again still works
  if (!file) return;

  let text;
  try {
    text = await file.text();
  } catch (err) {
    showMessage('That file couldn’t be opened. Please try again.', true);
    return;
  }

  let result;
  try {
    result = parseBackup(text);
  } catch (err) {
    showMessage(err.message, true);
    return;
  }

  const { classes, fullBackup, unrecognized } = result;
  const describe = (cls) => `${plural(cls.students.length, 'student')} and ${plural(cls.assignments.length, 'assignment')}`;
  let summary;

  if (fullBackup) {
    summary = `${classes.length} ${classes.length === 1 ? 'class' : 'classes'}`;
    const ok = confirm(
      `Replace everything in the app with this backup (${summary})?\n\n` +
      'All the classes in the app right now will be replaced. This can’t be undone.'
    );
    if (!ok) return;
    store.classes = classes;
  } else {
    // An older one-class file: add it alongside your other classes.
    summary = describe(classes[0]);
    const ok = confirm(`Add this file as a new class called “Imported class” (${summary})?\n\nYour other classes won’t change. You can rename it afterward.`);
    if (!ok) return;
    store.classes.push(classes[0]);
  }

  data = null; // so openClass resets the screen
  openClass(classes[0].id);
  closeClassForm();
  saveData();
  renderAll();

  let message = `Imported ${summary}.`;
  if (unrecognized) {
    message += ` ${plural(unrecognized, 'mark')} ${unrecognized === 1 ? 'wasn’t' : 'weren’t'} Done, Late, or Absent, so ${unrecognized === 1 ? 'it was' : 'they were'} left blank.`;
  }
  showMessage(message);
}

// ============================================================
// Pop-up message at the bottom of the screen
// ============================================================

function showMessage(text, isError = false) {
  el.toastText.textContent = text;
  el.toast.classList.toggle('is-error', isError);
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  if (!isError) toastTimer = setTimeout(hideMessage, 6000);
}

function hideMessage() {
  el.toast.hidden = true;
}

// ============================================================
// Start the app
// ============================================================

function init() {
  el.tabAssignments.addEventListener('click', () => showView('assignments'));
  el.tabStudents.addEventListener('click', () => showView('students'));
  el.tabOverview.addEventListener('click', () => showView('overview'));
  document.querySelectorAll('[data-go-students]').forEach((button) => {
    button.addEventListener('click', () => {
      showView('students');
      el.newStudentName.focus();
    });
  });
  el.removeSampleBtn.addEventListener('click', removeSampleData);

  el.classSelect.addEventListener('change', () => switchClass(el.classSelect.value));
  el.newClassBtn.addEventListener('click', () => openClassForm('new'));
  el.renameClassBtn.addEventListener('click', () => openClassForm('rename'));
  el.copyClassBtn.addEventListener('click', () => openClassForm('copy'));
  el.deleteClassBtn.addEventListener('click', deleteCurrentClass);
  el.classForm.addEventListener('submit', saveClassForm);
  el.classCancel.addEventListener('click', closeClassForm);

  el.newAssignmentBtn.addEventListener('click', () => openAssignmentForm(null));
  el.assignmentForm.addEventListener('submit', saveAssignmentForm);
  el.assignmentCancel.addEventListener('click', () => {
    closeAssignmentForm();
    renderAssignmentsView();
  });
  el.assignmentSelect.addEventListener('change', () => selectAssignment(el.assignmentSelect.value));
  el.olderBtn.addEventListener('click', () => stepAssignment(1));
  el.newerBtn.addEventListener('click', () => stepAssignment(-1));
  el.editAssignmentBtn.addEventListener('click', () => openAssignmentForm(findAssignment(currentAssignmentId)));
  el.deleteAssignmentBtn.addEventListener('click', deleteCurrentAssignment);

  el.addStudentForm.addEventListener('submit', addStudent);
  el.backToStudents.addEventListener('click', closeStudentSummary);
  el.renameStudentBtn.addEventListener('click', openRenameForm);
  el.renameForm.addEventListener('submit', saveRename);
  el.renameCancel.addEventListener('click', closeRenameForm);
  el.deleteStudentBtn.addEventListener('click', deleteCurrentStudent);

  el.exportBtn.addEventListener('click', exportCsv);
  el.importBtn.addEventListener('click', () => {
    el.importFile.value = '';
    el.importFile.click();
  });
  el.importFile.addEventListener('change', importCsv);
  el.toastClose.addEventListener('click', hideMessage);

  // If the app is open in two tabs, keep them in sync (each tab keeps its own open class).
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || event.newValue === null) return;
    try {
      const openId = data ? data.id : null;
      store = cleanStore(JSON.parse(event.newValue));
      data = store.classes.find((c) => c.id === openId) || null;
      openClass(openId);
      renderAll();
    } catch (err) { /* ignore */ }
  });

  document.querySelectorAll('[data-legend]').forEach((chip) => fillStatus(chip, chip.dataset.legend));

  loadData();
  openClass(store.currentClassId);
  renderAll();
}

init();
