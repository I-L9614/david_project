# פתרון מלא – Simple Auth API (Express)

מסמך זה מהווה **פתרון מלא** לתרגיל, כולל:
- מימוש כל הדרישות בקוד
- הסבר שלב־אחר־שלב
- סגירת פרויקט עם מבנה תיקיות וקבצים

---

## שלב 1 – יצירת שרת והגדרות בסיסיות

```js
import express from 'express';
import fs from 'fs/promises';

const app = express();
const PORT = 3000;

app.use(express.json());
```

**הסבר:**
- express – שרת HTTP
- fs/promises – עבודה אסינכרונית עם קבצי JSON
- express.json – מאפשר קריאת body כ־JSON

---

## שלב 2 – פונקציות עזר (Helper Functions)

### קריאת משתמשים
```js
async function readUsers() {
  try {
    const data = await fs.readFile('users.json', 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}
```

### שמירת משתמשים
```js
async function writeUsers(users) {
  await fs.writeFile('users.json', JSON.stringify(users, null, 2));
}
```

### קריאת פוסטים
```js
async function readPosts() {
  try {
    const data = await fs.readFile('posts.json', 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}
```

### שמירת פוסטים
```js
async function writePosts(posts) {
  await fs.writeFile('posts.json', JSON.stringify(posts, null, 2));
}
```

---

## שלב 3 – פונקציית אימות משתמש

```js
async function validateUser(username, password) {
  const users = await readUsers();
  return users.find(u => u.username === username && u.password === password) || null;
}
```

**תפקיד:**
- מאמת משתמש בכל בקשה מוגנת
- מחזיר משתמש או null

---

## שלב 4 – Endpoints

### GET /
```js
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Simple Auth API' });
});
```

---

### POST /register
```js
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const users = await readUsers();

  if (users.some(u => u.username === username)) {
    return res.status(400).json({ message: 'Username already exists' });
  }

  const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
  const newUser = { id, username, email, password };

  users.push(newUser);
  await writeUsers(users);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});
```

---

### POST /login
```js
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await validateUser(username, password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const { password: _, ...safeUser } = user;
  res.json({ message: 'Login successful', user: safeUser });
});
```

---

### GET /posts
```js
app.get('/posts', async (req, res) => {
  const posts = await readPosts();
  res.json(posts);
});
```

---

### POST /posts (מאומת)
```js
app.post('/posts', async (req, res) => {
  const { username, password, title, content } = req.body;
  const user = await validateUser(username, password);

  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const posts = await readPosts();
  const id = posts.length ? Math.max(...posts.map(p => p.id)) + 1 : 1;

  const post = {
    id,
    title,
    content,
    authorId: user.id,
    authorUsername: user.username
  };

  posts.push(post);
  await writePosts(posts);
  res.status(201).json(post);
});
```

---

### PUT /posts/:id
```js
app.put('/posts/:id', async (req, res) => {
  const { username, password, title, content } = req.body;
  const user = await validateUser(username, password);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const posts = await readPosts();
  const post = posts.find(p => p.id === Number(req.params.id));

  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (post.authorId !== user.id) return res.status(403).json({ message: 'Forbidden' });

  post.title = title;
  post.content = content;
  await writePosts(posts);
  res.json(post);
});
```

---

### DELETE /posts/:id
```js
app.delete('/posts/:id', async (req, res) => {
  const { username, password } = req.body;
  const user = await validateUser(username, password);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const posts = await readPosts();
  const post = posts.find(p => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (post.authorId !== user.id) return res.status(403).json({ message: 'Forbidden' });

  const filtered = posts.filter(p => p.id !== post.id);
  await writePosts(filtered);
  res.json({ message: 'Post deleted' });
});
```

---

### GET /users
```js
app.get('/users', async (req, res) => {
  const users = await readUsers();
  res.json(users.map(({ id, username, email }) => ({ id, username, email })));
});
```

---

### PUT /profile
```js
app.put('/profile', async (req, res) => {
  const { username, password, email, newPassword } = req.body;
  const user = await validateUser(username, password);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const users = await readUsers();
  const index = users.findIndex(u => u.id === user.id);

  if (email) users[index].email = email;
  if (newPassword) users[index].password = newPassword;

  await writeUsers(users);
  const { password: _, ...safeUser } = users[index];
  res.json(safeUser);
});
```

---

### DELETE /account
```js
app.delete('/account', async (req, res) => {
  const { username, password } = req.body;
  const user = await validateUser(username, password);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const users = (await readUsers()).filter(u => u.id !== user.id);
  await writeUsers(users);

  const posts = (await readPosts()).filter(p => p.authorId !== user.id);
  await writePosts(posts);

  res.json({ message: 'Account deleted' });
});
```

---

## שלב 5 – הרצת השרת

```js
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## סגירת פרויקט – מבנה תיקיות

```text
project/
│
├── server.js
├── users.json
├── posts.json
├── package.json
└── README.md
```

---

## סיכום

✔ מערכת Register / Login
✔ אימות בכל בקשה
✔ שמירת נתונים בקבצי JSON
✔ בדיקת בעלות (ownership)
✔ החזרת נתונים ללא מידע רגיש

הפרויקט מממש Authentication בסיסי בצורה ברורה ומתאימה למתחילים.

