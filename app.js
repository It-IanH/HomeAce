/* HomeAce - Vanilla JS calendar app */
const calendarGrid = document.getElementById("calendarGrid");
const calendarMonthLabel = document.getElementById("calendarMonthLabel");
const monthTitle = document.getElementById("monthTitle");
const monthGoal = document.getElementById("monthGoal");
const detailPanel = document.getElementById("detailPanel");
const detailContent = document.getElementById("detailContent");
const detailEmpty = document.getElementById("detailEmpty");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const responsibilitiesList = document.getElementById("responsibilitiesList");
const todosList = document.getElementById("todosList");
const notesInput = document.getElementById("notesInput");

const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const backToMonthBtn = document.getElementById("backToMonth");
const prevDayBtn = document.getElementById("prevDay");
const nextDayBtn = document.getElementById("nextDay");
const addResponsibilityBtn = document.getElementById("addResponsibility");
const addTodoBtn = document.getElementById("addTodo");

const STORAGE_KEY = "homeAceData";

const state = {
  today: new Date(),
  currentMonth: new Date(),
  selectedDate: null,
  data: {
    monthMeta: {},
    days: {},
    recurring: {
      responsibilities: [],
      todos: [],
    },
    overrides: {
      todoDone: {},
      todoEdited: {},
      todoDeleted: {},
      respEdited: {},
      respDeleted: {},
    },
  },
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const init = () => {
  loadStorage();
  state.currentMonth.setDate(1);
  bindEvents();
  renderMonth();
  renderMonthGoal();
  renderDetailPanel();
};

const loadStorage = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.monthGoals) {
        state.data.monthMeta = Object.keys(parsed.monthGoals).reduce((acc, key) => {
          acc[key] = { goalText: parsed.monthGoals[key] };
          return acc;
        }, {});
        state.data.days = parsed.days || {};
      } else {
        state.data = parsed;
      }
    } catch (error) {
      console.error("Failed to parse storage", error);
    }
  }
  ensureDataShape();
};

const ensureDataShape = () => {
  if (!state.data.monthMeta) state.data.monthMeta = {};
  if (!state.data.days) state.data.days = {};
  if (!state.data.recurring) {
    state.data.recurring = { responsibilities: [], todos: [] };
  }
  if (!state.data.recurring.responsibilities) state.data.recurring.responsibilities = [];
  if (!state.data.recurring.todos) state.data.recurring.todos = [];
  if (!state.data.overrides) {
    state.data.overrides = {
      todoDone: {},
      todoEdited: {},
      todoDeleted: {},
      respEdited: {},
      respDeleted: {},
    };
  }
  [
    "todoDone",
    "todoEdited",
    "todoDeleted",
    "respEdited",
    "respDeleted",
  ].forEach((key) => {
    if (!state.data.overrides[key]) state.data.overrides[key] = {};
  });
};

const saveStorage = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
};

const bindEvents = () => {
  prevMonthBtn.addEventListener("click", () => changeMonth(-1));
  nextMonthBtn.addEventListener("click", () => changeMonth(1));
  backToMonthBtn.addEventListener("click", () => {
    state.selectedDate = null;
    renderDetailPanel();
    updateSelectedDay();
  });

  prevDayBtn.addEventListener("click", () => changeSelectedDate(-1));
  nextDayBtn.addEventListener("click", () => changeSelectedDate(1));

  addResponsibilityBtn.addEventListener("click", () => openResponsibilityForm());
  addTodoBtn.addEventListener("click", () => openTodoForm());

  monthGoal.addEventListener("blur", () => {
    const key = getMonthKey(state.currentMonth);
    const value = monthGoal.textContent.trim();
    state.data.monthMeta[key] = { goalText: value };
    saveStorage();
  });

  notesInput.addEventListener("input", () => {
    if (!state.selectedDate) return;
    const day = getDayEntry(state.selectedDate);
    day.notes = notesInput.value;
    saveStorage();
  });
};

const changeMonth = (delta) => {
  const newMonth = new Date(state.currentMonth);
  newMonth.setMonth(newMonth.getMonth() + delta);
  newMonth.setDate(1);
  state.currentMonth = newMonth;
  renderMonth();
  renderMonthGoal();
  updateSelectedDay();
};

const changeSelectedDate = (delta) => {
  if (!state.selectedDate) return;
  const newDate = new Date(state.selectedDate);
  newDate.setDate(newDate.getDate() + delta);
  state.selectedDate = newDate;
  if (
    newDate.getFullYear() !== state.currentMonth.getFullYear() ||
    newDate.getMonth() !== state.currentMonth.getMonth()
  ) {
    state.currentMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
    renderMonth();
    renderMonthGoal();
  }
  renderDetailPanel();
  updateSelectedDay();
};

const renderMonth = () => {
  calendarGrid.innerHTML = "";
  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  calendarMonthLabel.textContent = `${monthNames[month]} ${year}`;
  monthTitle.textContent = `${monthNames[month]} ${year}`;

  for (let i = 0; i < startWeekday; i += 1) {
    const spacer = document.createElement("div");
    spacer.className = "day-cell";
    spacer.style.visibility = "hidden";
    calendarGrid.appendChild(spacer);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const cellDate = new Date(year, month, day);
    const cellKey = getDateKey(cellDate);
    const effective = getEffectiveDayData(cellKey);
    const responsibilitiesCount = effective.responsibilities.length;
    const todoTotal = effective.todos.length;
    const todoRemaining = effective.todos.filter((todo) => !todo.done).length;

    const cell = document.createElement("div");
    cell.className = "day-cell";
    cell.dataset.date = cellKey;

    cell.innerHTML = `
      <div class="day-number">${day}</div>
      <div class="day-metrics">
        <span>${responsibilitiesCount} responsibilities</span>
        <span>${todoRemaining}/${todoTotal} todo</span>
      </div>
    `;

    cell.addEventListener("click", () => {
      state.selectedDate = cellDate;
      renderDetailPanel();
      updateSelectedDay();
    });

    calendarGrid.appendChild(cell);
  }

  updateSelectedDay();
};

const renderMonthGoal = () => {
  const key = getMonthKey(state.currentMonth);
  const meta = state.data.monthMeta[key];
  monthGoal.textContent = meta && meta.goalText ? meta.goalText : "Click to edit month goal...";
};

const updateSelectedDay = () => {
  const cells = document.querySelectorAll(".day-cell");
  cells.forEach((cell) => {
    const cellDate = cell.dataset.date;
    cell.classList.toggle(
      "selected",
      state.selectedDate && cellDate === getDateKey(state.selectedDate)
    );
  });
};

const renderDetailPanel = () => {
  if (!state.selectedDate) {
    detailPanel.classList.remove("active");
    detailEmpty.style.display = "block";
    detailContent.style.display = "none";
    return;
  }

  detailPanel.classList.add("active");
  detailEmpty.style.display = "none";
  detailContent.style.display = "flex";

  const dateKey = getDateKey(state.selectedDate);
  const effective = getEffectiveDayData(dateKey);
  selectedDateLabel.textContent = `Date selected: ${formatSelectedDate(state.selectedDate)}`;

  renderResponsibilities(effective.responsibilities, dateKey);
  renderTodos(effective.todos, dateKey);
  notesInput.value = effective.notes || "";
};

const renderResponsibilities = (items, dateKey) => {
  responsibilitiesList.innerHTML = "";
  if (items.length === 0) {
    responsibilitiesList.innerHTML = `<div class="empty-state">No responsibilities yet.</div>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "detail-item";

    const header = document.createElement("div");
    header.className = "detail-item-header";
    header.innerHTML = `
      <span>${item.startTime}–${item.endTime} · ${item.title}</span>
      <div class="item-actions">
        <button data-action="edit">Edit</button>
        <button data-action="delete">Delete</button>
      </div>
    `;

    const description = document.createElement("div");
    description.className = "item-description";
    description.textContent = item.description ? item.description : "No description given.";

    header.addEventListener("click", (event) => {
      if (event.target.dataset.action) return;
      card.classList.toggle("expanded");
    });

    header.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (button.dataset.action === "delete") {
          deleteResponsibility(item, dateKey);
        } else {
          openResponsibilityForm(item, dateKey);
        }
      });
    });

    card.appendChild(header);
    card.appendChild(description);
    responsibilitiesList.appendChild(card);
  });
};

const renderTodos = (items, dateKey) => {
  todosList.innerHTML = "";
  if (items.length === 0) {
    todosList.innerHTML = `<div class="empty-state">No to-do items yet.</div>`;
    return;
  }

  items.forEach((todo) => {
    const row = document.createElement("div");
    row.className = "todo-item";

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    const checkmark = document.createElement("span");
    checkmark.className = "checkmark";
    checkmark.textContent = "✔";
    const textSpan = document.createElement("span");
    textSpan.textContent = todo.text;

    label.appendChild(checkbox);
    label.appendChild(checkmark);
    label.appendChild(textSpan);

    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.innerHTML = `
      <button data-action="edit">Edit</button>
      <button data-action="delete">Delete</button>
    `;

    if (todo.done) {
      row.classList.add("completed");
    }

    checkbox.addEventListener("change", () => {
      updateTodoDone(todo, dateKey, checkbox.checked);
    });

    actions.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.action === "delete") {
          deleteTodo(todo, dateKey);
        } else {
          openTodoForm(todo, dateKey);
        }
      });
    });

    row.appendChild(label);
    row.appendChild(actions);
    todosList.appendChild(row);
  });
};

const openResponsibilityForm = (item = null, dateKey = null) => {
  if (!state.selectedDate) return;
  const dayEntry = getDayEntry(state.selectedDate);
  const title = promptRequired("Responsibility title:", item ? item.title : "");
  if (title === null) return;
  const startTime = promptRequired(
    "Start time (e.g., 12:25PM):",
    item ? item.startTime : ""
  );
  if (startTime === null) return;
  const endTime = promptRequired("End time (e.g., 1:45PM):", item ? item.endTime : "");
  if (endTime === null) return;
  const description = promptOptional("Description (optional):", item ? item.description : "");
  if (description === null) return;

  if (item && item.isRecurring) {
    ensureOverrideMap("respEdited", dateKey);
    state.data.overrides.respEdited[dateKey][item.recurringId] = {
      title,
      startTime,
      endTime,
      description: description || "",
    };
  } else if (item) {
    item.title = title;
    item.startTime = startTime;
    item.endTime = endTime;
    item.description = description || "";
  } else {
    const repeatType = promptRepeatType();
    if (repeatType === null) return;
    if (repeatType !== "none") {
      const rule = buildRecurringRule({
        type: "responsibility",
        startDate: getDateKey(state.selectedDate),
        repeatType,
        payload: { title, startTime, endTime, description: description || "" },
      });
      if (!rule) return;
      state.data.recurring.responsibilities.push(rule);
    } else {
      dayEntry.responsibilities.push({
        id: Date.now().toString(),
        title,
        startTime,
        endTime,
        description: description || "",
      });
    }
  }

  saveStorage();
  renderDetailPanel();
  renderMonth();
};

const openTodoForm = (item = null, dateKey = null) => {
  if (!state.selectedDate) return;
  const dayEntry = getDayEntry(state.selectedDate);
  const text = promptRequired("Todo text:", item ? item.text : "");
  if (text === null) return;

  if (item && item.isRecurring) {
    ensureOverrideMap("todoEdited", dateKey);
    state.data.overrides.todoEdited[dateKey][item.recurringId] = { text };
  } else if (item) {
    item.text = text;
  } else {
    const repeatType = promptRepeatType();
    if (repeatType === null) return;
    if (repeatType !== "none") {
      const rule = buildRecurringRule({
        type: "todo",
        startDate: getDateKey(state.selectedDate),
        repeatType,
        payload: { text },
      });
      if (!rule) return;
      state.data.recurring.todos.push(rule);
    } else {
      dayEntry.todos.push({
        id: Date.now().toString(),
        text,
        done: false,
      });
    }
  }

  saveStorage();
  renderDetailPanel();
  renderMonth();
};

const deleteResponsibility = (item, dateKey) => {
  if (item.isRecurring) {
    const action = promptSeriesAction();
    if (!action) return;
    if (action === "single") {
      ensureOverrideMap("respDeleted", dateKey);
      state.data.overrides.respDeleted[dateKey][item.recurringId] = true;
    } else if (action === "future") {
      shortenSeries(item.recurringId, dateKey, "responsibilities");
    } else if (action === "all") {
      removeSeries(item.recurringId, "responsibilities");
    }
  } else {
    const dayEntry = getDayEntry(state.selectedDate);
    dayEntry.responsibilities = dayEntry.responsibilities.filter((r) => r.id !== item.id);
  }
  saveStorage();
  renderDetailPanel();
  renderMonth();
};

const deleteTodo = (todo, dateKey) => {
  if (todo.isRecurring) {
    const action = promptSeriesAction();
    if (!action) return;
    if (action === "single") {
      ensureOverrideMap("todoDeleted", dateKey);
      state.data.overrides.todoDeleted[dateKey][todo.recurringId] = true;
    } else if (action === "future") {
      shortenSeries(todo.recurringId, dateKey, "todos");
    } else if (action === "all") {
      removeSeries(todo.recurringId, "todos");
    }
  } else {
    const dayEntry = getDayEntry(state.selectedDate);
    dayEntry.todos = dayEntry.todos.filter((t) => t.id !== todo.id);
  }
  saveStorage();
  renderDetailPanel();
  renderMonth();
};

const updateTodoDone = (todo, dateKey, done) => {
  if (todo.isRecurring) {
    ensureOverrideMap("todoDone", dateKey);
    state.data.overrides.todoDone[dateKey][todo.recurringId] = done;
  } else {
    const dayEntry = getDayEntry(state.selectedDate);
    const match = dayEntry.todos.find((t) => t.id === todo.id);
    if (match) match.done = done;
  }
  saveStorage();
  renderDetailPanel();
  renderMonth();
};

const ensureOverrideMap = (mapKey, dateKey) => {
  if (!state.data.overrides[mapKey][dateKey]) {
    state.data.overrides[mapKey][dateKey] = {};
  }
};

const buildRecurringRule = ({ type, startDate, repeatType, payload }) => {
  const intervalInput = promptOptional("Interval (e.g., 1 for every interval):", "1");
  if (intervalInput === null) return null;
  const interval = Math.max(1, parseInt(intervalInput, 10) || 1);
  let weekdays = null;
  if (repeatType === "weekly") {
    const weekdayInput = promptOptional(
      "Weekdays (0=Sun..6=Sat or Mon, Tue):",
      "Mon,Wed,Fri"
    );
    if (weekdayInput === null) return null;
    weekdays = parseWeekdays(weekdayInput);
    if (!weekdays.length) return null;
  }
  const endModeInput = promptOptional("End mode (none/until/count):", "none");
  if (endModeInput === null) return null;
  const endMode = endModeInput || "none";
  let endDate = null;
  let endCount = null;
  if (endMode === "until") {
    endDate = promptRequired("End date (YYYY-MM-DD):", "");
    if (endDate === null) return null;
  }
  if (endMode === "count") {
    const countInput = promptRequired("End after how many occurrences?", "10");
    if (countInput === null) return null;
    endCount = Math.max(1, parseInt(countInput, 10) || 1);
  }

  return {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    startDate,
    repeatType,
    interval,
    weekdays,
    endMode,
    endDate,
    endCount,
    ...payload,
  };
};

const parseWeekdays = (input) => {
  if (!input) return [];
  const map = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    tues: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    thur: 4,
    thurs: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
  };
  const tokens = input.split(/[,\\s]+/).filter(Boolean);
  return tokens
    .map((token) => token.trim().toLowerCase())
    .map((token) => (map[token] !== undefined ? map[token] : parseInt(token, 10)))
    .filter((value, index, array) => Number.isInteger(value) && value >= 0 && value <= 6 && array.indexOf(value) === index);
};

const promptRequired = (message, defaultValue) => {
  const response = prompt(message, defaultValue);
  if (response === null) return null;
  const trimmed = response.trim();
  if (!trimmed) return null;
  return trimmed;
};

const promptOptional = (message, defaultValue) => {
  const response = prompt(message, defaultValue);
  if (response === null) return null;
  return response.trim();
};

const promptRepeatType = () => {
  const response = prompt(
    "Repeat type (none/daily/weekdays/weekly/monthly):",
    "none"
  );
  if (response === null) return null;
  const value = response.trim().toLowerCase();
  const allowed = ["none", "daily", "weekdays", "weekly", "monthly"];
  return allowed.includes(value) ? value : "none";
};

const promptSeriesAction = () => {
  const response = prompt(
    "Delete which occurrences? (single/future/all):",
    "single"
  );
  if (response === null) return null;
  const value = response.trim().toLowerCase();
  if (value === "single" || value === "future" || value === "all") return value;
  return null;
};

const shortenSeries = (recurringId, dateKey, type) => {
  const rules = state.data.recurring[type];
  const rule = rules.find((entry) => entry.id === recurringId);
  if (!rule) return;
  const previousDate = shiftDateISO(dateKey, -1);
  rule.endMode = "until";
  rule.endDate = previousDate;
};

const removeSeries = (recurringId, type) => {
  state.data.recurring[type] = state.data.recurring[type].filter((rule) => rule.id !== recurringId);
  pruneOverrides(recurringId);
};

const pruneOverrides = (recurringId) => {
  Object.keys(state.data.overrides).forEach((mapKey) => {
    Object.keys(state.data.overrides[mapKey]).forEach((dateKey) => {
      if (state.data.overrides[mapKey][dateKey]?.[recurringId] !== undefined) {
        delete state.data.overrides[mapKey][dateKey][recurringId];
      }
      if (Object.keys(state.data.overrides[mapKey][dateKey]).length === 0) {
        delete state.data.overrides[mapKey][dateKey];
      }
    });
  });
};

const shiftDateISO = (dateISO, days) => {
  const date = parseISODate(dateISO);
  date.setDate(date.getDate() + days);
  return getDateKey(date);
};

const getEffectiveDayData = (dateISO) => {
  const base = state.data.days[dateISO] || {
    responsibilities: [],
    todos: [],
    notes: "",
  };

  const responsibilities = base.responsibilities.map((item) => ({ ...item }));
  const todos = base.todos.map((item) => ({ ...item }));
  const notes = base.notes || "";

  state.data.recurring.responsibilities.forEach((rule) => {
    if (!ruleAppliesToDate(rule, dateISO)) return;
    if (state.data.overrides.respDeleted[dateISO]?.[rule.id]) return;
    const overrides = state.data.overrides.respEdited[dateISO]?.[rule.id];
    responsibilities.push({
      id: `recurring:${rule.id}:${dateISO}`,
      recurringId: rule.id,
      isRecurring: true,
      title: overrides?.title ?? rule.title,
      startTime: overrides?.startTime ?? rule.startTime,
      endTime: overrides?.endTime ?? rule.endTime,
      description: overrides?.description ?? rule.description,
    });
  });

  state.data.recurring.todos.forEach((rule) => {
    if (!ruleAppliesToDate(rule, dateISO)) return;
    if (state.data.overrides.todoDeleted[dateISO]?.[rule.id]) return;
    const overrides = state.data.overrides.todoEdited[dateISO]?.[rule.id];
    const doneOverride = state.data.overrides.todoDone[dateISO]?.[rule.id];
    todos.push({
      id: `recurring:${rule.id}:${dateISO}`,
      recurringId: rule.id,
      isRecurring: true,
      text: overrides?.text ?? rule.text,
      done: doneOverride !== undefined ? doneOverride : false,
    });
  });

  return { responsibilities, todos, notes };
};

const ruleAppliesToDate = (rule, dateISO) => {
  const date = parseISODate(dateISO);
  const startDate = parseISODate(rule.startDate);
  if (date < startDate) return false;

  if (rule.repeatType === "none") {
    return dateISO === rule.startDate;
  }

  if (!withinEndBounds(rule, dateISO)) return false;

  if (rule.repeatType === "daily") {
    return daysBetween(startDate, date) % rule.interval === 0;
  }

  if (rule.repeatType === "weekdays") {
    if (date.getDay() === 0 || date.getDay() === 6) return false;
    const weekDiff = weeksBetween(startDate, date);
    return weekDiff % rule.interval === 0;
  }

  if (rule.repeatType === "weekly") {
    const weekdays = rule.weekdays?.length ? rule.weekdays : [startDate.getDay()];
    if (!weekdays.includes(date.getDay())) return false;
    const weekDiff = weeksBetween(startDate, date);
    return weekDiff % rule.interval === 0;
  }

  if (rule.repeatType === "monthly") {
    const monthsDiff = monthsBetween(startDate, date);
    if (monthsDiff % rule.interval !== 0) return false;
    const startDay = startDate.getDate();
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(startDay, lastDay);
    return date.getDate() === targetDay;
  }

  return false;
};

const withinEndBounds = (rule, dateISO) => {
  if (rule.endMode === "until" && rule.endDate) {
    return dateISO <= rule.endDate;
  }
  if (rule.endMode === "count" && rule.endCount) {
    const count = countOccurrencesThrough(rule, dateISO);
    return count <= rule.endCount;
  }
  return true;
};

const countOccurrencesThrough = (rule, dateISO) => {
  const date = parseISODate(dateISO);
  const startDate = parseISODate(rule.startDate);
  let count = 0;
  if (rule.repeatType === "none") {
    return dateISO === rule.startDate ? 1 : 0;
  }

  if (rule.repeatType === "daily") {
    return Math.floor(daysBetween(startDate, date) / rule.interval) + 1;
  }

  if (rule.repeatType === "weekdays") {
    let cursor = new Date(startDate);
    while (cursor <= date) {
      if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
        const weekDiff = weeksBetween(startDate, cursor);
        if (weekDiff % rule.interval === 0) count += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  }

  if (rule.repeatType === "weekly") {
    const weekdays = rule.weekdays?.length ? rule.weekdays : [startDate.getDay()];
    let cursor = new Date(startDate);
    while (cursor <= date) {
      const weekDiff = weeksBetween(startDate, cursor);
      if (weekDiff % rule.interval === 0 && weekdays.includes(cursor.getDay())) {
        count += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  }

  if (rule.repeatType === "monthly") {
    const monthsDiff = monthsBetween(startDate, date);
    const startDay = startDate.getDate();
    let occurrences = 0;
    for (let i = 0; i <= monthsDiff; i += rule.interval) {
      const current = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(startDay, lastDay);
      const occurrenceDate = new Date(current.getFullYear(), current.getMonth(), targetDay);
      if (occurrenceDate <= date) occurrences += 1;
    }
    return occurrences;
  }

  return count;
};

const parseISODate = (iso) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const daysBetween = (start, end) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor((stripTime(end) - stripTime(start)) / oneDay);
};

const weeksBetween = (start, end) => {
  return Math.floor(daysBetween(start, end) / 7);
};

const monthsBetween = (start, end) => {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
};

const stripTime = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getDayEntry = (date) => {
  const key = getDateKey(date);
  if (!state.data.days[key]) {
    state.data.days[key] = {
      responsibilities: [],
      todos: [],
      notes: "",
    };
  }
  return state.data.days[key];
};

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatSelectedDate = (date) => {
  const month = monthNames[date.getMonth()].slice(0, 3).toUpperCase();
  const day = date.getDate();
  const weekday = dayNames[date.getDay()];
  return `${month} ${day} (${weekday})`;
};

init();
