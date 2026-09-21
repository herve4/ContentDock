// Analytics view for CM workspaces
const { useMemo: useMemoAn } = React;

function AnalyticsView({ drafts }) {
  const stats = useMemoAn(() => {
    const total = drafts.length;
    const published = drafts.filter(d => d.status === 'published').length;
    const scheduled = drafts.filter(d => d.scheduled && d.status !== 'published').length;
    const inProgress = drafts.filter(d => d.status === 'creation' || d.status === 'review').length;
    // Distribution per channel
    const byChannel = {};
    drafts.forEach(d => byChannel[d.channel] = (byChannel[d.channel] || 0) + 1);
    // Distribution per status
    const byStatus = {};
    window.CD_DATA.statuses.forEach(s => byStatus[s.id] = 0);
    drafts.forEach(d => byStatus[d.status] = (byStatus[d.status] || 0) + 1);
    // Distribution per weekday (based on scheduled.day)
    const byDow = [0,0,0,0,0,0,0];
    drafts.forEach(d => {
      if (!d.scheduled) return;
      const date = new Date();
      date.setDate(d.scheduled.day);
      const dow = (date.getDay() + 6) % 7; // Mon=0
      byDow[dow]++;
    });
    // Best times (top 4 scheduled hours)
    const hourCounts = {};
    drafts.forEach(d => {
      if (d.scheduled) hourCounts[d.scheduled.hour] = (hourCounts[d.scheduled.hour] || 0) + 1;
    });
    const bestTimes = Object.entries(hourCounts).sort((a,b) => b[1]-a[1]).slice(0,4);
    // Heatmap [dow][hour]
    const heatmap = Array.from({length: 7}, () => Array(12).fill(0));
    drafts.forEach(d => {
      if (!d.scheduled) return;
      const date = new Date(); date.setDate(d.scheduled.day);
      const dow = (date.getDay() + 6) % 7;
      const h = d.scheduled.hour;
      if (h >= 7 && h <= 18) heatmap[dow][h-7]++;
    });
    return { total, published, scheduled, inProgress, byChannel, byStatus, byDow, bestTimes, heatmap };
  }, [drafts]);

  const chColor = ch => ({ ig: '#e1306c', li: '#0a66c2', x: '#0f172a', fb: '#1877f2', tt: '#25f4ee', bl: '#a78bfa' }[ch] || '#888');
  const statusColor = s => ({ idea:'#6e6e7a', creation:'#60a5fa', review:'#fbbf24', ready:'#2dd4bf', published:'#4ade80' }[s]);

  const maxDow = Math.max(1, ...stats.byDow);
  const totalCh = Object.values(stats.byChannel).reduce((a,b)=>a+b,0) || 1;
  const dowLabels = ['LUN','MAR','MER','JEU','VEN','SAM','DIM'];

  const spark = pts => {
    const w = 80, h = 30;
    const max = Math.max(...pts, 1);
    return pts.map((v,i) => `${(i/(pts.length-1))*w},${h - (v/max)*h}`).join(' ');
  };

  return (
    <div>
      <div className="stats-grid">
        <StatCard label="Brouillons" icon={<IconLayers/>} value={stats.total} delta="+3 cette semaine"/>
        <StatCard label="Programmés" icon={<IconClock/>} value={stats.scheduled} delta={`${Math.round(stats.scheduled/stats.total*100)}% du total`}/>
        <StatCard label="En cours" icon={<IconEdit/>} value={stats.inProgress} delta="création + review"/>
        <StatCard label="Publiés" icon={<IconCheck/>} value={stats.published} delta="+1 vs sem. passée" spark={spark([2,4,3,5,4,6,7])} sparkColor="var(--ok)"/>
      </div>

      <div className="analytics-grid">
        <div className="analytics-panel">
          <h3><IconCalendar/>Publications programmées par jour</h3>
          <div className="week-chart">
            {stats.byDow.map((n, i) => {
              // stack by channel — simplified: total column, then breakdown
              const dayDrafts = drafts.filter(d => {
                if (!d.scheduled) return false;
                const dt = new Date(); dt.setDate(d.scheduled.day);
                return ((dt.getDay()+6)%7) === i;
              });
              const byCh = {};
              dayDrafts.forEach(d => byCh[d.channel] = (byCh[d.channel]||0)+1);
              const hRatio = n / maxDow;
              return (
                <div key={i} className="week-bar-col" title={`${dowLabels[i]} — ${n} publication${n>1?'s':''}`}>
                  <div className="week-bar-stack" style={{height: `${hRatio * 100}%`, minHeight: n ? 4 : 0}}>
                    {Object.entries(byCh).map(([ch, count]) => (
                      <div key={ch} className="week-bar"
                           style={{
                             flex: count,
                             background: chColor(ch),
                           }}/>
                    ))}
                  </div>
                  <div className="week-dow">{dowLabels[i]}</div>
                </div>
              );
            })}
          </div>
          <div className="analytics-legend">
            {Object.entries(stats.byChannel).map(([ch, n]) => (
              <span key={ch}>
                <span className="dot" style={{background: chColor(ch)}}/>
                {window.CD_DATA.channels[ch]?.label} · {n}
              </span>
            ))}
          </div>
        </div>

        <div className="analytics-panel">
          <h3><IconLayout/>Répartition par canal</h3>
          <div className="channel-chart">
            {Object.entries(stats.byChannel).sort((a,b) => b[1]-a[1]).map(([ch, n]) => (
              <div key={ch} className="channel-row">
                <div className="label"><ChannelBadge ch={ch} size={14}/>{window.CD_DATA.channels[ch]?.label}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{
                    width: `${(n / totalCh) * 100}%`,
                    background: chColor(ch),
                  }}/>
                </div>
                <span className="val">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-panel">
          <h3><IconClock/>Créneaux fréquents</h3>
          <div style={{color:'var(--text-3)', fontSize:11.5, marginBottom:8}}>
            Vos heures de publication les plus utilisées dans le calendrier.
          </div>
          <div className="best-times">
            {stats.bestTimes.map(([h, n]) => (
              <div key={h} className="best-time-cell">
                <div className="h">{String(h).padStart(2,'0')}:00</div>
                <div className="d">{n}× utilisée{n>1?'s':''}</div>
              </div>
            ))}
            {stats.bestTimes.length === 0 && (
              <div style={{gridColumn:'span 4', color:'var(--text-4)', textAlign:'center', padding:20, fontSize:11.5}}>
                Aucune publication programmée pour l'instant.
              </div>
            )}
          </div>
        </div>

        <div className="analytics-panel">
          <h3><IconColumns/>Statuts en cours</h3>
          <div className="channel-chart">
            {window.CD_DATA.statuses.map(s => {
              const n = stats.byStatus[s.id] || 0;
              return (
                <div key={s.id} className="channel-row">
                  <div className="label"><span className={`status ${s.id}`}><span className="dot"/></span>{s.label}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{
                      width: `${(n / (stats.total || 1)) * 100}%`,
                      background: statusColor(s.id),
                    }}/>
                  </div>
                  <span className="val">{n}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="analytics-panel" style={{gridColumn:'span 2'}}>
          <h3><IconZap/>Heatmap — semaine × horaire (7h → 18h)</h3>
          <div className="heatmap-wrap">
            <div className="heatmap-labels-y">
              {dowLabels.map(l => <div key={l}>{l}</div>)}
            </div>
            <div>
              <div className="heatmap-grid" style={{gridTemplateColumns: 'repeat(12, 1fr)'}}>
                {stats.heatmap.flatMap((row, di) =>
                  row.map((v, hi) => {
                    const max = Math.max(1, ...stats.heatmap.flat());
                    const alpha = v === 0 ? 0 : 0.15 + (v / max) * 0.85;
                    return <div key={`${di}-${hi}`}
                                className="heatmap-cell"
                                title={`${dowLabels[di]} ${hi+7}h · ${v} publication${v>1?'s':''}`}
                                style={v > 0 ? { background: `rgba(255,90,31,${alpha})` } : {}}/>;
                  })
                )}
              </div>
              <div className="heatmap-labels-x" style={{gridTemplateColumns: 'repeat(12, 1fr)'}}>
                {Array.from({length: 12}, (_,i) => <div key={i}>{i+7}h</div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, icon, value, delta, spark, sparkColor }) {
  const isDown = delta && delta.includes('-') && !delta.includes('+');
  return (
    <div className="stat-card">
      <div className="label">{icon}{label}</div>
      <div className="value">{value}</div>
      {delta && <div className={`delta ${isDown ? 'down' : ''}`}>{delta}</div>}
      {spark && (
        <svg className="sparkline" viewBox="0 0 80 30" fill="none">
          <polyline points={spark} stroke={sparkColor || 'var(--accent)'} strokeWidth="1.5"/>
        </svg>
      )}
    </div>
  );
}

Object.assign(window, { AnalyticsView, StatCard });
