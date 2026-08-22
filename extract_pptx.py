import zipfile
import xml.etree.ElementTree as ET
import re
import sys

def extract_text_from_pptx(pptx_path):
    slides_text = {}
    with zipfile.ZipFile(pptx_path) as z:
        for file in z.namelist():
            if file.startswith('ppt/slides/slide') and file.endswith('.xml') and '_rels' not in file:
                xml_content = z.read(file)
                tree = ET.fromstring(xml_content)
                ns = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
                texts = []
                for p in tree.findall('.//a:p', ns):
                    paragraph_text = ''
                    for r in p.findall('.//a:t', ns):
                        if r.text:
                            paragraph_text += r.text
                    if paragraph_text.strip():
                        texts.append(paragraph_text.strip())
                slides_text[file] = texts
    
    # Sort by slide number
    for file, texts in sorted(slides_text.items(), key=lambda x: int(re.search(r'\d+', x[0]).group())):
        sys.stdout.buffer.write(f"\n--- {file} ---\n".encode('utf-8'))
        for t in texts:
            sys.stdout.buffer.write(f"{t}\n".encode('utf-8'))

if __name__ == '__main__':
    extract_text_from_pptx('Masala_Recipe.pptx')
