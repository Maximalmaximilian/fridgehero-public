-- Insert sample recipes for immediate app functionality
INSERT INTO recipes (name, description, ingredients, instructions, prep_time, cook_time, servings, difficulty, cuisine_type, diet_tags, rating) VALUES

-- Easy Breakfast Recipes
(
    'Avocado Toast',
    'Simple and nutritious breakfast with fresh avocado on whole grain toast',
    ARRAY['2 slices whole grain bread', '1 ripe avocado', 'Salt and pepper', 'Optional: tomato, lemon juice'],
    ARRAY['Toast the bread until golden', 'Mash avocado in a bowl', 'Season with salt and pepper', 'Spread avocado on toast', 'Add toppings if desired'],
    5, 5, 2, 'easy', 'American', ARRAY['vegetarian', 'vegan'], 4.5
),

(
    'Greek Yogurt Parfait',
    'Layered yogurt with berries and granola for a healthy start',
    ARRAY['1 cup Greek yogurt', '1/2 cup mixed berries', '1/4 cup granola', '1 tbsp honey'],
    ARRAY['In a glass, add a layer of yogurt', 'Add berries and granola', 'Repeat layers', 'Drizzle with honey'],
    5, 0, 1, 'easy', 'Mediterranean', ARRAY['vegetarian'], 4.7
),

-- Quick Lunch Ideas
(
    'Chicken Caesar Salad',
    'Classic caesar salad with grilled chicken breast',
    ARRAY['2 chicken breasts', '1 head romaine lettuce', '1/4 cup parmesan cheese', 'Caesar dressing', 'Croutons'],
    ARRAY['Season and grill chicken until cooked through', 'Chop romaine lettuce', 'Slice cooked chicken', 'Toss lettuce with dressing', 'Top with chicken, cheese, and croutons'],
    10, 15, 2, 'easy', 'American', ARRAY[], 4.3
),

(
    'Vegetable Stir Fry',
    'Quick and colorful vegetable stir fry with soy sauce',
    ARRAY['2 cups mixed vegetables', '2 cloves garlic', '1 tbsp vegetable oil', '2 tbsp soy sauce', '1 tsp ginger'],
    ARRAY['Heat oil in wok or large pan', 'Add garlic and ginger, stir for 30 seconds', 'Add vegetables and stir fry for 5-7 minutes', 'Add soy sauce and toss', 'Serve over rice'],
    10, 8, 2, 'easy', 'Asian', ARRAY['vegetarian', 'vegan'], 4.4
),

-- Dinner Options
(
    'Spaghetti Carbonara',
    'Classic Italian pasta with eggs, cheese, and pancetta',
    ARRAY['400g spaghetti', '200g pancetta', '4 eggs', '100g parmesan cheese', 'Black pepper', 'Salt'],
    ARRAY['Cook spaghetti according to package directions', 'Fry pancetta until crispy', 'Beat eggs with grated parmesan', 'Drain pasta, reserve some pasta water', 'Mix hot pasta with egg mixture', 'Add pancetta and toss', 'Season with pepper'],
    15, 15, 4, 'medium', 'Italian', ARRAY[], 4.6
),

(
    'Salmon with Roasted Vegetables',
    'Healthy baked salmon with seasonal roasted vegetables',
    ARRAY['4 salmon fillets', '2 cups mixed vegetables', '2 tbsp olive oil', 'Lemon', 'Salt', 'Pepper', 'Herbs'],
    ARRAY['Preheat oven to 400°F', 'Toss vegetables with oil, salt, pepper', 'Place on baking sheet', 'Season salmon and add to sheet', 'Bake for 15-20 minutes', 'Serve with lemon'],
    15, 20, 4, 'easy', 'Mediterranean', ARRAY[], 4.8
),

-- Vegetarian/Vegan Options
(
    'Black Bean Quesadillas',
    'Crispy quesadillas filled with black beans and cheese',
    ARRAY['4 flour tortillas', '1 can black beans', '1 cup shredded cheese', '1 bell pepper', '1/2 onion', 'Cumin', 'Paprika'],
    ARRAY['Drain and rinse black beans', 'Sauté onion and pepper', 'Mix beans with vegetables and spices', 'Fill tortillas with bean mixture and cheese', 'Cook in pan until crispy and cheese melts'],
    15, 10, 2, 'easy', 'Mexican', ARRAY['vegetarian'], 4.2
),

(
    'Lentil Curry',
    'Hearty and flavorful lentil curry with coconut milk',
    ARRAY['1 cup red lentils', '1 can coconut milk', '1 onion', '3 cloves garlic', '1 tbsp curry powder', '1 can diced tomatoes', 'Ginger'],
    ARRAY['Sauté onion, garlic, ginger', 'Add curry powder, cook 1 minute', 'Add lentils, tomatoes, coconut milk', 'Simmer 20 minutes until lentils are soft', 'Season with salt and pepper'],
    10, 25, 4, 'medium', 'Indian', ARRAY['vegetarian', 'vegan'], 4.5
),

-- Quick Snacks
(
    'Hummus and Veggie Wrap',
    'Fresh vegetables wrapped with creamy hummus',
    ARRAY['1 large tortilla', '3 tbsp hummus', '1/2 cucumber', '1 carrot', 'Lettuce leaves', '1/4 bell pepper'],
    ARRAY['Spread hummus on tortilla', 'Layer with lettuce', 'Add sliced vegetables', 'Roll tightly', 'Cut in half to serve'],
    10, 0, 1, 'easy', 'Mediterranean', ARRAY['vegetarian', 'vegan'], 4.1
),

(
    'Smoothie Bowl',
    'Thick smoothie topped with fresh fruits and granola',
    ARRAY['1 frozen banana', '1/2 cup berries', '1/4 cup yogurt', '1 tbsp almond butter', 'Granola', 'Fresh fruit for topping'],
    ARRAY['Blend frozen fruit with yogurt and almond butter', 'Pour into bowl', 'Top with granola and fresh fruit', 'Serve immediately'],
    8, 0, 1, 'easy', 'American', ARRAY['vegetarian'], 4.6
),

-- Comfort Food
(
    'Chicken Noodle Soup',
    'Classic comfort soup with tender chicken and vegetables',
    ARRAY['2 chicken breasts', '8 cups chicken broth', '2 carrots', '2 celery stalks', '1 onion', '2 cups egg noodles', 'Parsley'],
    ARRAY['Cook chicken in broth until tender, remove and shred', 'Sauté vegetables in pot', 'Add broth back, bring to boil', 'Add noodles, cook until tender', 'Return chicken to pot', 'Season and garnish with parsley'],
    15, 30, 6, 'easy', 'American', ARRAY[], 4.7
),

(
    'Mushroom Risotto',
    'Creamy Italian rice dish with sautéed mushrooms',
    ARRAY['1.5 cups arborio rice', '4 cups warm vegetable broth', '300g mixed mushrooms', '1/2 cup white wine', '1 onion', 'Parmesan cheese', 'Butter'],
    ARRAY['Sauté onion until soft', 'Add rice, stir for 2 minutes', 'Add wine, stir until absorbed', 'Gradually add warm broth, stirring constantly', 'In separate pan, sauté mushrooms', 'Fold mushrooms into risotto', 'Finish with butter and parmesan'],
    10, 35, 4, 'hard', 'Italian', ARRAY['vegetarian'], 4.4
),

-- International Flavors
(
    'Korean Bibimbap',
    'Mixed rice bowl with vegetables and protein',
    ARRAY['2 cups cooked rice', '1 cup spinach', '1 carrot', '1 zucchini', '200g ground beef', 'Soy sauce', 'Sesame oil', 'Gochujang', 'Eggs'],
    ARRAY['Cook rice and keep warm', 'Blanch spinach, season with sesame oil', 'Julienne and sauté carrot and zucchini separately', 'Brown ground beef with soy sauce', 'Fry eggs sunny side up', 'Arrange all components over rice', 'Serve with gochujang'],
    20, 25, 2, 'medium', 'Korean', ARRAY[], 4.5
),

(
    'Thai Green Curry',
    'Aromatic curry with coconut milk and fresh basil',
    ARRAY['2 tbsp green curry paste', '1 can coconut milk', '500g chicken thigh', '1 eggplant', 'Thai basil', 'Fish sauce', 'Palm sugar', 'Lime'],
    ARRAY['Heat half coconut milk, add curry paste', 'Add chicken, cook until nearly done', 'Add remaining coconut milk and eggplant', 'Season with fish sauce and sugar', 'Simmer until vegetables are tender', 'Add basil and lime juice'],
    15, 20, 4, 'medium', 'Thai', ARRAY[], 4.7
),

-- Desserts
(
    'Chocolate Chip Cookies',
    'Classic homemade chocolate chip cookies',
    ARRAY['2.25 cups flour', '1 cup butter', '3/4 cup brown sugar', '1/2 cup white sugar', '2 eggs', '2 tsp vanilla', '2 cups chocolate chips'],
    ARRAY['Preheat oven to 375°F', 'Cream butter and sugars', 'Beat in eggs and vanilla', 'Mix in flour gradually', 'Fold in chocolate chips', 'Drop spoonfuls on baking sheet', 'Bake 9-11 minutes'],
    15, 10, 24, 'easy', 'American', ARRAY['vegetarian'], 4.8
),

(
    'Fresh Fruit Salad',
    'Refreshing mix of seasonal fresh fruits',
    ARRAY['2 cups strawberries', '2 cups pineapple', '2 cups grapes', '2 bananas', '1 tbsp honey', '1 tbsp lime juice', 'Mint leaves'],
    ARRAY['Wash and prepare all fruits', 'Cut into bite-sized pieces', 'Combine in large bowl', 'Drizzle with honey and lime juice', 'Toss gently', 'Garnish with mint'],
    15, 0, 6, 'easy', 'International', ARRAY['vegetarian', 'vegan'], 4.4
);

-- Update recipe count to reflect actual number of recipes
SELECT COUNT(*) as total_recipes FROM recipes; 