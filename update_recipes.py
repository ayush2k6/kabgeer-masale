import re

# Read the extracted recipes
with open('extracted_recipes.txt', 'r', encoding='utf-16') as f:
    text = f.read()

slides = text.split('--- ppt/slides/slide')
recipes = {}

for slide in slides[1:]:
    lines = [line.strip() for line in slide.split('\n') if line.strip()]
    if len(lines) < 2: continue
    
    title = lines[1]
    
    ingredients = ""
    ingredients_required = []
    steps = []
    chef_tip = ""
    
    current_section = None
    
    for line in lines[2:]:
        if line.startswith('Ingredients') and not line.startswith('Ingredients Required'):
            current_section = 'ingredients'
            continue
        elif line.startswith('Ingredients Required'):
            current_section = 'ingredients_required'
            continue
        elif line.startswith('Steps Of Cooking') or line.startswith('Steps of Cooking') or line.startswith('Steps Of Recipe'):
            current_section = 'steps'
            continue
        elif line.startswith('Tip from Chef') or line.startswith('Tip From Chef'):
            current_section = 'chef_tip'
            continue
        elif line.startswith('Usage'):
            current_section = 'how_to_use'
            continue
            
        if current_section == 'ingredients':
            ingredients += line + " "
        elif current_section == 'ingredients_required':
            ingredients_required.append(line)
        elif current_section == 'steps':
            steps.append(line)
        elif current_section == 'chef_tip':
            chef_tip += line + " "
        elif current_section == 'how_to_use':
            steps.append(line)

    recipes[title.lower().strip()] = {
        'ingredients': ingredients.strip(),
        'ingredients_required': ingredients_required,
        'steps': steps,
        'chef_tip': chef_tip.strip()
    }

# Read products.js
with open('src/data/products.js', 'r', encoding='utf-8') as f:
    products_js = f.read()

def update_product_block(match):
    block = match.group(0)
    name_match = re.search(r"name:\s*'(.*?)'", block)
    if not name_match: return block
    name = name_match.group(1).lower().replace(' masale', ' masala')
    
    matched_recipe = None
    for r_name in recipes:
        if name in r_name or r_name in name:
            matched_recipe = recipes[r_name]
            break
            
    if not matched_recipe:
        if 'chilli' in name and 'chilli' in ','.join(recipes.keys()):
            for r_name in recipes:
                if 'chili' in r_name or 'chilli' in r_name:
                    if 'kashmiri' not in name and 'kashmiri' not in r_name:
                        matched_recipe = recipes[r_name]
                        break
    
    if not matched_recipe:
        return block
        
    ing_str = matched_recipe['ingredients']
    
    how_to_use = ""
    if matched_recipe['ingredients_required']:
        how_to_use += "Ingredients Required:\\n" + "\\n".join(matched_recipe['ingredients_required']) + "\\n\\n"
    if matched_recipe['steps']:
        how_to_use += "Steps of Cooking:\\n" + "\\n".join(matched_recipe['steps'])
        
    # Escape backticks for JS template literals
    how_to_use = how_to_use.replace('`', '\\`')
    ing_str = ing_str.replace('`', '\\`')
    chef_tip = matched_recipe['chef_tip'].replace('`', '\\`')

    if ing_str:
        # For ingredients, we can keep using backticks or quotes, let's just use backticks to be safe
        block = re.sub(r"ingredients:\s*'.*?',", f"ingredients: `{ing_str}`,", block, flags=re.DOTALL)
        block = re.sub(r'ingredients:\s*".*?",', f"ingredients: `{ing_str}`,", block, flags=re.DOTALL)
    if how_to_use:
        block = re.sub(r"howToUse:\s*'.*?',", f"howToUse: `{how_to_use}`,", block, flags=re.DOTALL)
        block = re.sub(r'howToUse:\s*".*?",', f"howToUse: `{how_to_use}`,", block, flags=re.DOTALL)
    if chef_tip:
        block = re.sub(r"chefsTip:\s*'.*?',", f"chefsTip: `{chef_tip}`,", block, flags=re.DOTALL)
        block = re.sub(r'chefsTip:\s*".*?",', f"chefsTip: `{chef_tip}`,", block, flags=re.DOTALL)
        
    return block

new_products_js = re.sub(r'\{\s*id:.*?color:\s*\'#.*?\'\s*\}', update_product_block, products_js, flags=re.DOTALL)

with open('src/data/products.js', 'w', encoding='utf-8') as f:
    f.write(new_products_js)

print("Update fixed and complete!")
