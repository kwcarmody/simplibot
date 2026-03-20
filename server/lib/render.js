const { getViewModel } = require('../data');
const { normalizeFeatures } = require('../pocketbase');

const protectedRoutes = new Set(['home', 'chat', 'tools', 'todos', 'reports', 'channels', 'settings', 'profile', 'docs']);
const allRoutes = new Set([...protectedRoutes, 'signin']);
const routeFeatureMap = {
  home: 'home',
  chat: 'chat',
  tools: 'tools',
  todos: 'todos',
  reports: 'reports',
  channels: 'channels',
  settings: 'settings',
  profile: 'profile',
  docs: 'docs',
};

function getFirstAuthorizedRoute(features = {}) {
  const enabled = normalizeFeatures(features);
  const first = Object.entries(routeFeatureMap).find(([, feature]) => enabled[feature]);
  return first ? `/${first[0]}` : '/signin';
}

function renderSignin(res, options = {}) {
  const viewModel = getViewModel('signin', {}, null, {
    signin: {
      email: options.email || '',
      error: options.error || '',
    },
  });

  res.status(options.error ? 401 : 200).render('layout', {
    ...viewModel,
    isAuthPage: true,
    pageTemplate: 'pages/signin',
  });
}

function renderRoute(req, res, route) {
  const viewModel = getViewModel(route, req.query, req.session.auth || null, {
    chatMessages: req.session.chat?.messages || [],
    settingsOverride: req.session.ui?.settings || null,
    docs: req.docsPage || null,
  });

  res.render('layout', {
    ...viewModel,
    isAuthPage: false,
    pageTemplate: `pages/${route}`,
  });
}

function renderNotFound(res) {
  res.status(404).render('layout', {
    ...getViewModel('home', {}),
    title: 'Not Found | Pikori',
    isAuthPage: false,
    pageTemplate: 'pages/not-found',
  });
}

module.exports = {
  allRoutes,
  getFirstAuthorizedRoute,
  protectedRoutes,
  renderNotFound,
  renderRoute,
  renderSignin,
  routeFeatureMap,
};
