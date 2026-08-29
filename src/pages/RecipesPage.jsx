import React, { useEffect, useState } from 'react';
import { Clock, Users, ChevronRight, X, ChefHat, CheckCircle2, Flame, HeartPulse } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { PRODUCTS } from '../data/products';
import recipeBannerImg from '../assets/recipe banner.png';
import spicePatternImg from '../assets/image.png';
const hardcodedRecipes = {
  'Mutton Stew Masala': {
    title: 'Authentic Mughlai Mutton Stew',
    time: '45 mins',
    servings: '4',
    masala: 'Mutton Stew Masala',
    desc: 'A rich, aromatic, slow-cooked stew using our signature 9-spice blend.',
    category: 'Non-Veg',
    color: '#0a4226',
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
      'Stir well, add half a cup of water, and cover. If using a pressure cooker, cook for 4-5 whistles until the meat is tender.',
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
    color: '#5e3219',
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
      'Discard tea bags from the boiled chana and add the chana along with its water to the kadhai.',
      'Simmer for 10-15 minutes until the gravy thickens.',
      'Garnish with ginger juliennes and green chilies. Serve with hot bhaturas.'
    ]
  },
  'Veg Tandoori Masala': {
    title: 'Smoky Veg Tandoori Tikka',
    time: '25 mins',
    servings: '2',
    masala: 'Veg Tandoori Masala',
    desc: 'Get restaurant-style charred flavors at home with paneer and vegetables.',
    category: 'Veg',
    color: '#d6a033',
    ingredients: [
      '200g Paneer, cubed',
      '1 Capsicum & 1 Onion, diced',
      '3 tbsp Hung Curd',
      '1 tbsp Mustard Oil',
      '2 tbsp Kabgeer Veg Tandoori Masala',
      'Lemon juice'
    ],
    instructions: [
      'In a bowl, mix hung curd, mustard oil, and Kabgeer Veg Tandoori Masala to form a thick marinade.',
      'Add paneer, capsicum, and onions to the marinade. Coat well and let it rest for 15-20 minutes.',
      'Skewer the paneer and veggies.',
      'Grill in an oven at 200°C for 10-12 mins, or pan-fry on a grill pan until charred edges appear.',
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
    color: '#5e3219',
    ingredients: [
      '500g Minced Mutton (Keema), very fine',
      '2 tbsp Raw Papaya Paste',
      '1 tbsp Roasted Gram Flour (Besan)',
      '2 tbsp Ghee',
      '1 packet Kabgeer Galauti Kebab Masala',
      'Kewra water (optional)'
    ],
    instructions: [
      'Mix the minced mutton with raw papaya paste and let it marinate for 1 hour to tenderize.',
      'Add the roasted gram flour, ghee, and the complete packet of Kabgeer Galauti Kebab Masala to the mix.',
      'Knead the mixture well like dough. Add a few drops of kewra water if desired.',
      'Form small, flat patties (kebabs) with your hands.',
      'Shallow fry on a non-stick tawa or grill pan with ghee until both sides are dark brown and crisp.',
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
    color: product.color || '#5e3219',
    image: product.image,
    ingredients: [
      isNonVeg ? '500g Meat/Chicken' : '500g Mixed Vegetables/Paneer/Dal',
      '2 tbsp Desi Ghee or Oil',
      '2 Onions, finely chopped',
      '2 Tomatoes, pureed (if required)',
      `1 packet Kabgeer ${product.name}`,
      'Salt to taste (check masala box if salt is already added)',
      'Fresh coriander for garnish'
    ],
    instructions: [
      'Heat ghee or oil in a heavy-bottomed pan or pressure cooker.',
      'Add the chopped onions and fry until they turn golden brown.',
      'Add your main ingredient (meat/vegetables/paneer) and sauté well for 5-7 minutes.',
      `Mix in the Kabgeer ${product.name} and cook until the oil separates from the masala.`,
      'Add water as per your desired gravy consistency and cover. Cook until the main ingredient is fully tender.',
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
        // Optionally update filter based on recipe
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
    <div style={{
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* Banner Section */}
      <section className="recipes-banner">
        <img src={recipeBannerImg} alt="Recipes Banner" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </section>

      <div style={{ position: 'relative', backgroundColor: '#fdfaf5' }}>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="container" style={{ padding: '3rem 1.5rem' }}>
        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
          {['All', 'Veg', 'Non-Veg'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '25px',
                border: `2px solid ${activeFilter === filter ? 'var(--color-primary)' : 'var(--color-border)'}`,
                backgroundColor: activeFilter === filter ? 'var(--color-primary)' : 'white',
                color: activeFilter === filter ? 'white' : 'var(--color-text)',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {filter}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {filteredRecipes.map(recipe => (
            <div
              key={recipe.id}
              onClick={() => setSelectedRecipe(recipe)}
              style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-md)', transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'pointer' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            >
              <div style={{
                height: '220px',
                backgroundColor: 'transparent',
                backgroundImage: `url('${recipe.image}')`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <span style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: 'var(--color-primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 1, boxShadow: 'var(--shadow-sm)' }}>
                  {recipe.category}
                </span>
              </div>

              <div style={{ padding: '1.5rem' }}>
                <span style={{ color: 'var(--color-accent)', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Uses {recipe.masala}
                </span>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--color-primary)', margin: '0.5rem 0 1rem 0' }}>
                  {recipe.title}
                </h3>
                <p style={{ color: 'var(--color-text-light)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  {recipe.desc}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={16} /> {recipe.time}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={16} /> {recipe.servings}</span>
                  </div>
                  <span style={{ color: 'var(--color-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    View Recipe <ChevronRight size={16} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
        </div>
      </div>

      {/* Recipe Modal Overlay */}
      {selectedRecipe && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <button
              onClick={() => setSelectedRecipe(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#fff',
                border: '1px solid #eee',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 10
              }}
            >
              <X size={20} color="#000" />
            </button>

            <div style={{ padding: '3rem 4rem', backgroundColor: '#fff', color: '#333' }}>
              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '0 0 1rem 0' }} />
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.8rem', color: '#000', margin: 0, fontWeight: 'normal' }}>
                  {selectedRecipe.title}
                </h2>
                <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '1rem 0 0 0' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', padding: '0 2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <ChefHat size={36} strokeWidth={1.2} color="#000" />
                  <strong style={{ fontSize: '1rem', color: '#000' }}>Difficulty</strong>
                  <span style={{ fontSize: '0.9rem', color: '#555' }}>Easy</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Clock size={36} strokeWidth={1.2} color="#000" />
                  <strong style={{ fontSize: '1rem', color: '#000' }}>Prep Time</strong>
                  <span style={{ fontSize: '0.9rem', color: '#555' }}>15 mins</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Flame size={36} strokeWidth={1.2} color="#000" />
                  <strong style={{ fontSize: '1rem', color: '#000' }}>Cook Time</strong>
                  <span style={{ fontSize: '0.9rem', color: '#555' }}>{selectedRecipe.time}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <HeartPulse size={36} strokeWidth={1.2} color="#000" />
                  <strong style={{ fontSize: '1rem', color: '#000' }}>Nutrition</strong>
                  <span style={{ fontSize: '0.9rem', color: '#555' }}>High</span>
                </div>
              </div>

              <div style={{ width: '100%', marginBottom: '2.5rem' }}>
                <img src={selectedRecipe.image} alt={selectedRecipe.title} style={{ width: '100%', height: '350px', objectFit: 'contain' }} />
              </div>

              <hr style={{ border: 'none', borderTop: '2px solid #000', marginBottom: '2.5rem' }} />

              <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
                {/* Ingredients */}
                <div style={{ flex: '1 1 300px' }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', marginBottom: '1.5rem', color: '#000', fontWeight: 'normal' }}>Ingredients</h3>
                  <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', margin: 0, color: '#000' }}>
                    {selectedRecipe.ingredients.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.5rem', fontSize: '1.05rem', lineHeight: '1.6' }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div style={{ flex: '1 1 300px' }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', marginBottom: '1.5rem', color: '#000', fontWeight: 'normal' }}>Instructions</h3>
                  <ol style={{ paddingLeft: '1.5rem', margin: 0, color: '#000' }}>
                    {selectedRecipe.instructions.map((step, idx) => (
                      <li key={idx} style={{ marginBottom: '0.75rem', fontSize: '1.05rem', lineHeight: '1.6' }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '2px solid #000', marginTop: '2.5rem', marginBottom: '2rem' }} />

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.95rem', marginBottom: '1rem', color: '#555' }}>Missing the magic ingredient?</p>
                <Link
                  to={`/products?search=${encodeURIComponent(selectedRecipe.masala)}`}
                  style={{ display: 'inline-block', backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.75rem 2rem', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', fontSize: '1rem' }}
                >
                  Get {selectedRecipe.masala}
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
