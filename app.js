const state = { cases: [] };
const $ = (id) => document.getElementById(id);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','>':'&gt;','<':'&lt;','"':'&quot;',"'":'&#39;'}[c]));
const duration = (ms) => !ms ? '—' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
const plural = (items) => Array.isArray(items) && items.length ? items.join(', ') : '—';
function render() {
  const term = $('query').value.trim().toLowerCase(), status = $('status').value, type = $('type').value, area = $('area').value;
  const visible = state.cases.filter(item => (!status || item.status === status) && (!type || item.executionType === type) && (!area || item.area === area) && (!term || `${item.id} ${item.title} ${item.area} ${item.priority} ${(item.sourceRefs || []).join(' ')} ${item.status}`.toLowerCase().includes(term)));
  $('count').textContent = `${visible.length} de ${state.cases.length} casos`;
  $('rows').innerHTML = visible.length ? visible.map(item => {
    const history = item.regression === 'regression' ? '<strong class="regression">REGRESSÃO</strong>' : item.previousStatus ? `anterior: ${escapeHtml(item.previousStatus)}` : 'primeira execução';
    const coverage = `${escapeHtml(item.executionType)} · ${escapeHtml(plural(item.viewports))}<br><small>Perfil: ${escapeHtml(plural(item.profiles))}</small>`;
    const detail = item.error || (item.preconditions || []).join(' · ') || '—';
    return `<tr><td><strong>${escapeHtml(item.id)}</strong><br>${escapeHtml(item.title)}<br><small>${escapeHtml(plural(item.sourceRefs))}</small></td><td>${escapeHtml(item.area)}<br><small>${escapeHtml(item.priority)}</small></td><td>${coverage}</td><td><span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td><td>${history}</td><td>${item.attempts ? `${escapeHtml(plural(item.projects))}<br><small>${item.attempts} instância(s) · ${duration(item.durationMs)}</small>` : 'não executado'}</td><td>${escapeHtml(detail)}</td></tr>`;
  }).join('') : '<tr><td colspan="7">Nenhum caso corresponde aos filtros.</td></tr>';
}
async function main() {
  try {
    const report = await fetch('data/latest.json', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
    if (Array.isArray(report.cases)) state.cases = report.cases;
    else {
      // Mantém o catálogo visível também antes da primeira geração v2 do relatório.
      const catalog = await fetch('data/catalog.json', { cache: 'no-store' }).then(r => r.json());
      state.cases = (catalog.cases || []).map(item => ({ ...item, status: item.defaultStatus, attempts: 0, durationMs: 0, projects: [], regression: 'none' }));
      report.note = `${report.note ? `${report.note} · ` : ''}Catálogo exibido sem execução v2.`;
    }
    const calculated = state.cases.reduce((acc, item) => { acc.total += 1; acc[item.status] = (acc[item.status] || 0) + 1; return acc; }, { total: 0 });
    const summary = report.summary?.total === state.cases.length ? report.summary : calculated;
    $('total').textContent = summary.total ?? 0; $('passed').textContent = summary.passed ?? 0;
    $('failed').textContent = `${summary.failed ?? 0}/${summary.regressions ?? 0}`;
    $('blocked').textContent = summary.blocked ?? 0;
    const run = report.runSummary || {};
    $('meta').textContent = `Ambiente: ${report.environment || 'não informado'} · geração: ${report.generatedAt || '—'} · revisão: ${report.revision || '—'} · ${run.total || 0} instâncias na última execução${report.unmappedRunTests ? ` · ${report.unmappedRunTests} sem ID do catálogo` : ''}${report.note ? ` · ${report.note}` : ''}`;
    [...new Set(state.cases.map(item => item.area).filter(Boolean))].sort().forEach(value => $('area').insertAdjacentHTML('beforeend', `<option>${escapeHtml(value)}</option>`));
    render();
  } catch { $('meta').textContent = 'Não foi possível carregar o relatório sanitizado.'; $('rows').innerHTML = '<tr><td colspan="7">Falha ao carregar dados.</td></tr>'; }
}
const ACCESS_HASH = '03e95d9576e27e9116885331e99b43b0a4e6051a7b7ccf14e0ed5c86e1c85d26';
const ACCESS_STORAGE_KEY = 'apcapQaAccessUntil_v2';
let accessAttempts = 0;
const sha256 = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(byte => byte.toString(16).padStart(2, '0')).join('');
function hasAccess() {
  if (sessionStorage.getItem(ACCESS_STORAGE_KEY) === 'session') return true;
  const until = Number(localStorage.getItem(ACCESS_STORAGE_KEY) || 0);
  if (until > Date.now()) return true;
  localStorage.removeItem(ACCESS_STORAGE_KEY);
  return false;
}
let dashboardStarted = false;
function openDashboard() {
  $('accessGate').hidden = true;
  $('dashboard').hidden = false;
  document.body.classList.remove('access-open');
  if (!dashboardStarted) {
    dashboardStarted = true;
    ['query','status','type','area'].forEach(id => $(id).addEventListener('input', render));
    main();
  }
}
function initAccess() {
  if (hasAccess()) return openDashboard();
  document.body.classList.add('access-open');
  $('accessForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = $('accessSubmit');
    const message = $('accessMessage');
    submit.disabled = true;
    message.textContent = 'Verificando…';
    const valid = await sha256($('accessCode').value) === ACCESS_HASH;
    if (valid) {
      if ($('rememberAccess').checked) localStorage.setItem(ACCESS_STORAGE_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
      else sessionStorage.setItem(ACCESS_STORAGE_KEY, 'session');
      $('accessCode').value = '';
      message.textContent = '';
      return openDashboard();
    }
    accessAttempts += 1;
    message.textContent = 'Código incorreto. Confira e tente novamente.';
    $('accessCode').select();
    setTimeout(() => { submit.disabled = false; }, Math.min(8000, accessAttempts * 1200));
  });
  $('toggleCode').addEventListener('click', () => {
    const input = $('accessCode');
    input.type = input.type === 'password' ? 'text' : 'password';
    $('toggleCode').textContent = input.type === 'password' ? 'Mostrar' : 'Ocultar';
    input.focus();
  });
}
$('logout').addEventListener('click', () => {
  localStorage.removeItem(ACCESS_STORAGE_KEY);
  sessionStorage.removeItem(ACCESS_STORAGE_KEY);
  location.reload();
});
initAccess();
