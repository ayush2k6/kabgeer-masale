import React, { useEffect, useState } from 'react';
import { Clock, Users, ChevronRight, X, ChefHat, Flame, HeartPulse, ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import recipeBannerImg from '../assets/recipe banner.png';
import './RecipesPage.css';

const hardcodedRecipes = {
  'Mutton Stew Masala': {
    title: 'Authentic Mughlai Mutton Stew',
    time: '45 mins',
    servings: '4',
    masala: 'Mutton Stew Masala',
    desc: 'A rich, aromatic, slow-cooked stew using our signature 9-spice blend.',
    category: 'Non-Veg',
    ingredients: [
      '500g Mutton, curry cut',
      '3 large Onions, sliced',
      '2 tbsp Desi Ghee',
      '1/2 cup Yogurt (Dahi)',
      '1 packet Kabgeer Mutton Stew Masala',
      'Salt to taste',
      'Fresh coriander for garnish'
    ],
    instructions: [
      'Heat ghee in a heavy-bottomed pan or pressure cooker.',
      'Add the sliced onions and fry until they are golden brown.',
      'Add the mutton pieces and sear them well for 5-7 minutes.',
      'Mix in the yogurt, salt, and the complete packet of Kabgeer Mutton Stew Masala.',
      'Stir well, add half a cup of water, and cover. Cook until the meat is tender.',
      'Garnish with fresh coriander and serve hot with naan or sheermaal.'
    ]
  },
  'Chole Masale': {
    title: 'Delhi-Style Chole Bhature',
    time: '30 mins',
    servings: '4',
    masala: 'Chole Masale',
    desc: 'Spicy, tangy, and dark chole made perfectly with our authentic daily blend.',
    category: 'Veg',
    ingredients: [
      '250g Kabuli Chana (soaked overnight)',
      '2 Tea bags (for dark color)',
      '2 tbsp Oil or Ghee',
      '1 large Tomato, pureed',
      '1 packet Kabgeer Chole Masale',
      'Ginger juliennes and slit green chilies'
    ],
    instructions: [
      'Pressure cook the soaked chana with salt, water, and tea bags for 5-6 whistles.',
      'In a separate kadhai, heat oil/ghee and add the tomato puree. Cook for 2 mins.',
      'Add the Kabgeer Chole Masale and cook until oil separates.',
      'Discard tea bags from boiled chana and add chana with its water to the kadhai.',
      'Simmer for 10-15 minutes until the gravy thickens.',
      'Garnish with ginger juliennes and green chilies. Serve hot.'
    ]
  },
  'Veg Tandoori Masala': {
    title: 'Smoky Veg Tandoori Tikka',
    time: '25 mins',
    servings: '2',
    masala: 'Veg Tandoori Masala',
    desc: 'Get restaurant-style charred flavors at home with paneer and vegetables.',
    category: 'Veg',
    ingredients: [
      '200g Paneer, cubed',
      '1 Capsicum & 1 Onion, diced',
      '3 tbsp Hung Curd',
      '1 tbsp Mustard Oil',
      '2 tbsp Kabgeer Veg Tandoori Masala',
      'Lemon juice'
    ],
    instructions: [
      'In a bowl, mix hung curd, mustard oil, and Kabgeer Veg Tandoori Masala to form a marinade.',
      'Add paneer, capsicum, and onions. Coat well and let rest for 15-20 minutes.',
      'Skewer the paneer and veggies.',
      'Grill in an oven or pan-fry on a grill pan until charred edges appear.',
      'Squeeze fresh lemon juice over it and serve with mint chutney.'
    ]
  },
  'Galauti Kebab Masala': {
    title: 'Lucknawi Galauti Kebab',
    time: '40 mins',
    servings: '4',
    masala: 'Galauti Kebab Masala',
    desc: 'Melt-in-your-mouth authentic Awadhi kebabs made simple.',
    category: 'Non-Veg',
    ingredients: [
      '500g Minced Mutton (Keema), very fine',
      '2 tbsp Raw Papaya Paste',
      '1 tbsp Roasted Gram Flour (Besan)',
      '2 tbsp Ghee',
      '1 packet Kabgeer Galauti Kebab Masala',
      'Kewra water (optional)'
    ],
    instructions: [
      'Mix the minced mutton with raw papaya paste and let it marinate for 1 hour.',
      'Add the roasted gram flour, ghee, and Kabgeer Galauti Kebab Masala to the mix.',
      'Knead the mixture well like dough. Add a few drops of kewra water if desired.',
      'Form small, flat patties (kebabs) with your hands.',
      'Shallow fry on a tawa with ghee until both sides are dark brown and crisp.',
      'Serve with Ulte Tawa Ka Paratha and green chutney.'
    ]
  }
};

const RECIPES = PRODUCTS.map((product, index) => {
  if (hardcodedRecipes[product.name]) {
    return { ...hardcodedRecipes[product.name], id: `r${index + 1}`, image: product.image };
  }

  const isNonVeg = product.tags?.includes('Non-Veg');
  return {
    id: `r${index + 1}`,
    title: `Authentic ${product.name.replace(' Masala', '')} Recipe`,
    time: '40 mins',
    servings: '4',
    masala: product.name,
    desc: product.description || `A delicious recipe using Kabgeer ${product.name}.`,
    category: isNonVeg ? 'Non-Veg' : 'Veg',
    image: product.image,
    ingredients: [
      isNonVeg ? '500g Meat/Chicken' : '500g Mixed Vegetables/Paneer/Dal',
      '2 tbsp Desi Ghee or Oil',
      '2 Onions, finely chopped',
      '2 Tomatoes, pureed (if required)',
      `1 packet Kabgeer ${product.name}`,
      'Salt to taste',
      'Fresh coriander for garnish'
    ],
    instructions: [
      'Heat ghee or oil in a heavy-bottomed pan or pressure cooker.',
      'Add the chopped onions and fry until they turn golden brown.',
      'Add your main ingredient (meat/vegetables/paneer) and sauté well for 5-7 minutes.',
      `Mix in the Kabgeer ${product.name} and cook until the oil separates from the masala.`,
      'Add water as per your desired gravy consistency and cook until tender.',
      `Chef's Tip: ${product.chefsTip || 'Serve hot with naan, paratha, or steamed rice.'}`,
      'Garnish with fresh coriander leaves before serving.'
    ]
  };
});

const RecipesPage = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (location.state && location.state.openRecipeFor) {
      const recipeToOpen = RECIPES.find(r => r.masala === location.state.openRecipeFor);
      if (recipeToOpen) {
        setSelectedRecipe(recipeToOpen);
        if (recipeToOpen.category && recipeToOpen.category !== 'All') {
          setActiveFilter(recipeToOpen.category);
        }
      }
    }
  }, [location.state]);

  const filteredRecipes = RECIPES.filter(recipe => {
    if (activeFilter === 'All') return true;
    return recipe.category === activeFilter;
  });

  return (
    <div className="recipes-page-wrapper">
      
      {/* Banner Section */}
      <section className="recipes-hero-banner">
        <img
          src={recipeBannerImg}
          alt="Authentic Lucknavi Masala Recipes"
          className="recipes-banner-image"
        />
      </section>

      {/* Main Content Area */}
      <div className="recipes-main-content">
        <div className="container recipes-container">
          
          {/* Category Filter Tabs */}
          <div className="recipes-filter-tabs">
            {['All', 'Veg', 'Non-Veg'].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`recipe-filter-btn ${activeFilter === filter ? 'active' : ''}`}
              >
                {filter === 'All' ? 'All Heritage Recipes' : `${filter} Recipes`}
              </button>
            ))}
          </div>

          {/* Recipes Grid */}
          <div className="recipes-grid">
            {filteredRecipes.map(recipe => (
              <div
                key={recipe.id}
                className="recipe-card"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <div
                  className="recipe-card-img-wrap"
                  style={{ backgroundImage: `url('${recipe.image}')` }}
                >
                  <span className={`recipe-category-badge ${recipe.category === 'Veg' ? 'veg' : 'non-veg'}`}>
                    {recipe.category}
                  </span>
                </div>

                <div className="recipe-card-body">
                  <span className="recipe-masala-tag">
                    Uses {recipe.masala}
                  </span>
                  <h3 className="recipe-card-title">
                    {recipe.title}
                  </h3>
                  <p className="recipe-card-desc">
                    {recipe.desc}
                  </p>

                  <div className="recipe-card-footer">
                    <div className="recipe-meta-items">
                      <span className="recipe-meta-item">
                        <Clock size={15} /> {recipe.time}
                      </span>
                      <span className="recipe-meta-item">
                        <Users size={15} /> {recipe.servings} Servings
                      </span>
                    </div>
                    <span className="recipe-view-btn">
                      View Recipe <ChevronRight size={15} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Recipe Detail Modal Overlay */}
      {selectedRecipe && (
        <div className="recipe-modal-backdrop" onClick={() => setSelectedRecipe(null)}>
          <div className="recipe-modal-card" onClick={(e) => e.stopPropagation()}>
            
            <button
              onClick={() => setSelectedRecipe(null)}
              className="recipe-modal-close-btn"
              aria-label="Close recipe modal"
            >
              <X size={18} />
            </button>

            <div className="recipe-modal-inner">
              
              {/* Modal Header */}
              <div className="recipe-modal-header">
                <hr className="recipe-modal-ornament-line" />
                <h2 className="recipe-modal-title">
                  {selectedRecipe.title}
                </h2>
                <hr className="recipe-modal-ornament-line" />
              </div>

              {/* 4 Quick Badges */}
              <div className="recipe-modal-stats-grid">
                <div className="recipe-modal-stat">
                  <ChefHat size={28} strokeWidth={1.4} className="recipe-modal-stat-icon" />
                  <strong>Difficulty</strong>
                  <span>Easy</span>
                </div>
                <div className="recipe-modal-stat">
                  <Clock size={28} strokeWidth={1.4} className="recipe-modal-stat-icon" />
                  <strong>Prep Time</strong>
                  <span>15 mins</span>
                </div>
                <div className="recipe-modal-stat">
                  <Flame size={28} strokeWidth={1.4} className="recipe-modal-stat-icon" />
                  <strong>Cook Time</strong>
                  <span>{selectedRecipe.time}</span>
                </div>
                <div className="recipe-modal-stat">
                  <HeartPulse size={28} strokeWidth={1.4} className="recipe-modal-stat-icon" />
                  <strong>Nutrition</strong>
                  <span>100% Pure</span>
                </div>
              </div>

              {/* Recipe Image */}
              <div className="recipe-modal-image-wrap">
                <img
                  src={selectedRecipe.image}
                  alt={selectedRecipe.title}
                  className="recipe-modal-image"
                />
              </div>

              {/* Details Grid: Ingredients & Instructions */}
              <div className="recipe-modal-details-grid">
                {/* Ingredients */}
                <div className="recipe-details-col">
                  <h3>Ingredients Required</h3>
                  <ul className="recipe-ingredients-list">
                    {selectedRecipe.ingredients.map((item, idx) => (
                      <li key={idx}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div className="recipe-details-col">
                  <h3>Cooking Instructions</h3>
                  <ol className="recipe-instructions-list">
                    {selectedRecipe.instructions.map((step, idx) => (
                      <li key={idx}>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Call to action */}
              <div className="recipe-modal-cta-box">
                <p>Missing the authentic royal spice blend?</p>
                <Link
                  to={`/products?search=${encodeURIComponent(selectedRecipe.masala)}`}
                  className="btn-get-recipe-masala"
                >
                  <ShoppingBag size={17} /> Get {selectedRecipe.masala}
                </Link>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RecipesPage;
