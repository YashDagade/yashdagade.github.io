document.addEventListener('DOMContentLoaded', function() {
    const headers = document.querySelectorAll('section h2');
    headers.forEach(header => {
        header.addEventListener('click', function() {
            this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none';
        });
    });
});
