-- ============================================================
--  Demo Seed: Demo Sushi House
--  IMPORTANT: Replace <YOUR_AUTH_USER_ID> with your actual
--  Supabase Auth user UUID before running this script.
--  Find it in: Authentication → Users → copy your user's ID.
-- ============================================================

do $$
declare
  v_owner_id    uuid := '<YOUR_AUTH_USER_ID>';  -- ← REPLACE THIS
  v_rest_id     uuid;
  v_cat_app     uuid;
  v_cat_rolls   uuid;
  v_cat_entree  uuid;
  v_cat_drinks  uuid;
  v_sub_classic uuid;
  v_sub_spec    uuid;
  v_tag_spicy   uuid;
  v_tag_pop     uuid;
  v_tag_veg     uuid;
  v_tag_gf      uuid;
  v_item_edam   uuid;
  v_item_gyoza  uuid;
  v_item_cali   uuid;
  v_item_spider uuid;
  v_item_dragon uuid;
  v_item_salmon uuid;
  v_item_tuna   uuid;
  v_item_teriy  uuid;
  v_item_udon   uuid;
  v_item_miso   uuid;
  v_item_green  uuid;
  v_item_soda   uuid;
  v_grp_sauce   uuid;
  v_grp_prot    uuid;
  v_grp_extras  uuid;
begin

-- ────────────────────────────────────────────────────────────
--  Restaurant
-- ────────────────────────────────────────────────────────────
insert into public.restaurants (
  owner_user_id, name, slug, description, address, phone, email, timezone,
  online_ordering_enabled, pickup_enabled, dine_in_enabled, delivery_enabled, is_active
) values (
  v_owner_id,
  'Demo Sushi House',
  'demo-sushi-house',
  'Fresh, authentic Japanese cuisine made with the finest ingredients. From classic nigiri to bold specialty rolls, every dish is crafted with care.',
  '123 Sakura Street, New York, NY 10001',
  '(212) 555-0123',
  'info@demosushihouse.com',
  'America/New_York',
  true, true, true, false, true
) returning id into v_rest_id;

-- ────────────────────────────────────────────────────────────
--  Hours (Mon–Sat 11am–10pm, Sun 12pm–9pm)
-- ────────────────────────────────────────────────────────────
insert into public.restaurant_hours (restaurant_id, day_of_week, open_time, close_time, is_closed) values
  (v_rest_id, 0, '12:00', '21:00', false), -- Sunday
  (v_rest_id, 1, '11:00', '22:00', false), -- Monday
  (v_rest_id, 2, '11:00', '22:00', false), -- Tuesday
  (v_rest_id, 3, '11:00', '22:00', false), -- Wednesday
  (v_rest_id, 4, '11:00', '22:00', false), -- Thursday
  (v_rest_id, 5, '11:00', '23:00', false), -- Friday
  (v_rest_id, 6, '11:00', '23:00', false); -- Saturday

-- ────────────────────────────────────────────────────────────
--  Tags
-- ────────────────────────────────────────────────────────────
insert into public.tags (restaurant_id, name, color) values (v_rest_id, 'Spicy',      '#ef4444') returning id into v_tag_spicy;
insert into public.tags (restaurant_id, name, color) values (v_rest_id, 'Popular',    '#f97316') returning id into v_tag_pop;
insert into public.tags (restaurant_id, name, color) values (v_rest_id, 'Vegetarian', '#22c55e') returning id into v_tag_veg;
insert into public.tags (restaurant_id, name, color) values (v_rest_id, 'Gluten Free','#3b82f6') returning id into v_tag_gf;

-- ────────────────────────────────────────────────────────────
--  Categories
-- ────────────────────────────────────────────────────────────
insert into public.categories (restaurant_id, name, description, display_order, is_active) values
  (v_rest_id, 'Appetizers',   'Start your meal right',               0, true) returning id into v_cat_app;
insert into public.categories (restaurant_id, name, description, display_order, is_active) values
  (v_rest_id, 'Sushi Rolls',  'Crafted with precision and fresh fish',1, true) returning id into v_cat_rolls;
insert into public.categories (restaurant_id, name, description, display_order, is_active) values
  (v_rest_id, 'Entrees',      'Hearty Japanese main dishes',          2, true) returning id into v_cat_entree;
insert into public.categories (restaurant_id, name, description, display_order, is_active) values
  (v_rest_id, 'Drinks',       'Hot & cold beverages',                 3, true) returning id into v_cat_drinks;

-- ────────────────────────────────────────────────────────────
--  Subcategories under Sushi Rolls
-- ────────────────────────────────────────────────────────────
insert into public.subcategories (restaurant_id, category_id, name, display_order, is_active) values
  (v_rest_id, v_cat_rolls, 'Classic Rolls',   0, true) returning id into v_sub_classic;
insert into public.subcategories (restaurant_id, category_id, name, display_order, is_active) values
  (v_rest_id, v_cat_rolls, 'Specialty Rolls',  1, true) returning id into v_sub_spec;

-- ────────────────────────────────────────────────────────────
--  Menu Items — Appetizers
-- ────────────────────────────────────────────────────────────
insert into public.menu_items (restaurant_id, category_id, name, description, price, is_available, display_order) values
  (v_rest_id, v_cat_app, 'Edamame', 'Steamed and salted young soybeans', 5.00, true, 0) returning id into v_item_edam;
insert into public.menu_items (restaurant_id, category_id, name, description, price, is_available, display_order) values
  (v_rest_id, v_cat_app, 'Gyoza (6pc)', 'Pan-fried pork & vegetable dumplings with ponzu dipping sauce', 9.50, true, 1) returning id into v_item_gyoza;
insert into public.menu_items (restaurant_id, category_id, name, description, price, is_available, display_order) values
  (v_rest_id, v_cat_app, 'Miso Soup', 'Traditional miso broth with tofu, wakame, and scallions', 4.00, true, 2) returning id into v_item_miso;

-- ────────────────────────────────────────────────────────────
--  Menu Items — Classic Rolls
-- ────────────────────────────────────────────────────────────
insert into public.menu_items (restaurant_id, category_id, subcategory_id, name, description, price, is_available, display_order) values
  (v_rest_id, v_cat_rolls, v_sub_classic, 'California Roll', 'Crab, avocado, cucumber, sesame seeds', 12.00, true, 0) returning id into v_item_cali;
insert into public.menu_items (restaurant_id, category_id, subcategory_id, name, description, price, is_available, display_order) values
  (v_rest_id, v_cat_rolls, v_sub_classic, 'Tuna Roll', 'Fresh bluefin tuna, cucumber, soy paper', 14.00, true, 1) returning id into v_item_tuna;
insert into public.menu_items (restaurant_id, category_id, subcategory_id, name, description, price, is_available, display_order) values
  (v_rest_id, v_cat_rolls, v_sub_classic, 'Salmon Avocado Roll', 'Wild salmon, creamy avocado, sesame', 13.00, true, 2) returning id into v_item_salmon;

-- ────────────────────────────────────────────────────────────
--  Menu Items — Specialty Rolls
-- ────────────────────────────────────────────────────────────
insert into public.menu_items (restaurant_id, category_id, subcategory_id, name, description, price, is_available, display_order) values
  (v_rest_id, v_cat_rolls, v_sub_spec, 'Spider Roll', 'Soft shell crab tempura, cucumber, avocado, masago', 16.50, true, 0) returning id into v_item_spider;
insert into public.menu_items (restaurant_id, category_id, subcategory_id, name, description, price, is_available, display_order) values
  (v_rest_id, v_cat_rolls, v_sub_spec, 'Dragon Roll', 'Shrimp tempura inside, avocado on top, spicy mayo, unagi sauce', 18.00, true, 1) returning id into v_item_dragon;

-- ────────────────────────────────────────────────────────────
--  Menu Items — Entrees
-- ────────────────────────────────────────────────────────────
insert into public.menu_items (restaurant_id, category_id, name, description, price, is_available, display_order) values
  (v_rest_id, v_cat_entree, 'Chicken Teriyaki', 'Grilled chicken glazed with house teriyaki sauce, steamed rice, miso soup', 19.00, true, 0) returning id into v_item_teriy;
insert into public.menu_items (restaurant_id, category_id, name, description, price, is_available, display_order) values
  (v_rest_id, v_cat_entree, 'Udon Noodle Soup', 'Thick wheat noodles in savory dashi broth, tempura, scallions', 17.00, true, 1) returning id into v_item_udon;

-- ────────────────────────────────────────────────────────────
--  Menu Items — Drinks
-- ────────────────────────────────────────────────────────────
insert into public.menu_items (restaurant_id, category_id, name, description, price, is_available, display_order) values
  (v_rest_id, v_cat_drinks, 'Green Tea', 'Hot or iced premium Japanese green tea', 3.50, true, 0) returning id into v_item_green;
insert into public.menu_items (restaurant_id, category_id, name, description, price, is_available, display_order) values
  (v_rest_id, v_cat_drinks, 'Soft Drink', 'Coke, Diet Coke, Sprite, Ginger Ale', 3.00, true, 1) returning id into v_item_soda;

-- ────────────────────────────────────────────────────────────
--  Tags on items
-- ────────────────────────────────────────────────────────────
insert into public.menu_item_tags (restaurant_id, menu_item_id, tag_id) values
  (v_rest_id, v_item_edam,   v_tag_veg),
  (v_rest_id, v_item_edam,   v_tag_gf),
  (v_rest_id, v_item_cali,   v_tag_pop),
  (v_rest_id, v_item_tuna,   v_tag_gf),
  (v_rest_id, v_item_dragon, v_tag_pop),
  (v_rest_id, v_item_dragon, v_tag_spicy),
  (v_rest_id, v_item_spider, v_tag_pop),
  (v_rest_id, v_item_miso,   v_tag_veg),
  (v_rest_id, v_item_green,  v_tag_veg);

-- ────────────────────────────────────────────────────────────
--  Option Groups
-- ────────────────────────────────────────────────────────────

-- Sauce choice for Dragon Roll
insert into public.option_groups (restaurant_id, menu_item_id, name, is_required, min_select, max_select, display_order) values
  (v_rest_id, v_item_dragon, 'Sauce Choice', true, 1, 1, 0) returning id into v_grp_sauce;
insert into public.options (restaurant_id, option_group_id, name, additional_price, is_active, display_order) values
  (v_rest_id, v_grp_sauce, 'Spicy Mayo',   0.00, true, 0),
  (v_rest_id, v_grp_sauce, 'Unagi Sauce',  0.00, true, 1),
  (v_rest_id, v_grp_sauce, 'Both Sauces',  0.00, true, 2);

-- Protein for Teriyaki
insert into public.option_groups (restaurant_id, menu_item_id, name, is_required, min_select, max_select, display_order) values
  (v_rest_id, v_item_teriy, 'Protein Choice', true, 1, 1, 0) returning id into v_grp_prot;
insert into public.options (restaurant_id, option_group_id, name, additional_price, is_active, display_order) values
  (v_rest_id, v_grp_prot, 'Chicken',     0.00, true, 0),
  (v_rest_id, v_grp_prot, 'Salmon',      3.00, true, 1),
  (v_rest_id, v_grp_prot, 'Tofu',        0.00, true, 2);

-- Add-ons for California Roll
insert into public.option_groups (restaurant_id, menu_item_id, name, is_required, min_select, max_select, display_order) values
  (v_rest_id, v_item_cali, 'Add-ons', false, 0, 3, 0) returning id into v_grp_extras;
insert into public.options (restaurant_id, option_group_id, name, additional_price, is_active, display_order) values
  (v_rest_id, v_grp_extras, 'Extra Avocado',   1.50, true, 0),
  (v_rest_id, v_grp_extras, 'Spicy Mayo',       0.50, true, 1),
  (v_rest_id, v_grp_extras, 'Masago (fish roe)',2.00, true, 2);

-- Soft Drink flavors
insert into public.option_groups (restaurant_id, menu_item_id, name, is_required, min_select, max_select, display_order) values
  (v_rest_id, v_item_soda, 'Flavor', true, 1, 1, 0);
insert into public.options (restaurant_id, option_group_id, name, additional_price, is_active, display_order)
  select v_rest_id, og.id, flavor, 0.00, true, ord
  from public.option_groups og,
       (values ('Coke',0),('Diet Coke',1),('Sprite',2),('Ginger Ale',3)) as v(flavor,ord)
  where og.menu_item_id = v_item_soda and og.name = 'Flavor';

end $$;
