document.addEventListener('DOMContentLoaded', () => {
    const templateSelector = document.getElementById('template-selector');
    const variablesForm = document.getElementById('variables-form');
    const messagesContainer = document.getElementById('messages-container');
    
    let templates = [];
    let variables = new Set();
    let currentValues = {};

    // --- NEW: Define Automatic Variables ---
    const autoVariableNames = ['Current Date', 'Current Time', 'Day of Week', 'Greeting'];

    function getAutoVariable(name) {
        const now = new Date();
        switch(name) {
            case 'Current Date': 
                return now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            case 'Current Time': 
                return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            case 'Day of Week': 
                return now.toLocaleDateString([], { weekday: 'long' });
            case 'Greeting': 
                const hour = now.getHours();
                if (hour < 12) return 'Good morning';
                if (hour < 17) return 'Good afternoon';
                return 'Good evening';
            default: 
                return null;
        }
    }

    // 1. Fetch and Parse the Selected CSV
    function loadCategory(filename) {
        templates = [];
        variables.clear();
        currentValues = {};
        variablesForm.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Loading...</p>';
        messagesContainer.innerHTML = '';

        fetch(filename)
            .then(response => {
                if (!response.ok) throw new Error('File not found');
                return response.text();
            })
            .then(csvText => {
                parseCSV(csvText);
                extractVariables();
                renderForm();
                renderMessages();
            })
            .catch(error => {
                variablesForm.innerHTML = `<p style="color: #ef4444;">Error loading ${filename}. Ensure the file exists in the folder.</p>`;
                console.error('Error:', error);
            });
    }

function parseCSV(text) {
        // Strip out any hidden Windows carriage returns before doing anything
        const cleanText = text.replace(/\r/g, '');
        const lines = cleanText.split('\n');
        
        for (let i = 1; i < lines.length; i++) { 
            if (!lines[i].trim()) continue;
            
            const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (row.length >= 2) {
                templates.push({
                    // The Fix: Trim away invisible spaces BEFORE removing the quotes
                    title: row[0].trim().replace(/^"|"$/g, ''),
                    template: row[1].trim().replace(/^"|"$/g, '')
                });
            }
        }
    }

    // Helper: Find all [Variables], but ignore the automatic ones
    function extractVariables() {
        const regex = /\[([^\]]+)\]/g;
        templates.forEach(t => {
            let match;
            while ((match = regex.exec(t.template)) !== null) {
                const varName = match[1];
                // Only add to the user input list if it's NOT an auto-variable
                if (!autoVariableNames.includes(varName)) {
                    variables.add(varName);
                    currentValues[varName] = ''; 
                }
            }
        });
    }

    // 2. Build the Form Dynamically (Only for user inputs)
    function renderForm() {
        variablesForm.innerHTML = ''; 
        
        if (variables.size === 0) {
            variablesForm.innerHTML = '<p style="color: var(--text-secondary);">No manual variables needed for these templates.</p>';
            return;
        }

        variables.forEach(variableName => {
            const group = document.createElement('div');
            group.className = 'form-group';

            const label = document.createElement('label');
            label.textContent = variableName;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Enter ${variableName}...`;
            
            input.addEventListener('input', (e) => {
                currentValues[variableName] = e.target.value;
                renderMessages();
            });

            group.appendChild(label);
            group.appendChild(input);
            variablesForm.appendChild(group);
        });
    }

    // 3. Render the Messages
    function renderMessages() {
        messagesContainer.innerHTML = '';
        
        templates.forEach((t, index) => {
            // Replace both auto-variables and manual user inputs
            let processedText = t.template.replace(/\[([^\]]+)\]/g, (match, varName) => {
                if (autoVariableNames.includes(varName)) {
                    return getAutoVariable(varName);
                }
                return currentValues[varName] || `[${varName}]`;
            });

            const card = document.createElement('div');
            card.style.backgroundColor = 'var(--bg-input)';
            card.style.padding = 'var(--spacing-md)';
            card.style.borderRadius = 'var(--radius)';
            card.style.border = '1px solid var(--border-color)';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                    <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">${t.title}</h3>
                    <button class="btn copy-btn" data-index="${index}" style="width: auto; padding: 0.3rem 0.8rem; font-size: 0.85rem;">Copy</button>
                </div>
                <p style="margin: 0; white-space: pre-wrap; color: var(--text-primary);" id="msg-${index}">${processedText}</p>
            `;
            
            messagesContainer.appendChild(card);
        });

        // Attach copy functionality
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                const textToCopy = document.getElementById(`msg-${idx}`).innerText;
                
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const originalText = e.target.innerText;
                    e.target.innerText = 'Copied!';
                    e.target.style.backgroundColor = '#10b981';
                    e.target.style.color = '#ffffff';
                    
                    setTimeout(() => {
                        e.target.innerText = originalText;
                        e.target.style.backgroundColor = 'var(--brand-primary)';
                        e.target.style.color = '#121212';
                    }, 2000);
                });
            });
        });
    }

    // 4. Listen for Dropdown Changes
    templateSelector.addEventListener('change', (e) => {
        loadCategory(e.target.value);
    });

    // 5. Initial Load on Page Start
    loadCategory(templateSelector.value);
});
