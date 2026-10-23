// SNK API: clientes, liberação de acesso, rastreadores e veículos. O Traccar recebe os dados dos aparelhos.
const express=require('express'),cors=require('cors'),jwt=require('jsonwebtoken'),bcrypt=require('bcryptjs'),Database=require('better-sqlite3'),fs=require('fs'),path=require('path');
const {JWT_SECRET,TRACCAR_URL='http://traccar:8082',TRACCAR_USER,TRACCAR_PASS,ADMIN_EMAIL,ADMIN_PASSWORD,PORT=5000,DB_PATH='/data/snk.db',ORIGIN='*'}=process.env;
if(!JWT_SECRET||JWT_SECRET.length<24)throw new Error('Defina JWT_SECRET com 24+ caracteres no .env');
fs.mkdirSync(path.dirname(DB_PATH),{recursive:true});
const db=new Database(DB_PATH);
db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,nome TEXT,tel TEXT,email TEXT UNIQUE,senha TEXT,role TEXT DEFAULT 'cliente',status TEXT DEFAULT 'pendente',criado TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS trackers(id INTEGER PRIMARY KEY,imei TEXT UNIQUE,chip TEXT,operadora TEXT,modelo TEXT,placa TEXT,veiculo TEXT,user_id INTEGER,traccar_id INTEGER,criado TEXT DEFAULT CURRENT_TIMESTAMP)`);
if(ADMIN_EMAIL&&ADMIN_PASSWORD&&!db.prepare('SELECT 1 FROM users WHERE email=?').get(ADMIN_EMAIL))
  db.prepare("INSERT INTO users(nome,email,senha,role,status) VALUES('Administrador',?,?,'admin','ativo')").run(ADMIN_EMAIL,bcrypt.hashSync(ADMIN_PASSWORD,10));

const basic='Basic '+Buffer.from(`${TRACCAR_USER}:${TRACCAR_PASS}`).toString('base64');
const tc=async(p,o={})=>{const r=await fetch(TRACCAR_URL+'/api'+p,{...o,headers:{Authorization:basic,'Content-Type':'application/json'}});
  if(!r.ok)throw new Error(`Servidor de rastreadores respondeu ${r.status}. Verifique o Traccar.`);return r.status===204?null:r.json()};
const app=express();app.use(cors({origin:ORIGIN}));app.use(express.json());
const wrap=f=>(q,s)=>f(q,s).catch(e=>{console.error(e);s.status(500).json({error:e.message})});
const need=role=>(q,s,n)=>{try{const t=jwt.verify((q.headers.authorization||'').slice(7),JWT_SECRET);
  const u=db.prepare('SELECT id,nome,role,status FROM users WHERE id=?').get(t.id);
  if(!u||u.status!=='ativo')return s.status(401).json({error:'Acesso não liberado.'});
  if(role&&u.role!==role)return s.status(403).json({error:'Sem permissão.'});q.user=u;n()}catch{s.status(401).json({error:'Sessão expirada. Entre novamente.'})}};

app.post('/auth/register',wrap(async(q,s)=>{const{nome,tel,email,senha}=q.body;
  if(!nome||!/^\S+@\S+\.\S+$/.test(email||'')||(senha||'').length<8)return s.status(400).json({error:'Preencha nome, e-mail válido e senha com 8+ caracteres.'});
  try{db.prepare('INSERT INTO users(nome,tel,email,senha) VALUES(?,?,?,?)').run(nome,tel,email.toLowerCase(),bcrypt.hashSync(senha,10));s.status(201).json({ok:true})}
  catch{s.status(409).json({error:'Este e-mail já está cadastrado.'})}}));
app.post('/auth/login',wrap(async(q,s)=>{const u=db.prepare('SELECT * FROM users WHERE email=?').get((q.body.email||'').toLowerCase());
  if(!u||!bcrypt.compareSync(q.body.senha||'',u.senha))return s.status(401).json({error:'E-mail ou senha incorretos.'});
  if(u.status==='pendente')return s.status(403).json({error:'Seu cadastro aguarda liberação do administrador.'});
  if(u.status!=='ativo')return s.status(403).json({error:'Acesso bloqueado. Fale com a SNK.'});
  s.json({token:jwt.sign({id:u.id},JWT_SECRET,{expiresIn:'12h'}),nome:u.nome,email:u.email,role:u.role})}));

app.get('/admin/clientes',need('admin'),wrap(async(q,s)=>s.json(db.prepare("SELECT id,nome,tel,email,status,criado FROM users WHERE role='cliente' ORDER BY status='pendente' DESC,id DESC").all())));
app.patch('/admin/clientes/:id',need('admin'),wrap(async(q,s)=>{if(!['ativo','bloqueado','pendente'].includes(q.body.status))return s.status(400).json({error:'Status inválido.'});
  db.prepare("UPDATE users SET status=? WHERE id=? AND role='cliente'").run(q.body.status,q.params.id);s.json({ok:true})}));
app.get('/admin/rastreadores',need('admin'),wrap(async(q,s)=>{const rows=db.prepare('SELECT t.*,u.nome cliente FROM trackers t LEFT JOIN users u ON u.id=t.user_id ORDER BY t.id DESC').all();
  const dv={};try{(await tc('/devices')).forEach(d=>dv[d.id]=d.status)}catch{}
  s.json(rows.map(r=>({...r,conexao:dv[r.traccar_id]||'desconhecido'})))}));
app.post('/admin/rastreadores',need('admin'),wrap(async(q,s)=>{const{imei,chip,operadora,modelo,placa,veiculo,user_id}=q.body;
  if(!/^[A-Za-z0-9]{5,20}$/.test(imei||''))return s.status(400).json({error:'IMEI/ID inválido (5 a 20 letras ou números).'});
  if(!placa||!user_id)return s.status(400).json({error:'Informe a placa e o cliente.'});
  if(db.prepare('SELECT 1 FROM trackers WHERE imei=?').get(imei))return s.status(409).json({error:'Este rastreador já está cadastrado.'});
  const d=await tc('/devices',{method:'POST',body:JSON.stringify({name:placa.toUpperCase(),uniqueId:imei})});
  try{db.prepare('INSERT INTO trackers(imei,chip,operadora,modelo,placa,veiculo,user_id,traccar_id) VALUES(?,?,?,?,?,?,?,?)').run(imei,chip,operadora,modelo,placa.toUpperCase(),veiculo,user_id,d.id)}
  catch(e){await tc('/devices/'+d.id,{method:'DELETE'});throw e}
  s.status(201).json({ok:true})}));
app.delete('/admin/rastreadores/:id',need('admin'),wrap(async(q,s)=>{const t=db.prepare('SELECT * FROM trackers WHERE id=?').get(q.params.id);
  if(t){try{await tc('/devices/'+t.traccar_id,{method:'DELETE'})}catch{}db.prepare('DELETE FROM trackers WHERE id=?').run(t.id)}s.json({ok:true})}));

app.get('/veiculos',need(),wrap(async(q,s)=>{const rows=q.user.role==='admin'?db.prepare('SELECT * FROM trackers').all():db.prepare('SELECT * FROM trackers WHERE user_id=?').all(q.user.id);
  if(!rows.length)return s.json([]);const pos={},dv={};(await tc('/positions')).forEach(p=>pos[p.deviceId]=p);(await tc('/devices')).forEach(d=>dv[d.id]=d);
  s.json(rows.map(t=>{const p=pos[t.traccar_id],d=dv[t.traccar_id],vel=p?Math.round(p.speed*1.852):0;
    return{id:t.id,placa:t.placa,modelo:t.veiculo||t.modelo||'Veículo',lat:p?p.latitude:null,lng:p?p.longitude:null,vel,st:!d||d.status!=='online'?'off':vel>2?'mov':'par',ign:p&&p.attributes?p.attributes.ignition?1:0:0}}))}));
app.post('/comandos',need(),wrap(async(q,s)=>{const t=db.prepare('SELECT * FROM trackers WHERE id=?').get(q.body.veiculo);
  if(!t||(q.user.role!=='admin'&&t.user_id!==q.user.id))return s.status(404).json({error:'Veículo não encontrado.'});
  if(!['bloquear','desbloquear'].includes(q.body.comando))return s.status(400).json({error:'Comando inválido.'});
  await tc('/commands/send',{method:'POST',body:JSON.stringify({deviceId:t.traccar_id,type:q.body.comando==='bloquear'?'engineStop':'engineResume',attributes:{}})});s.json({ok:true})}));
app.listen(PORT,()=>console.log('SNK API na porta '+PORT));
