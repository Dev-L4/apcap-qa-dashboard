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
    const detailRaw = item.error || (item.preconditions || []).join(' · ') || '—';
    const detail = escapeHtml(detailRaw)
      .replace(/(Hipótese de causa raiz:)/, '<br><br><strong>Causa raiz:</strong>')
      .replace(/(Proposta de solução:)/, '<br><br><strong>Correção proposta:</strong>');
    return `<tr><td><strong>${escapeHtml(item.id)}</strong><br>${escapeHtml(item.title)}<br><small>${escapeHtml(plural(item.sourceRefs))}</small></td><td>${escapeHtml(item.area)}<br><small>${escapeHtml(item.priority)}</small></td><td>${coverage}</td><td><span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td><td>${history}</td><td>${item.attempts ? `${escapeHtml(plural(item.projects))}<br><small>${item.attempts} instância(s) · ${duration(item.durationMs)}</small>` : 'não executado'}</td><td>${detail}</td></tr>`;
  }).join('') : '<tr><td colspan="7">Nenhum caso corresponde aos filtros.</td></tr>';
}
async function main() {
  try {
    const report = await fetch('data/latest.json', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
    if (Array.isArray(report.cases)) state.cases = report.cases;
    else {
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
['query','status','type','area'].forEach(id => $(id).addEventListener('input', render));
main();
