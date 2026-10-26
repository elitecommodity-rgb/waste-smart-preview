/* Waste Smart — static demo shim. Answers the app's api.php / feeds.php calls from a captured snapshot
   (45 days of simulated scale, meter and POS data). Nothing leaves the browser; edits live in memory only. */
(function(){
  const DEMO_PIN = 'demo123', DEMO_CODE = '123456';
  let snapP = null;
  const load = () => snapP || (snapP = fetch('demo/snapshot.json').then(r => r.json()).then(s => {
    const cap = new Date(s.captured + 'T12:00:00'), now = new Date(); now.setHours(12,0,0,0);
    s._shift = Math.round((now - cap) / 86400000);
    const sh = txt => s._shift ? txt.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m,y,mo,d) => {
      const dt = new Date(+y, +mo-1, +d, 12); dt.setDate(dt.getDate() + s._shift);
      return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
    }) : txt;
    s._sh = sh;
    s.feeds = JSON.parse(sh(JSON.stringify(s.feeds)));
    s.data = JSON.parse(sh(JSON.stringify(s.data)));
    // keep "last seen" times fresh so devices read as live
    const nowUtc = new Date().toISOString().slice(0,19).replace('T',' ');
    (s.feeds.device_list.devices || []).forEach(d => { if (d.enabled) { d.lastSeen = nowUtc; d.health = 'live'; } });
    return s;
  }));
  try {
    if (location.hash === '#demo') { localStorage.removeItem('ws_auth_token'); localStorage.removeItem('ws_auth_site'); } else {
    localStorage.setItem('ws_auth_token', 'demo');
    localStorage.setItem('ws_auth_site', JSON.stringify({ id:1, name:'Harbour Street Kitchen', type:'Independent Restaurant', currency:'R' })); }
  } catch(e){}
  const json = (o, code) => new Response(JSON.stringify(o), { status: code || 200, headers: { 'Content-Type':'application/json' } });
  const realFetch = window.fetch.bind(window);
  window.fetch = async function(url, opts){
    const u = String(url);
    if (!/(api|feeds|master)\.php/.test(u)) return realFetch(url, opts);
    const body = opts && opts.body ? JSON.parse(opts.body) : {};
    const a = body.action;
    if (/master\.php/.test(u)) {   // sign-up, code, login and reset are answered locally; nothing is sent or stored
      if (a === 'site_login') return (body.password === DEMO_PIN) ? json({ ok:true, token:'demo', role:'admin', demo:{ endsAt:null, daysLeft:14 }, site:{ id:1, name:'Harbour Street Kitchen', type:'Independent Restaurant', currency:'R' } }) : json({ error:'The email or password is not right. In this demo the password is ' + DEMO_PIN + '.' }, 401);
      if (a === 'signup') return json({ ok:true, pending:true, plan: body.plan === 'demo' ? 'demo' : 'paid', message: body.plan === 'demo' ? 'Demo: your request would now go to Gilded Age for review, and a 6 digit verification code is emailed when it is approved. In this preview the code is ' + DEMO_CODE + '.' : 'Demo: your account would now be created and the payment details emailed. When Gilded Age confirms payment, a verification code is emailed. In this preview the code is ' + DEMO_CODE + '.' });
      if (a === 'verify_code') return String(body.code) === DEMO_CODE ? json({ ok:true, plan:'demo', demoDays:14, message:'Your demo is open for 14 days. In this preview log in with any email and the password ' + DEMO_PIN + '.' }) : json({ error:'That code is not right. In this demo it is ' + DEMO_CODE + '.' }, 422);
      if (a === 'site_password_change') return json({ ok:true });
      return json({ ok:true, message:'Demo: a reset link would be emailed to you.' });
    }
    const S = await load();
    if (/api\.php/.test(u)) {
      if (a === 'verify_pin') return body.pin === DEMO_PIN ? json({ ok:true, role:'admin' }) : json({ error:'Incorrect password. In this demo the password is ' + DEMO_PIN + '.' }, 401);
      if (a === 'get') { const v = S.data[body.key]; return json({ value: v == null ? null : JSON.stringify(v) }); }
      if (a === 'set') { S.data[body.key] = typeof body.value === 'string' ? (function(){ try { return JSON.parse(body.value); } catch(e){ return body.value; } })() : body.value; return json({ ok:true }); }
      if (a === 'login' || a === 'register') return json({ token:'demo', site:{ id:1, name:'Harbour Street Kitchen', type:'Independent Restaurant', currency:'R' } });
      return json({ ok:true });
    }
    const F = S.feeds;
    switch (a) {
      case 'device_list': return json(F.device_list);
      case 'feed_days': return json(F.feed_days);
      case 'hourly': return json(F.hourly);
      case 'pos_ops': return json(F.pos_ops);
      case 'adapters': return json(F.adapters);
      case 'bi_tokens': return json(F.bi_tokens);
      case 'log': return json(F.log);
      case 'settings_get': return json({ settings: F.device_list.settings });
      case 'device_save': return json({ ok:true, device: Object.assign({ id:99, uid:'d_demo', health:'never' }, body), credentials:{ deviceId:'d_demo000001', apiKey:'wsd_DEMO_ONLY_NOT_A_REAL_KEY', hmacSecret:'demo-secret', note:'Demo only. Nothing was created.' } });
      case 'device_rotate_key': return json({ ok:true, credentials:{ deviceId:'d_demo000001', apiKey:'wsd_DEMO_ONLY_NOT_A_REAL_KEY', hmacSecret:'demo-secret' } });
      case 'bi_token_create': return json({ ok:true, token:'wsbi_DEMO_ONLY_NOT_A_REAL_TOKEN', note:'Demo only.' });
      case 'recent': return json({ rows:[] });
      case 'mapping_test': return json({ ok:true, mapped:[], normalised:[], errors:['Demo: mapping tests run on the live service.'], recordCount:0 });
      default: return json({ ok:true });
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.createElement('div');
    b.style.cssText = 'position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:99999;background:#14181f;color:#f4e7b8;font:600 12px system-ui,sans-serif;padding:7px 14px;border-radius:999px;box-shadow:0 4px 18px rgba(0,0,0,.35);letter-spacing:.02em';
    b.innerHTML = 'DEMO &middot; sample data &middot; password <b>demo123</b> &middot; <a href="master.html" style="color:#ffd76a">Gilded Age master admin &rarr;</a> &middot; <a href="group.html" style="color:#ffd76a">Group admin &rarr;</a>';
    document.body.appendChild(b);
  });
})();
