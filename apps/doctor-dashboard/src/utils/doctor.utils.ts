export function formatDoctorGreetingName(name?: string): string {
  if (!name || name.trim().toLowerCase() === 'doctor') {
    return 'Doctor';
  }
  const trimmed = name.trim();
  if (/^dr\.?\s+/i.test(trimmed)) {
    return trimmed;
  }
  if (/^doc\s+/i.test(trimmed)) {
    const afterDoc = trimmed.replace(/^doc\s+/i, '').trim();
    return afterDoc ? `Dr. ${afterDoc}` : trimmed;
  }
  return `Dr. ${trimmed}`;
}

export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getAvatarInitial(name?: string): string {
  if (!name) return 'D';
  const clean = name.replace(/^(dr\.?|doc|doctor)\s+/i, '').trim();
  return clean.charAt(0).toUpperCase() || 'D';
}
