// Estava no script do form.html
import { supabase } from './supabase.js';

const ra = sessionStorage.getItem('ra');

if (!ra) window.location.href = 'index.html';

// Busca nome do aluno e exibe
const { data: aluno } = await supabase
    .from('aluno')
    .select('ra, nome')
    .eq('ra', ra)
    .single();

if (aluno) {
    const info = document.createElement('p');
    info.style.cssText = 'color:rgba(255,255,255,0.8); font-size:14px; margin-bottom:16px; text-align:center;';
    info.textContent = `R.A.: ${aluno.ra} — ${aluno.nome || ''}`;
    document.querySelector('form').before(info);
}

// Carrega atividades do banco
const { data: atividades } = await supabase
    .from('atividade')
    .select('id, nome_atividade')
    .order('id');

const sel = document.getElementById('atividade');
(atividades || []).forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.nome_atividade;
    sel.appendChild(opt);
});

// Preview do arquivo
document.getElementById('arquivo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const wrap = document.getElementById('preview-wrap');
    const img = document.getElementById('preview-img');
    const pdf = document.getElementById('preview-pdf');
    if (!file) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    if (file.type.startsWith('image/')) {
        img.src = URL.createObjectURL(file);
        img.style.display = 'block';
        pdf.textContent = '';
    } else {
        img.style.display = 'none';
        pdf.textContent = `📄 ${file.name}`;
    }
});

// Converte para base64
function toBase64(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}

// Submissão
document.getElementById('formCert').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg');
    const btn = document.getElementById('btnSalvar');
    btn.disabled = true;
    msg.textContent = 'Salvando...';

    const file = document.getElementById('arquivo').files[0];
    if (file.size > 5 * 1024 * 1024) {
        msg.textContent = '⚠️ Arquivo muito grande. Máximo: 5MB.';
        btn.disabled = false;
        return;
    }

    // Busca id_situacao de 'pendente' (id=1)
    const { data: sit } = await supabase
        .from('situacao')
        .select('id')
        .eq('situacao', 'pendente')
        .single();

    let base64 = null;
    try { base64 = await toBase64(file); }
    catch { msg.textContent = 'Erro ao processar o arquivo.'; btn.disabled = false; return; }

    const { error } = await supabase.from('certificado').insert({
        ra_aluno: parseInt(ra),
        data: document.getElementById('data').value,
        duracao: parseFloat(document.getElementById('duracao').value),
        id_atividade: parseInt(document.getElementById('atividade').value),
        id_situacao: sit?.id || 1,
        arquivo_base64: base64,
        arquivo_nome: file.name,
        arquivo_tipo: file.type,
    });

    if (error) {
        msg.textContent = 'Erro ao salvar. Tente novamente.';
        console.error(error);
    } else {
        msg.textContent = '✅ Certificado enviado com sucesso!';
        document.getElementById('formCert').reset();
        document.getElementById('preview-wrap').style.display = 'none';
    }
    btn.disabled = false;
});

function ordenarSelect(selectId) {
    const select = document.getElementById(selectId);
    const opcoes = Array.from(select.options);

    // Mantém o "Selecione..." fixo no topo
    const placeholder = opcoes.shift();

    opcoes.sort((a, b) => a.text.localeCompare(b.text, 'pt-BR'));

    select.innerHTML = '';
    select.appendChild(placeholder);
    opcoes.forEach(op => select.appendChild(op));
}

ordenarSelect('atividade');