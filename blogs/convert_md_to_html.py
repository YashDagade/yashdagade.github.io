import os
import re
import json
import markdown
import shutil

# Define directories
export_dir = 'blogs/export'
posts_dir = 'blogs/posts'
export_pages_dir = 'blogs/exportpages'
images_dir = os.path.join(export_pages_dir, 'images')

# Ensure the exportpages and images directories exist
os.makedirs(export_pages_dir, exist_ok=True)
os.makedirs(images_dir, exist_ok=True)

def update_image_paths_and_copy(html_content, image_dir):
    """Update image paths in the HTML content and copy images to the exportpages/images directory."""
    def replace_path(match):
        img_path = match.group(1)
        src_path = os.path.join(image_dir, img_path)
        dest_path = os.path.join(images_dir, os.path.basename(img_path))
        
        # Copy the image to the exportpages/images directory
        if os.path.exists(src_path):
            shutil.copy(src_path, dest_path)
        
        # Return the relative path to the image in the new location
        new_path = os.path.relpath(dest_path, export_pages_dir)
        return f'src="{new_path}"'

    return re.sub(r'src="([^"]+)"', replace_path, html_content)

def extract_metadata(markdown_content):
    """Extract metadata like title, date, and tags from the markdown content."""
    lines = markdown_content.split('\n')
    title = re.search(r'^# (.+)$', lines[0], re.MULTILINE)
    title = title.group(1) if title else "Untitled"
    
    date = ''
    tags = ''
    for line in lines:
        if line.startswith('Date: '):
            date = line.replace('Date: ', '').strip()
        elif line.startswith('Tags: '):
            tags = line.replace('Tags: ', '').strip()
    
    return title, date, tags

def strip_metadata(content):
    """Remove metadata lines from the content."""
    stripped_lines = []
    for line in content.split('\n'):
        if line.startswith('# '):  # Title line
            continue
        if line.startswith('Date: '):
            continue
        if line.startswith('Tags: '):
            continue
        stripped_lines.append(line)
    return '\n'.join(stripped_lines)

def convert_md_to_html(filename, markdown_dir, output_dir):
    """Convert a Markdown file to an HTML file with updated image paths."""
    with open(os.path.join(markdown_dir, filename), 'r', encoding='utf-8') as file:
        content = file.read()

    # Extract metadata
    title, date, tags = extract_metadata(content)

    # Exclude posts without tags or tagged as "Personal"
    if not tags or 'Personal' in tags:
        return None

    # Remove metadata from the content
    stripped_content = strip_metadata(content)

    # Convert Markdown to HTML
    html_content = markdown.markdown(stripped_content)

    # Update image paths and copy images
    image_dir = os.path.join(markdown_dir, filename.replace('.md', ''))
    html_content = update_image_paths_and_copy(html_content, image_dir)

    # Write the HTML file
    output_filename = re.sub(r'[^a-zA-Z0-9]', ' ', title).strip() + '.html'
    output_filepath = os.path.join(output_dir, output_filename)
    with open(output_filepath, 'w', encoding='utf-8') as file:
        file.write(f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link rel="stylesheet" href="../styles/blog.css">
</head>
<body>
    <article>
        <h1>{title}</h1>
        <p><strong>Date:</strong> {date}</p>
        <p><strong>Tags:</strong> {tags}</p>
        {html_content}
    </article>
</body>
</html>
""")

    return {'title': title, 'date': date, 'tags': tags, 'url': output_filename}

# Process markdown files from both export and posts directories
all_posts = []
for md_file in os.listdir(export_dir):
    if md_file.endswith('.md'):
        post_metadata = convert_md_to_html(md_file, export_dir, export_pages_dir)
        if post_metadata:
            all_posts.append(post_metadata)

for md_file in os.listdir(posts_dir):
    if md_file.endswith('.md'):
        post_metadata = convert_md_to_html(md_file, posts_dir, export_pages_dir)
        if post_metadata:
            all_posts.append(post_metadata)

# Generate posts.json
posts_json_path = os.path.join(export_pages_dir, 'posts.json')
with open(posts_json_path, 'w') as json_file:
    json.dump(all_posts, json_file)

print("posts.json generated.")
print("Conversion complete. HTML files and images are updated and organized.")
