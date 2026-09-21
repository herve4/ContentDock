// Calendar view — month + week, drag & drop
const { useState: useStateC, useMemo: useMemoC } = React;

function CalendarView({ drafts, onOpen, onSchedule, onUnschedule }) {
  const [mode, setMode] = useStateC('month'); // month | week
  const now = new Date();
  const [year, setYear] = useStateC(now.getFullYear());
  const [month, setMonth] = useStateC(now.getMonth()); // 0-based

  const scheduled = drafts.filter(d => d.scheduled);
  const unscheduled = drafts.filter(d => !d.scheduled && d.status !== 'published');

  return (
    <div className="calendar-wrap">
      <UnscheduledPanel drafts={unscheduled} onOpen={onOpen} onUnschedule={onUnschedule}/>
      <div className="calendar">
        <CalHeader mode={mode} setMode={setMode} month={month} year={year}
                   onPrev={() => { if(month===0){setMonth(11); setYear(year-1);} else setMonth(month-1); }}
                   onNext={() => { if(month===11){setMonth(0); setYear(year+1);} else setMonth(month+1); }}
                   onToday={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}/>
        {mode === 'month'
          ? <MonthGrid year={year} month={month} scheduled={scheduled} onSchedule={onSchedule} onOpen={onOpen}/>
          : <WeekGrid year={year} month={month} scheduled={scheduled} onSchedule={onSchedule} onOpen={onOpen}/>}
      </div>
    </div>
  );
}

function CalHeader({ mode, setMode, month, year, onPrev, onNext, onToday }) {
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return (
    <div className="calendar-head">
      <div className="cal-nav">
        <button onClick={onPrev}><IconChevronLeft size={14}/></button>
        <button onClick={onNext}><IconChevronRight size={14}/></button>
      </div>
      <button className="cal-today" onClick={onToday}>Aujourd'hui</button>
      <div className="cal-title">{monthNames[month]} {year}</div>
      <div className="cal-mode">
        <button className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>Semaine</button>
        <button className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>Mois</button>
      </div>
    </div>
  );
}

function UnscheduledPanel({ drafts, onOpen, onUnschedule }) {
  const [dragId, setDragId] = useStateC(null);
  return (
    <div className="unsched-panel"
         onDragOver={e => e.preventDefault()}
         onDrop={e => {
           const id = e.dataTransfer.getData('text/plain');
           if (id) onUnschedule(id);
         }}>
      <div className="unsched-head">
        <span>Non planifiés</span>
        <span className="badge">{drafts.length}</span>
      </div>
      {drafts.length === 0 && (
        <div style={{padding: 20, textAlign:'center', color:'var(--text-4)', fontSize:11.5}}>
          Glisser un événement ici pour le retirer du planning
        </div>
      )}
      {drafts.map(d => (
        <div key={d.id}
             className={`unsched-card ${dragId === d.id ? 'dragging' : ''}`}
             draggable
             onDragStart={e => { e.dataTransfer.setData('text/plain', d.id); setDragId(d.id); }}
             onDragEnd={() => setDragId(null)}
             onClick={() => onOpen(d.id)}>
          <div className="uc-thumb">
            {d.images[0]
              ? <img src={d.images[0]} alt=""/>
              : <div style={{width:'100%', height:'100%', display:'grid', placeItems:'center', color:'var(--text-4)'}}><IconHash size={14}/></div>}
          </div>
          <div className="uc-body">
            <div className="uc-title">{d.title}</div>
            <div className="uc-meta">
              <ChannelBadge ch={d.channel} size={12}/>
              <span>{d.body ? d.body.slice(0, 30) + '…' : 'sans texte'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthGrid({ year, month, scheduled, onSchedule, onOpen }) {
  const dow = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const today = new Date();
  const isSameMonth = today.getFullYear() === year && today.getMonth() === month;
  const [overDay, setOverDay] = useStateC(null);

  // Build cells for whole month starting on Monday
  const firstDay = new Date(year, month, 1);
  const jsDay = firstDay.getDay(); // 0=Sun..6=Sat
  const mondayOffset = (jsDay + 6) % 7; // convert so Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = 0; i < mondayOffset; i++) {
    cells.push({ day: daysInPrev - mondayOffset + 1 + i, other: true, m: month - 1 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, other: false, m: month });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const next = cells.length - mondayOffset - daysInMonth + 1;
    cells.push({ day: next, other: true, m: month + 1 });
    if (cells.length >= 42) break;
  }

  return (
    <>
      <div className="cal-grid" style={{gridAutoRows: 'auto'}}>
        {dow.map(x => <div key={x} className="cal-dow">{x}</div>)}
      </div>
      <div className="cal-grid">
        {cells.map((c, i) => {
          const isToday = !c.other && isSameMonth && c.day === today.getDate();
          const events = c.other ? [] : scheduled.filter(d => d.scheduled.day === c.day);
          const dropKey = `${c.m}-${c.day}`;
          return (
            <div key={i}
                 className={`cal-cell ${c.other ? 'other-month' : ''} ${isToday ? 'today' : ''} ${overDay === dropKey ? 'drag-over' : ''}`}
                 onDragOver={e => { e.preventDefault(); setOverDay(dropKey); }}
                 onDragLeave={() => setOverDay(null)}
                 onDrop={e => {
                   e.preventDefault();
                   const id = e.dataTransfer.getData('text/plain');
                   if (id && !c.other) onSchedule(id, c.day, 10);
                   setOverDay(null);
                 }}>
              <div className="cal-day-num">{c.day}</div>
              {events.map(d => (
                <div key={d.id}
                     className="cal-event"
                     draggable
                     onDragStart={e => e.dataTransfer.setData('text/plain', d.id)}
                     onClick={() => onOpen(d.id)}
                     style={{borderLeftColor: chColor(d.channel)}}>
                  <ChannelBadge ch={d.channel} size={12}/>
                  <span className="cal-event-title">{d.title}</span>
                  <span className="cal-event-time">{String(d.scheduled.hour).padStart(2,'0')}h</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

function WeekGrid({ year, month, scheduled, onSchedule, onOpen }) {
  const today = new Date();
  // Get Monday of current month week (simpler: build week from 1st Monday visible)
  const monday = getStartOfWeek(new Date(year, month, today.getDate() || 1));
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
  const hours = Array.from({length: 14}, (_,i) => i + 7); // 7h -> 20h

  const [over, setOver] = useStateC(null);
  const dowLabels = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  return (
    <div className="cal-week" style={{overflowY:'auto'}}>
      <div/>
      {days.map((d, i) => {
        const isToday = d.toDateString() === today.toDateString();
        return (
          <div key={i} className="cal-week-daycol">
            <div className={`cal-week-dow ${isToday ? 'today' : ''}`}>
              {dowLabels[i]} <span className="num">{d.getDate()}</span>
            </div>
          </div>
        );
      })}
      {hours.map(h => (
        <React.Fragment key={h}>
          <div className="cal-week-hour">{String(h).padStart(2,'0')}:00</div>
          {days.map((d, di) => {
            const events = scheduled.filter(e => e.scheduled.day === d.getDate() && e.scheduled.hour === h && d.getMonth() === month);
            const key = `${di}-${h}`;
            return (
              <div key={di}
                   className={`cal-week-slot ${over === key ? 'drag-over' : ''}`}
                   style={{position:'relative'}}
                   onDragOver={e => { e.preventDefault(); setOver(key); }}
                   onDragLeave={() => setOver(null)}
                   onDrop={e => {
                     e.preventDefault();
                     const id = e.dataTransfer.getData('text/plain');
                     if (id) onSchedule(id, d.getDate(), h);
                     setOver(null);
                   }}>
                {events.map(ev => (
                  <div key={ev.id}
                       className="cal-week-event"
                       style={{top:2, height: 40, borderLeftColor: chColor(ev.channel)}}
                       draggable
                       onDragStart={e => e.dataTransfer.setData('text/plain', ev.id)}
                       onClick={() => onOpen(ev.id)}>
                    <div className="we-title" style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{ev.title}</div>
                    <div className="we-time"><ChannelBadge ch={ev.channel} size={10}/><span>{String(h).padStart(2,'0')}:00</span></div>
                  </div>
                ))}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

function getStartOfWeek(d) {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const m = new Date(d);
  m.setDate(d.getDate() - diff);
  return m;
}

function chColor(ch) {
  const m = { ig: '#e1306c', li: '#0a66c2', x: '#111', fb: '#1877f2', tt: '#25f4ee', bl: '#a78bfa' };
  return m[ch] || 'var(--accent)';
}

Object.assign(window, { CalendarView, chColor });
