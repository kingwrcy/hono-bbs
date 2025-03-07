-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT NOT NULL,
  email_hash TEXT,
  bio TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP DEFAULT (DATETIME('now', 'utc'))
);

-- 创建帖子表
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  raw_content TEXT,  -- 存储原始 Markdown 内容
  author TEXT NOT NULL,
  tag TEXT,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT (DATETIME('now', 'utc')),
  FOREIGN KEY (author) REFERENCES users(username)
);

-- 创建评论表
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  raw_content TEXT NOT NULL,  -- 存储原始 Markdown 内容
  author TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT (DATETIME('now', 'utc')),
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (author) REFERENCES users(username)
);

-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT (DATETIME('now', 'utc'))
);

-- 创建触发器，使第一个注册的用户成为管理员
CREATE TRIGGER IF NOT EXISTS make_first_user_admin
AFTER INSERT ON users
WHEN (SELECT COUNT(*) FROM users) = 1
BEGIN
  UPDATE users SET role = 'admin' WHERE id = NEW.id;
END;


--创建触发器，在添加评论时自动更新帖子的评论计数
CREATE TRIGGER IF NOT EXISTS increment_post_comment_count
AFTER INSERT ON comments
BEGIN
    UPDATE posts 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.post_id;
END;

--创建触发器，在删除评论时自动更新帖子的评论计数
CREATE TRIGGER IF NOT EXISTS decrement_post_comment_count
AFTER DELETE ON comments
BEGIN
    UPDATE posts 
    SET comment_count = CASE WHEN comment_count > 0 THEN comment_count - 1 ELSE 0 END 
    WHERE id = OLD.post_id;
END;

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加默认配置
INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('site_name', '{"value": "Hono BBS", "description": "网站名称"}'),
  ('enable_registration', '{"value": true, "description": "是否允许新用户注册"}'),
  ('enable_comments', '{"value": true, "description": "是否允许发表评论"}');

-- 创建触发器自动更新updated_at字段
CREATE TRIGGER IF NOT EXISTS update_settings_timestamp 
AFTER UPDATE ON settings
BEGIN
  UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
