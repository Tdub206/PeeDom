let _activeScreen = 'unknown';

export function setActiveScreen(screen: string): void {
  _activeScreen = screen.length > 0 ? screen : 'unknown';
}

export function getActiveScreen(): string {
  return _activeScreen;
}
