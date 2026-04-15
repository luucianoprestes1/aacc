// ⚠️ ALTERE A SENHA ABAIXO
const SENHA_ADM = 'aacc2026';

// Se já está autenticado, vai direto
if (sessionStorage.getItem('adm') === 'ok') {
    window.location.href = 'adm.html';
}

document.getElementById('formAdm').addEventListener('submit', (e) => {
    e.preventDefault();
    const tentativa = document.getElementById('senha').value;
    if (tentativa === SENHA_ADM) {
        sessionStorage.setItem('adm', 'ok');
        window.location.href = 'adm.html';
    } else {
        document.getElementById('msg').textContent = '❌ Senha incorreta.';
        document.getElementById('senha').value = '';
        document.getElementById('senha').focus();
    }
});