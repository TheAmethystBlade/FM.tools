document.addEventListener('DOMContentLoaded', () => {
    const variablesForm = document.getElementById('variables-form');
    const messagesContainer = document.getElementById('messages-container');
    
    let templates = [];
    let variables = new Set();
    let currentValues = {};

    // 1. Fetch and Parse the CSV Spreadsheet
    fetch('templates.csv')
        .then(response => response.text())
        .then(csvText => {
            parseCSV(csvText);
            extractVariables();
            renderForm();
            renderMessages();
        })
        .catch(error => {
            variablesForm.innerHTML = '<p>Error loading templates.csv. Ensure the file exists.</p>';
            console.error('Error:', error);
        });

    // Helper: Parse CSV data (handles commas inside spreadsheet cells)
    function parseCSV(text) {
        const lines = text.split('\n');
        for (let i = 1; i < lines.length; i++) { // Skip header row
            if (!lines[i].trim()) continue;
            
            // Splits by comma, but ignores commas enclosed in quotes
            const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (row.length >= 2) {
                templates.push({
                    title: row[0].replace(/^"|"$/g, '').trim(),
                    template: row[1].replace(/^"|"$/g, '').trim()
                });
            }
        }
    }

    // Helper: Find all [Variables] in the templates
    function extractVariables() {
        const regex = /\[([^\]]+)\]/g;
        templates.forEach(t => {
            let match;
            while ((match = regex.exec(t.template)) !== null) {
                variables.add(match[1]);
                currentValues[match[1]] = ''; // Initialize blank
            }
        });
    }

    // 2. Build the Form Dynamically
    function renderForm() {
        variablesForm.innerHTML = ''; // Clear loading text
        
        if (variables.size === 0) {
            variablesForm.innerHTML = '<p style="color: var(--text-secondary);">No variables found in brackets [ ] in the spreadsheet.</p>';
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
            
            // Listen for typing and update messages instantly
            input.addEventListener('input', (e) => {
                currentValues[variableName] = e.target.value;
                renderMessages();
            });

            group.appendChild(label);
            group.appendChild(input);
            variablesForm.appendChild(group);
        });
    }

    // 3. Render the Messages with injected variables
    function renderMessages() {
        messagesContainer.innerHTML = '';
        
        templates.forEach((t, index) => {
            let processedText = t.template;
            
            // Replace [Variables] with typed text, or leave bracketed if empty
            variables.forEach(variableName => {
                const replacement = currentValues[variableName] || `[${variableName}]`;
                const regex = new RegExp(`\\[${variableName}\\]`, 'g');
                processedText = processedText.replace(regex, replacement);
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
                    e.target.style.backgroundColor = '#10b981'; // Green success color
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
});
