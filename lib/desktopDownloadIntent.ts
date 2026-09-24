export type DesktopPlatform = 'mac' | 'windows';

export function desktopPlatform(value: unknown): DesktopPlatform | null {
  return value === 'mac' || value === 'windows' ? value : null;
}

export function desktopDownloadPath(platform: DesktopPlatform): string {
  return `/download/${platform}`;
}
