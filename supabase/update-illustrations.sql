-- 更新技能卡的插图 URL
UPDATE skill_cards SET illustration_url = '/assets/opening-timing-guide.png' WHERE skill_order = 1 AND level = '初阶';
UPDATE skill_cards SET illustration_url = '/assets/shared-context-opening.png' WHERE skill_order = 2 AND level = '初阶';
UPDATE skill_cards SET illustration_url = '/assets/conversation-balance.png' WHERE skill_order = 3 AND level = '初阶';
UPDATE skill_cards SET illustration_url = '/assets/follow-keyword.png' WHERE skill_order = 4 AND level = '初阶';
UPDATE skill_cards SET illustration_url = '/assets/natural-close.png' WHERE skill_order = 5 AND level = '初阶';
