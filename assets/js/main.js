// Para fazer login, o usuário insere seu R.A. e o sistema verifica se ele existe na tabela "aluno" do Supabase. Se encontrado, o R.A. é armazenado na sessionStorage e o usuário é redirecionado para a página de formulário. Caso contrário, uma mensagem de erro é exibida.
import { supabase } from './supabase.js';

document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ra = parseInt(document.getElementById('ra').value);
    const msg = document.getElementById('msg');
    msg.textContent = 'Verificando...';

    const { data, error } = await supabase
        .from('aluno')
        .select('ra')
        .eq('ra', ra)
        .single();

    if (error || !data) {
        msg.textContent = '❌ R.A. não encontrado. Procure a secretaria.';
        return;
    }

    sessionStorage.setItem('ra', ra);
    window.location.href = 'form.html';
});