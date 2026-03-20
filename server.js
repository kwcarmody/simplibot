const path = require('path');
const express = require('express');
const session = require('express-session');
const { createAuthRouter } = require('./server/routes/auth');
const { createSettingsRouter } = require('./server/routes/settings');
const { createChatRouter } = require('./server/routes/chat');
const { createPageRouter } = require('./server/routes/pages');
const { createDocsRouter } = require('./server/routes/docs');
const { createTodosRouter } = require('./server/routes/todos');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  session({
    name: 'pikori.sid',
    secret: process.env.SESSION_SECRET || 'pikori-dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

app.use(createAuthRouter());
app.use(createSettingsRouter());
app.use(createChatRouter());
app.use(createDocsRouter());
app.use(createTodosRouter());
app.use(createPageRouter());

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Pikori EJS app listening on http://localhost:${port}`);
  });
}

module.exports = app;
