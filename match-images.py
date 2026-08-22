import cv2
import numpy as np
import os
import re
import json

base_dir = r"c:/Users/Admin/.gemini/antigravity-ide/scratch/kabgeer-masale/public/assets/products"
template_dir = os.path.join(base_dir, "1. Mutton Stew")

template_files = ["1.png", "2.jpg", "3.png", "4.png", "5.jpg", "6.jpg", "7.jpg"]
templates = []

print("Loading templates...")
for tf in template_files:
    img = cv2.imread(os.path.join(template_dir, tf))
    img = cv2.resize(img, (200, 200))
    templates.append(img)

def compare_hist(img1, img2):
    hsv1 = cv2.cvtColor(img1, cv2.COLOR_BGR2HSV)
    hsv2 = cv2.cvtColor(img2, cv2.COLOR_BGR2HSV)
    
    hist1 = cv2.calcHist([hsv1], [0, 1], None, [50, 60], [0, 180, 0, 256])
    cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
    
    hist2 = cv2.calcHist([hsv2], [0, 1], None, [50, 60], [0, 180, 0, 256])
    cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)
    
    score = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
    return score

mapping = {}

for folder in os.listdir(base_dir):
    folder_path = os.path.join(base_dir, folder)
    if not os.path.isdir(folder_path) or folder == "1. Mutton Stew":
        continue
        
    print(f"Processing {folder}...")
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    target_imgs = {}
    for f in files:
        img = cv2.imread(os.path.join(folder_path, f))
        if img is not None:
            target_imgs[f] = cv2.resize(img, (200, 200))
    
    assigned = set()
    result_array = [None] * 7
    
    for i, tmpl in enumerate(templates):
        best_score = -1
        best_file = None
        for f, t_img in target_imgs.items():
            if f in assigned:
                continue
            score = compare_hist(tmpl, t_img)
            
            if i == 0:
                if re.match(r'^[2-9]\d\.(png|jpe?g)$', f, re.IGNORECASE) or re.match(r'^1\.(png|jpe?g)$', f, re.IGNORECASE):
                    score += 1.0 
            if i == 4 and 'cooking' in f.lower():
                score += 1.0
                
            if score > best_score:
                best_score = score
                best_file = f
                
        if best_file:
            result_array[i] = best_file
            assigned.add(best_file)
            
    remaining = [f for f in files if f not in assigned]
    mapping[folder] = [f for f in result_array if f is not None] + remaining

with open("c:/Users/Admin/.gemini/antigravity-ide/scratch/kabgeer-masale/mapping.json", "w") as f:
    json.dump(mapping, f, indent=2)

print("Saved mapping.json")
