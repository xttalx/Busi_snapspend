/* Icon set — thin, editorial stroke. 16px by default. */
const ICONS = {
  dashboard: <><path d="M3 3h6v8H3z"/><path d="M11 3h2v5h-2z"/><path d="M11 10h2v3h-2z"/><path d="M3 13v0"/><path d="M3 13h6"/></>,
  expense:   <><path d="M2 4h12v8H2z"/><path d="M2 7h12"/><circle cx="11.5" cy="9.5" r="1" fill="currentColor"/></>,
  invoice:   <><path d="M3 2h7l3 3v9H3z"/><path d="M10 2v3h3"/><path d="M5 8h6M5 10.5h6M5 13h3"/></>,
  paystub:   <><path d="M3 3h10v10H3z"/><path d="M3 6h10"/><path d="M5 9h2M5 11h4"/><path d="M10 9.5h1.5v2H10z"/></>,
  employees: <><circle cx="6" cy="6" r="2.4"/><path d="M2 13c0-2 2-3.4 4-3.4S10 11 10 13"/><circle cx="11.5" cy="6.5" r="1.8"/><path d="M9.5 12.5c0-1.4 1-2.5 2.5-2.5 1.6 0 2.5 1.1 2.5 2.5"/></>,
  reports:   <><path d="M2 13h12"/><path d="M4 13V8"/><path d="M7 13V5"/><path d="M10 13V9"/><path d="M13 13V3"/></>,
  business:  <><path d="M2 14h12"/><path d="M3 14V5l5-3 5 3v9"/><path d="M6 8h1M9 8h1M6 11h1M9 11h1"/></>,
  settings:  <><circle cx="8" cy="8" r="2.2"/><path d="M8 1.5l.7 1.6 1.7-.2.4 1.7 1.5.8-.7 1.6.8 1.5-1.6.7-.4 1.7-1.7-.2L8 14.5l-.7-1.6-1.7.2-.4-1.7-1.5-.8.7-1.6-.8-1.5 1.6-.7.4-1.7 1.7.2z"/></>,
  search:    <><circle cx="7" cy="7" r="4.2"/><path d="M10.5 10.5L14 14"/></>,
  plus:      <><path d="M8 3v10M3 8h10"/></>,
  close:     <><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></>,
  arrow:     <><path d="M3 8h10M9 4l4 4-4 4"/></>,
  arrow_up:  <><path d="M4 6l4-4 4 4M8 2v12"/></>,
  arrow_down:<><path d="M4 10l4 4 4-4M8 14V2"/></>,
  download:  <><path d="M8 2v8M4 7l4 4 4-4"/><path d="M2 13h12"/></>,
  print:     <><path d="M4 2h8v4H4z"/><path d="M2 6h12v6H10v2H6v-2H2z"/><path d="M6 9h4"/></>,
  send:      <><path d="M14 2L7 9"/><path d="M14 2L9 14l-2-5-5-2z"/></>,
  filter:    <><path d="M2 3h12l-4 6v5l-4-2V9z"/></>,
  edit:      <><path d="M2 14l1-3 8-8 2 2-8 8z"/><path d="M9 4l2 2"/></>,
  trash:     <><path d="M3 4h10M6 4V2.5h4V4M4.5 4l.5 9h6l.5-9"/></>,
  check:     <><path d="M3 8.5l3 3 7-7"/></>,
  more:      <><circle cx="3" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="13" cy="8" r="1" fill="currentColor"/></>,
  receipt:   <><path d="M3 1l1 1 1-1 1 1 1-1 1 1 1-1 1 1 1-1 1 1v13l-1-1-1 1-1-1-1 1-1-1-1 1-1-1-1 1-1-1z"/><path d="M5 5h6M5 8h6M5 11h4"/></>,
  calendar:  <><path d="M2 4h12v10H2z"/><path d="M2 7h12"/><path d="M5 2v3M11 2v3"/></>,
  chev_r:    <><path d="M6 3l4 5-4 5"/></>,
  external:  <><path d="M6 3H3v10h10v-3"/><path d="M9 3h4v4"/><path d="M7 9l6-6"/></>,
  sparkles:  <><path d="M8 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/><path d="M13 9l.5 1.5L15 11l-1.5.5L13 13l-.5-1.5L11 11l1.5-.5z"/></>,
};

function Icon({ name, size = 16, stroke = 1.4, ...rest }) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="glyph"
      {...rest}
    >
      {path}
    </svg>
  );
}

window.Icon = Icon;
