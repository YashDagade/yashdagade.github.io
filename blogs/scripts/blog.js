document.addEventListener('DOMContentLoaded', function() {
    const blogList = document.getElementById('blog-list');
    const postsDir = 'exportpages';
    const posts = [];

    // Function to fetch metadata from HTML file
    async function fetchPostMetadata(filePath) {
        const response = await fetch(filePath);
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        
        const title = doc.querySelector('h1').textContent;
        const date = doc.querySelector('p strong').nextSibling.nodeValue.trim();
        const tags = doc.querySelector('p strong + p strong').nextSibling.nodeValue.trim();
        
        return { title, date, tags, url: filePath };
    }

    // Function to load posts
    async function loadPosts() {
        const files = await fetch('posts.json').then(res => res.json());
        
        for (const file of files) {
            const metadata = await fetchPostMetadata(`${postsDir}/${file}`);
            posts.push(metadata);
        }
        displayPosts(posts);
    }

    // Function to display posts
    function displayPosts(posts) {
        posts.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
        blogList.innerHTML = ''; // Clear previous list
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.classList.add('blog-post');

            const postTitle = document.createElement('h2');
            const postLink = document.createElement('a');
            postLink.href = post.url;
            postLink.textContent = post.title;
            postTitle.appendChild(postLink);

            const postDate = document.createElement('p');
            postDate.classList.add('post-date');
            postDate.textContent = `Published on: ${post.date}`;

            const postTags = document.createElement('p');
            postTags.classList.add('post-tags');
            postTags.textContent = `Tags: ${post.tags}`;

            postElement.appendChild(postTitle);
            postElement.appendChild(postDate);
            postElement.appendChild(postTags);

            blogList.appendChild(postElement);
        });
    }

    // Load posts on page load
    loadPosts();
});
