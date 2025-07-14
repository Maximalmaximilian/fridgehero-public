-- Expanded Recipe Dataset Migration
-- Adding 50+ new recipes across diverse categories, meal types, and cuisines
-- Focus on variety, common ingredients, and different cooking skill levels

INSERT INTO recipes (name, description, ingredients, instructions, prep_time, cook_time, servings, difficulty, cuisine_type, diet_tags, rating) VALUES

-- BREAKFAST RECIPES (10 new)
(
    'Overnight Oats with Berries',
    'No-cook breakfast preparation perfect for busy mornings',
    ARRAY['1 cup rolled oats', '1 cup milk', '2 tbsp chia seeds', '1 tbsp honey', '1/2 cup mixed berries', '1/4 cup chopped nuts'],
    ARRAY['Mix oats, milk, and chia seeds in jar', 'Add honey and stir well', 'Refrigerate overnight', 'Top with berries and nuts before serving'],
    5, 0, 2, 'easy', 'American', ARRAY['vegetarian'], 4.6
),

(
    'Shakshuka',
    'Middle Eastern dish of eggs poached in spiced tomato sauce',
    ARRAY['6 eggs', '1 can crushed tomatoes', '1 onion', '3 cloves garlic', '1 red bell pepper', '2 tsp paprika', '1 tsp cumin', 'Feta cheese', 'Fresh parsley'],
    ARRAY['Sauté onion and pepper until soft', 'Add garlic and spices, cook 1 minute', 'Add tomatoes, simmer 10 minutes', 'Create wells and crack eggs into sauce', 'Cover and cook until eggs are set', 'Garnish with feta and parsley'],
    15, 20, 3, 'medium', 'Middle Eastern', ARRAY['vegetarian'], 4.7
),

(
    'Banana Pancakes',
    'Fluffy pancakes with natural banana sweetness',
    ARRAY['2 ripe bananas', '2 eggs', '1/4 cup flour', '1/4 tsp baking powder', '1 tbsp butter', 'Pinch of salt', 'Maple syrup'],
    ARRAY['Mash bananas in bowl', 'Beat in eggs and flour', 'Add baking powder and salt', 'Heat butter in pan', 'Cook small pancakes 2-3 minutes per side', 'Serve with maple syrup'],
    10, 10, 2, 'easy', 'American', ARRAY['vegetarian'], 4.4
),

(
    'Breakfast Burrito',
    'Protein-packed portable breakfast wrapped in tortilla',
    ARRAY['4 large eggs', '4 flour tortillas', '1 cup cooked black beans', '1 cup shredded cheese', '1 avocado', '1/4 cup salsa', '2 tbsp olive oil'],
    ARRAY['Scramble eggs in olive oil', 'Warm tortillas', 'Fill with eggs, beans, cheese', 'Add avocado slices and salsa', 'Roll tightly and serve'],
    15, 10, 4, 'easy', 'Mexican', ARRAY['vegetarian'], 4.5
),

(
    'Steel Cut Oatmeal',
    'Creamy, hearty oatmeal with customizable toppings',
    ARRAY['1 cup steel cut oats', '4 cups water', '1 cup milk', '2 tbsp brown sugar', '1/2 tsp cinnamon', 'Fresh fruit', 'Nuts'],
    ARRAY['Bring water to boil', 'Add oats and reduce heat', 'Simmer 20-25 minutes stirring occasionally', 'Stir in milk and sugar', 'Top with fruit and nuts'],
    5, 25, 4, 'easy', 'American', ARRAY['vegetarian'], 4.3
),

(
    'French Toast',
    'Classic custard-soaked bread griddled to golden perfection',
    ARRAY['8 slices thick bread', '4 eggs', '1/2 cup milk', '2 tbsp sugar', '1 tsp vanilla', '1/2 tsp cinnamon', 'Butter', 'Powdered sugar'],
    ARRAY['Whisk eggs, milk, sugar, vanilla, cinnamon', 'Dip bread slices in mixture', 'Cook in buttered pan until golden', 'Flip and cook other side', 'Dust with powdered sugar'],
    10, 15, 4, 'easy', 'French', ARRAY['vegetarian'], 4.8
),

(
    'Breakfast Quinoa Bowl',
    'Protein-rich grain bowl with fresh toppings',
    ARRAY['1 cup cooked quinoa', '1 cup almond milk', '2 tbsp maple syrup', '1/2 cup berries', '1/4 cup almonds', '2 tbsp coconut flakes', '1 tbsp chia seeds'],
    ARRAY['Warm quinoa with almond milk', 'Stir in maple syrup', 'Top with berries and almonds', 'Sprinkle with coconut and chia seeds'],
    5, 5, 2, 'easy', 'American', ARRAY['vegetarian', 'vegan'], 4.4
),

(
    'Eggs Benedict',
    'Classic brunch dish with poached eggs and hollandaise',
    ARRAY['4 eggs', '2 English muffins', '4 slices Canadian bacon', '3 egg yolks', '1/2 cup butter', '2 tbsp lemon juice', 'Cayenne pepper'],
    ARRAY['Toast English muffin halves', 'Warm Canadian bacon', 'Poach eggs in simmering water', 'Make hollandaise with yolks, butter, lemon', 'Assemble and serve immediately'],
    20, 15, 2, 'hard', 'American', ARRAY[], 4.6
),

(
    'Breakfast Hash',
    'Hearty skillet dish with potatoes, vegetables, and eggs',
    ARRAY['4 medium potatoes', '1 onion', '2 bell peppers', '4 eggs', '4 slices bacon', '2 tbsp olive oil', 'Salt', 'Pepper', 'Paprika'],
    ARRAY['Dice and parboil potatoes', 'Cook bacon until crispy, set aside', 'Sauté potatoes until golden', 'Add onions and peppers', 'Create wells for eggs', 'Cover and cook until eggs set'],
    15, 25, 4, 'medium', 'American', ARRAY[], 4.5
),

(
    'Acai Bowl',
    'Antioxidant-rich smoothie bowl with fresh toppings',
    ARRAY['2 frozen acai packets', '1 frozen banana', '1/2 cup berries', '1/4 cup granola', '2 tbsp coconut flakes', '1 tbsp honey', '1/4 cup apple juice'],
    ARRAY['Blend acai with banana and apple juice', 'Pour into bowl', 'Top with berries and granola', 'Drizzle with honey', 'Sprinkle coconut flakes'],
    10, 0, 1, 'easy', 'Brazilian', ARRAY['vegetarian', 'vegan'], 4.7
),

-- LUNCH RECIPES (15 new)
(
    'Buddha Bowl',
    'Nourishing bowl with quinoa, roasted vegetables, and tahini dressing',
    ARRAY['1 cup quinoa', '2 cups mixed vegetables', '1/4 cup tahini', '2 tbsp lemon juice', '1 tbsp olive oil', '1 avocado', '2 tbsp pumpkin seeds'],
    ARRAY['Cook quinoa according to package directions', 'Roast vegetables at 400°F for 20 minutes', 'Mix tahini with lemon juice and water', 'Arrange quinoa and vegetables in bowl', 'Top with avocado and seeds', 'Drizzle with tahini dressing'],
    15, 25, 2, 'easy', 'Modern Healthy', ARRAY['vegetarian', 'vegan'], 4.6
),

(
    'Mediterranean Wrap',
    'Fresh vegetables and hummus wrapped in lavash bread',
    ARRAY['2 large lavash breads', '1/2 cup hummus', '1 cucumber', '2 tomatoes', '1/4 red onion', '1/4 cup olives', '1/4 cup feta cheese', 'Spinach leaves'],
    ARRAY['Spread hummus on lavash', 'Layer with spinach leaves', 'Add sliced vegetables and olives', 'Sprinkle with feta cheese', 'Roll tightly and slice'],
    15, 0, 2, 'easy', 'Mediterranean', ARRAY['vegetarian'], 4.3
),

(
    'Thai Beef Salad',
    'Spicy and refreshing salad with grilled beef',
    ARRAY['1 lb beef sirloin', '6 cups mixed greens', '1 cucumber', '2 tomatoes', '1/4 red onion', '1/4 cup mint', '3 tbsp lime juice', '2 tbsp fish sauce', '1 tbsp brown sugar', '2 Thai chilies'],
    ARRAY['Grill beef to medium-rare, slice thin', 'Mix lime juice, fish sauce, sugar, chilies', 'Combine greens with vegetables and herbs', 'Toss with dressing', 'Top with sliced beef'],
    20, 10, 4, 'medium', 'Thai', ARRAY[], 4.5
),

(
    'Quinoa Tabbouleh',
    'Protein-rich twist on traditional Middle Eastern salad',
    ARRAY['1 cup quinoa', '3 tomatoes', '1 cucumber', '1/2 cup parsley', '1/4 cup mint', '1/4 cup lemon juice', '1/4 cup olive oil', 'Salt', 'Pepper'],
    ARRAY['Cook quinoa and let cool', 'Dice tomatoes and cucumber finely', 'Chop herbs', 'Mix all ingredients', 'Let flavors meld for 30 minutes', 'Adjust seasoning and serve'],
    20, 15, 4, 'easy', 'Middle Eastern', ARRAY['vegetarian', 'vegan'], 4.4
),

(
    'Ramen Bowl',
    'Comforting noodle soup with rich broth and toppings',
    ARRAY['4 packs ramen noodles', '6 cups chicken broth', '2 eggs', '1 cup mushrooms', '2 green onions', '1 sheet nori', '2 cloves garlic', '1 tbsp miso paste'],
    ARRAY['Simmer broth with garlic and miso', 'Soft boil eggs for 6 minutes', 'Sauté mushrooms', 'Cook ramen noodles', 'Assemble bowls with noodles and broth', 'Top with eggs, mushrooms, nori, green onions'],
    15, 20, 2, 'medium', 'Japanese', ARRAY[], 4.7
),

(
    'Caprese Sandwich',
    'Italian sandwich with fresh mozzarella, tomato, and basil',
    ARRAY['4 slices ciabatta bread', '8 oz fresh mozzarella', '2 large tomatoes', '1/4 cup fresh basil', '3 tbsp balsamic glaze', '2 tbsp olive oil'],
    ARRAY['Slice mozzarella and tomatoes', 'Brush bread with olive oil', 'Layer cheese, tomato, and basil', 'Drizzle with balsamic glaze', 'Grill or serve fresh'],
    10, 5, 2, 'easy', 'Italian', ARRAY['vegetarian'], 4.5
),

(
    'Asian Lettuce Wraps',
    'Light and flavorful ground meat in crisp lettuce cups',
    ARRAY['1 lb ground turkey', '1 head butter lettuce', '2 tbsp soy sauce', '1 tbsp sesame oil', '2 cloves garlic', '1 tbsp ginger', '2 green onions', '1/4 cup water chestnuts'],
    ARRAY['Brown ground turkey in pan', 'Add garlic and ginger', 'Stir in soy sauce and sesame oil', 'Add water chestnuts and green onions', 'Serve in lettuce cups'],
    15, 10, 4, 'easy', 'Asian', ARRAY[], 4.4
),

(
    'Greek Salad',
    'Traditional salad with feta, olives, and Greek dressing',
    ARRAY['6 cups romaine lettuce', '2 tomatoes', '1 cucumber', '1/2 red onion', '1/2 cup kalamata olives', '4 oz feta cheese', '1/4 cup olive oil', '2 tbsp red wine vinegar', '1 tsp oregano'],
    ARRAY['Chop vegetables into bite-sized pieces', 'Whisk oil, vinegar, and oregano', 'Combine vegetables and olives', 'Top with crumbled feta', 'Drizzle with dressing'],
    15, 0, 4, 'easy', 'Greek', ARRAY['vegetarian'], 4.6
),

(
    'Pulled Pork Sandwich',
    'Slow-cooked pork shoulder with tangy barbecue sauce',
    ARRAY['3 lbs pork shoulder', '1/2 cup brown sugar', '2 tbsp paprika', '1 tbsp cumin', '1 cup barbecue sauce', '4 hamburger buns', 'Coleslaw mix'],
    ARRAY['Rub pork with spices and brown sugar', 'Slow cook for 6-8 hours', 'Shred meat and mix with barbecue sauce', 'Serve on buns with coleslaw'],
    20, 480, 6, 'easy', 'American', ARRAY[], 4.8
),

(
    'Poke Bowl',
    'Hawaiian-style raw fish bowl with rice and vegetables',
    ARRAY['1 lb sushi-grade tuna', '2 cups cooked rice', '1 avocado', '1 cucumber', '1/4 cup edamame', '2 tbsp soy sauce', '1 tbsp sesame oil', '1 tsp rice vinegar', 'Sesame seeds'],
    ARRAY['Cube tuna into bite-sized pieces', 'Mix soy sauce, sesame oil, vinegar', 'Marinate tuna in sauce', 'Arrange rice in bowls', 'Top with tuna, avocado, cucumber, edamame', 'Sprinkle with sesame seeds'],
    20, 0, 2, 'medium', 'Hawaiian', ARRAY[], 4.7
),

(
    'Falafel Wrap',
    'Crispy chickpea fritters with tahini sauce in pita',
    ARRAY['1 can chickpeas', '1/4 cup flour', '2 cloves garlic', '1 tsp cumin', '1/4 cup parsley', '4 pita breads', '1/4 cup tahini', '2 tbsp lemon juice', 'Cucumber', 'Tomato'],
    ARRAY['Pulse chickpeas with garlic, cumin, parsley', 'Form into balls and fry until golden', 'Mix tahini with lemon juice', 'Warm pita breads', 'Fill with falafel, vegetables, and sauce'],
    25, 15, 4, 'medium', 'Middle Eastern', ARRAY['vegetarian', 'vegan'], 4.5
),

(
    'BLT Sandwich',
    'Classic bacon, lettuce, and tomato sandwich',
    ARRAY['8 slices bacon', '8 slices bread', '2 large tomatoes', '4 lettuce leaves', '1/4 cup mayonnaise'],
    ARRAY['Cook bacon until crispy', 'Toast bread slices', 'Slice tomatoes', 'Spread mayo on toast', 'Layer with lettuce, tomato, and bacon'],
    10, 10, 4, 'easy', 'American', ARRAY[], 4.3
),

(
    'Chicken Quesadilla',
    'Grilled chicken and cheese melted between tortillas',
    ARRAY['2 chicken breasts', '4 flour tortillas', '2 cups shredded cheese', '1 bell pepper', '1/2 onion', '2 tbsp olive oil', 'Salsa', 'Sour cream'],
    ARRAY['Season and grill chicken, slice thin', 'Sauté pepper and onion', 'Fill tortillas with chicken, vegetables, cheese', 'Cook in pan until cheese melts', 'Serve with salsa and sour cream'],
    15, 20, 4, 'easy', 'Mexican', ARRAY[], 4.4
),

(
    'Nicoise Salad',
    'French salad with tuna, eggs, and vegetables',
    ARRAY['6 cups mixed greens', '2 cans tuna', '4 hard-boiled eggs', '1 lb small potatoes', '1/2 lb green beans', '1/4 cup olives', '2 tbsp capers', '1/4 cup olive oil', '2 tbsp red wine vinegar'],
    ARRAY['Boil potatoes until tender', 'Blanch green beans', 'Hard boil eggs', 'Arrange all ingredients on greens', 'Whisk oil and vinegar', 'Drizzle dressing over salad'],
    20, 20, 4, 'medium', 'French', ARRAY[], 4.6
),

(
    'Bánh Mì Sandwich',
    'Vietnamese sandwich with pickled vegetables and protein',
    ARRAY['4 baguette pieces', '1 lb pork tenderloin', '1 cucumber', '2 carrots', '1/4 cup rice vinegar', '2 tbsp sugar', '1/4 cup cilantro', 'Jalapeños', 'Mayonnaise'],
    ARRAY['Marinate and grill pork', 'Quick pickle carrots in vinegar and sugar', 'Slice cucumber and jalapeños', 'Spread mayo on baguette', 'Fill with pork, pickled vegetables, cilantro'],
    20, 15, 4, 'medium', 'Vietnamese', ARRAY[], 4.7
),

-- DINNER RECIPES (15 new)
(
    'Beef Stroganoff',
    'Creamy beef and mushroom dish served over egg noodles',
    ARRAY['1.5 lbs beef sirloin', '8 oz mushrooms', '1 onion', '3 tbsp flour', '2 cups beef broth', '1 cup sour cream', '3 tbsp butter', '12 oz egg noodles', 'Parsley'],
    ARRAY['Cut beef into strips', 'Brown beef in butter, remove', 'Sauté mushrooms and onion', 'Add flour, cook 1 minute', 'Gradually add broth', 'Return beef, simmer 10 minutes', 'Stir in sour cream', 'Serve over noodles'],
    20, 25, 6, 'medium', 'Russian', ARRAY[], 4.7
),

(
    'Chicken Tikka Masala',
    'Creamy tomato curry with tender marinated chicken',
    ARRAY['2 lbs chicken breast', '1 cup yogurt', '2 tbsp garam masala', '1 onion', '4 cloves garlic', '2 tbsp ginger', '1 can crushed tomatoes', '1 cup heavy cream', '2 tbsp tomato paste'],
    ARRAY['Marinate chicken in yogurt and spices', 'Grill chicken until charred', 'Sauté onion, garlic, ginger', 'Add tomato paste and spices', 'Add tomatoes, simmer', 'Stir in cream and chicken', 'Serve with rice'],
    30, 30, 6, 'medium', 'Indian', ARRAY[], 4.8
),

(
    'Eggplant Parmesan',
    'Breaded eggplant layered with marinara and cheese',
    ARRAY['2 large eggplants', '2 cups flour', '4 eggs', '3 cups breadcrumbs', '3 cups marinara sauce', '2 cups mozzarella cheese', '1 cup parmesan cheese', 'Olive oil'],
    ARRAY['Slice eggplant, salt and drain', 'Set up breading station', 'Bread eggplant slices', 'Fry until golden', 'Layer with sauce and cheese', 'Bake at 375°F for 30 minutes'],
    45, 45, 6, 'medium', 'Italian', ARRAY['vegetarian'], 4.6
),

(
    'Moroccan Tagine',
    'Slow-cooked stew with warm spices and dried fruit',
    ARRAY['2 lbs lamb shoulder', '1 onion', '3 cloves garlic', '2 tsp cinnamon', '1 tsp ginger', '1/2 cup dried apricots', '1/4 cup almonds', '2 cups broth', 'Couscous'],
    ARRAY['Brown lamb in pot', 'Add onion and garlic', 'Stir in spices', 'Add broth and apricots', 'Simmer covered 1.5 hours', 'Add almonds', 'Serve over couscous'],
    20, 90, 6, 'medium', 'Moroccan', ARRAY[], 4.5
),

(
    'Fish Tacos',
    'Crispy fish with cabbage slaw in corn tortillas',
    ARRAY['1.5 lbs white fish', '8 corn tortillas', '2 cups cabbage', '1/4 cup lime juice', '2 tbsp mayo', '1 tsp cumin', '1/2 cup flour', '1 avocado', 'Cilantro'],
    ARRAY['Season and coat fish in flour', 'Pan fry until crispy', 'Mix cabbage with lime and mayo', 'Warm tortillas', 'Fill with fish, slaw, avocado', 'Garnish with cilantro'],
    15, 10, 4, 'easy', 'Mexican', ARRAY[], 4.4
),

(
    'Ratatouille',
    'French vegetable stew with herbs and olive oil',
    ARRAY['1 eggplant', '2 zucchini', '2 bell peppers', '4 tomatoes', '1 onion', '4 cloves garlic', '1/4 cup olive oil', 'Thyme', 'Basil', 'Bay leaves'],
    ARRAY['Dice all vegetables uniformly', 'Sauté onion and garlic', 'Add vegetables in order of cooking time', 'Season with herbs', 'Simmer until tender', 'Adjust seasoning'],
    25, 45, 6, 'medium', 'French', ARRAY['vegetarian', 'vegan'], 4.3
),

(
    'Korean BBQ Bowl',
    'Marinated beef with pickled vegetables over rice',
    ARRAY['1.5 lbs ribeye steak', '1/4 cup soy sauce', '2 tbsp brown sugar', '2 tbsp sesame oil', '3 cloves garlic', '2 cups cooked rice', 'Kimchi', 'Bean sprouts', 'Sesame seeds'],
    ARRAY['Marinate sliced beef in soy sauce, sugar, sesame oil, garlic', 'Grill beef over high heat', 'Serve over rice', 'Top with kimchi and bean sprouts', 'Sprinkle with sesame seeds'],
    20, 10, 4, 'easy', 'Korean', ARRAY[], 4.6
),

(
    'Stuffed Bell Peppers',
    'Colorful peppers filled with seasoned ground meat and rice',
    ARRAY['6 bell peppers', '1 lb ground beef', '1 cup cooked rice', '1 onion', '2 cloves garlic', '1 can diced tomatoes', '1 cup shredded cheese', 'Italian seasoning'],
    ARRAY['Cut tops off peppers, remove seeds', 'Brown beef with onion and garlic', 'Mix in rice, tomatoes, seasoning', 'Stuff peppers with mixture', 'Bake covered at 375°F for 45 minutes', 'Top with cheese, bake 10 more minutes'],
    20, 55, 6, 'easy', 'American', ARRAY[], 4.4
),

(
    'Pad Thai',
    'Classic Thai stir-fried noodles with sweet and tangy sauce',
    ARRAY['8 oz rice noodles', '3 tbsp tamarind paste', '3 tbsp brown sugar', '2 tbsp fish sauce', '2 eggs', '1 cup shrimp', '2 cups bean sprouts', '1/4 cup peanuts', 'Lime wedges'],
    ARRAY['Soak noodles until soft', 'Mix tamarind, sugar, fish sauce', 'Scramble eggs, set aside', 'Stir-fry shrimp', 'Add noodles and sauce', 'Toss with eggs and bean sprouts', 'Garnish with peanuts and lime'],
    15, 15, 4, 'medium', 'Thai', ARRAY[], 4.7
),

(
    'Chicken Marsala',
    'Pan-seared chicken in mushroom wine sauce',
    ARRAY['4 chicken breasts', '8 oz mushrooms', '1/2 cup Marsala wine', '1/2 cup chicken broth', '1/4 cup heavy cream', '3 tbsp butter', 'Flour', 'Parsley'],
    ARRAY['Pound chicken thin, dredge in flour', 'Sear chicken until golden, remove', 'Sauté mushrooms', 'Add wine and broth, reduce', 'Stir in cream and butter', 'Return chicken to sauce', 'Garnish with parsley'],
    15, 20, 4, 'medium', 'Italian', ARRAY[], 4.6
),

(
    'Beef and Broccoli',
    'Classic Chinese stir-fry with tender beef and crisp broccoli',
    ARRAY['1 lb beef sirloin', '4 cups broccoli florets', '3 tbsp soy sauce', '2 tbsp oyster sauce', '1 tbsp cornstarch', '2 cloves garlic', '1 tbsp ginger', '2 tbsp vegetable oil'],
    ARRAY['Slice beef thin, marinate in soy sauce and cornstarch', 'Blanch broccoli', 'Stir-fry beef until browned', 'Add garlic and ginger', 'Return broccoli to pan', 'Toss with oyster sauce'],
    15, 10, 4, 'easy', 'Chinese', ARRAY[], 4.5
),

(
    'Seafood Paella',
    'Spanish rice dish with saffron and mixed seafood',
    ARRAY['2 cups bomba rice', '4 cups seafood stock', '1/4 tsp saffron', '1 lb mixed seafood', '1 red pepper', '1/2 cup green beans', '4 cloves garlic', '1/4 cup olive oil', 'Lemon'],
    ARRAY['Heat oil in paella pan', 'Sauté garlic and vegetables', 'Add rice, stir to coat', 'Add hot stock with saffron', 'Arrange seafood on top', 'Simmer without stirring 20 minutes', 'Rest 5 minutes before serving'],
    20, 30, 6, 'hard', 'Spanish', ARRAY[], 4.8
),

(
    'Lamb Curry',
    'Aromatic slow-cooked lamb in rich Indian spices',
    ARRAY['2 lbs lamb shoulder', '2 onions', '4 cloves garlic', '2 tbsp ginger', '2 tbsp curry powder', '1 can coconut milk', '1 can diced tomatoes', 'Cilantro', 'Basmati rice'],
    ARRAY['Brown lamb in batches', 'Sauté onions until golden', 'Add garlic, ginger, spices', 'Return lamb with tomatoes', 'Simmer 1.5 hours until tender', 'Stir in coconut milk', 'Serve with rice and cilantro'],
    20, 90, 6, 'medium', 'Indian', ARRAY[], 4.7
),

(
    'Chicken Cacciatore',
    'Italian hunter\'s chicken with tomatoes and herbs',
    ARRAY['1 whole chicken, cut up', '1 onion', '2 bell peppers', '4 cloves garlic', '1 can crushed tomatoes', '1/2 cup white wine', 'Rosemary', 'Thyme', 'Olives'],
    ARRAY['Brown chicken pieces, remove', 'Sauté onion and peppers', 'Add garlic and herbs', 'Add wine and tomatoes', 'Return chicken to pot', 'Simmer covered 45 minutes', 'Add olives before serving'],
    20, 50, 6, 'medium', 'Italian', ARRAY[], 4.5
),

(
    'Turkey Meatballs',
    'Lean ground turkey meatballs in marinara sauce',
    ARRAY['1.5 lbs ground turkey', '1/2 cup breadcrumbs', '1 egg', '1/4 cup parmesan', '2 cloves garlic', '3 cups marinara sauce', 'Fresh basil', '1 lb spaghetti'],
    ARRAY['Mix turkey, breadcrumbs, egg, cheese, garlic', 'Form into meatballs', 'Brown in skillet', 'Simmer in marinara 20 minutes', 'Cook spaghetti', 'Serve meatballs over pasta', 'Garnish with basil'],
    20, 25, 6, 'easy', 'Italian', ARRAY[], 4.4
),

-- SNACKS & APPETIZERS (10 new)
(
    'Buffalo Cauliflower',
    'Crispy roasted cauliflower tossed in spicy buffalo sauce',
    ARRAY['1 head cauliflower', '1/2 cup flour', '1/2 cup milk', '1/2 cup buffalo sauce', '2 tbsp butter', 'Ranch dressing'],
    ARRAY['Cut cauliflower into florets', 'Make batter with flour and milk', 'Dip cauliflower in batter', 'Bake at 450°F for 15 minutes', 'Toss with buffalo sauce and butter', 'Serve with ranch'],
    15, 20, 4, 'easy', 'American', ARRAY['vegetarian'], 4.3
),

(
    'Spinach Artichoke Dip',
    'Creamy hot dip perfect for parties',
    ARRAY['1 package frozen spinach', '1 can artichoke hearts', '8 oz cream cheese', '1/2 cup mayo', '1/2 cup sour cream', '1 cup parmesan cheese', '3 cloves garlic'],
    ARRAY['Thaw and drain spinach', 'Chop artichoke hearts', 'Mix all ingredients except 1/4 cup parmesan', 'Transfer to baking dish', 'Top with remaining cheese', 'Bake at 375°F for 25 minutes'],
    15, 25, 8, 'easy', 'American', ARRAY['vegetarian'], 4.6
),

(
    'Deviled Eggs',
    'Classic appetizer with creamy yolk filling',
    ARRAY['12 hard-boiled eggs', '1/2 cup mayonnaise', '1 tsp mustard', '1 tsp vinegar', 'Paprika', 'Salt', 'Pepper'],
    ARRAY['Halve eggs and remove yolks', 'Mash yolks with mayo, mustard, vinegar', 'Season with salt and pepper', 'Pipe mixture back into whites', 'Sprinkle with paprika'],
    20, 0, 6, 'easy', 'American', ARRAY['vegetarian'], 4.4
),

(
    'Bruschetta',
    'Toasted bread topped with fresh tomato mixture',
    ARRAY['1 baguette', '4 ripe tomatoes', '1/4 cup fresh basil', '3 cloves garlic', '3 tbsp olive oil', '2 tbsp balsamic vinegar', 'Salt', 'Pepper'],
    ARRAY['Slice and toast baguette', 'Dice tomatoes and remove seeds', 'Chop basil and garlic', 'Mix tomatoes with basil, garlic, oil, vinegar', 'Season with salt and pepper', 'Top toasted bread with mixture'],
    15, 5, 6, 'easy', 'Italian', ARRAY['vegetarian', 'vegan'], 4.5
),

(
    'Stuffed Mushrooms',
    'Button mushrooms filled with seasoned breadcrumb mixture',
    ARRAY['20 large button mushrooms', '1/2 cup breadcrumbs', '1/4 cup parmesan cheese', '2 cloves garlic', '2 tbsp olive oil', 'Parsley', 'Cream cheese'],
    ARRAY['Remove mushroom stems and chop', 'Mix chopped stems with breadcrumbs, cheese, garlic', 'Add olive oil and parsley', 'Fill mushroom caps with mixture', 'Bake at 375°F for 20 minutes'],
    20, 20, 6, 'easy', 'American', ARRAY['vegetarian'], 4.3
),

(
    'Chicken Wings',
    'Crispy baked wings with your choice of sauce',
    ARRAY['2 lbs chicken wings', '2 tbsp baking powder', '1 tsp salt', '1/2 cup hot sauce', '1/4 cup butter', 'Celery sticks', 'Blue cheese dressing'],
    ARRAY['Pat wings dry, toss with baking powder and salt', 'Arrange on wire rack', 'Bake at 425°F for 45 minutes', 'Mix hot sauce with melted butter', 'Toss wings in sauce', 'Serve with celery and blue cheese'],
    10, 45, 4, 'easy', 'American', ARRAY[], 4.7
),

(
    'Guacamole',
    'Fresh avocado dip with lime and cilantro',
    ARRAY['4 ripe avocados', '1 lime', '1/4 red onion', '2 cloves garlic', '1 jalapeño', '1/4 cup cilantro', '1 tomato', 'Salt'],
    ARRAY['Mash avocados with lime juice', 'Finely dice onion, garlic, jalapeño', 'Chop cilantro and dice tomato', 'Mix all ingredients', 'Season with salt', 'Serve with tortilla chips'],
    15, 0, 6, 'easy', 'Mexican', ARRAY['vegetarian', 'vegan'], 4.6
),

(
    'Caprese Skewers',
    'Fresh mozzarella, tomato, and basil on skewers',
    ARRAY['1 pint cherry tomatoes', '8 oz fresh mozzarella balls', '24 fresh basil leaves', '3 tbsp balsamic glaze', 'Wooden skewers'],
    ARRAY['Thread tomato, mozzarella, and basil on skewers', 'Arrange on serving platter', 'Drizzle with balsamic glaze', 'Serve immediately'],
    15, 0, 6, 'easy', 'Italian', ARRAY['vegetarian'], 4.4
),

(
    'Cheese and Charcuterie Board',
    'Artfully arranged selection of cheeses, meats, and accompaniments',
    ARRAY['3 types cheese', '2 types cured meat', 'Crackers', 'Nuts', 'Dried fruit', 'Fresh grapes', 'Honey', 'Mustard'],
    ARRAY['Arrange cheeses on large board', 'Add meats in folded arrangements', 'Fill spaces with crackers and nuts', 'Add fresh and dried fruits', 'Include small bowls for honey and mustard'],
    20, 0, 8, 'easy', 'European', ARRAY[], 4.5
),

(
    'Jalapeño Poppers',
    'Spicy jalapeños stuffed with cream cheese and wrapped in bacon',
    ARRAY['12 large jalapeños', '8 oz cream cheese', '1 cup shredded cheese', '12 slices bacon', 'Toothpicks'],
    ARRAY['Cut jalapeños in half, remove seeds', 'Mix cream cheese with shredded cheese', 'Fill jalapeños with cheese mixture', 'Wrap each with bacon, secure with toothpick', 'Bake at 400°F for 20 minutes'],
    20, 20, 6, 'easy', 'American', ARRAY[], 4.5
),

-- DESSERTS (10 new)
(
    'Tiramisu',
    'Classic Italian coffee-flavored dessert with mascarpone',
    ARRAY['6 egg yolks', '3/4 cup sugar', '1.25 cups mascarpone', '1.75 cups heavy cream', '2 packages ladyfingers', '1 cup strong coffee', '3 tbsp coffee liqueur', 'Cocoa powder'],
    ARRAY['Whisk egg yolks and sugar until thick', 'Add mascarpone', 'Whip cream to soft peaks, fold in', 'Combine coffee and liqueur', 'Dip ladyfingers in coffee mixture', 'Layer with mascarpone mixture', 'Refrigerate overnight', 'Dust with cocoa before serving'],
    30, 0, 8, 'medium', 'Italian', ARRAY['vegetarian'], 4.9
),

(
    'Cheesecake',
    'Rich and creamy New York style cheesecake',
    ARRAY['2 cups graham cracker crumbs', '1/2 cup butter', '32 oz cream cheese', '1 cup sugar', '4 eggs', '1 tsp vanilla', '1/4 cup sour cream'],
    ARRAY['Mix crumbs and melted butter, press into pan', 'Beat cream cheese until smooth', 'Add sugar, eggs, vanilla, sour cream', 'Pour over crust', 'Bake at 325°F for 60 minutes', 'Cool completely before serving'],
    20, 60, 12, 'medium', 'American', ARRAY['vegetarian'], 4.8
),

(
    'Chocolate Lava Cake',
    'Individual cakes with molten chocolate centers',
    ARRAY['4 oz dark chocolate', '4 tbsp butter', '2 eggs', '2 tbsp sugar', '2 tbsp flour', 'Pinch salt', 'Butter for ramekins', 'Vanilla ice cream'],
    ARRAY['Melt chocolate and butter', 'Beat eggs and sugar until thick', 'Fold in chocolate mixture and flour', 'Butter ramekins and fill', 'Bake at 425°F for 12 minutes', 'Invert onto plates', 'Serve with ice cream'],
    15, 12, 4, 'medium', 'French', ARRAY['vegetarian'], 4.7
),

(
    'Apple Crisp',
    'Baked apples topped with oat and brown sugar crumble',
    ARRAY['6 apples', '1 cup rolled oats', '1/2 cup flour', '1/2 cup brown sugar', '1/4 cup butter', '1 tsp cinnamon', '1/4 tsp nutmeg'],
    ARRAY['Peel and slice apples, arrange in baking dish', 'Mix oats, flour, brown sugar, cinnamon', 'Cut in cold butter until crumbly', 'Top apples with oat mixture', 'Bake at 375°F for 35 minutes'],
    15, 35, 8, 'easy', 'American', ARRAY['vegetarian'], 4.6
),

(
    'Crème Brûlée',
    'Elegant custard dessert with caramelized sugar top',
    ARRAY['2 cups heavy cream', '1 vanilla bean', '5 egg yolks', '1/3 cup sugar', '2 tbsp brown sugar'],
    ARRAY['Heat cream with vanilla bean', 'Whisk egg yolks with sugar', 'Slowly add hot cream to yolks', 'Strain into ramekins', 'Bake in water bath at 325°F for 35 minutes', 'Chill overnight', 'Sprinkle with brown sugar and torch'],
    20, 35, 6, 'hard', 'French', ARRAY['vegetarian'], 4.8
),

(
    'Brownies',
    'Fudgy chocolate brownies with crispy top',
    ARRAY['1 cup butter', '2 cups sugar', '4 eggs', '3/4 cup cocoa powder', '1 cup flour', '1/2 tsp salt', '1 cup chocolate chips'],
    ARRAY['Melt butter and mix with sugar', 'Beat in eggs one at a time', 'Sift together cocoa, flour, salt', 'Fold dry ingredients into wet', 'Add chocolate chips', 'Bake at 350°F for 25 minutes'],
    15, 25, 16, 'easy', 'American', ARRAY['vegetarian'], 4.5
),

(
    'Pavlova',
    'Light meringue dessert topped with cream and fruit',
    ARRAY['4 egg whites', '1 cup superfine sugar', '1 tsp vanilla', '1 tsp vinegar', '2 tbsp cornstarch', '2 cups heavy cream', '2 tbsp powdered sugar', 'Mixed berries'],
    ARRAY['Beat egg whites to soft peaks', 'Gradually add sugar until stiff', 'Fold in vanilla, vinegar, cornstarch', 'Shape into circle on parchment', 'Bake at 250°F for 1 hour', 'Cool completely', 'Top with whipped cream and berries'],
    20, 60, 8, 'medium', 'Australian', ARRAY['vegetarian'], 4.6
),

(
    'Banana Bread',
    'Moist quick bread made with overripe bananas',
    ARRAY['3 ripe bananas', '1/3 cup melted butter', '3/4 cup sugar', '1 egg', '1 tsp vanilla', '1 tsp baking soda', '1.5 cups flour', 'Pinch salt'],
    ARRAY['Mash bananas in large bowl', 'Mix in butter, sugar, egg, vanilla', 'Sprinkle baking soda and salt over mixture', 'Add flour and mix until just combined', 'Pour into greased loaf pan', 'Bake at 350°F for 60 minutes'],
    15, 60, 8, 'easy', 'American', ARRAY['vegetarian'], 4.4
),

(
    'Key Lime Pie',
    'Tart and creamy Florida dessert with graham cracker crust',
    ARRAY['1.5 cups graham cracker crumbs', '1/3 cup butter', '1 can sweetened condensed milk', '1/2 cup key lime juice', '1 tbsp lime zest', '3 egg yolks', 'Whipped cream'],
    ARRAY['Mix crumbs and melted butter, press into pie pan', 'Whisk condensed milk, lime juice, zest, egg yolks', 'Pour into crust', 'Bake at 350°F for 15 minutes', 'Cool completely', 'Top with whipped cream'],
    20, 15, 8, 'easy', 'American', ARRAY['vegetarian'], 4.7
),

(
    'Chocolate Mousse',
    'Light and airy chocolate dessert',
    ARRAY['6 oz dark chocolate', '3 tbsp butter', '3 eggs', '1/4 cup sugar', '1 cup heavy cream', '1 tsp vanilla'],
    ARRAY['Melt chocolate and butter', 'Separate eggs', 'Beat yolks with half the sugar', 'Beat whites with remaining sugar to peaks', 'Whip cream with vanilla', 'Fold chocolate into yolks', 'Fold in whites, then cream', 'Chill 2 hours'],
    25, 0, 6, 'medium', 'French', ARRAY['vegetarian'], 4.6
);

-- Update recipe count
SELECT COUNT(*) as total_recipes_after_expansion FROM recipes; 