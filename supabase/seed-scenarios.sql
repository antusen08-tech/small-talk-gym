-- 插入 Simulator 场景主题
INSERT INTO scenario_themes (category, title, description, display_order) VALUES
('工作场合', '跨部门咖啡局', '和不熟同事开场，练习在咖啡局的自然对话', 1),
('日常生活', '餐厅等位', '和同行陌生人开场，练习短暂社交', 2),
('社交聚会', '朋友聚会', '认识朋友的朋友，练习融入新圈子', 3);

-- 插入场景卡 - 跨部门咖啡局 (5张)
INSERT INTO scene_cards (theme_id, location, moment, relationships, current_thread, goal, green_light, yellow_light, red_light, off_limits_notes, scene_order)
SELECT
  id as theme_id,
  '咖啡厅' as location,
  '大家刚点好饮料、坐下来' as moment,
  '坐在你旁边的跨部门同事；你们刚互相介绍过' as relationships,
  '桌上的饮品、今天的安排、彼此的轻量认识' as current_thread,
  '由你先开口，从桌上的饮品或今天的安排说起' as goal,
  '对视、微笑、主动问候' as green_light,
  '刚好在旁边但不确定' as yellow_light,
  '戴耳机、看手机、赶时间' as red_light,
  '不要问私事或敏感话题' as off_limits_notes,
  1 as scene_order
FROM scenario_themes WHERE title = '跨部门咖啡局';

INSERT INTO scene_cards (theme_id, location, moment, relationships, current_thread, goal, green_light, yellow_light, red_light, off_limits_notes, scene_order)
SELECT
  id,
  '咖啡厅',
  '你和之前聊过、但不熟的跨部门同事又见面',
  '之前见过面但不熟的跨部门同事',
  '最近的共同经历、对方的工作',
  '重新开场，从最近的共同经历开始',
  '对方主动打招呼或微笑',
  '对方只是点头',
  '对方明显在看手机或赶时间',
  '不要追问私人问题',
  2
FROM scenario_themes WHERE title = '跨部门咖啡局';

INSERT INTO scene_cards (theme_id, location, moment, relationships, current_thread, goal, green_light, yellow_light, red_light, off_limits_notes, scene_order)
SELECT
  id,
  '咖啡厅',
  '熟同事带来陌生人，你们一起坐下',
  '你、熟同事、以及一个不熟的陌生人',
  '桌上的饮品、当天的活动',
  '加入一段已经开始的对话',
  '对方和熟同事正在聊天，有自然停顿',
  '对方注意到你但没主动说',
  '对方和熟同事聊得很投入',
  '不要打断正在深入的话题',
  3
FROM scenario_themes WHERE title = '跨部门咖啡局';

INSERT INTO scene_cards (theme_id, location, moment, relationships, current_thread, goal, green_light, yellow_light, red_light, off_limits_notes, scene_order)
SELECT
  id,
  '咖啡厅',
  '对方先问你一句：你在哪个部门？',
  '不熟的跨部门同事',
  '部门、工作内容',
  '自然接话，然后扩展到轻话题',
  '对方主动开启话题',
  '对方只是简单问候',
  '对方问完后明显失去兴趣',
  '不要反问对方私人问题',
  4
FROM scenario_themes WHERE title = '跨部门咖啡局';

INSERT INTO scene_cards (theme_id, location, moment, relationships, current_thread, goal, green_light, yellow_light, red_light, off_limits_notes, scene_order)
SELECT
  id,
  '咖啡厅',
  '已聊过两三轮，饮料送到',
  '不熟的跨部门同事',
  '聊天自然结束前',
  '练习自然结束对话',
  '对方给出短答或身体转向别处',
  '对方说要去忙了',
  '对方已经明显要离开',
  '不要硬拖对话',
  5
FROM scenario_themes WHERE title = '跨部门咖啡局';

-- 插入场景卡 - 餐厅等位 (3张)
INSERT INTO scene_cards (theme_id, location, moment, relationships, current_thread, goal, green_light, yellow_light, red_light, off_limits_notes, scene_order)
SELECT
  id,
  '餐厅',
  '等人，和同行陌生人一起等位',
  '和同行但不熟的人',
  '等位时的闲聊、餐厅环境',
  '从餐厅环境开始轻话题',
  '对方也在看菜单或环境',
  '对方在看手机',
  '对方戴耳机或明显不想聊天',
  '不要问对方为什么一个人',
  1
FROM scenario_themes WHERE title = '餐厅等位';

INSERT INTO scene_cards (theme_id, location, moment, relationships, current_thread, goal, green_light, yellow_light, red_light, off_limits_notes, scene_order)
SELECT
  id,
  '餐厅',
  '叫号后坐下前，和同行陌生人短暂交流',
  '和同行但不熟的人',
  '即将入座、刚才的等位经历',
  '用一句简短开场，然后自然结束',
  '对方有回应',
  '对方只说一个嗯',
  '对方明显想离开',
  '不要强求交换联系方式',
  2
FROM scenario_themes WHERE title = '餐厅等位';

INSERT INTO scene_cards (theme_id, location, moment, relationships, current_thread, goal, green_light, yellow_light, red_light, off_limits_notes, scene_order)
SELECT
  id,
  '餐厅',
  '用餐中，对方同桌但不太熟',
  '同桌但不熟的同事',
  '菜品、用餐体验',
  '从菜品聊起，轻松交流',
  '对方对食物有评价',
  '对方在吃，没说话',
  '对方在看手机或戴耳机',
  '不要在对方忙碌时打扰',
  3
FROM scenario_themes WHERE title = '餐厅等位';

-- 插入场景卡 - 朋友聚会 (3张)
INSERT INTO scene_cards (theme_id, location, moment, relationships, current_thread, goal, green_light, yellow_light, red_light, off_limits_notes, scene_order)
SELECT
  id,
  '朋友家/聚会地点',
  '朋友介绍你认识新朋友，刚来一会儿',
  '朋友的朋友，关系不熟',
  '聚会活动、为什么来、共同的兴趣',
  '从聚会本身或朋友的共同点开始',
  '对方也在和你朋友聊天',
  '对方只打招呼就没了',
  '对方明显在和熟人聊天不想被打扰',
  '不要追问对方和朋友的关系',
  1
FROM scenario_themes WHERE title = '朋友聚会';

INSERT INTO scene_cards (theme_id, location, moment, relationships, current_thread, goal, green_light, yellow_light, red_light, off_limits_notes, scene_order)
SELECT
  id,
  '朋友家/聚会地点',
  '聚会进行到一半，想融入一群人的对话',
  '一群不太熟的人',
  '正在进行的聊天主题',
  '先听，找到能接的话再加入',
  '对话有自然停顿',
  '对方们聊得很紧',
  '对方们明显在聊私密话题',
  '不要试图主导话题',
  2
FROM scenario_themes WHERE title = '朋友聚会';

INSERT INTO scene_cards (theme_id, location, moment, relationships, current_thread, goal, green_light, yellow_light, red_light, off_limits_notes, scene_order)
SELECT
  id,
  '朋友家/聚会地点',
  '聚会接近尾声，和刚认识的人道别',
  '朋友的朋友',
  '今晚的感受、接下来的安排',
  '一句真诚的收尾，表达认识你很高兴',
  '对方也准备离开',
  '对方还在和熟人聊天',
  '对方已经离开',
  '不要强求下次见面',
  3
FROM scenario_themes WHERE title = '朋友聚会';
