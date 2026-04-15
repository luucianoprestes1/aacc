import { supabase } from './supabase.js';

// Proteção
if (sessionStorage.getItem('adm') !== 'ok') window.location.href = 'adm_login.html';

function formatarData(d) {
    if (!d) return '—';
    const [ano, mes, dia] = d.split('-');
    return `${dia}/${mes}/${ano}`;
}

let todosCerts = [];
let relData = [];

// ── Carrega certificados com todos os joins ──
async function carregarCerts(filtros = {}) {
    const lista = document.getElementById('lista');
    lista.innerHTML = '<p style="color:rgba(255,255,255,0.6);">Carregando...</p>';

    let query = supabase
        .from('certificado')
        .select(`
                    id, data, duracao, arquivo_nome, arquivo_tipo, arquivo_base64, observacao, ra_aluno, id_situacao,
                    aluno ( ra, nome ),
                    atividade ( id, nome_atividade ),
                    situacao  ( id, situacao )
                `)
        .order('created_at', { ascending: false });

    if (filtros.ra) query = query.eq('ra_aluno', filtros.ra);
    if (filtros.status) query = query.eq('id_situacao', filtros.status);
    if (filtros.atividade) query = query.ilike('atividade.nome_atividade', `%${filtros.atividade}%`);

    const { data, error } = await query;
    if (error) { lista.innerHTML = '<p style="color:#fca5a5;">Erro ao carregar.</p>'; return; }

    todosCerts = data || [];

    // Filtro local por nome de atividade (supabase não filtra bem em joins)
    let filtrado = todosCerts;
    if (filtros.atividade) {
        const termo = filtros.atividade.toLowerCase();
        filtrado = todosCerts.filter(c => c.atividade?.nome_atividade?.toLowerCase().includes(termo));
    }

    renderCerts(filtrado);
}

function renderCerts(certs) {
    const lista = document.getElementById('lista');
    const vazio = document.getElementById('vazio');
    lista.innerHTML = '';

    if (!certs.length) { vazio.style.display = 'block'; return; }
    vazio.style.display = 'none';

    certs.forEach(c => {
        const status = c.situacao?.situacao || 'pendente';
        const card = document.createElement('div');
        card.className = 'card';
        card.id = `card-${c.id}`;
        card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <b>${c.atividade?.nome_atividade || '—'}</b><br>
                            <span style="font-size:13px; color:rgba(255,255,255,0.6);">R.A.: ${c.ra_aluno} ${c.aluno?.nome ? '| ' + c.aluno.nome : ''}</span>
                        </div>
                        <span class="badge ${status}">${status}</span>
                    </div>
                    
                    <hr>

                    <p class="card-info">📅 ${formatarData(c.data)} &nbsp;|&nbsp; ⏱️ ${c.duracao ?? '—'}h</p>

                    ${c.observacao ? `<p style="font-size:12px;color:rgba(255,255,255,0.5);font-style:italic;margin-top:4px;">💬 ${c.observacao}</p>` : ''}

                    <textarea class="obs" id="obs-${c.id}" placeholder="Observação (opcional)">${c.observacao || ''}</textarea>

                    <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                        <label for="dur-${c.id}" style="color:rgba(255,255,255,0.6); font-size:13px; white-space:nowrap;">Duração:</label>
                        <input type="number" id="dur-${c.id}" value="${c.duracao ?? ''}"
                            style="padding:7px 10px; border-radius:8px; border:none; background:rgba(255,255,255,0.12); color:white; font-size:13px; width:120px;">
                    </div>
                    
                    <div class="acoes">
                        ${c.arquivo_base64 ? `<button class="btn-ver" data-id="${c.id}">👁 Ver certificado</button>` : ''}
                        <button class="btn-aprovar"  data-id="${c.id}">✔ Aprovar</button>
                        <button class="btn-reprovar" data-id="${c.id}">✘ Reprovar</button>
                    </div>
                `;
        lista.appendChild(card);
    });

    document.querySelectorAll('.btn-aprovar').forEach(btn =>
        btn.addEventListener('click', () => validar(btn.dataset.id, 2)));
    document.querySelectorAll('.btn-reprovar').forEach(btn =>
        btn.addEventListener('click', () => validar(btn.dataset.id, 3)));
    document.querySelectorAll('.btn-ver').forEach(btn =>
        btn.addEventListener('click', () => {
            const cert = todosCerts.find(c => c.id == btn.dataset.id);
            if (cert) abrirModal(cert);
        }));
}

// ── Validar ──
async function validar(id, id_situacao) {
    const obs = document.getElementById(`obs-${id}`)?.value || '';
    const durInput = document.getElementById(`dur-${id}`)?.value;
    const duracao = durInput !== '' ? parseFloat(durInput) : undefined;

    const payload = { id_situacao, observacao: obs };
    if (duracao) payload.duracao = duracao;

    const { error } = await supabase
        .from('certificado')
        .update(payload)
        .eq('id', id);

    if (!error) {
        await carregarCerts();
        carregarRelatorio();
    } else {
        alert('Erro ao atualizar. Tente novamente.');
    }
}

// ── Converte horas (NUMERIC) para minutos ──
function duracaoEmMinutos(d) {
    if (!d) return 0;
    return Math.round(parseFloat(d) * 60);
}

// ── Agrupa registros por aluno ──
function agruparPorAluno(data) {
    const mapa = {};
    data.forEach(r => {
        const key = r.ra;
        if (!mapa[key]) {
            mapa[key] = {
                ra: r.ra, nome: r.nome || '—',
                curso: r.curso || '—',
                atividades: [],
                totalMinutos: 0
            };
        }
        if (r.atividade && !mapa[key].atividades.includes(r.atividade)) {
            mapa[key].atividades.push(r.atividade);
        }
        mapa[key].totalMinutos += duracaoEmMinutos(r.duracao);
    });
    return Object.values(mapa).sort((a, b) => String(a.ra).localeCompare(String(b.ra)));
}

// ── Formata minutos para "HH:MM" ──
function minutosParaHora(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Relatório ──
async function carregarRelatorio(filtros = {}) {
    const body = document.getElementById('rel-body');
    let query = supabase
        .from('relatorio_aacc')
        .select('*')
        .eq('status', 'aprovado');

    if (filtros.ra) query = query.eq('ra', filtros.ra);

    const { data, error } = await query;
    if (error || !data) { body.innerHTML = '<tr><td colspan="5">Erro.</td></tr>'; return; }

    // Filtro local por atividade
    let filtrado = data;
    if (filtros.atividade) {
        const termo = filtros.atividade.toLowerCase();
        filtrado = data.filter(r => r.atividade?.toLowerCase().includes(termo));
    }

    relData = filtrado;

    if (!filtrado.length) {
        body.innerHTML = '<tr><td colspan="5" style="color:rgba(255,255,255,0.5);">Nenhuma hora aprovada ainda.</td></tr>';
        return;
    }

    const agrupado = agruparPorAluno(filtrado);
    let totalGeralMin = 0;

    body.innerHTML = agrupado.map(a => {
        totalGeralMin += a.totalMinutos;
        return `<tr>
                    <td>${a.ra}</td>
                    <td>${a.nome}</td>
                    <td>${a.curso}</td>
                    <td style="font-size:12px;">${a.atividades.join('; ')}</td>
                    <td>${minutosParaHora(a.totalMinutos)}h</td>
                </tr>`;
    }).join('');

    body.innerHTML += `<tr class="total-row">
                <td colspan="4" style="text-align:right;">Total geral:</td>
                <td>${minutosParaHora(totalGeralMin)}h</td>
            </tr>`;
}

// ── Exportar XLSX ──
window.exportarCSV = () => {
    if (!relData.length) { alert('Nenhum dado para exportar.'); return; }

    const agrupado = agruparPorAluno(relData);

    // Monta linhas
    const cabecalho = ['ra', 'nome', 'curso', 'atividades', 'total de horas'];
    const linhas = agrupado.map(a => [
        a.ra,
        a.nome,
        a.curso,
        a.atividades.join('; '),
        minutosParaHora(a.totalMinutos)
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([cabecalho, ...linhas]);

    // Largura das colunas
    ws['!cols'] = [
        { wch: 12 },  // ra
        { wch: 30 },  // nome
        { wch: 28 },  // curso
        { wch: 60 },  // atividades
        { wch: 14 },  // total
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Relatório AACC');
    XLSX.writeFile(wb, 'aacc_relatorio.xlsx');
};

window.aplicarFiltros = () => {
    const filtros = {
        ra: document.getElementById('filtro-ra').value.trim() || null,
        atividade: document.getElementById('filtro-atividade').value.trim(),
        status: document.getElementById('filtro-status').value || null,
    };
    carregarCerts(filtros);
    carregarRelatorio(filtros);
};

window.abrirModal = async (c) => {
    const img = document.getElementById('modal-img');
    const pdf = document.getElementById('modal-pdf');
    img.style.display = 'none'; pdf.style.display = 'none';
    document.getElementById('modal').classList.add('open');

    // Busca o base64 só agora
    const { data, error } = await supabase
        .from('certificado')
        .select('arquivo_base64, arquivo_tipo')
        .eq('id', c.id)
        .single();

    if (error || !data?.arquivo_base64) {
        document.getElementById('modal').classList.remove('open');
        alert('Erro ao carregar o arquivo.');
        return;
    }

    if (data.arquivo_tipo?.startsWith('image/')) {
        img.src = `data:${data.arquivo_tipo};base64,${data.arquivo_base64}`;
        img.style.display = 'block';
    } else {
        pdf.src = `data:application/pdf;base64,${data.arquivo_base64}`;
        pdf.style.display = 'block';
    }
};

window.fecharModal = () => {
    document.getElementById('modal').classList.remove('open');
    document.getElementById('modal-img').src = '';
    document.getElementById('modal-pdf').src = '';
};

window.sair = () => {
    sessionStorage.removeItem('adm');
    window.location.href = 'index.html';
};

carregarCerts({ status: '1' });
carregarRelatorio();