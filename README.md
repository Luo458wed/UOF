# 个人学习网站

这是一个部署到 GitHub Pages 的静态个人学习网站。

## 结构

- `index.html`：首页
- `notes.html`：课程笔记列表
- `note.html`：Markdown 笔记详情页
- `resources.html`：学习资料列表
- `data.js`：站点内容索引
- `script.js`：前端渲染逻辑
- `styles.css`：页面样式
- `notes/*.md`：每篇笔记的 Markdown 正文

## 如何新增一篇笔记

1. 在 `notes/` 下新建一个 Markdown 文件
2. 在 `data.js` 的 `notes` 数组里加一条记录
3. 给记录配置唯一的 `slug`
4. 把 `markdown` 指向对应的 `.md` 文件
