const BIN = process.env.JSONBIN_BIN_ID;
const KEY = process.env.JSONBIN_ACCESS_KEY;
const BASE = `https://api.jsonbin.io/v3/b/${BIN}`;

function send(res, status, body){
  res.status(status).setHeader('Content-Type','application/json');
  res.end(JSON.stringify(body));
}

async function jsonbin(method, body){
  const r = await fetch(method === 'GET' ? `${BASE}/latest` : BASE, {
    method,
    headers: {
      'X-Access-Key': KEY,
      'Content-Type': 'application/json'
    },
    ...(body !== undefined ? {body: JSON.stringify(body)} : {})
  });
  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(j.message || j.error || `JSONBin error ${r.status}`);
  return j.record ?? j;
}

export default async function handler(req,res){
  if(!BIN || !KEY) return send(res,500,{error:'Environment JSONBin belum lengkap.'});

  try{
    if(req.method === 'GET') return send(res,200,await jsonbin('GET'));
    if(req.method !== 'PUT') return send(res,405,{error:'Method not allowed'});

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if(!body || !Array.isArray(body.lines)){
      return send(res,400,{error:'Format data harus { lines: [], lineMaster: [] }.'});
    }
    if(body.lines.length > 500) return send(res,400,{error:'Maksimal 500 data productivity.'});

    const lineMaster = Array.isArray(body.lineMaster)
      ? [...new Set(body.lineMaster.map(x=>String(x||'').trim()).filter(Boolean))].slice(0,100)
      : [...new Set(body.lines.map(x=>String(x?.line||'').trim()).filter(Boolean))].slice(0,100);

    for(const x of body.lines){
      if(!x || !x.id || !String(x.line||'').trim() || !String(x.date||'').trim() ||
        !(Number(x.minutes)>0) || !(Number(x.std)>0) || !(Number(x.actualCt)>0) || !(Number(x.qty)>=0)){
        return send(res,400,{error:'Ada data productivity yang tidak valid.'});
      }
    }

    return send(res,200,await jsonbin('PUT',{lines:body.lines,lineMaster}));
  }catch(e){
    return send(res,500,{error:e.message || 'Server error'});
  }
}
