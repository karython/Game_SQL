
// ===== Utilidades =====
const $ = sel => document.querySelector(sel);
const el = id => document.getElementById(id);
const normalize = s => (s||"")
    .replace(/--.*$/mg, "")       // remove comentários de linha
    .replace(/\s+/g, " ")
    .trim();

const banned = /\b(join|sum|count|between|like|group\s+by|having)\b/i;

// ===== DB Simulado (memória) =====
const DB = {
    tables: {
    // Uma tabela para a fase 3 (DROP)
    Arquivos_Comprometidos: {
        schema: { id: 'INT', descricao: 'VARCHAR(80)' },
        rows: [ { id: 1, descricao: 'PenDrive suspeito' } ]
    }
    }
};

function renderDB(){
    const c = el('dbState');
    const keys = Object.keys(DB.tables);
    if(keys.length===0){ c.innerHTML = '<em>Nenhuma tabela criada.</em>'; return; }
    c.innerHTML = keys.map(t => {
    const table = DB.tables[t];
    const headers = Object.keys(table.schema);
    const rows = table.rows || [];
    const thead = '<tr>'+headers.map(h=>`<th>${h}</th>`).join('')+'</tr>';
    const tbody = rows.length ? rows.map(r=>'<tr>'+headers.map(h=>`<td>${safe(r[h])}</td>`).join('')+'</tr>').join('') : '<tr><td colspan="999" style="color:#94a3b8">(sem registros)</td></tr>';
    return `
        <div style="margin:8px 0 18px">
        <div class="badge" style="margin-bottom:6px">Tabela: ${t}</div>
        <table>${thead}${tbody}</table>
        </div>
    `;
    }).join('');
}
const safe = v => (v===undefined||v===null)?'':String(v).replace(/[&<>]/g, s=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[s]));

// ===== Confete simples =====
function throwConfetti(){
    const cvs = el('confetti');
    const w = cvs.width = window.innerWidth;
    const h = cvs.height = 1; // não usamos desenho; só como container
    // criar elementos DOM coloridos caindo
    for(let i=0;i<60;i++){
    const s = document.createElement('span');
    s.style.left = (Math.random()*w)+'px';
    s.style.background = `hsl(${Math.floor(Math.random()*360)}, 90%, 60%)`;
    s.style.animationDuration = (4+Math.random()*2)+'s';
    s.style.animationDelay = (Math.random()*0.4)+'s';
    s.className = 'confetti-bit';
    cvs.parentElement.appendChild(s);
    s.classList.add('confetti');
    // substituímos class para aproveitar keyframes "fall" na tag span via CSS acima
    s.className = '';
    s.style.position='fixed';
    s.style.top='-10px';
    s.style.width='8px'; s.style.height='12px'; s.style.opacity='.85';
    s.style.animation='fall linear forwards';
    s.style.borderRadius='2px';
    s.addEventListener('animationend', ()=> s.remove());
    }
}

// ===== Persistência =====
const SAVE_KEY = 'ministerio-sql-save-v1';
function save(){
    localStorage.setItem(SAVE_KEY, JSON.stringify({ phase, subStep, DB }));
}
function load(){
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    try{
    const data = JSON.parse(raw);
    if(typeof data.phase==='number'){
        Object.assign(DB, data.DB || DB);
        phase = data.phase; subStep = data.subStep||0;
        return true;
    }
    }catch(e){}
    return false;
}

// ===== Fases =====
let phase = 1; // 1..10
let subStep = 0; // para a fase 10

const phases = [
    {
    id:1,
    title:"O Cofre Secreto (DDL — CREATE TABLE)",
    story:`O Ministério precisa registrar seus agentes de campo. Para abrir o cofre de credenciais,
            crie a tabela <code>Agentes</code> com as colunas <code>id INT</code>, <code>nome VARCHAR(50)</code> e <code>nivel INT</code>.`,
    objective:`Crie a tabela <strong>Agentes</strong>.`,
    hint:`Esse comando é usado quando você precisa criar uma estrutura nova para armazenar dados, como um molde de tabela.`,
    validate(sql){
        const ok = /^create\s+table\s+agentes\s*\(\s*id\s+int\s*,\s*nome\s+varchar\s*\(\s*\d+\s*\)\s*,\s*nivel\s+int\s*\)\s*;?$/i.test(sql);
        if(!ok) return {ok:false, msg:"Estrutura esperada para criar a tabela Agentes."};
        DB.tables.Agentes = { schema:{ id:'INT', nome:'VARCHAR(50)', nivel:'INT' }, rows: [] };
        return {ok:true, msg:"Tabela Agentes criada."};
    }
    },
    {
    id:2,
    title:"Os Dossiês (DDL — ALTER TABLE)",
    story:`O ministro ordenou que o cadastro tenha a <code>data_admissao</code> de cada agente.`,
    objective:`Adicionar coluna <strong>data_admissao DATE</strong> na tabela Agentes.`,
    hint:`Use o comando que modifica uma tabela existente para acrescentar um novo campo.`,
    validate(sql){
        const ok = /^alter\s+table\s+agentes\s+add\s+(column\s+)?data_admissao\s+date\s*;?$/i.test(sql);
        if(!ok) return {ok:false, msg:"Use ALTER TABLE Agentes ADD COLUMN data_admissao DATE;"};
        if(!DB.tables.Agentes) return {ok:false, msg:"Crie a tabela Agentes primeiro (Fase 1)."};
        DB.tables.Agentes.schema.data_admissao = 'DATE';
        DB.tables.Agentes.rows.forEach(r=>{ if(r.data_admissao===undefined) r.data_admissao = null; });
        return {ok:true, msg:"Coluna adicionada."};
    }
    },
    {
    id:3,
    title:"A Limpeza dos Arquivos (DDL — DROP TABLE)",
    story:`Um arquivo comprometido foi detectado. Remova a tabela <code>Arquivos_Comprometidos</code>.`,
    objective:`Remover a tabela <strong>Arquivos_Comprometidos</strong>.`,
    hint:`Esse comando elimina completamente a estrutura, como se você apagasse uma pasta inteira.`,
    validate(sql){
        const ok = /^drop\s+table\s+arquivos_comprometidos\s*;?$/i.test(sql);
        if(!ok) return {ok:false, msg:"Use DROP TABLE Arquivos_Comprometidos;"};
        delete DB.tables.Arquivos_Comprometidos;
        return {ok:true, msg:"Tabela removida do sistema."};
    }
    },
    {
    id:4,
    title:"O Recrutamento (DML — INSERT)",
    story:`Você precisa cadastrar um novo agente com identidade temporária para uma missão encoberta.`,
    objective:`Inserir agente <strong>João Silva</strong>, nível <strong>3</strong>, data <strong>2025-08-27</strong>.`,
    hint:`Pense em como adicionar uma nova linha em uma tabela já existente, listando valores para cada coluna.`,
    validate(sql){
        if(!DB.tables.Agentes) return {ok:false, msg:"Crie a tabela Agentes primeiro."};
        // Aceita duas formas: com lista de colunas ou sem
        let m = sql.match(/^insert\s+into\s+agentes\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)\s*;?$/i);
        if(m){
        const cols = m[1].split(',').map(s=>s.trim().toLowerCase());
        const vals = splitValues(m[2]);
        const rec = {};
        cols.forEach((c,i)=>{ rec[c]=stripQuotes(vals[i]); });
        // normaliza tipos
        if(rec.nivel!==undefined) rec.nivel = Number(rec.nivel);
        if(rec.id!==undefined) rec.id = Number(rec.id);
        DB.tables.Agentes.rows.push({ id: rec.id??(DB.tables.Agentes.rows.length+1), nome: rec.nome??null, nivel: rec.nivel??null, data_admissao: rec.data_admissao??null });
        return {ok:true, msg:"Agente inserido (colunas explícitas)"};
        }
        // Sem colunas, assume ordem: id, nome, nivel, data_admissao
        m = sql.match(/^insert\s+into\s+agentes\s*values\s*\(([^)]+)\)\s*;?$/i);
        if(m){
        const vals = splitValues(m[1]);
        const rec = { id: numOrNull(vals[0]), nome: stripQuotes(vals[1]), nivel: numOrNull(vals[2]), data_admissao: stripQuotes(vals[3]) };
        DB.tables.Agentes.rows.push(rec);
        return {ok:true, msg:"Agente inserido"};
        }
        return {ok:false, msg:"Use INSERT INTO Agentes ... VALUES (...);"};
    }
    },
    {
    id:5,
    title:"A Espionagem (DML — UPDATE)",
    story:`O agente precisa mudar o codinome para despistar a vigilância.`,
    objective:`Atualizar nome de <strong>João Silva</strong> para <strong>Agente Fantasma</strong>.`,
    hint:`Esse comando altera informações de registros já existentes. Use uma condição para escolher qual linha deve ser modificada.`,
    validate(sql){
        const m = sql.match(/^update\s+agentes\s+set\s+nome\s*=\s*'([^']+)'\s+where\s+nome\s*=\s*'([^']+)'\s*;?$/i);
        if(!m) return {ok:false, msg:"Use UPDATE Agentes SET nome='Agente Fantasma' WHERE nome='João Silva';"};
        const novo = m[1]; const antigo = m[2];
        let changed = 0;
        (DB.tables.Agentes?.rows||[]).forEach(r=>{ if(String(r.nome)===antigo){ r.nome = novo; changed++; }});
        return changed? {ok:true, msg:`${changed} registro(s) atualizado(s).`} : {ok:false, msg:"Nenhum agente 'João Silva' encontrado."};
    }
    },
    {
    id:6,
    title:"A Traição (DML — DELETE)",
    story:`Identificamos um traidor! Remova imediatamente o registro perigoso.`,
    objective:`Excluir o agente com nome <strong>Agente Fantasma</strong>.`,
    hint:`Esse comando apaga registros de uma tabela. Use junto de uma condição para remover apenas o alvo certo.`,
    validate(sql){
        const m = sql.match(/^delete\s+from\s+agentes\s+where\s+nome\s*=\s*'([^']+)'\s*;?$/i);
        if(!m) return {ok:false, msg:"Use DELETE FROM Agentes WHERE nome='Agente Fantasma';"};
        const alvo = m[1];
        const before = (DB.tables.Agentes?.rows||[]).length;
        DB.tables.Agentes.rows = DB.tables.Agentes.rows.filter(r=> String(r.nome)!==alvo);
        const after = DB.tables.Agentes.rows.length;
        const removed = before-after;
        return removed? {ok:true, msg:`${removed} registro(s) excluído(s).`} : {ok:false, msg:"Nenhum registro com esse nome."};
    }
    },
    {
    id:7,
    title:"A Lista Secreta (DQL — SELECT + WHERE)",
    story:`O ministro solicitou a relação de agentes com nível acima de 2 para uma operação noturna.`,
    objective:`Selecionar todos os agentes com <strong>nivel &gt; 2</strong>.`,
    hint:`É o comando mais usado para consultar registros, mas aqui você deve acrescentar um filtro condicional.`,
    validate(sql){
        const m = sql.match(/^select\s+\*\s+from\s+agentes\s+where\s+nivel\s*>\s*(\d+)\s*;?$/i);
        if(!m) return {ok:false, msg:"Use SELECT * FROM Agentes WHERE nivel > 2;"};
        const n = Number(m[1]);
        const rows = (DB.tables.Agentes?.rows||[]).filter(r => Number(r.nivel)>n);
        const html = renderRows(['id','nome','nivel','data_admissao'], rows);
        return {ok:true, msg:"Consulta realizada:", table: html };
    }
    },
    {
    id:8,
    title:"A Vigilância (DQL — ORDER BY)",
    story:`Organize a lista de vigilância em ordem alfabética para a reunião do conselho.`,
    objective:`Selecionar <code>nome, nivel</code> e ordenar por <code>nome</code>.`,
    hint:`Após selecionar as colunas desejadas, use a cláusula que organiza o resultado em ordem.`,
    validate(sql){
        const m = sql.match(/^select\s+nome\s*,\s*nivel\s+from\s+agentes\s+order\s+by\s+nome\s*;?$/i);
        if(!m) return {ok:false, msg:"Use SELECT nome, nivel FROM Agentes ORDER BY nome;"};
        const rows = [...(DB.tables.Agentes?.rows||[])].sort((a,b)=> String(a.nome).localeCompare(String(b.nome)) ).map(r=>({nome:r.nome, nivel:r.nivel}));
        const html = renderRows(['nome','nivel'], rows);
        return {ok:true, msg:"Lista ordenada:", table: html };
    }
    },
    {
    id:9,
    title:"A Sala Restrita (DQL — LIMIT)",
    story:`A sala restrita comporta no máximo três agentes por vez. Liste os primeiros a entrar.`,
    objective:`Selecionar os <strong>3 primeiros</strong> registros.`,
    hint:`Esse comando mostra apenas uma parte do resultado, útil quando não precisamos de todas as linhas.`,
    validate(sql){
        const m = sql.match(/^select\s+\*\s+from\s+agentes\s+limit\s+(\d+)\s*;?$/i);
        if(!m) return {ok:false, msg:"Use SELECT * FROM Agentes LIMIT 3;"};
        const n = Math.min(Number(m[1]), 999);
        const rows = (DB.tables.Agentes?.rows||[]).slice(0,n);
        const html = renderRows(['id','nome','nivel','data_admissao'], rows);
        return {ok:true, msg:"Resultados limitados:", table: html };
    }
    },
    {
    id:10,
    title:"Missão Final (DDL + DML + DQL)",
    story:`O banco foi invadido! Você precisa: (1) criar a tabela <code>Missoes</code> com <code>id INT, titulo VARCHAR(50)</code>,
            (2) inserir a missão <em>Operação Final</em>, e (3) consultar todas as missões para auditoria. Execute em três passos.`,
    objective:`Passo ${'${'}subStep+1${'}'} de 3: <strong>CREATE</strong> → <strong>INSERT</strong> → <strong>SELECT</strong>.`,
    hint:`Reflita nos três tipos de operações que você praticou: primeiro criar a estrutura, depois adicionar um dado e por fim consultá-lo.`,
    validate(sql){
        // subStep 0 -> CREATE
        if(subStep===0){
        const ok = /^create\s+table\s+missoes\s*\(\s*id\s+int\s*,\s*titulo\s+varchar\s*\(\s*\d+\s*\)\s*\)\s*;?$/i.test(sql);
        if(!ok) return {ok:false, msg:"Crie a tabela Missoes com id INT, titulo VARCHAR(50)."};
        DB.tables.Missoes = { schema:{ id:'INT', titulo:'VARCHAR(50)' }, rows: [] };
        subStep = 1; save();
        return {ok:true, msg:"Tabela Missoes criada. Agora faça o INSERT (passo 2)."};
        }
        // subStep 1 -> INSERT
        if(subStep===1){
        const m1 = sql.match(/^insert\s+into\s+missoes\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)\s*;?$/i);
        const m2 = sql.match(/^insert\s+into\s+missoes\s*values\s*\(([^)]+)\)\s*;?$/i);
        if(!m1 && !m2) return {ok:false, msg:"Insira 1 registro na tabela Missoes."};
        let rec;
        if(m1){
            const cols = m1[1].split(',').map(s=>s.trim().toLowerCase());
            const vals = splitValues(m1[2]);
            rec = {}; cols.forEach((c,i)=> rec[c]=stripQuotes(vals[i]) );
            rec.id = Number(rec.id); rec.titulo = String(rec.titulo);
        } else {
            const vals = splitValues(m2[1]);
            rec = { id: Number(vals[0]), titulo: stripQuotes(vals[1]) };
        }
        DB.tables.Missoes.rows.push(rec);
        subStep = 2; save();
        return {ok:true, msg:"Missão inserida. Agora faça o SELECT (passo 3)."};
        }
        // subStep 2 -> SELECT
        if(subStep===2){
        const ok = /^select\s+\*\s+from\s+missoes\s*;?$/i.test(sql);
        if(!ok) return {ok:false, msg:"Finalize com SELECT * FROM Missoes;"};
        const rows = DB.tables.Missoes.rows;
        const html = renderRows(['id','titulo'], rows);
        // concluído
        return {ok:true, msg:"Auditoria concluída. Parabéns, agente!", table: html, done:true };
        }
        return {ok:false, msg:"Siga a ordem: CREATE → INSERT → SELECT."};
    }
    },
    {
        id:11,
        title:"Novo Capítulo — Identidade Única",
        story:`Agora o Ministério precisa identificar agentes sem repetir nomes.`,
        objective:`Use SELECT com <strong>DISTINCT</strong> para listar nomes únicos da tabela Agentes.`,
        hint:`DISTINCT remove valores duplicados, mostrando apenas um de cada.`,
    },
    {
        id:12,
        title:"Codinomes Oficiais",
        story:`Para a nova missão, os relatórios precisam exibir colunas com nomes mais amigáveis.`,
        objective:`Selecionar nome e nivel, renomeando nivel para <strong>classificacao</strong> com AS.`,
        hint:`Use AS para dar um apelido temporário a uma coluna.`,
    },
    {
        id:13,
        title:"Os Mais Fortes Primeiro",
        story:`O Conselho quer ver primeiro os agentes de nível mais alto.`,
        objective:`Selecionar nome e nivel e ordenar por nivel de forma decrescente.`,
        hint:`Adicione a palavra que inverte a ordem padrão no ORDER BY.`,
    },
    {
        id:14,
        title:"O Revezamento",
        story:`A operação só comporta 2 agentes por turno, mas precisamos começar da segunda dupla.`,
        objective:`Selecionar 2 agentes pulando os 2 primeiros.`,
        hint:`Use LIMIT junto de OFFSET para pular registros iniciais.`,
    },
    {
        id:15,
        title:"Triagem Avançada",
        story:`O ministro quer ver apenas agentes nível 2 OU com nome 'Ana'.`,
        objective:`Selecionar agentes usando operadores lógicos.`,
        hint:`Combine condições com AND, OR ou NOT.`,
    },
    {
        id:16,
        title:"Caça ao Traidor",
        story:`Localize agentes cujo nível NÃO seja 3.`,
        objective:`Selecionar todos os agentes onde nivel diferente de 3.`,
        hint:`Use o operador de desigualdade (!= ou <>).`,
    },
    {
        id:17,
        title:"Registros Misteriosos",
        story:`Alguns agentes ainda não têm data de admissão registrada.`,
        objective:`Selecionar agentes com data_admissao nula.`,
        hint:`Verifique valores nulos com IS NULL ou IS NOT NULL.`,
    },
    {
        id:18,
        title:"Agentes Selecionados",
        story:`O Conselho pediu os agentes cujos nomes estão em uma lista: João, Maria ou Ana.`,
        objective:`Selecionar apenas esses nomes específicos.`,
        hint:`Use IN para verificar se um valor está dentro de uma lista.`,
    },
    {
        id:19,
        title:"Níveis Futuros",
        story:`Queremos prever a progressão: mostre o nível atual e o nível futuro (nivel+1).`,
        objective:`Selecionar nome, nivel e nivel+1 como proximo_nivel.`,
        hint:`Você pode fazer operações aritméticas diretamente no SELECT.`,
    },
    {
        id:20,
        title:"Identidade Completa",
        story:`Precisamos juntar nome e nivel em uma única coluna de apresentação.`,
        objective:`Concatenar nome e nivel em uma string.`,
        hint:`Combine colunas em uma só com CONCAT ou usando ||.`,
    }
];

function renderRows(headers, rows){
    const thead = '<tr>'+headers.map(h=>`<th>${h}</th>`).join('')+'</tr>';
    const tbody = rows.length ? rows.map(r=>'\n<tr>'+headers.map(h=>`<td>${safe(r[h])}</td>`).join('')+'</tr>').join('') : '<tr><td colspan="999" style="color:#94a3b8">(sem resultados)</td></tr>';
    return `<table>${thead}${tbody}</table>`;
}

function splitValues(s){
    // divide valores respeitando strings entre aspas simples
    const out=[]; let buf=''; let q=false;
    for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(ch==="'" ) { q=!q; buf+=ch; }
    else if(ch==="," && !q){ out.push(buf.trim()); buf=''; }
    else buf+=ch;
    }
    if(buf.trim()!=='') out.push(buf.trim());
    return out;
}
const stripQuotes = v => (v||'').trim().replace(/^'(.*)'$/,'$1');
const numOrNull = v => { const n = Number((v||'').replace(/'/g,'')); return isNaN(n)? null : n };

// ===== UI Lógica =====
function setPhase(p){
    const data = phases.find(f=>f.id===p);
    if(!data) return;
    el('phaseBadge').textContent = `Fase ${p} de 20`;
    el('phaseTitle').textContent = data.title;
    el('phaseNow').textContent = p;
    el('storyText').innerHTML = `<p>${data.story}</p>`;
    el('objective').innerHTML = `<strong>Objetivo:</strong> ${data.objective}`;
    // Atualiza barra
    el('bar').style.width = Math.round(((p-1)/10)*100) + '%';
    // Dica (atualiza conteúdo dinâmico da fase 10)
    if(p===10){
    // re-render hints & objective com subStep atual
    const d = phases[9];
    el('objective').innerHTML = `<strong>Objetivo:</strong> Passo ${subStep+1} de 3 — <em>CREATE → INSERT → SELECT</em>`;
    }
    renderDB();
    save();
}

function showOutput(html){
    const out = el('output');
    out.innerHTML = html;
}

function success(msg, tableHtml){
    const stamp = `<span class="stamp">MISSÃO CUMPRIDA</span>`;
    const extra = tableHtml? `<div style="margin-top:8px">${tableHtml}</div>`:'';
    showOutput(`${stamp}<div style="margin-top:8px; color:#a7f3d0">${msg}</div>${extra}`);
    throwConfetti();
}

function error(msg){
    const o = el('output');
    o.classList.remove('shake');
    void o.offsetWidth; // reflow
    o.classList.add('shake');
    showOutput(`<div style="color:var(--danger); font-weight:700">ALERTA DO MINISTÉRIO</div><div style="color:#fecaca; margin-top:6px">${safe(msg)}</div>`);
}

function advance(){
    if(phase<20){
    phase++; subStep=0; setPhase(phase);
    } else {
    // fim do jogo
    el('bar').style.width = '100%';
    const finale = `<div style="padding:12px; background:rgba(34,197,94,.08); border:1px solid #14532d; border-radius:12px; margin-top:10px">
        <strong>Parabéns, Agente!</strong>
        <p>Você concluiu a Operação SQL. Continue praticando e mantendo os dados do Ministério seguros.</p>
    </div>`;
    showOutput(finale);
    throwConfetti();
    }
}

// ===== Execução =====
function runSQL(){
    const raw = el('sqlInput').value;
    const n = normalize(raw);
    if(!n){ error('Digite um comando SQL.'); return; }
    if(banned.test(n)) { error('Comandos avançados detectados. Mantenha-se no escopo desta revisão.'); return; }
    const data = phases.find(f=>f.id===phase);
    try{
    const r = data.validate(n);
    if(!r || !r.ok){ error(r?.msg || 'Comando inválido para esta fase.'); return; }
    renderDB();
    success(r.msg || 'OK', r.table);
    // Avança de fase automaticamente (a fase 10 só avança quando done=true)
    if(phase===20){
        if(r.done){ advance(); }
        else { setPhase(20); } // re-render objetivo
    } else {
        setTimeout(()=> advance(), 700);
    }
    save();
    }catch(e){
    console.error(e);
    error('O Ministério detectou inconsistência na sintaxe. Revise seu comando.');
    }
}

// ===== Dicas =====
el('btnHint').addEventListener('click', ()=>{
    const data = phases.find(f=>f.id===phase);
    showOutput(`<div style="color:#93c5fd"><strong>Dica:</strong> ${data.hint}</div>`);
});

// ===== Botões / atalhos =====
el('btnRun').addEventListener('click', runSQL);
document.addEventListener('keydown', (e)=>{
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='enter') runSQL();
});

el('btnReset').addEventListener('click', ()=>{
    if(!confirm('Reiniciar progresso e limpar o banco simulado?')) return;
    localStorage.removeItem(SAVE_KEY);
    location.reload();
});

/* Modo Professor: permite pular fase
el('btnSkip').addEventListener('click', ()=>{
    const code = prompt('Insira a credencial de Professor para pular fase');
    if(code && code.toUpperCase().trim()==='@Gomes0705'){
    if(phase<10){ phase++; subStep=0; setPhase(phase); showOutput('<div style="color:#a7f3d0">Fase pulada.</div>'); save(); }
    } else {
    error('Credencial inválida. Acesso negado.');
    }
});
*/
// ===== Inicialização =====
(function init(){
    load();
    setPhase(phase);
    renderDB();
    // Mensagem inicial
    showOutput('<div style="color:#cbd5e1">Bem-vindo, Agente. Revise os comandos SQL e avance nas fases. Use <strong>Ctrl+Enter</strong> para executar.</div>');
})();
