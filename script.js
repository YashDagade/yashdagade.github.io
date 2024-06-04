document.addEventListener('DOMContentLoaded', function() {
    const projectLinks = document.querySelectorAll('.project-link');
    const bodyContent = document.querySelector('body');

    projectLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            bodyContent.classList.add('fade');
            this.classList.add('highlight');
            this.querySelector('.project-text').classList.add('highlight');
        });
        link.addEventListener('mouseleave', function() {
            bodyContent.classList.remove('fade');
            this.classList.remove('highlight');
            this.querySelector('.project-text').classList.remove('highlight');
        });
    });
});
