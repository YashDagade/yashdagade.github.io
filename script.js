document.addEventListener('DOMContentLoaded', function() {
    const projectLinks = document.querySelectorAll('.project-link');
    const bodyContent = document.querySelector('body');

    projectLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            bodyContent.classList.add('fade');
            this.classList.add('highlight');

            const imageSrc = this.getAttribute('data-image');
            if (imageSrc) {
                let hoverImage = document.createElement('img');
                hoverImage.src = imageSrc;
                hoverImage.classList.add('hover-image');
                document.body.appendChild(hoverImage);

                this.hoverImage = hoverImage;
            }
        });

        link.addEventListener('mouseleave', function() {
            bodyContent.classList.remove('fade');
            this.classList.remove('highlight');
            if (this.hoverImage) {
                this.hoverImage.remove();
                this.hoverImage = null;
            }
        });

        link.addEventListener('mousemove', function(e) {
            if (this.hoverImage) {
                this.hoverImage.style.left = `${e.clientX - this.hoverImage.offsetWidth / 2}px`;
                this.hoverImage.style.top = `${e.clientY - this.hoverImage.offsetHeight / 2 }px`;
            }
        });
    });
});
