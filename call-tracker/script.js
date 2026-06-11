document.addEventListener('DOMContentLoaded', () => {
    const callForm = document.getElementById('call-form');
    const logContainer = document.getElementById('log-container');
    
    // Load existing logs from Local Storage
    let callLogs = JSON.parse(localStorage.getItem('callTrackerLogs')) || [];

    // Render the initial logs
    renderLogs();

    callForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Capture data
        const newLog = {
            id: Date.now(),
            timestamp: new Date().toLocaleString(),
            name: document.getElementById('client-name').value,
            callType: document.getElementById('call-type').value,
            notes: document.getElementById('call-notes').value,
            followUp: document.getElementById('follow-up').value
        };

        // Add to state and save
        callLogs.unshift(newLog); // Add to the top of the list
        localStorage.setItem('callTrackerLogs', JSON.stringify(callLogs));

        // Reset form and update UI
        callForm.reset();
        renderLogs();
    });

    function renderLogs() {
        if (callLogs.length === 0) {
            logContainer.innerHTML = '<p style="text-align: center; margin-top: 2rem;">No calls logged yet.</p>';
            return;
        }

        logContainer.innerHTML = ''; // Clear container

        callLogs.forEach(log => {
            // Create a sub-card for each log
            const logEntry = document.createElement('div');
            // Using inline styles here for specific micro-layout, but relying on global variables
            logEntry.style.borderLeft = '4px solid var(--brand-primary)';
            logEntry.style.backgroundColor = 'var(--bg-input)';
            logEntry.style.padding = 'var(--spacing-md)';
            logEntry.style.borderRadius = '0 var(--radius) var(--radius) 0';
            
            // Format the UI for the log
            let badgeColor = log.followUp !== 'None' ? '#ef4444' : 'var(--text-secondary)'; // Red if follow up needed

            logEntry.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                    <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">${log.name}</h3>
                    <small style="color: var(--text-secondary);">${log.timestamp}</small>
                </div>
                <div style="margin-bottom: 0.5rem;">
                    <span style="background: var(--bg-surface); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; border: 1px solid var(--border-color);">${log.callType}</span>
                    <span style="background: var(--bg-surface); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; border: 1px solid var(--border-color); color: ${badgeColor}; font-weight: bold;">Follow Up: ${log.followUp}</span>
                </div>
                <p style="margin: 0; font-size: 0.95rem;">${log.notes || '<em>No notes recorded.</em>'}</p>
            `;

            logContainer.appendChild(logEntry);
        });
    }
});
