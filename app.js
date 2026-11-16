/* ===== Multiply Mania — multiples of 10 ===== */
(() => {
  'use strict';

  /* ---------- question banks ---------- */
  const PRACTICE = [
    [2,30],[4,20],[5,10],[3,40],[6,50],[7,20],[8,30],[9,10],[4,60],[5,70],
    [3,80],[6,40],[2,90],[7,30],[8,20],[9,50],[4,50],[6,60],[8,40],[7,70]
  ].map(([a,b]) => ({
    kind:'numeric', a, b, answer:a*b,
    hint:`Think ${a} × ${b/10} = ${a*(b/10)} first, then add a zero.`
  }));

  const CHALLENGE = [
    { kind:'numeric', word:'A box holds <b>40 pencils</b>. How many pencils are in <b>7 boxes</b>?',
      answer:280, hint:'Multiply 7 × 40. That’s 7 × 4 = 28, then add one zero.' },
    { kind:'numeric', word:'Find the missing number:<br><span class="big-num">6 × ▢ = 420</span>',
      answer:70, hint:'42 ÷ 6 = 7, then add one zero → the missing number.' },
    { kind:'numeric', word:'Mia reads <b>30 pages</b> each day for <b>5 days</b>, then <b>20 more</b> pages. How many pages in all?',
      answer:170, hint:'First 30 × 5 = 150. Then add the extra 20 pages.' },
    { kind:'numeric', word:'Watch the pattern grow!<br><span class="big-num">3 × 200 = ?</span>',
      answer:600, hint:'3 × 2 = 6, then add two zeros for 200.' },
    { kind:'choice', word:'Which is greater?',
      options:['8 × 40','6 × 50'], answerIndex:0,
      hint:'Solve both: 8 × 40 = 320 and 6 × 50 = 300.' }
  ];

  /* ---------- state ---------- */
  const state = {
    mode:'all', queue:[], index:0, score:0, streak:0,
    input:'', locked:false, modeTotal:0
  };

  /* ---------- element refs ---------- */
  const $ = id => document.getElementById(id);
  const els = {
    screens:{ start:$('screen-start'), play:$('screen-play'), results:$('screen-results') },
    bestScore:$('best-score'), soundBtn:$('btn-sound'), startBtn:$('btn-start'),
    score:$('score'), streak:$('streak'), progressLabel:$('progress-label'), progressFill:$('progress-fill'),
    card:$('question-card'), qIndex:$('q-index'), qText:$('q-text'), answer:$('answer-display'),
    feedback:$('feedback'), pad:$('pad'), choiceArea:$('choice-area'),
    hintBtn:$('btn-hint'), submitBtn:$('btn-submit'), nextBtn:$('btn-next'), quitBtn:$('btn-quit'),
    resultsMascot:$('results-mascot'), resultsTitle:$('results-title'),
    resultsScore:$('results-score'), resultsTotal:$('results-total'), resultsStars:$('results-stars'),
    resultsMsg:$('results-msg'), againBtn:$('btn-again'), homeBtn:$('btn-home')
  };

  /* ---------- sound (Web Audio, no files) ---------- */
  let audioCtx = null;
  let soundOn = localStorage.getItem('mm_sound') !== 'off';
  const audio = () => (audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)());
  function tone(freq, start, dur, type='sine', vol=0.18){
    if(!soundOn) return;
    try{
      const ctx = audio(); const t = ctx.currentTime + start;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(ctx.destination); osc.start(t); osc.stop(t + dur + 0.02);
    }catch(e){}
  }
  const sfx = {
    click:()=>tone(520,0,0.06,'triangle',0.1),
    right:()=>{ [523,659,784,1047].forEach((f,i)=>tone(f, i*0.09, 0.22,'sine',0.2)); },
    wrong:()=>{ tone(200,0,0.28,'sawtooth',0.14); },
    win:()=>{ [523,659,784,1047,1319].forEach((f,i)=>tone(f, i*0.12, 0.4,'triangle',0.18)); }
  };

  /* ---------- confetti ---------- */
  const cvs = $('confetti'), ctx2 = cvs.getContext('2d');
  let particles = [], rafId = null;
  const COLORS = ['#ffd60a','#ff5d8f','#2575fc','#38b000','#ff9f1c','#9d4edd','#00e5ff'];
  function sizeCanvas(){ cvs.width = innerWidth; cvs.height = innerHeight; }
  addEventListener('resize', sizeCanvas); sizeCanvas();
  function burst(x = innerWidth/2, y = innerHeight*0.32){
    for(let i=0;i<90;i++){
      const ang = Math.random()*Math.PI*2, sp = 4 + Math.random()*9;
      particles.push({ x, y, vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp - 4,
        size:6+Math.random()*8, color:COLORS[(Math.random()*COLORS.length)|0],
        rot:Math.random()*6.28, vr:(Math.random()-0.5)*0.4, life:1 });
    }
    if(!rafId) rafId = requestAnimationFrame(loop);
  }
  function loop(){
    ctx2.clearRect(0,0,cvs.width,cvs.height);
    particles.forEach(p => {
      p.vy += 0.28; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.008;
      ctx2.save(); ctx2.globalAlpha = Math.max(0, p.life);
      ctx2.translate(p.x, p.y); ctx2.rotate(p.rot);
      ctx2.fillStyle = p.color; ctx2.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
      ctx2.restore();
    });
    particles = particles.filter(p => p.life > 0 && p.y < cvs.height + 60);
    if(particles.length) rafId = requestAnimationFrame(loop);
    else { rafId = null; ctx2.clearRect(0,0,cvs.width,cvs.height); }
  }

  /* ---------- background bubbles ---------- */
  (function bubbles(){
    const wrap = document.createElement('div'); wrap.className = 'bg-bubbles';
    for(let i=0;i<12;i++){
      const b = document.createElement('i'); const s = 24 + Math.random()*90;
      b.style.width = b.style.height = s + 'px';
      b.style.left = Math.random()*100 + '%';
      b.style.animationDuration = (9 + Math.random()*11) + 's';
      b.style.animationDelay = (-Math.random()*18) + 's';
      wrap.appendChild(b);
    }
    document.body.prepend(wrap);
  })();

  /* ---------- helpers ---------- */
  function show(name){
    Object.values(els.screens).forEach(s => s.classList.remove('active'));
    els.screens[name].classList.add('active');
    window.scrollTo({ top:0, behavior:'smooth' });
  }
  const starsFor = pct => pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;

  /* ---------- start screen ---------- */
  function refreshBest(){ els.bestScore.textContent = (localStorage.getItem('mm_best') || 0) + '%'; }
  refreshBest();
  els.soundBtn.textContent = soundOn ? '🔊 Sound: On' : '🔇 Sound: Off';
  els.soundBtn.addEventListener('click', () => {
    soundOn = !soundOn; localStorage.setItem('mm_sound', soundOn ? 'on' : 'off');
    els.soundBtn.textContent = soundOn ? '🔊 Sound: On' : '🔇 Sound: Off';
    if(soundOn) sfx.click();
  });
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active'); state.mode = card.dataset.mode; sfx.click();
    });
  });
  els.startBtn.addEventListener('click', startGame);
  els.againBtn.addEventListener('click', startGame);
  els.homeBtn.addEventListener('click', () => show('start'));
  els.quitBtn.addEventListener('click', () => show('start'));

  /* ---------- game flow ---------- */
  function startGame(){
    const base = state.mode === 'challenge' ? CHALLENGE
      : state.mode === 'practice' ? PRACTICE
      : PRACTICE.concat(CHALLENGE);
    state.queue = base.slice();
    state.index = 0; state.score = 0; state.streak = 0; state.modeTotal = base.length;
    els.score.textContent = '0'; els.streak.textContent = '0';
    show('play'); renderQuestion();
  }

  function renderQuestion(){
    const q = state.queue[state.index];
    state.input = ''; state.locked = false;
    els.card.classList.remove('correct','wrong');
    els.feedback.textContent = ''; els.feedback.className = 'feedback';
    els.qIndex.textContent = `Question ${state.index + 1}`;
    els.progressLabel.textContent = `${state.index + 1} / ${state.modeTotal}`;
    els.progressFill.style.width = (state.index / state.modeTotal * 100) + '%';

    const isWord = q.word && q.kind === 'numeric';
    els.qText.className = isWord ? 'q-word' : 'q-text';
    els.qText.innerHTML = q.word ? q.word
      : `<span class="big-num">${q.a} × ${q.b}</span> = ?`;

    const numeric = q.kind === 'numeric';
    els.pad.hidden = !numeric;
    els.choiceArea.hidden = numeric;
    els.answer.hidden = !numeric;
    els.submitBtn.hidden = !numeric;   // choice questions settle on tap
    els.nextBtn.hidden = true;
    els.hintBtn.hidden = false;
    els.submitBtn.disabled = true;

    if(numeric){
      renderInput();
      els.choiceArea.innerHTML = '';
    } else {
      els.answer.innerHTML = '';
      els.choiceArea.innerHTML = '';
      q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.textContent = opt;
        btn.addEventListener('click', () => chooseOption(btn, i));
        els.choiceArea.appendChild(btn);
      });
    }
  }

  function renderInput(){
    const el = els.answer;
    if(state.input === ''){ el.innerHTML = '<span class="placeholder">?</span>'; }
    else { el.innerHTML = `${state.input}<span class="caret">|</span>`; }
    els.submitBtn.disabled = state.input === '' || state.locked;
  }

  /* ---------- input ---------- */
  els.pad.addEventListener('click', e => {
    const btn = e.target.closest('button'); if(!btn || state.locked) return;
    const k = btn.dataset.key; sfx.click();
    if(k === 'clear') state.input = '';
    else if(k === 'back') state.input = state.input.slice(0,-1);
    else if(state.input.length < 4) state.input += k;
    renderInput();
  });
  addEventListener('keydown', e => {
    if(!els.screens.play.classList.contains('active') || state.locked) return;
    const q = state.queue[state.index]; if(q.kind !== 'numeric') return;
    if(/^[0-9]$/.test(e.key)){ if(state.input.length<4) state.input += e.key; renderInput(); }
    else if(e.key === 'Backspace'){ state.input = state.input.slice(0,-1); renderInput(); }
    else if(e.key === 'Enter' && state.input !== ''){ checkNumeric(); }
  });
  els.submitBtn.addEventListener('click', checkNumeric);
  els.nextBtn.addEventListener('click', nextQuestion);
  els.hintBtn.addEventListener('click', () => {
    const q = state.queue[state.index];
    els.feedback.className = 'feedback ok';
    els.feedback.innerHTML = `💡 <span class="hintline">${q.hint}</span>`;
  });

  /* ---------- checking ---------- */
  function checkNumeric(){
    if(state.locked || state.input === '') return;
    const q = state.queue[state.index];
    const ok = parseInt(state.input, 10) === q.answer;
    settle(ok, ok ? '' : `The answer is <b>${q.answer}</b>. ${q.hint}`);
  }

  function chooseOption(btn, i){
    if(state.locked) return;
    const q = state.queue[state.index];
    const ok = i === q.answerIndex;
    els.choiceArea.querySelectorAll('button').forEach(b => b.disabled = true);
    btn.classList.add(ok ? 'chosen-right' : 'chosen-wrong');
    if(!ok){
      const right = els.choiceArea.querySelectorAll('button')[q.answerIndex];
      right.classList.add('chosen-right');
    }
    settle(ok, ok ? '' : `${q.hint} So <b>${q.options[q.answerIndex]}</b> is greater.`);
  }

  function settle(ok, explain){
    state.locked = true;
    els.submitBtn.hidden = true; els.nextBtn.hidden = false;
    els.submitBtn.disabled = true; els.hintBtn.hidden = true;
    if(ok){
      state.score++; state.streak++;
      els.score.textContent = state.score; els.streak.textContent = state.streak;
      els.card.classList.add('correct');
      els.feedback.className = 'feedback ok';
      const cheer = state.streak >= 5 ? ' 🔥 On fire!' : state.streak >= 3 ? ' 🔥 Streak!' : '';
      els.feedback.innerHTML = `✅ Correct! +1 ⭐${cheer}`;
      sfx.right(); burst(innerWidth/2, innerHeight*0.3);
    } else {
      state.streak = 0; els.streak.textContent = '0';
      els.card.classList.add('wrong');
      els.feedback.className = 'feedback no';
      els.feedback.innerHTML = `💪 Not quite.<span class="hintline">${explain}</span>`;
      sfx.wrong();
    }
  }

  function nextQuestion(){
    state.index++;
    if(state.index >= state.modeTotal){ finish(); return; }
    renderQuestion();
  }

  /* ---------- results ---------- */
  function finish(){
    const total = state.modeTotal, pct = Math.round(state.score / total * 100);
    els.resultsScore.textContent = state.score;
    els.resultsTotal.textContent = total;
    const s = starsFor(pct);
    els.resultsStars.textContent = '⭐'.repeat(s) + '☆'.repeat(3 - s);
    const names = ['Great effort!','Nice work!','Amazing!','Math champion!'];
    els.resultsTitle.textContent = names[s];
    els.resultsMascot.textContent = ['🐢','🙂','😃','🎉'][s];
    els.resultsMsg.textContent = pct === 100
      ? 'Perfect score — you’re a multiples-of-10 master! 🦊'
      : `You scored ${pct}%. Play again to earn more stars!`;
    const best = parseInt(localStorage.getItem('mm_best') || 0, 10);
    if(pct > best) localStorage.setItem('mm_best', pct);
    refreshBest();
    show('results');
    els.progressFill.style.width = '100%';
    sfx.win(); burst(); setTimeout(() => burst(innerWidth*0.3, innerHeight*0.3), 250);
    setTimeout(() => burst(innerWidth*0.7, innerHeight*0.3), 500);
  }
})();
