import { supabase } from './supabase.js';

const ra = sessionStorage.getItem('ra');
if (!ra) window.location.href = 'index.html';

function formatarData(d) {
    if (!d) return '—';
    const [ano, mes, dia] = d.split('-');
    return `${dia}/${mes}/${ano}`;
}

const { data: aluno } = await supabase
    .from('aluno')
    .select('ra, nome')
    .eq('ra', ra)
    .single();

document.getElementById('ra-label').textContent = `R.A.: ${ra} — ${aluno?.nome || ''}`;

// Busca certificados com joins
const { data: certs, error } = await supabase
    .from('certificado')
    .select(`
                id, data, duracao, arquivo_base64, arquivo_nome, arquivo_tipo, observacao,
                atividade ( nome_atividade ),
                situacao  ( situacao )
            `)
    .eq('ra_aluno', ra)
    .order('created_at', { ascending: false });

const lista = document.getElementById('lista');
const vazio = document.getElementById('vazio');

if (error || !certs?.length) {
    lista.innerHTML = '';
    vazio.style.display = 'block';
} else {
    lista.innerHTML = '';
    certs.forEach(c => {
        const status = c.situacao?.situacao || 'pendente';
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <b>${c.atividade?.nome_atividade || '—'}</b>
                        <span class="badge ${status}">${status}</span>
                    </div>
                    <hr>
                    <p class="card-info">📅 ${formatarData(c.data)} &nbsp;|&nbsp; ⏱️ ${c.duracao ?? '—'}h</p>
                    ${c.observacao ? `<p class="card-obs">💬 ${c.observacao}</p>` : ''}
                    ${c.arquivo_base64 ? `<button class="btn-ver">Ver certificado</button>` : ''}
                    <button class="btn-excluir" style="margin-top:10px; padding:6px 14px; border-radius:8px; border:1px solid rgba(239,68,68,0.5); background:rgba(239,68,68,0.15); color:#fca5a5; cursor:pointer; font-size:13px;">🗑 Excluir</button>
                `;
        lista.appendChild(card);
        card.querySelector('.btn-ver')?.addEventListener('click', () => abrirModal(c));
        card.querySelector('.btn-excluir').addEventListener('click', () => excluir(c.id, card, c.situacao?.situacao));
    });
}

async function excluir(id, card, status) {
    if (status === 'aprovado') {
        alert('Certificados aprovados não podem ser excluídos.');
        return;
    }
    if (!confirm('Tem certeza que deseja excluir este certificado?')) return;

    const { error } = await supabase
        .from('certificado')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erro ao excluir. Tente novamente.');
    } else {
        card.remove();
        // Se não sobrou nenhum card, mostra mensagem de vazio
        if (!document.querySelector('.card')) {
            document.getElementById('lista').innerHTML = '';
            document.getElementById('vazio').style.display = 'block';
        }
    }
}

window.abrirModal = (c) => {
    const img = document.getElementById('modal-img');
    const pdf = document.getElementById('modal-pdf');
    if (c.arquivo_tipo?.startsWith('image/')) {
        img.src = `data:${c.arquivo_tipo};base64,${c.arquivo_base64}`;
        img.style.display = 'block'; pdf.style.display = 'none';
    } else {
        pdf.src = `data:application/pdf;base64,${c.arquivo_base64}`;
        pdf.style.display = 'block'; img.style.display = 'none';
    }
    document.getElementById('modal').classList.add('open');
};

window.fecharModal = () => {
    document.getElementById('modal').classList.remove('open');
    document.getElementById('modal-img').src = '';
    document.getElementById('modal-pdf').src = '';
};