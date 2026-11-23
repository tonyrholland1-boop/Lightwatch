const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const solid = { fill: 'currentColor', stroke: 'none' };

export function Icon({ name, size = 16, ...rest }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
    focusable: 'false',
    ...rest,
  };

  switch (name) {
    case 'bolt':
      return (
        <svg {...common} {...base}>
          <path d="M13 2 4.5 13.5H11L10 22l9-11.5h-6.5L13 2Z" />
        </svg>
      );
    case 'boltOff':
      return (
        <svg {...common} {...base}>
          <path d="M13 2 6.6 10.3H11L10 22l3.2-4.1" />
          <path d="M3 3l18 18" />
        </svg>
      );
    case 'boltSolid':
      return (
        <svg {...common} {...solid}>
          <path d="M13 2 4.5 13.5H11L10 22l9-11.5h-6.5L13 2Z" />
        </svg>
      );
    case 'help':
      return (
        <svg {...common} {...base}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.6 9.3a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.7v.4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case 'scale':
      return (
        <svg {...common} {...base}>
          <path d="M12 4v16M6 8h12" />
          <path d="M6 8 3 14a3 3 0 0 0 6 0L6 8ZM18 8l-3 6a3 3 0 0 0 6 0l-3-6Z" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common} {...base}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common} {...base}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case 'chevronDown':
      return (
        <svg {...common} {...base}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case 'arrowRight':
      return (
        <svg {...common} {...base}>
          <path d="M4 12h16M14 6l6 6-6 6" />
        </svg>
      );
    case 'arrowDown':
      return (
        <svg {...common} {...base}>
          <path d="M12 4v16M6 14l6 6 6-6" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common} {...base}>
          <path d="m4.5 12.5 5 5 10-11" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common} {...base}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case 'pin':
      return (
        <svg {...common} {...base}>
          <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common} {...base}>
          <path d="M12 3 5 6v5.5c0 4.4 3 7.6 7 9.5 4-1.9 7-5.1 7-9.5V6l-7-3Z" />
          <path d="m9.2 12 2 2 3.6-4" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common} {...base}>
          <circle cx="9" cy="8.5" r="3.2" />
          <path d="M3.2 19.2a5.8 5.8 0 0 1 11.6 0" />
          <path d="M16 5.6a3 3 0 0 1 0 5.8M17.4 14.3a5 5 0 0 1 3.4 4.9" />
        </svg>
      );
    case 'eyeOff':
      return (
        <svg {...common} {...base}>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.3A9.7 9.7 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3 3.6" />
          <path d="M6.4 7.9A16.8 16.8 0 0 0 3 12s4 6 9 6c1.2 0 2.3-.3 3.3-.8" />
        </svg>
      );
    case 'layers':
      return (
        <svg {...common} {...base}>
          <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
          <path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" />
        </svg>
      );
    case 'waves':
      return (
        <svg {...common} {...base}>
          <path d="M2 8.5c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
          <path d="M2 13.5c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
          <path d="M2 18.5c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...common} {...base}>
          <path d="M12 4 2.8 19.5h18.4L12 4Z" />
          <path d="M12 10v4.2M12 17.2h.01" />
        </svg>
      );
    case 'info':
      return (
        <svg {...common} {...base}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5.5M12 7.8h.01" />
        </svg>
      );
    case 'share':
      return (
        <svg {...common} {...base}>
          <path d="M12 3v11M7.5 7.5 12 3l4.5 4.5" />
          <path d="M5 14v5.5c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5V14" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...common} {...base}>
          <path d="M20 11a8 8 0 1 0-2.6 6.3" />
          <path d="M20 4.5V11h-6.5" />
        </svg>
      );
    case 'spark':
      return (
        <svg {...common} {...base}>
          <path d="M12 3v3M12 18v3M4.2 12h3M16.8 12h3M6.5 6.5l2.1 2.1M15.4 15.4l2.1 2.1M17.5 6.5l-2.1 2.1M8.6 15.4l-2.1 2.1" />
          <circle cx="12" cy="12" r="2.6" />
        </svg>
      );
    case 'map':
      return (
        <svg {...common} {...base}>
          <path d="m3 6.5 6-2.5 6 2.5 6-2.5v13l-6 2.5-6-2.5-6 2.5v-13Z" />
          <path d="M9 4v13M15 6.5v13" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common} {...base}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    default:
      return null;
  }
}

export function StatusIcon({ status, size = 18 }) {
  const map = {
    ON: 'boltSolid',
    OFF: 'boltOff',
    UNKNOWN: 'help',
    CONFLICTED: 'scale',
  };
  return <Icon name={map[status] || 'help'} size={size} />;
}
