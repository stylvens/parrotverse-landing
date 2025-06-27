// Store scroll position before the page unloads
window.addEventListener('beforeunload', function () {
  sessionStorage.setItem('scrollX', window.scrollX);
  sessionStorage.setItem('scrollY', window.scrollY);
});

// Restore scroll position after the page is fully loaded
window.onload = function () {
  const x = sessionStorage.getItem('scrollX');
  const y = sessionStorage.getItem('scrollY');
  if (x !== null && y !== null) {
    window.scrollTo(Number(x), Number(y));
  }
};

// Toast message for successful form submission
document.addEventListener('DOMContentLoaded', function () {
  const form = document.querySelector('.form-overlay form');
  if (form) {
    form.addEventListener('submit', function () {
      setTimeout(() => {
        const toast = document.createElement('div');
        toast.textContent = "Thanks! You’re on the list 🦜";
        toast.style.position = 'fixed';
        toast.style.bottom = '2rem';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = '#32757f';
        toast.style.color = 'white';
        toast.style.padding = '0.75rem 1.5rem';
        toast.style.borderRadius = '6px';
        toast.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        toast.style.zIndex = '9999';
        toast.style.opacity = '1';
        toast.style.transition = 'opacity 0.5s ease-in-out';

        document.body.appendChild(toast);

        // Fade out and remove
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => {
            toast.remove();
          }, 500);
        }, 3000);
      }, 500);
    });
  }
});
