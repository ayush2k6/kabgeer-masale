import re

with open('src/pages/HomePage.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace body fonts
css = re.sub(r"font-family:\s*'Inter',\s*sans-serif;\s*/\*\s*Fallback.*?\*/", "font-family: var(--font-body);", css)
css = re.sub(r"font-family:\s*'Outfit',\s*'Inter',\s*sans-serif;", "font-family: var(--font-body);", css)
css = re.sub(r"font-family:\s*'Comfortaa',\s*'Outfit',\s*sans-serif;", "font-family: var(--font-body);", css)

# Replace heading fonts
css = re.sub(r"font-family:\s*'Playfair Display',\s*'Georgia',\s*serif;", "font-family: var(--font-heading);", css)
css = re.sub(r"font-family:\s*'Comfortaa',\s*'Righteous',\s*'Varela Round',\s*sans-serif;", "font-family: var(--font-heading);", css)
css = re.sub(r"font-family:\s*'Georgia',\s*serif;", "font-family: var(--font-heading);", css)

# The product names in slider and grid currently use 'Inter', sans-serif;
css = re.sub(r"font-family:\s*'Inter',\s*sans-serif;", "font-family: var(--font-heading);", css)

with open('src/pages/HomePage.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Typography updated in HomePage.css")
