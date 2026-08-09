const state = { cases: [], auditEntries: [] };
const WORKFLOW = 'https://github.com/Dev-L4/apcap-qa-automation/actions/workflows/qa.yml';
const $ = id => document.getElementById(id);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const duration = ms => !ms ? '—' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;

function render() {
  const term = $('query').value.trim().toLowerCase(), status = $('status').value, type = $('type').value;
  const visible = state.cases.filter(item => (!status || item.status === status) && (!type || item.execution === type) && (!term || `${item.id} ${item.title} ${item.execution} ${item.status}`.toLowerCase().includes(term)));
  $('count').textContent = `${visible.length} resultados retidos`;
  $('rows').innerHTML = visible.length ? visible.map(item => `<tr>
    <td><strong>${escapeHtml(item.id)}</strong><br>${escapeHtml(item.title)}</td>
    <td>${escapeHtml(item.execution)}</td>
    <td><span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>${item.regression === 'regression' ? '<br><strong class="regression">REGRESSÃO</strong>' : ''}</td>
    <td>${escapeHtml((item.projects || []).join(', ') || '—')}<br><small>${item.attempts || 0} instância(s) · ${duration(item.durationMs)}</small>${Array.isArray(item.evidence) && item.evidence.length ? `<br><a class="evidence-link" href="${escapeHtml(item.evidence[0])}" target="_blank" rel="noopener">📷 Ver evidência${item.evidence.length > 1 ? ` (${item.evidence.length})` : ''}</a>` : '<br><small>Evidência visual ainda não publicada</small>'}</td>
    <td><a class="button secondary" href="${WORKFLOW}">Rodar este caso</a> <button class="button secondary copy-id" type="button" data-case="${escapeHtml(item.id)}">Copiar ID</button><br><small>GitHub exige confirmação autenticada para <code>${escapeHtml(item.id)}</code>.</small></td>
  </tr>`).join('') : '<tr><td colspan="5">Nenhum resultado corresponde aos filtros.</td></tr>';
}

function renderAudit() {
  const term = $('audit-query').value.trim().toLowerCase();
  const eligibility = $('eligibility').value;
  const status = $('audit-status').value;
  const visible = state.auditEntries.filter(item =>
    (!eligibility || item.elegibilidade === eligibility) &&
    (!status || item.statusAtual === status) &&
    (!term || `${item.id} ${item.titulo} ${item.area} ${item.casoAutomatizado || ''}`.toLowerCase().includes(term))
  );
  $('audit-count').textContent = `${visible.length} de ${state.auditEntries.length} itens`;
  $('audit-rows').innerHTML = visible.length ? visible.map(item => `<tr>
    <td><strong>${escapeHtml(item.id)}</strong><br><small>${escapeHtml(item.area)}</small></td>
    <td><strong>${escapeHtml(item.titulo)}</strong><br><small>${escapeHtml(item.justificativa)}</small></td>
    <td><span class="audit-tag eligibility-${escapeHtml(item.elegibilidade)}">${escapeHtml(item.elegibilidade)}</span></td>
    <td><span class="audit-tag audit-status-${escapeHtml(item.statusAtual)}">${escapeHtml(item.statusAtual)}</span></td>
    <td>${item.casoAutomatizado ? `<code>${escapeHtml(item.casoAutomatizado)}</code>` : '—'}</td>
    <td>${escapeHtml(item.proximaAcao)}</td>
  </tr>`).join('') : '<tr><td colspan="6">Nenhum item corresponde aos filtros.</td></tr>';
}

async function copyCaseId(id) {
  try {
    await navigator.clipboard.writeText(id);
    $('action-feedback').textContent = `ID ${id} copiado. GitHub exige confirmação autenticada para executar.`;
  } catch {
    $('action-feedback').textContent = `Não foi possível copiar automaticamente. Use o ID ${id} no GitHub autenticado.`;
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('.copy-id');
  if (button?.dataset.case) void copyCaseId(button.dataset.case);
});

async function loadExecutionReport() {
  try {
    const report = await fetch('data/latest.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw new Error(); return response.json(); });
    state.cases = Array.isArray(report.cases) ? report.cases : [];
    const summary = report.summary || { total: 0, passed: 0, failed: 0 };
    $('total').textContent = summary.total; $('passed').textContent = summary.passed; $('failed').textContent = summary.failed;
    const coverage = Object.entries(report.browserCoverage || {}).sort(([a], [b]) => a.localeCompare(b)).map(([browser, count]) => `${browser}: ${count} caso(s)`).join(' · ');
    $('coverage').textContent = coverage || 'Sem cobertura nesta execução.';
    $('meta').textContent = `Ambiente: ${report.environment || 'não informado'} · geração: ${report.generatedAt || '—'} · revisão: ${report.revision || '—'} · ${summary.total || 0} casos nesta execução`;
    render();
  } catch {
    $('meta').textContent = 'Não foi possível carregar o relatório sanitizado.';
    $('coverage').textContent = 'Indisponível.';
    $('rows').innerHTML = '<tr><td colspan="5">Falha ao carregar dados.</td></tr>';
  }
}

async function loadCoverageAudit() {
  try {
    const audit = await fetch('data/coverage-audit.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw new Error(); return response.json(); });
    if (!Array.isArray(audit.entries)) throw new Error();
    state.auditEntries = audit.entries;
    $('audit-meta').textContent = `${audit.scope || 'Auditoria de cobertura'} · atualização: ${audit.generatedAt || '—'}`;
    renderAudit();
  } catch {
    $('audit-meta').textContent = 'Não foi possível carregar a auditoria de cobertura.';
    $('audit-count').textContent = 'Indisponível';
    $('audit-rows').innerHTML = '<tr><td colspan="6">A auditoria de cobertura está indisponível. Tente atualizar a página mais tarde.</td></tr>';
  }
}

['query', 'status', 'type'].forEach(id => $(id).addEventListener('input', render));
['audit-query', 'eligibility', 'audit-status'].forEach(id => $(id).addEventListener('input', renderAudit));
void loadExecutionReport();
void loadCoverageAudit();
