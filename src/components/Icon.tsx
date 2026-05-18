// Stroke icons ported from bloom-icons.jsx
import * as React from 'react';

type Props = {
  name: string;
  size?: number;
  stroke?: number;
  color?: string;
  fill?: string;
  style?: React.CSSProperties;
};

export function Icon({
  name,
  size = 22,
  stroke = 1.6,
  color = 'currentColor',
  fill = 'none',
  style,
}: Props) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill,
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
  };
  switch (name) {
    case 'home': return (<svg {...props}><path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2v-9z"/></svg>);
    case 'timeline': return (<svg {...props}><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 8v8M8 6h8M8 18h8"/></svg>);
    case 'bloom': return (<svg {...props}><path d="M12 6c2 0 3 1.5 3 3.5 0 1-.4 1.8-1 2.4M12 6c-2 0-3 1.5-3 3.5 0 1 .4 1.8 1 2.4M12 14c2 0 3-1.5 3-3.5M12 14c-2 0-3-1.5-3-3.5"/><circle cx="12" cy="12" r="2"/><path d="M12 14v6M9 19l-2 1M15 19l2 1"/></svg>);
    case 'care': return (<svg {...props}><path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z"/></svg>);
    case 'profile': return (<svg {...props}><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg>);
    case 'plus': return (<svg {...props}><path d="M12 5v14M5 12h14"/></svg>);
    case 'mic': return (<svg {...props}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>);
    case 'feed': return (<svg {...props}><path d="M9 3l3 5 3-5M12 8v6M7 14a5 5 0 0010 0z"/></svg>);
    case 'sleep': return (<svg {...props}><path d="M21 13a9 9 0 11-10-10 7 7 0 0010 10z"/></svg>);
    case 'diaper': return (<svg {...props}><path d="M4 8h16l-2 9a3 3 0 01-3 2H9a3 3 0 01-3-2L4 8z"/><path d="M4 8l3-3h10l3 3"/></svg>);
    case 'growth': return (<svg {...props}><path d="M4 20l5-5 4 4 7-9"/><path d="M14 10h6v6"/></svg>);
    case 'medicine': return (<svg {...props}><rect x="3" y="9" width="18" height="6" rx="3"/><path d="M12 9v6"/></svg>);
    case 'mood': return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M8.5 14a4 4 0 007 0"/></svg>);
    case 'milestone': return (<svg {...props}><path d="M12 2l2.6 5.4L20 8l-4 4 1 6-5-3-5 3 1-6-4-4 5.4-.6L12 2z"/></svg>);
    case 'note': return (<svg {...props}><path d="M5 4h11l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"/><path d="M16 4v4h4M8 13h8M8 17h5"/></svg>);
    case 'chevron': return (<svg {...props}><path d="M9 6l6 6-6 6"/></svg>);
    case 'chevronL': return (<svg {...props}><path d="M15 6l-6 6 6 6"/></svg>);
    case 'chevronD': return (<svg {...props}><path d="M6 9l6 6 6-6"/></svg>);
    case 'chevronU': return (<svg {...props}><path d="M6 15l6-6 6 6"/></svg>);
    case 'close': return (<svg {...props}><path d="M6 6l12 12M18 6L6 18"/></svg>);
    case 'check': return (<svg {...props}><path d="M5 12l4 4 10-10"/></svg>);
    case 'sparkle': return (<svg {...props}><path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z"/><path d="M19 15l.7 1.6L21 17l-1.3.5L19 19l-.7-1.5L17 17l1.3-.4z"/></svg>);
    case 'leaf': return (<svg {...props}><path d="M5 19c0-9 6-14 15-14-1 9-6 15-15 14z"/><path d="M5 19l8-8"/></svg>);
    case 'flame': return (<svg {...props}><path d="M12 3c1 4 5 5 5 10a5 5 0 11-10 0c0-2 1-3 2-4 1 2 3 1 3-1 0-2-1-3 0-5z"/></svg>);
    case 'doctor': return (<svg {...props}><path d="M5 4v5a4 4 0 008 0V4M5 4h2M11 4h2M9 13v2a4 4 0 008 0v-1"/><circle cx="17" cy="14" r="2"/></svg>);
    case 'shield': return (<svg {...props}><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z"/></svg>);
    case 'bell': return (<svg {...props}><path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2zM10 20a2 2 0 004 0"/></svg>);
    case 'search': return (<svg {...props}><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>);
    case 'arrowR': return (<svg {...props}><path d="M5 12h14M13 6l6 6-6 6"/></svg>);
    case 'arrowU': return (<svg {...props}><path d="M12 19V5M6 11l6-6 6 6"/></svg>);
    case 'lock': return (<svg {...props}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>);
    case 'send': return (<svg {...props}><path d="M4 12l16-8-6 18-3-7-7-3z"/></svg>);
    case 'menu': return (<svg {...props}><path d="M4 7h16M4 12h16M4 17h10"/></svg>);
    case 'edit': return (<svg {...props}><path d="M4 20h4l11-11-4-4L4 16v4z"/></svg>);
    case 'thermo': return (<svg {...props}><path d="M10 4a2 2 0 014 0v9a4 4 0 11-4 0V4z"/></svg>);
    case 'clock': return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
    case 'sun': return (<svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5L7 17M17 7l1.5-1.5"/></svg>);
    case 'moon': return (<svg {...props}><path d="M21 13a9 9 0 11-10-10 7 7 0 0010 10z"/></svg>);
    case 'logout': return (<svg {...props}><path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l-5-5 5-5M5 12h12"/></svg>);
    default: return (<svg {...props}><circle cx="12" cy="12" r="6"/></svg>);
  }
}
