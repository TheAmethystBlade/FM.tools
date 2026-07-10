document.addEventListener('DOMContentLoaded', () => {
    // 1. The Path Fix: Look at the literal HTML attribute to determine folder depth
    const scriptTag = document.querySelector('script[src$="app.js"]');
    const rootPath = scriptTag ? scriptTag.getAttribute('src').replace('app.js', '') : '';

    // 2. Check for saved theme preference BEFORE rendering
    const savedTheme = localStorage.getItem('site-theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    // 3. Inject Universal Header & Nav
    const headerHTML = `
        <header id="global-header">
            <button class="hamburger">☰</button>
            <h1>My Tool Hub</h1>
            <button id="theme-toggle" style="margin-left: auto; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-primary);">
                ${savedTheme === 'dark' ? '☀️' : '🌙'}
            </button>
        </header>
        <nav id="global-menu" style="display:none; padding: 1rem; background: var(--bg-surface); border-bottom: 1px solid var(--border-color);">
            <ul id="hamburger-menu-list" style="list-style: none; padding: 0; margin: 0; display: flex; gap: 1rem; flex-wrap: wrap;">
                <li><a href="${rootPath}index.html" style="color: var(--text-primary); text-decoration: none; font-weight: bold;">Home</a></li>
            </ul>
        </nav>
    `;
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    // 4. Theme Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('site-theme', 'light');
            themeToggleBtn.textContent = '🌙';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('site-theme', 'dark');
            themeToggleBtn.textContent = '☀️';
        }
    });

    // 5. Toggle Menu
    const menu = document.getElementById('global-menu');
    document.querySelector('.hamburger').addEventListener('click', () => {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });

    // 6. Fetch Registry and Populate Menu & Homepage Grid
    fetch(rootPath + 'tools.json')
        .then(response => response.json())
        .then(tools => {
            const menuContainer = document.getElementById('hamburger-menu-list');
            const mainGrid = document.getElementById('tools-grid'); 

            tools.forEach(tool => {
                // Add to Hamburger Menu
                const li = document.createElement('li');
                li.innerHTML = `<a href="${rootPath}${tool.path}" style="color: var(--text-secondary); text-decoration: none;">${tool.title}</a>`;
                menuContainer.appendChild(li);

                // Add to Homepage Grid (only fires if we are actually on the homepage)
                if (mainGrid) {
                    const card = document.createElement('div');
                    card.className = 'panel';
                    card.innerHTML = `
                        <h3>${tool.title}</h3>
                        <p>${tool.description}</p>
                        <button class="btn" onclick="window.location.href='${rootPath}${tool.path}'">Launch Tool</button>
                    `;
                    mainGrid.appendChild(card);
                }
            });
        })
        .catch(error => console.error('Error loading tools registry:', error));
});
