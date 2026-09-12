# Kabgeer Masale - Recent Addons & Modifications Log

This file documents all the recent visual, logical, and structural changes made to the project during the latest development phase.

## 1. Global UI & Typography Enhancements
* **Global Font Standardization**: Applied `Playfair Display` (the premium serif font) globally across the site for all headings and body text to give the brand a royal, heritage look.
* **Pricing Font Fix**: Standardized all pricing text (`₹79.00`, etc.) across Product Cards, Cart Drawer, Checkout, and Product Pages to use a clean sans-serif system font for better readability, distinguishing it from the fancy body text.

## 2. Product Data & Images
* **Updated Action Buttons**: Changed the secondary button text on all products from "View Step-by-Step Recipe" to a cleaner "View Recipe" in `src/data/products.js`.
* **Cover Image Updates**: Replaced the product cover mockups for `Chicken Biryani Masala`, `Mutton Biryani Masala`, and `Veg Biryani Masala` with newly provided high-quality mockups.

## 3. Build Your Bundle Page (`BuildBundlePage.jsx`)
* **Hero Banner Integration**: Added the `build your bundle banner.png` to the top of the page.
* **Custom Description Text**: Added the promotional text: *"Craft Your Own Spice Box. Curate your personalized selection of authentic masala blends... Special Bundle Offer! Buy 4 or more products to unlock 10% OFF + 2 FREE Mini Masala Boxes!"*
* **Layout Cleanup**: Removed the redundant "1-2-3 How it works" steps section from the page for a cleaner look.

## 4. Cart & Bundle Logic (`CartContext.jsx`)
* **Global MOQ Rule**: Enforced a strict Minimum Order Quantity (MOQ) of **2 packs per product** across the entire store.
* **Bundle Offer Logic Fix**: Updated the bundle logic so the offer (10% OFF + 2 FREE Mini Boxes) is only unlocked when the user adds **4 DISTINCT products** from the Build Bundle page, rather than just 4 total quantities of the same product.

## 5. Our Story Page (`AboutPage.jsx`)
* **Initial Layout Changes**: Added a premium gold/cream styling theme with custom pull-quotes to make the story visually striking.
* **Final Layout Refinement**: Removed the hero image banner and overlay entirely. The "Our Story" text was re-centered and expanded to take up the full container width in a single-column layout, providing a distraction-free, elegant reading experience. 

## 6. Profile / Account Page (`ProfilePage.jsx`)
* **UI Cleanup**: Removed the "Account Stats / VIP Patron Privileges Strip" (which showed '0 Orders Placed', 'Express Shipping', etc.) to streamline the user's dashboard experience.

## 7. Version Control
* **Git Push**: All of the above changes, along with image assets and CSS file modifications, were committed and successfully pushed to the remote repository (`https://github.com/tanmayhitech/kabgeer-masale-v1`).
