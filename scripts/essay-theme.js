// ============================================================
// Shared essay/manifesto theme behavior
// Used by: build.html, fromsubtoexp.html, dearmorderneducation.html
// - Cycles through 6 style themes (shared localStorage key so all
//   pages stay in sync), also bound to the "s" key.
// - Drives the reading progress bar when a #progressBar element exists.
// Pair with styles/essay-theme.css.
// ============================================================

(function () {
    const styleBtn = document.getElementById('styleBtn');
    const body = document.body;
    const styles = ['classic', 'modern', 'editorial', 'elegant', 'mono', 'contrast'];

    let currentStyleIndex = 0;
    const savedStyle = localStorage.getItem('manifestoStyle');
    if (savedStyle) {
        const savedIndex = styles.indexOf(savedStyle);
        if (savedIndex !== -1) {
            currentStyleIndex = savedIndex;
        }
    }
    body.className = styles[currentStyleIndex];

    if (styleBtn) {
        styleBtn.addEventListener('click', () => {
            currentStyleIndex = (currentStyleIndex + 1) % styles.length;
            const newStyle = styles[currentStyleIndex];
            body.className = newStyle;
            localStorage.setItem('manifestoStyle', newStyle);
        });

        // Keyboard shortcut - press 's' to cycle styles
        document.addEventListener('keydown', (e) => {
            if (e.key === 's' || e.key === 'S') {
                styleBtn.click();
            }
        });
    }

    // Reading progress bar (only on pages that include one)
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        document.addEventListener('scroll', () => {
            const scrollable = document.documentElement.scrollHeight - window.innerHeight;
            const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
            progressBar.style.width = progress + '%';
        }, { passive: true });
    }
})();
