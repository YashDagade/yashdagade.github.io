# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio and blog website for yashdagade.com, hosted on GitHub Pages. It's built as a lightweight static site using vanilla HTML, CSS, and JavaScript with no frameworks. The site consists of a main portfolio section and a separate blog subsystem with a Python-based build pipeline.

## Common Commands

### Development Server
```bash
npm start
# Starts http-server on port 8000 for local development
```

### Blog Publishing Pipeline
```bash
python blogs/convert_md_to_html.py
# Run from the repository root
# Processes all markdown files from blogs/export/ and blogs/posts/
# Generates HTML files in blogs/exportpages/
# Creates/updates blogs/exportpages/posts.json with metadata
# Copies images to blogs/exportpages/images/
# Excludes posts tagged "Personal" from public output
```

Note: Python 3 and the `markdown` library are required for blog conversion.

## Architecture

### Main Portfolio Site (Root Directory)
- **[index.html](index.html)** - Primary landing page with about section and project portfolio
- **[press.html](press.html)** - Media coverage and awards aggregator
- **[script.js](script.js)** - Interactive hover effects for project screenshots (desktop only)
- **[style.css](style.css)** - Global styling with responsive design (breakpoint at 800px)
- **[assets/](assets/)** - Static assets including project images, social icons, and resume PDFs

Key features:
- Hover image preview system with preloading for smooth interactions
- Responsive mobile design that degrades complex animations
- "Friends links" positioned dynamically to avoid overlap with social icons
- No frameworks - pure vanilla JavaScript

### Blog Subsystem (blogs/ Directory)
- **[blogs/convert_md_to_html.py](blogs/convert_md_to_html.py)** - Build script that converts markdown to HTML
- **[blogs/export/](blogs/export/)** - Primary source for markdown blog posts (~61 files)
- **[blogs/posts/](blogs/posts/)** - Additional hand-written markdown posts
- **[blogs/exportpages/](blogs/exportpages/)** - Generated HTML blog posts (output directory)
- **[blogs/exportpages/posts.json](blogs/exportpages/posts.json)** - Generated metadata file consumed by frontend
- **[blogs/scripts/blog.js](blogs/scripts/blog.js)** - Dynamic filtering, sorting, and blog loading
- **[blogs/styles/blog.css](blogs/styles/blog.css)** - Blog-specific styling with grid layout

### Markdown Post Format
Blog posts must follow this format:
```markdown
# Post Title
Date: YYYY-MM-DD
Tags: Tag1, Tag2, Tag3

Content goes here...
```

- Title (first h1) is required
- Date and Tags metadata are extracted by the build script
- Posts without tags or tagged "Personal" are excluded from public output
- Images should be in a folder matching the markdown filename (without .md extension)

### Blog Filtering System
The blog frontend ([blogs/scripts/blog.js](blogs/scripts/blog.js)) provides:
- Tag-based filtering via dropdown
- Sort by date (ascending/descending)
- Dynamic loading from posts.json
- Color-coded tag categories

## Key Technical Details

### Image Management
- Main site images stored in [assets/](assets/)
- Blog images are automatically copied from source directories to [blogs/exportpages/images/](blogs/exportpages/images/)
- Image paths are updated automatically by the Python build script
- Main site uses image preloading for hover effects

### Responsive Design
- Mobile breakpoint at 800px width
- Hover effects disabled on mobile (touch devices)
- Friend links automatically hidden if they would overlap with social icons
- Blog uses responsive grid layout

### Git Workflow
- Main branch: `main`
- Site is automatically published via GitHub Pages
- Custom domain configured via [CNAME](CNAME) file (www.yashdagade.com)

## Important Notes

- **No build step for main site** - HTML, CSS, and JS are served directly
- **Python script must be run manually** after adding/editing blog posts
- **Personal posts are filtered** - Any post tagged "Personal" or without tags won't appear publicly
- **Image paths matter** - Blog images should be in folders matching their source markdown filename
- When adding new blog posts, place markdown files in either [blogs/export/](blogs/export/) or [blogs/posts/](blogs/posts/), then run the Python conversion script
