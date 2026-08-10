const $ = id => document.getElementById(id);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const safeEvidence = value => Array.isArray(value) ? value.filter(path => /^evidence\/[A-Z0-9-]+\/[a-z0-9-]+\.png$/.test(path)) : [];

async function loadExecutionReport() {
  try {
    const report = await fetch('data/latest.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw new Error(); return response.json(); });
    const cases = Array.isArray(report.cases) ? report.cases : [];
    const summary = report.summary || { total: 0, passed: 0, failed: 0 };
    $('total').textContent = summary.total || 0;
    $('passed').textContent = summary.passed || 0;
    $('failed').textContent = summary.failed || 0;
    $('meta').textContent = `Ambiente: ${report.environment || 'HML'} · atualização: ${report.generatedAt || '—'} · ${cases.length} fluxo(s) completo(s) elegível(is)`;
    $('rows').innerHTML = cases.length ? cases.map(item => {
      const evidence = safeEvidence(item.evidence);
      const evidenceHtml = evidence.length
        ? `<details><summary>${evidence.length} screenshot(s)</summary>${evidence.map((path, index) => `<a href="${escapeHtml(path)}" target="_blank" rel="noopener noreferrer">Evidência ${index + 1}</a>`).join('<br>')}</details>`
        : 'Sem evidência publicada';
      return `<tr><td><strong>${escapeHtml(item.id)}</strong><br>${escapeHtml(item.title)}</td><td>${escapeHtml(item.execution)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml((item.projects || []).join(', ') || '—')}</td><td>${evidenceHtml}</td></tr>`;
    }).join('') : '<tr><td colspan="5"><strong>Nenhum caso elegível.</strong><br>Um caso só será publicado após completar todo o objetivo declarado autonomamente e produzir screenshot sanitizado de cada etapa relevante.</td></tr>';
  } catch {
    $('meta').textContent = 'Não foi possível carregar o relatório sanitizado.';
    $('rows').innerHTML = '<tr><td colspan="5">Falha ao carregar dados.</td></tr>';
  }
}

void loadExecutionReport();
