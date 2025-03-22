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

        // Update friends links position on resize
        handleFriendsLinksPosition();
    });

    // Handle friends links position to prevent overlap with social links
    function handleFriendsLinksPosition() {
        if (window.innerWidth <= 800) return; // Don't run on mobile

        const socialLinks = document.getElementById('social-links');
        const friendsTextContainer = document.getElementById('friends-text-container');
        const friendsLinkContainer = document.getElementById('friends-link-container');
        const briansLinkContainer = document.getElementById('brians-link-container');

        if (!socialLinks || !friendsTextContainer || !friendsLinkContainer || !briansLinkContainer) return;

        // Calculate position of social links relative to viewport
        const socialRect = socialLinks.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const buffer = 80; // Extra space between elements in pixels

        // If social links are close to or visible at bottom of viewport
        if (socialRect.bottom > viewportHeight - buffer) {
            // Hide friends links when social links are visible at bottom
            friendsTextContainer.style.opacity = '0';
            friendsLinkContainer.style.opacity = '0';
            briansLinkContainer.style.opacity = '0';
            // Add transition for smooth fade
            if (!friendsTextContainer.style.transition) {
                friendsTextContainer.style.transition = 'opacity 0.3s ease';
                friendsLinkContainer.style.transition = 'opacity 0.3s ease';
                briansLinkContainer.style.transition = 'opacity 0.3s ease';
            }
        } else {
            // Show friends links when social links are not at bottom
            friendsTextContainer.style.opacity = '1';
            friendsLinkContainer.style.opacity = '1';
            briansLinkContainer.style.opacity = '1';
        }
    }

    // Run on initial load
    handleFriendsLinksPosition();

    // Run on scroll
    window.addEventListener('scroll', handleFriendsLinksPosition);
});
