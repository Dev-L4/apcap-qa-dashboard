const state = { tests: [] };
const $ = (id) => document.getElementById(id);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const duration = (ms) => ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
function render() {
  const term = $('query').value.trim().toLowerCase(), status = $('status').value, project = $('project').value;
  const visible = state.tests.filter(t => (!status || t.status === status) && (!project || t.project === project) && (!term || `${t.title} ${t.project} ${t.status} ${t.error || ''}`.toLowerCase().includes(term)));
  $('count').textContent = `${visible.length} de ${state.tests.length} casos`;
  $('rows').innerHTML = visible.length ? visible.map(t => `<tr><td>${escapeHtml(t.title)}</td><td>${escapeHtml(t.project)}</td><td><span class="status ${escapeHtml(t.status)}">${escapeHtml(t.status)}</span></td><td>${duration(t.durationMs || 0)}</td><td>${escapeHtml(t.error || '—')}</td></tr>`).join('') : '<tr><td colspan="5">Nenhum caso corresponde aos filtros.</td></tr>';
}
async function main() {
  try {
    const report = await fetch('data/latest.json', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    state.tests = Array.isArray(report.tests) ? report.tests : [];
    ['total','passed','failed','skipped'].forEach(key => $(key).textContent = report.summary?.[key] ?? 0);
    $('meta').textContent = `Ambiente: ${report.environment || 'não informado'} · geração: ${report.generatedAt || 'ainda não executado'} · revisão: ${report.revision || '—'}${report.note ? ` · ${report.note}` : ''}`;
    [...new Set(state.tests.map(t => t.project).filter(Boolean))].sort().forEach(project => $('project').insertAdjacentHTML('beforeend', `<option>${escapeHtml(project)}</option>`));
    render();
  } catch (error) { $('meta').textContent = 'Não foi possível carregar o resultado sanitizado.'; $('rows').innerHTML = '<tr><td colspan="5">Falha ao carregar dados.</td></tr>'; }
}
['query','status','project'].forEach(id => $(id).addEventListener('input', render)); main();
