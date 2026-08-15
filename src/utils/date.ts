export function formatDate(isoDateTime: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(isoDateTime));
}
