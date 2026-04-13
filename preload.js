// Preload runs in the renderer with access to DOM before the page loads.
// We use it to suppress the "install app" banner Messenger sometimes shows.
window.addEventListener('DOMContentLoaded', () => {
  // Block the PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
  });
});
