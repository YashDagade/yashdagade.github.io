document.addEventListener('DOMContentLoaded', function() {
    const blogList = document.getElementById('blog-list');
    const sortOrderSelect = document.getElementById('sortOrder');
    const tagFilterSelect = document.getElementById('tagFilter');
    const postsDir = 'exportpages';
    let posts = [];

    // Function to load posts
    async function loadPosts() {
        try {
            const response = await fetch(`${postsDir}/posts.json`);
            posts = await response.json(); // Directly use the parsed JSON data
            console.log("Loaded posts:", posts); // Debugging log
            posts = posts.filter(post => post.tags && post.tags.length > 0 && !post.tags.includes('Personal')); // Exclude personal and untagged posts
            populateTagFilter();
            displayPosts();
        } catch (error) {
            console.error("Failed to load posts.json:", error);
        }
    }

    // Function to populate the tag filter dropdown
    function populateTagFilter() {
        const tags = new Set();
        posts.forEach(post => post.tags.split(',').forEach(tag => tags.add(tag.trim())));
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilterSelect.appendChild(option);
        });
    }

    // Function to display posts
    function displayPosts() {
        blogList.innerHTML = ''; // Clear previous list
        const filteredPosts = filterAndSortPosts();
        console.log("Displaying posts:", filteredPosts); // Debugging log
        filteredPosts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.classList.add('blog-post');

            const postTitle = document.createElement('h2');
            const postLink = document.createElement('a');
            postLink.href = `${postsDir}/${post.url}`;
            postLink.textContent = post.title;
            postTitle.appendChild(postLink);

            const postDate = document.createElement('p');
            postDate.classList.add('post-date');
            postDate.textContent = `${post.date}`;

            const postTags = document.createElement('p');
            postTags.classList.add('post-tags');
            post.tags.split(',').forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.classList.add('tag', tag.trim().replace(/\s+/g, ''));
                tagElement.textContent = tag;
                postTags.appendChild(tagElement);
            });

            postElement.appendChild(postTitle);
            postElement.appendChild(postDate);
            postElement.appendChild(postTags);

            blogList.appendChild(postElement);
        });
    }

    // Function to filter and sort posts
    function filterAndSortPosts() {
        let filteredPosts = posts;

        // Filter by tag
        const selectedTag = tagFilterSelect.value;
        if (selectedTag !== 'all') {
            filteredPosts = filteredPosts.filter(post => post.tags.split(',').map(tag => tag.trim()).includes(selectedTag));
        }

        // Sort by date
        const sortOrder = sortOrderSelect.value;
        filteredPosts.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        return filteredPosts;
    }

    // Event listeners for filters
    sortOrderSelect.addEventListener('change', displayPosts);
    tagFilterSelect.addEventListener('change', displayPosts);

    // Load posts on page load
    loadPosts();
});
