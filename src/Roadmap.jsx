const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" width="11" height="11">
    <path d="M5 12.5l4.2 4.2L19 7" stroke="#1F1E1C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function Roadmap({ roadmap = [], weekFocus = '', projectedFinish = '', status = '', dateLabel = '' }) {
  const atRisk = (status || '').toLowerCase().includes('risk')
  return (
    <div className="card rm">
      <div className="head">
        <div className="titlerow">
          <h1>Where we are</h1>
          <span className="date">{dateLabel}</span>
        </div>
        {weekFocus && <div className="focus" dangerouslySetInnerHTML={{ __html: weekFocus }} />}
      </div>
      <div className="tl">
        {roadmap.map(m => (
          <div className={'node ' + m.state} key={m.id}>
            <div className="rail">
              <div className="line" />
              <div className="dot">
                {m.state === 'done' ? <Check /> : m.state === 'active' ? <span className="pulse" /> : <span className="hollow" />}
              </div>
            </div>
            <div className="nbody">
              <div className="row1">
                <div className="mname"><span className="mid">{m.id}</span>{m.name}</div>
                <div className="mtarget">{m.target}</div>
              </div>
              {m.state === 'active' && (
                <>
                  <span className="tag here">● You are here</span>
                  <div className="aprog"><div className="bar"><span style={{ width: (m.progress || 0) + '%' }} /></div><span className="pct">{m.progress || 0}%</span></div>
                </>
              )}
              {m.state === 'done' && <span className="tag donetag">Done</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="foot">
        <span className="fin">Projected finish <b>{projectedFinish}</b></span>
        <span className={'statustag ' + (atRisk ? 'risk' : 'ok')}><span className="dot2" />{atRisk ? 'At risk' : 'On track'}</span>
      </div>
    </div>
  )
}
