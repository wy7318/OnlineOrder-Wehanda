-- ============================================================
--  Yen Sushi Menu Seed
--  Restaurant ID: 13f699ce-2e63-4146-a8b5-55aee677d22b
--  Run in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  rid uuid := '13f699ce-2e63-4146-a8b5-55aee677d22b';

  -- Category IDs
  cat_appetizer uuid;
  cat_kitchen   uuid;
  cat_sushi     uuid;
  cat_dessert   uuid;
  cat_drink     uuid;
  cat_alcohol   uuid;

  -- Subcategory IDs
  sub_salad     uuid;
  sub_appetizer uuid;
  sub_hot_food  uuid;
  sub_noodles   uuid;
  sub_teriyaki  uuid;
  sub_nigiri    uuid;
  sub_sashimi   uuid;
  sub_roll      uuid;
  sub_hand_roll uuid;
  sub_dessert   uuid;
  sub_beverage  uuid;
  sub_alcohol   uuid;

  -- Tag IDs
  tag_raw  uuid;
  tag_vege uuid;

BEGIN

  -- ──────────────────────────────────────────────────────────
  --  CATEGORIES
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.categories (restaurant_id, name, display_order) VALUES (rid, 'Appetizer', 1) RETURNING id INTO cat_appetizer;
  INSERT INTO public.categories (restaurant_id, name, display_order) VALUES (rid, 'Kitchen',   2) RETURNING id INTO cat_kitchen;
  INSERT INTO public.categories (restaurant_id, name, display_order) VALUES (rid, 'Sushi',     3) RETURNING id INTO cat_sushi;
  INSERT INTO public.categories (restaurant_id, name, display_order) VALUES (rid, 'Dessert',   4) RETURNING id INTO cat_dessert;
  INSERT INTO public.categories (restaurant_id, name, display_order) VALUES (rid, 'Drink',     5) RETURNING id INTO cat_drink;
  INSERT INTO public.categories (restaurant_id, name, display_order) VALUES (rid, 'Alcohol',   6) RETURNING id INTO cat_alcohol;

  -- ──────────────────────────────────────────────────────────
  --  SUBCATEGORIES
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.subcategories (restaurant_id, category_id, name, display_order) VALUES (rid, cat_appetizer, 'Salad',         1) RETURNING id INTO sub_salad;
  INSERT INTO public.subcategories (restaurant_id, category_id, name, display_order) VALUES (rid, cat_appetizer, 'Appetizer',     2) RETURNING id INTO sub_appetizer;
  INSERT INTO public.subcategories (restaurant_id, category_id, name, display_order) VALUES (rid, cat_appetizer, 'Hot Food',      3) RETURNING id INTO sub_hot_food;
  INSERT INTO public.subcategories (restaurant_id, category_id, name, display_order) VALUES (rid, cat_kitchen,   'Noodles',       1) RETURNING id INTO sub_noodles;
  INSERT INTO public.subcategories (restaurant_id, category_id, name, display_order) VALUES (rid, cat_kitchen,   'Teriyaki Bowl', 2) RETURNING id INTO sub_teriyaki;
  INSERT INTO public.subcategories (restaurant_id, category_id, name, display_order) VALUES (rid, cat_sushi,     'Nigiri',        1) RETURNING id INTO sub_nigiri;
  INSERT INTO public.subcategories (restaurant_id, category_id, name, display_order) VALUES (rid, cat_sushi,     'Sashimi',       2) RETURNING id INTO sub_sashimi;
  INSERT INTO public.subcategories (restaurant_id, category_id, name, display_order) VALUES (rid, cat_sushi,     'Roll',          3) RETURNING id INTO sub_roll;
  INSERT INTO public.subcategories (restaurant_id, category_id, name, display_order) VALUES (rid, cat_sushi,     'Hand Roll',     4) RETURNING id INTO sub_hand_roll;
  INSERT INTO public.subcategories (restaurant_id, category_id, name, display_order) VALUES (rid, cat_dessert,   'Dessert',       1) RETURNING id INTO sub_dessert;
  INSERT INTO public.subcategories (restaurant_id, category_id, name, display_order) VALUES (rid, cat_drink,     'Beverage',      1) RETURNING id INTO sub_beverage;
  INSERT INTO public.subcategories (restaurant_id, category_id, name, display_order) VALUES (rid, cat_alcohol,   'Alcohol',       1) RETURNING id INTO sub_alcohol;

  -- ──────────────────────────────────────────────────────────
  --  TAGS
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.tags (restaurant_id, name, color) VALUES (rid, 'Raw',  '#ef4444') RETURNING id INTO tag_raw;
  INSERT INTO public.tags (restaurant_id, name, color) VALUES (rid, 'Vege', '#22c55e') RETURNING id INTO tag_vege;

  -- ──────────────────────────────────────────────────────────
  --  MENU ITEMS: Appetizer > Salad
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_items (restaurant_id, category_id, subcategory_id, name, price, display_order) VALUES
    (rid, cat_appetizer, sub_salad, 'Seaweed salad',  4, 1),
    (rid, cat_appetizer, sub_salad, 'Squid salad',    4, 2),
    (rid, cat_appetizer, sub_salad, 'Cucumber salad', 4, 3);

  -- ──────────────────────────────────────────────────────────
  --  MENU ITEMS: Appetizer > Appetizer
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_items (restaurant_id, category_id, subcategory_id, name, description, price, display_order) VALUES
    (rid, cat_appetizer, sub_appetizer, 'Edamame',               NULL,                                                                    4,    1),
    (rid, cat_appetizer, sub_appetizer, 'Chefs edamame',         'Garlic, Spicy garlic',                                                  5,    2),
    (rid, cat_appetizer, sub_appetizer, 'Miso soup',             NULL,                                                                    2.5,  3),
    (rid, cat_appetizer, sub_appetizer, 'Shrimp tempura (6pcs)', NULL,                                                                    8,    4),
    (rid, cat_appetizer, sub_appetizer, 'Vegetable Tempura',     'Broccoli, Bell pepper shrimp, Sweet potato, Asparagus, Onion',          8,    5),
    (rid, cat_appetizer, sub_appetizer, 'Yellowtail Kama',       'Fried Yellowtail collar',                                               10,   6),
    (rid, cat_appetizer, sub_appetizer, 'Salmon Kama',           'Fried Salmon collar',                                                   9,    7),
    (rid, cat_appetizer, sub_appetizer, 'Fried Squid Legs',      NULL,                                                                    6,    8),
    (rid, cat_appetizer, sub_appetizer, 'Crispy Fried Shrimp',   NULL,                                                                    7,    9),
    (rid, cat_appetizer, sub_appetizer, 'Calamari Rings',        NULL,                                                                    7,   10);

  -- ──────────────────────────────────────────────────────────
  --  MENU ITEMS: Appetizer > Hot Food
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_items (restaurant_id, category_id, subcategory_id, name, price, display_order) VALUES
    (rid, cat_appetizer, sub_hot_food, 'Gyoza',   4, 1),
    (rid, cat_appetizer, sub_hot_food, 'Edamame', 4, 2);

  -- ──────────────────────────────────────────────────────────
  --  MENU ITEMS: Kitchen > Noodles
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_items (restaurant_id, category_id, subcategory_id, name, description, price, display_order) VALUES
    (rid, cat_kitchen, sub_noodles, 'Spicy Ramen',  'Fish cake, Green onions',                                                             9,  1),
    (rid, cat_kitchen, sub_noodles, 'Udon',         'Fish cake, Green onions, Fried tofu',                                                 9,  2),
    (rid, cat_kitchen, sub_noodles, 'Tempura Udon', 'Shrimp tempura, Tamago, Fish cake, Green onions, Fried tofu',                         10, 3),
    (rid, cat_kitchen, sub_noodles, 'Yakisoba',     'Thin noodles w/ cabbage, Carrots, Onions, Broccoli, Sesame seeds',                    9,  4),
    (rid, cat_kitchen, sub_noodles, 'Yaki Udon',    'Thick Udon noodles w/ mushroom, Broccoli, Carrots, Onions, Asparagus, Sesame seeds',  9,  5);

  -- ──────────────────────────────────────────────────────────
  --  MENU ITEMS: Kitchen > Teriyaki Bowl
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_items (restaurant_id, category_id, subcategory_id, name, description, price, display_order) VALUES
    (rid, cat_kitchen, sub_teriyaki, 'Chicken',           'Rice w/ carrots, Onions, Broccoli, Zucchini, Sesame seeds', 11, 1),
    (rid, cat_kitchen, sub_teriyaki, 'Beef',              'Rice w/ carrots, Onion, Sesame seeds',                      12, 2),
    (rid, cat_kitchen, sub_teriyaki, 'Kids Chicken Boat', 'Rice w/ chicken, Sesame seeds, Cucumber salad',             6,  3),
    (rid, cat_kitchen, sub_teriyaki, 'Kids Beef Boat',    'Rice w/ beef, Sesame seeds, Cucumber salad',                6,  4);

  -- ──────────────────────────────────────────────────────────
  --  MENU ITEMS: Sushi > Nigiri
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_items (restaurant_id, category_id, subcategory_id, name, price, display_order) VALUES
    (rid, cat_sushi, sub_nigiri, 'Tuna Nigiri',             4,    1),
    (rid, cat_sushi, sub_nigiri, 'Salmon Nigiri',           4,    2),
    (rid, cat_sushi, sub_nigiri, 'Mackerel Nigiri',         4,    3),
    (rid, cat_sushi, sub_nigiri, 'Yellowtail Nigiri',       4,    4),
    (rid, cat_sushi, sub_nigiri, 'Octopus Nigiri',          4,    5),
    (rid, cat_sushi, sub_nigiri, 'Haru Nigiri',             4,    6),
    (rid, cat_sushi, sub_nigiri, 'Marinated Salmon Nigiri', 4.5,  7),
    (rid, cat_sushi, sub_nigiri, 'Yellowtail Belly Nigiri', 4.5,  8),
    (rid, cat_sushi, sub_nigiri, 'Eel Nigiri',              4.5,  9),
    (rid, cat_sushi, sub_nigiri, 'Sizzling Salmon Nigiri',  4.5, 10),
    (rid, cat_sushi, sub_nigiri, 'Albacore Tuna Nigiri',    3.5, 11),
    (rid, cat_sushi, sub_nigiri, 'White Tuna Nigiri',       3.5, 12),
    (rid, cat_sushi, sub_nigiri, 'Squid Nigiri',            3.5, 13),
    (rid, cat_sushi, sub_nigiri, 'Shrimp Nigiri',           3.5, 14),
    (rid, cat_sushi, sub_nigiri, 'Egg Nigiri',              3,   15),
    (rid, cat_sushi, sub_nigiri, 'Crab Nigiri',             3,   16),
    (rid, cat_sushi, sub_nigiri, 'Inari Nigiri',            3,   17),
    (rid, cat_sushi, sub_nigiri, 'Salmon Egg Nigiri',       7,   18),
    (rid, cat_sushi, sub_nigiri, 'Scallop Nigiri',          4,   19),
    (rid, cat_sushi, sub_nigiri, 'Smelt Egg Nigiri',        5,   20),
    (rid, cat_sushi, sub_nigiri, 'Spicy Yellowtail Nigiri', 4,   21),
    (rid, cat_sushi, sub_nigiri, 'Baked Mussel',            4.5, 22),
    (rid, cat_sushi, sub_nigiri, 'Sweet Shrimp Nigiri',     9,   23);

  -- ──────────────────────────────────────────────────────────
  --  MENU ITEMS: Sushi > Sashimi
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_items (restaurant_id, category_id, subcategory_id, name, price, display_order) VALUES
    (rid, cat_sushi, sub_sashimi, 'Tuna Sashimi',          9.99, 1),
    (rid, cat_sushi, sub_sashimi, 'Salmon Sashimi',        9.99, 2),
    (rid, cat_sushi, sub_sashimi, 'Squid Sashimi',         9.99, 3),
    (rid, cat_sushi, sub_sashimi, 'Octopus Sashimi',       9.99, 4),
    (rid, cat_sushi, sub_sashimi, 'Albacore Tuna Sashimi', 9.99, 5),
    (rid, cat_sushi, sub_sashimi, 'Yellowtail Sashimi',    9.99, 6),
    (rid, cat_sushi, sub_sashimi, 'Eel Sashimi',           9.99, 7),
    (rid, cat_sushi, sub_sashimi, 'White Tuna Sashimi',    9.99, 8);

  -- ──────────────────────────────────────────────────────────
  --  MENU ITEMS: Sushi > Roll
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_items (restaurant_id, category_id, subcategory_id, name, description, price, display_order) VALUES
    (rid, cat_sushi, sub_roll, 'Crab Roll',                    'Crab Stick, Avocado, Crab Mix',                                      4,    1),
    (rid, cat_sushi, sub_roll, 'Philly Delux',                 'Salmon, Cream Cheese, Asparagus, Avocado',                           6.99, 2),
    (rid, cat_sushi, sub_roll, 'Hawaiian Roll',                'Spicy Tuna, Tuna, Spicy Mayo',                                       4,    3),
    (rid, cat_sushi, sub_roll, 'Las Vegas Roll',               'Crabstick, Eel, Cream Cheese, Eel Sauce',                            4,    4),
    (rid, cat_sushi, sub_roll, 'Spicy Crab & Shrimp Roll',     'Crab Mix, Shrimp, Spicy Mayo, Sriracha',                             4,    5),
    (rid, cat_sushi, sub_roll, 'Spicy Tiger Roll',             'Spicy Tuna, Shrimp, Eel Sauce, Spicy Mayo',                          4,    6),
    (rid, cat_sushi, sub_roll, 'Tiger Roll',                   'Crab Mix, Avocado, Shrimp',                                          4,    7),
    (rid, cat_sushi, sub_roll, 'Jalapeno Roll',                'Cream Cheese, Crab Stick, Jalapeno, Eel Sauce',                      4,    8),
    (rid, cat_sushi, sub_roll, 'Onion Crunch Roll',            'Crab Mix, Avocado, Onion Crunch',                                    4,    9),
    (rid, cat_sushi, sub_roll, 'Shaggy Dog Roll',              'Shrimp Tempura, Avocado, Crab Stick, Tempura Crunch, Eel Sauce',     4,   10),
    (rid, cat_sushi, sub_roll, 'Golden California Roll',       'Crab Mix, Avocado',                                                  4,   11),
    (rid, cat_sushi, sub_roll, 'Calamari Tempura Roll',        'Calamari Tempura, Crab, Avocado, Cucumber',                          6.99,12),
    (rid, cat_sushi, sub_roll, 'Arizona Roll',                 'Spicy Tuna, Crab, Cream Cheese, Jalapenos, Tempura Crunch',          4,   13),
    (rid, cat_sushi, sub_roll, 'Salmon Tempura Roll',          'Salmon Tempura, Crab, Avocado, Cucumber',                            6.99,14),
    (rid, cat_sushi, sub_roll, 'Haru Popper Roll',             'Crab, Cream Cheese Mix, Jalapeno, Spicy Mayo, Eel Sauce',            4,   15),
    (rid, cat_sushi, sub_roll, 'Chilli Crab Roll',             'Spicy Crab Mix, Cucumber Fried Jalapenos on top',                    4,   16),
    (rid, cat_sushi, sub_roll, 'Diamondback Roll',             'Shrimp Tempura, Crab, Avocado, Cucumber',                            6.99,17),
    (rid, cat_sushi, sub_roll, 'Rainbow Roll',                 'Crab Mix, Avocado, Tuna, Salmon, White Fish, Shrimp',                4.5, 18),
    (rid, cat_sushi, sub_roll, 'Red Dragon Roll',              'Crab Mix, Avocado, Spicy Tuna, Jalapeno, Spicy Mayo',                4.5, 19),
    (rid, cat_sushi, sub_roll, 'I Love Salmon Roll',           'Crab Mix, Avocado, Salmon',                                          4.5, 20),
    (rid, cat_sushi, sub_roll, 'Dragon Roll',                  'Crab Mix, Avocado, Eel, Eel Sauce',                                  4.5, 21),
    (rid, cat_sushi, sub_roll, 'Volcano Roll',                 'Avocado, Cream Cheese, Crab Mix, Spicy Mayo',                        4.5, 22),
    (rid, cat_sushi, sub_roll, 'Shrimp Tempura Roll',          'Shrimp Tempura, Crab, Spicy Mayo',                                   4.5, 23),
    (rid, cat_sushi, sub_roll, 'Baked Scallop Roll',           'Crab Mix, Avocado, Scallop, Spicy Mayo',                             4.5, 24),
    (rid, cat_sushi, sub_roll, 'Philly Roll',                  'Smoked Salmon, Cream Cheese, Avocado',                               3.5, 25),
    (rid, cat_sushi, sub_roll, 'Spicy California Roll',        'Spicy Crab Mix, Avocado',                                            3.5, 26),
    (rid, cat_sushi, sub_roll, 'Spicy Tuna Roll',              'Spicy Tuna',                                                         3.5, 27),
    (rid, cat_sushi, sub_roll, 'Spicy Salmon Roll',            'Spicy Salmon, Spicy Mayo',                                           3.5, 28),
    (rid, cat_sushi, sub_roll, 'Sunset Roll',                  'Spicy Tuna, Salmon, Spicy Mayo, Sriracha',                           3.5, 29),
    (rid, cat_sushi, sub_roll, 'Crunch Roll',                  'Crab Mix, Avocado, Tempura Crunch',                                  3.5, 30),
    (rid, cat_sushi, sub_roll, 'Firecracker Roll',             'Crab Mix, Avocado, Spicy Crunch',                                    3.5, 31),
    (rid, cat_sushi, sub_roll, 'California Roll',              'Crab Mix, Avocado',                                                  3,   32),
    (rid, cat_sushi, sub_roll, 'Avocado Roll',                 'Avocado',                                                            8,   33),
    (rid, cat_sushi, sub_roll, 'Cucumber Avocado Roll',        'Cucumber, Avocado',                                                  8,   34),
    (rid, cat_sushi, sub_roll, 'Cucumber Roll',                'Cucumber',                                                           8,   35),
    (rid, cat_sushi, sub_roll, 'Vegetable Roll',               'Asparagus, Yellow Radish, Carrot, Kanpyo',                           8,   36),
    (rid, cat_sushi, sub_roll, 'Asparagus Roll',               'Asparagus, Tempura Crunch, Topped with Spicy Mayo',                  8,   37),
    (rid, cat_sushi, sub_roll, 'Eel Avocado Roll',             'Eel, Avocado',                                                       8,   38),
    (rid, cat_sushi, sub_roll, 'Salmon Roll',                  'Salmon',                                                             9,   39),
    (rid, cat_sushi, sub_roll, 'Tuna Roll',                    'Tuna',                                                               9,   40),
    (rid, cat_sushi, sub_roll, 'Salmon Skin Roll',             'Salmon Skin, Burdock Root, Masago',                                  8,   41),
    (rid, cat_sushi, sub_roll, 'Caterpillar Roll',             'Crab Mix, Eel, Avocado, Eel Sauce',                                  9,   42),
    (rid, cat_sushi, sub_roll, 'Crispy Rice W/Spicy Tuna Roll','Spicy Tuna, Green Onion, Masago on top of Fried Rice',               6.99,43),
    (rid, cat_sushi, sub_roll, 'Spider Roll',                  'Soft Shell Crab, Crab Stick, Avocado',                               8,   44);

  -- ──────────────────────────────────────────────────────────
  --  MENU ITEMS: Sushi > Hand Roll
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_items (restaurant_id, category_id, subcategory_id, name, description, price, display_order) VALUES
    (rid, cat_sushi, sub_hand_roll, 'Tuna Hand Roll',              'Tuna',                                      6.99,  1),
    (rid, cat_sushi, sub_hand_roll, 'Salmon Hand Roll',            'Salmon',                                    6.99,  2),
    (rid, cat_sushi, sub_hand_roll, 'Spicy Scallop Hand Roll',     'Raw Scallop, Spicy Mayo, Sriracha, Masago', 6.99,  3),
    (rid, cat_sushi, sub_hand_roll, 'Yellowtail Hand Roll',        'Yellowtail',                                6.99,  4),
    (rid, cat_sushi, sub_hand_roll, 'White Tuna Hand Roll',        'White Tuna',                                6.99,  5),
    (rid, cat_sushi, sub_hand_roll, 'California Hand Roll',        'Crab Mix, Avocado',                         6.99,  6),
    (rid, cat_sushi, sub_hand_roll, 'Philly Hand Roll',            'Cream Cheese, Smoked Salmon, Avocado',      6.99,  7),
    (rid, cat_sushi, sub_hand_roll, 'Spicy Crab Shrimp Hand Roll', 'Crab, Shrimp, Spicy Mayo, Sriracha',        6.99,  8),
    (rid, cat_sushi, sub_hand_roll, 'Tempura Hand Roll',           'Shrimp, Crab Stick, Spicy Mayo, Crunch',    6.99,  9),
    (rid, cat_sushi, sub_hand_roll, 'Salmon Skin Hand Roll',       'Salmon Skin, Burdock Root, Masago',         6.99, 10);

  -- ──────────────────────────────────────────────────────────
  --  MENU ITEMS: Dessert > Dessert
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_items (restaurant_id, category_id, subcategory_id, name, price, display_order) VALUES
    (rid, cat_dessert, sub_dessert, 'Cheese ball',      4.5, 1),
    (rid, cat_dessert, sub_dessert, 'Red bean bread',   4.5, 2),
    (rid, cat_dessert, sub_dessert, 'Cream puffs',      4.5, 3),
    (rid, cat_dessert, sub_dessert, 'Samanko',          4.5, 4),
    (rid, cat_dessert, sub_dessert, 'Mochi Ice Cream',  4.5, 5),
    (rid, cat_dessert, sub_dessert, 'Macaron',          4,   6),
    (rid, cat_dessert, sub_dessert, 'Lemon Cheesecake', 4.5, 7),
    (rid, cat_dessert, sub_dessert, 'Choco Cheesecake', 4.5, 8),
    (rid, cat_dessert, sub_dessert, 'Cheesecake',       4.5, 9);

  -- ──────────────────────────────────────────────────────────
  --  MENU ITEMS: Drink > Beverage
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_items (restaurant_id, category_id, subcategory_id, name, price, display_order) VALUES
    (rid, cat_drink, sub_beverage, 'Soft Drink',           3,   1),
    (rid, cat_drink, sub_beverage, 'Tea',                  3,   2),
    (rid, cat_drink, sub_beverage, 'Chocolate Milk',       2.5, 3),
    (rid, cat_drink, sub_beverage, 'Ramune (Marble Soda)', 3,   4),
    (rid, cat_drink, sub_beverage, 'Juice',                3,   5);

  -- ──────────────────────────────────────────────────────────
  --  MENU ITEMS: Alcohol > Alcohol  (3 duplicate "Flat Top - Copy" rows skipped)
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_items (restaurant_id, category_id, subcategory_id, name, description, price, display_order) VALUES
    (rid, cat_alcohol, sub_alcohol, 'Beer',                 NULL,                                              4.5,  1),
    (rid, cat_alcohol, sub_alcohol, 'Sake',                 NULL,                                              4,    2),
    (rid, cat_alcohol, sub_alcohol, 'Sake Bomb',            'Large Beer w/ Small House Sake',                  8.5,  3),
    (rid, cat_alcohol, sub_alcohol, 'Junmai Ginjo',         'Hakutsuru, Filtered Sake',                        20,   4),
    (rid, cat_alcohol, sub_alcohol, 'Nigori',               'Sayuri, Unfiltered Sake',                         20,   5),
    (rid, cat_alcohol, sub_alcohol, 'Unfiltered Nigori',    'Sho Chiku Bai, Unfiltered Sake',                  14,   6),
    (rid, cat_alcohol, sub_alcohol, 'Korean Soju',          'Chum Churum',                                     14,   7),
    (rid, cat_alcohol, sub_alcohol, 'Sparkling Sake',       'Mio',                                             20,   8),
    (rid, cat_alcohol, sub_alcohol, 'Cabernet Sauvignon',   '14 Hands, Columbia Valley Paterson, Washington',  9,    9),
    (rid, cat_alcohol, sub_alcohol, 'Malbec',               'Santa Julia, Mendoza, Argentina',                 8,   10),
    (rid, cat_alcohol, sub_alcohol, 'Plum',                 'Kikkoman, Sanger, California',                    7,   11),
    (rid, cat_alcohol, sub_alcohol, 'Pinot Grigio',         'Chloe, Valdadige D.O.C, Italy',                   7,   12),
    (rid, cat_alcohol, sub_alcohol, 'Chardonnay - Flat Top','Flat Top, Helena, California',                    8,   13),
    (rid, cat_alcohol, sub_alcohol, 'Chardonnay - Butter',  'Butter, Lodi, California',                        9,   14),
    (rid, cat_alcohol, sub_alcohol, 'Riesling',             'Kungfu Girl, Washington',                         9,   15),
    (rid, cat_alcohol, sub_alcohol, 'Sauvignon Blanc',      'Kendall Jackson, California',                     9,   16);

  -- ──────────────────────────────────────────────────────────
  --  TAG LINKS: Raw — Nigiri
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_item_tags (restaurant_id, menu_item_id, tag_id)
  SELECT rid, mi.id, tag_raw
  FROM public.menu_items mi
  WHERE mi.restaurant_id = rid
    AND mi.subcategory_id = sub_nigiri
    AND mi.name IN (
      'Tuna Nigiri','Salmon Nigiri','Mackerel Nigiri','Yellowtail Nigiri',
      'Octopus Nigiri','Haru Nigiri','Marinated Salmon Nigiri','Yellowtail Belly Nigiri',
      'Eel Nigiri','Sizzling Salmon Nigiri','Albacore Tuna Nigiri','White Tuna Nigiri',
      'Squid Nigiri','Salmon Egg Nigiri','Scallop Nigiri','Smelt Egg Nigiri',
      'Spicy Yellowtail Nigiri','Sweet Shrimp Nigiri'
    );

  -- ──────────────────────────────────────────────────────────
  --  TAG LINKS: Raw — all Sashimi
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_item_tags (restaurant_id, menu_item_id, tag_id)
  SELECT rid, mi.id, tag_raw
  FROM public.menu_items mi
  WHERE mi.restaurant_id = rid
    AND mi.subcategory_id = sub_sashimi;

  -- ──────────────────────────────────────────────────────────
  --  TAG LINKS: Raw — Roll
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_item_tags (restaurant_id, menu_item_id, tag_id)
  SELECT rid, mi.id, tag_raw
  FROM public.menu_items mi
  WHERE mi.restaurant_id = rid
    AND mi.subcategory_id = sub_roll
    AND mi.name IN (
      'Philly Delux','Hawaiian Roll','Spicy Tiger Roll','Arizona Roll',
      'Salmon Tempura Roll','Rainbow Roll','Red Dragon Roll','I Love Salmon Roll',
      'Volcano Roll','Baked Scallop Roll','Philly Roll','Spicy Tuna Roll',
      'Spicy Salmon Roll','Sunset Roll','Crispy Rice W/Spicy Tuna Roll'
    );

  -- ──────────────────────────────────────────────────────────
  --  TAG LINKS: Raw — Hand Roll
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_item_tags (restaurant_id, menu_item_id, tag_id)
  SELECT rid, mi.id, tag_raw
  FROM public.menu_items mi
  WHERE mi.restaurant_id = rid
    AND mi.subcategory_id = sub_hand_roll
    AND mi.name IN (
      'Tuna Hand Roll','Salmon Hand Roll','Spicy Scallop Hand Roll',
      'Yellowtail Hand Roll','White Tuna Hand Roll','Philly Hand Roll'
    );

  -- ──────────────────────────────────────────────────────────
  --  TAG LINKS: Vege — Roll
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.menu_item_tags (restaurant_id, menu_item_id, tag_id)
  SELECT rid, mi.id, tag_vege
  FROM public.menu_items mi
  WHERE mi.restaurant_id = rid
    AND mi.subcategory_id = sub_roll
    AND mi.name IN (
      'Avocado Roll','Cucumber Avocado Roll','Cucumber Roll',
      'Vegetable Roll','Asparagus Roll'
    );

END $$;
