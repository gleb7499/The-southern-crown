import { useEffect, useMemo, useRef, useState } from 'react';

const MONTH_NAMES_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const WEEKDAY_NAMES_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatDateYYYYMMDD(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseYYYYMMDD(value) {
  if (!value) return null;
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  if (!match) return null;
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return null;
  return date;
}

function toMondayFirstIndex(jsDayIndex) {
  // JS: 0=Sun..6=Sat -> Monday-first: 0=Mon..6=Sun
  return (jsDayIndex + 6) % 7;
}

function clampInt(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export default function DateDropdownPicker({
  value,
  onChange,
  inputClassName = 'filter-input',
  placeholder = 'Выберите дату',
}) {
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const parsedValue = useMemo(() => parseYYYYMMDD(value), [value]);

  const initialMonth = parsedValue ? parsedValue.getMonth() : new Date().getMonth();
  const initialYear = parsedValue ? parsedValue.getFullYear() : new Date().getFullYear();

  const [{ month: viewMonth, year: viewYear }, setView] = useState(() => ({
    month: initialMonth,
    year: initialYear,
  }));

  const [isYearEditOpen, setIsYearEditOpen] = useState(false);
  const [yearDraft, setYearDraft] = useState(String(initialYear));

  useEffect(() => {
    if (!parsedValue) return;
    setView({ month: parsedValue.getMonth(), year: parsedValue.getFullYear() });
    setIsYearEditOpen(false);
  }, [parsedValue]);

  useEffect(() => {
    if (!isOpen) return;

    const onMouseDown = (event) => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const target = event.target;
      if (anchor.contains(target) || panel.contains(target)) return;
      setIsOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const firstDayIndex = toMondayFirstIndex(firstOfMonth.getDay());

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    // Leading days from previous month
    for (let i = firstDayIndex; i > 0; i -= 1) {
      const day = daysInPrevMonth - i + 1;
      cells.push({
        key: `p-${day}`,
        date: new Date(viewYear, viewMonth - 1, day),
        isOutside: true,
      });
    }

    // Current month
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({
        key: `c-${day}`,
        date: new Date(viewYear, viewMonth, day),
        isOutside: false,
      });
    }

    // Trailing days from next month to fill 6 weeks (42 cells)
    const trailingCount = 42 - cells.length;
    for (let day = 1; day <= trailingCount; day += 1) {
      cells.push({
        key: `n-${day}`,
        date: new Date(viewYear, viewMonth + 1, day),
        isOutside: true,
      });
    }

    return cells;
  }, [viewMonth, viewYear]);

  const displayedValue = useMemo(() => {
    if (!parsedValue) return '';
    const dd = pad2(parsedValue.getDate());
    const mm = pad2(parsedValue.getMonth() + 1);
    const yyyy = parsedValue.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }, [parsedValue]);

  const goPrevMonth = () => {
    setIsYearEditOpen(false);
    setView(({ month, year }) => {
      if (month === 0) return { month: 11, year: year - 1 };
      return { month: month - 1, year };
    });
  };

  const goNextMonth = () => {
    setIsYearEditOpen(false);
    setView(({ month, year }) => {
      if (month === 11) return { month: 0, year: year + 1 };
      return { month: month + 1, year };
    });
  };

  const openYearEditor = () => {
    setYearDraft(String(viewYear));
    setIsYearEditOpen(true);
  };

  const closeYearEditor = () => {
    setIsYearEditOpen(false);
    setYearDraft(String(viewYear));
  };

  const applyYearDraft = () => {
    const parsed = Number(yearDraft);
    if (!Number.isFinite(parsed)) {
      closeYearEditor();
      return;
    }
    const nextYear = clampInt(parsed, 1900, 2100);
    setView(({ month }) => ({ month, year: nextYear }));
    setIsYearEditOpen(false);
  };

  const handlePick = (date) => {
    onChange(formatDateYYYYMMDD(date));
    setIsOpen(false);
  };

  const isSameDay = (a, b) => {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  return (
    <div className="date-dropdown" ref={anchorRef}>
      <input
        type="text"
        className={inputClassName}
        value={displayedValue}
        placeholder={placeholder}
        readOnly
        onClick={() => {
          setIsOpen((v) => !v);
          setIsYearEditOpen(false);
        }}
        aria-label="Дата"
      />

      {isOpen && (
        <div className="date-dropdown__panel" ref={panelRef} role="dialog" aria-label="Календарь">
          <div className="date-dropdown__header">
            <button
              type="button"
              className="date-dropdown__nav"
              onClick={goPrevMonth}
              aria-label="Предыдущий месяц"
            >
              ‹
            </button>

            <div
              className="date-dropdown__title"
              aria-label={`${MONTH_NAMES_RU[viewMonth]} ${viewYear}`}
            >
              <span className="date-dropdown__month" title={MONTH_NAMES_RU[viewMonth]}>
                {MONTH_NAMES_RU[viewMonth]}
              </span>
              <button
                type="button"
                className="date-dropdown__year"
                onClick={() => (isYearEditOpen ? closeYearEditor() : openYearEditor())}
                aria-label="Выбрать год"
                title="Нажмите, чтобы указать год"
              >
                {viewYear}
              </button>
            </div>

            <button
              type="button"
              className="date-dropdown__nav"
              onClick={goNextMonth}
              aria-label="Следующий месяц"
            >
              ›
            </button>
          </div>

          {isYearEditOpen && (
            <div className="date-dropdown__year-editor" aria-label="Ввод года">
              <input
                className="date-dropdown__year-input"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                step={1}
                value={yearDraft}
                onChange={(e) => setYearDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyYearDraft();
                  if (e.key === 'Escape') closeYearEditor();
                }}
                aria-label="Год"
              />
              <button
                type="button"
                className="date-dropdown__year-apply"
                onClick={applyYearDraft}
                aria-label="Применить год"
              >
                OK
              </button>
              <button
                type="button"
                className="date-dropdown__year-cancel"
                onClick={closeYearEditor}
                aria-label="Отменить ввод года"
              >
                ✕
              </button>
            </div>
          )}

          <div className="date-dropdown__weekdays">
            {WEEKDAY_NAMES_RU.map((name) => (
              <div key={name} className="date-dropdown__weekday">
                {name}
              </div>
            ))}
          </div>

          <div className="date-dropdown__grid">
            {calendarCells.map((cell) => {
              const selected = isSameDay(cell.date, parsedValue);
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={
                    'date-dropdown__day' +
                    (cell.isOutside ? ' is-outside' : '') +
                    (selected ? ' is-selected' : '')
                  }
                  onClick={() => handlePick(cell.date)}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
