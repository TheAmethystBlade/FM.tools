document.addEventListener('DOMContentLoaded', () => {
    const callForm = document.getElementById('call-form');
    const logContainer = document.getElementById('log-container');
    
    // Load existing logs from Local Storage
    let callLogs = JSON.parse(localStorage.getItem('callTrackerLogs')) || [];

    // Render the initial logs
    renderLogs();

    // Helper Function: Calculate specific date based on current time
    function calculateTargetDate(followUpType, baseDate) {
        if (followUpType === 'None') return null;
        
        const target = new Date(baseDate.getTime());
        
        switch (followUpType) {
            case 'EOD':
                target.setHours(17, 0, 0, 0); // Sets to 5:00 PM today
                return target.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            case 'Tomorrow':
                target.setDate(target.getDate() + 1);
                return target.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            case 'Next Week':
                target.setDate(target.getDate() + 7);
                return target.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            case 'Next Month':
                target.setMonth(target.getMonth() + 1);
                return target.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            default:
                return followUpType;
        }
    }

    callForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const followUpSelection = document.getElementById('follow-up').value;
        const now = new Date();

        // Only add to queue if a follow up is actually required
        if (followUpSelection !== 'None') {
            const newLog = {
                id: Date.now(),
                loggedTime: now.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                targetFollowUp: calculateTargetDate(followUpSelection, now),
                name: document.getElementById('client-name').value,
                callType: document.getElementById('call-type').value,
                notes: document.getElementById('call-notes').value,
                followUpCategory: followUpSelection
            };

            callLogs.unshift(newLog); 
            localStorage.setItem('callTrackerLogs', JSON.stringify(callLogs));
        }

        callForm.reset();
        renderLogs();
    });

    // Make delete function available globally so inline onclick handlers can find it
    window.deleteLog = function(idToRemove) {
        // Filter out the item with the matching ID
        callLogs = callLogs.filter(log => log.id !== idToRemove);
        localStorage.setItem('callTrackerLogs', JSON.stringify(callLogs));
        renderLogs();
    };

    function renderLogs() {
        if (callLogs.length === 0) {
            logContainer.innerHTML = '<p style="text-align: center; margin-top: 2rem; color: var(--text-secondary);">No follow ups pending.</p>';
            return;
        }

        logContainer.innerHTML = ''; 

        callLogs.forEach(log => {
            const logEntry = document.createElement('div');
            
            logEntry.style.borderLeft = '4px solid var(--brand-primary)';
            logEntry.style.backgroundColor = 'var(--bg-input)';
            logEntry.style.padding = 'var(--spacing-md)';
            logEntry.style.borderRadius = '0 var(--radius) var(--radius) 0';
            logEntry.style.borderTop = '1px solid var(--border-color)';
            logEntry.style.borderRight = '1px solid var(--border-color)';
            logEntry.style.borderBottom = '1px solid var(--border-color)';

            logEntry.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">${log.name}</h3>
                        <small style="color: var(--text-secondary);">Logged: ${log.loggedTime}</small>
                    </div>
                    <button class="btn" onclick="deleteLog(${log.id})" style="background-color: transparent; border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.3rem 0.6rem; width: auto; font-size: 0.8rem;">✔️ Resolve</button>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <span style="background: var(--bg-surface); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; border: 1px solid var(--border-color); margin-right: 0.5rem;">${log.callType}</span>
                    <span style="background: var(--bg-surface); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; border: 1px solid var(--border-color); color: #ef4444; font-weight: bold;">Due: ${log.targetFollowUp}</span>
                </div>
                <p style="margin: 0; font-size: 0.95rem; color: var(--text-primary);">${log.notes || '<em>No notes recorded.</em>'}</p>
            `;

            logContainer.appendChild(logEntry);
        });
    }
});
