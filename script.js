document.addEventListener('DOMContentLoaded', function() {
    const projectLinks = document.querySelectorAll('.project-link');
    const bodyContent = document.querySelector('body');
    const isMobile = window.innerWidth <= 800;
    const preloadedImages = {}; // Object to store preloaded images

    // Preload all images
    if (!isMobile) {
        projectLinks.forEach(link => {
            const imageSrc = link.getAttribute('data-image');
            if (imageSrc) {
                // Create and preload the image
                const img = new Image();
                img.src = imageSrc;
                img.classList.add('hover-image');
                // Store the preloaded image
                preloadedImages[imageSrc] = img;
            }
        });
    }

    // Only enable hover effects on non-mobile devices
    if (!isMobile) {
        projectLinks.forEach(link => {
            link.addEventListener('mouseenter', function() {
                bodyContent.classList.add('fade');
                this.classList.add('highlight');
                this.closest('li').classList.add('highlight');

                const imageSrc = this.getAttribute('data-image');
                if (imageSrc && preloadedImages[imageSrc]) {
                    // Clone the preloaded image
                    const hoverImage = preloadedImages[imageSrc].cloneNode(true);
                    document.body.appendChild(hoverImage);
                    this.hoverImage = hoverImage;
                }
            });

            link.addEventListener('mouseleave', function() {
                bodyContent.classList.remove('fade');
                this.classList.remove('highlight');
                this.closest('li').classList.remove('highlight');
                if (this.hoverImage) {
                    this.hoverImage.remove();
                    this.hoverImage = null;
                }
            });

            link.addEventListener('mousemove', function(e) {
                if (this.hoverImage) {
                    this.hoverImage.style.left = `${e.clientX - this.hoverImage.offsetWidth / 2}px`;
                    this.hoverImage.style.top = `${e.clientY - this.hoverImage.offsetHeight / 2}px`;
                }
            });
        });
    }

    // Add window resize handler to disable/enable hover effects
    window.addEventListener('resize', function() {
        const isMobileNow = window.innerWidth <= 800;
        
        if (isMobileNow && !isMobile) {
            // Remove all event listeners and reset
            projectLinks.forEach(link => {
                if (link.hoverImage) {
                    link.hoverImage.remove();
                    link.hoverImage = null;
                }
            });
            bodyContent.classList.remove('fade');
            document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
        }
    });
});
