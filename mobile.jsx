// Mobile bottom nav + FAB capture
// Adaptive: labels depend on current domain, always exposes Capture (FAB) + Espaces (drawer)
const { useState: useStateM } = React;

function BottomNav({ view, onView, onCapture, onOpenSidebar }) {
  // Detect the 2 most relevant views for the currently selected screen
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navigation principale">
      <button className={view === 'storyboard' ? 'active' : ''}
              onClick={() => onView('storyboard')}
              aria-label="Storyboard">
        <IconGrid/><span>Board</span>
      </button>
      <button className={view === 'calendar' ? 'active' : ''}
              onClick={() => onView('calendar')}
              aria-label="Calendrier">
        <IconCalendar/><span>Agenda</span>
      </button>
      <button className="fab" onClick={onCapture} aria-label="Capturer" title="Capturer">
        <IconPlus/>
      </button>
      <button className={view === 'queue' || view === 'analytics' ? 'active' : ''}
              onClick={() => onView(view === 'queue' ? 'analytics' : 'queue')}
              aria-label="Queue / Analytics">
        <IconClock/><span>{view === 'analytics' ? 'Stats' : 'Queue'}</span>
      </button>
      <button onClick={onOpenSidebar} aria-label="Espaces">
        <IconFolder/><span>Menu</span>
      </button>
    </nav>
  );
}

Object.assign(window, { BottomNav });
