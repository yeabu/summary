const ROLE_LABELS = {
  admin: '管理员',
  base_agent: '基地代理',
  captain: '队长',
  finance: '财务主管',
  factory_manager: '厂长',
  user: '佳慧伙伴'
};

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function getRoleLabel(role) {
  const key = normalizeRole(role);
  return ROLE_LABELS[key] || ROLE_LABELS.user;
}

function isAdmin(role) {
  return normalizeRole(role) === 'admin';
}

function isBaseAgent(role) {
  return normalizeRole(role) === 'base_agent';
}

function canAccess(role, allowed = []) {
  if (!allowed || allowed.length === 0) return true;
  if (allowed.includes('*') || allowed.includes('any')) return true;
  const key = normalizeRole(role);
  if (!key) return false;
  return allowed.some(r => normalizeRole(r) === key);
}

module.exports = { getRoleLabel, isAdmin, isBaseAgent, canAccess }
