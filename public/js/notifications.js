/**
 * Notifications module for displaying toast notifications
 * This provides a reusable notification system that can be imported by other modules
 */

// Create notification container if it doesn't exist
function ensureNotificationContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-4';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Show a notification toast
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {string} type - The notification type (success, error, warning, info)
 * @param {number} duration - How long to show the notification in ms (default: 5000ms)
 */
export function showNotification(title, message, type = 'info', duration = 5000) {
    console.log(`Showing ${type} notification: ${title} - ${message}`);
    
    const container = ensureNotificationContainer();
    
    // Get color classes based on type
    let colorClasses;
    let icon;
    
    switch(type) {
        case 'success':
            colorClasses = 'bg-green-100 border-l-4 border-green-500 text-green-700';
            icon = '<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>';
            break;
        case 'error':
            colorClasses = 'bg-red-100 border-l-4 border-red-500 text-red-700';
            icon = '<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
            break;
        case 'warning':
            colorClasses = 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700';
            icon = '<svg class="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>';
            break;
        default: // info
            colorClasses = 'bg-blue-100 border-l-4 border-blue-500 text-blue-700';
            icon = '<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `px-4 py-3 rounded-lg shadow-lg transition transform duration-300 ease-in-out ${colorClasses}`;
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    ${icon}
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium">${title}</p>
                    <p class="text-sm">${message}</p>
                </div>
            </div>
            <button class="notification-close ml-4 text-gray-400 hover:text-gray-500">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Add close handler
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeNotification(notification);
        });
    }
    
    // Auto remove after specified duration
    if (duration > 0) {
        setTimeout(() => {
            closeNotification(notification);
        }, duration);
    }
    
    return notification;
}

/**
 * Close a notification with animation
 * @param {HTMLElement} notification - The notification element to close
 */
function closeNotification(notification) {
    notification.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
    const container = document.getElementById('notification-container');
    if (container) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }
}

// Make showNotification available globally for non-module scripts
window.showNotification = showNotification;
window.clearAllNotifications = clearAllNotifications;

// Export default for ES modules
export default {
    showNotification,
    clearAllNotifications
}; 