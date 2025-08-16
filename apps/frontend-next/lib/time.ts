// Always render times consistently across SSR and client
const tz = process.env.NEXT_PUBLIC_TZ || 'Asia/Jerusalem';

// Cache the formatter once to avoid re-creating each render
const formatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: tz
});

export function formatTime(iso: string) {
  return formatter.format(new Date(iso));
}
