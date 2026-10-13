// Theme (remembers choice; falls back gracefully)
const root = document.documentElement;
try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch (e) {}
document.getElementById('theme-toggle').setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  document.getElementById('theme-toggle').setAttribute('aria-pressed', String(next === 'dark'));
  try { localStorage.setItem('theme', next); } catch (e) {}
});

// Bottom bar: sliding indicator + scroll-spy
const links = [...document.querySelectorAll('.bottom-bar a')];
const ind = document.querySelector('.bar-indicator');
const sections = links.map(a => document.querySelector(a.getAttribute('href')));
function moveTo(a) {
  links.forEach(l => { l.classList.toggle('active', l === a); if (l === a) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
  ind.style.width = a.offsetWidth + 'px';
  ind.style.transform = `translateX(${a.offsetLeft}px)`;
}
function spy() {
  const y = window.scrollY + window.innerHeight * 0.35;
  let cur = 0;
  sections.forEach((s, i) => { if (s.offsetTop <= y) cur = i; });
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = sections.length - 1;
  if (!links[cur].classList.contains('active')) moveTo(links[cur]);
}
window.addEventListener('scroll', spy, { passive: true });
window.addEventListener('resize', () => { clearTimeout(window._barRT); window._barRT = setTimeout(() => moveTo(links.find(l => l.classList.contains('active')) || links[0]), 80); });
window.addEventListener('load', () => { moveTo(links[0]); spy(); });

// Image sliders (hero + gallery), 1.5s auto-change
document.querySelectorAll('.slider').forEach(sl => {
  const track = sl.querySelector('.slider-track');
  const n = track.children.length, dotsBox = sl.querySelector('.s-dots');
  const delay = +sl.dataset.interval || 1500;
  let i = 0, timer, x0 = null;
  for (let k = 0; k < n; k++) { const b = document.createElement('button'); b.setAttribute('aria-label', 'Slide ' + (k + 1)); b.onclick = () => go(k, true); dotsBox.appendChild(b); }
  function go(k, user) {
    i = (k + n) % n;
    track.style.transform = `translateX(-${i * 100}%)`;
    [...dotsBox.children].forEach((d, j) => { d.classList.toggle('on', j === i); d.setAttribute('aria-current', String(j === i)); });
    if (user) restart();
  }
  function restart() { clearInterval(timer); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => go(i + 1), delay); }
  sl.querySelector('.s-prev').onclick = () => go(i - 1, true);
  sl.querySelector('.s-next').onclick = () => go(i + 1, true);
  sl.addEventListener('mouseenter', () => clearInterval(timer));
  sl.addEventListener('mouseleave', restart);
  sl.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; clearInterval(timer); }, { passive: true });
  sl.addEventListener('touchend', e => { if (x0 !== null) { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1), true); else restart(); } x0 = null; });
  sl.tabIndex = 0;
  sl.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(i + 1, true); if (e.key === 'ArrowLeft') go(i - 1, true); });
  go(0); restart();
});

// Scroll reveal: direction-aware fade/slide in on scroll
(function () {
  if (!('IntersectionObserver' in window)) return;
  const items = document.querySelectorAll('.hero-text, .hero-image, .director-intro, .sec-title, .feature, .school-moments .grid > div, .staff-card, .more-moments, .picture-card, .contact-info-card, .Addmm, .cta-inner, .qa-dark, .qa-map, .mapcard');
  document.documentElement.classList.add('js-reveal');

  // reliable direction: updated on every scroll event, BEFORE IO fires
  let scrollDir = 'down';
  let prevY = window.scrollY;
  window.addEventListener('scroll', () => {
    const cur = window.scrollY;
    if (cur !== prevY) { scrollDir = cur > prevY ? 'down' : 'up'; prevY = cur; }
  }, { passive: true });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.remove('from-top');
        if (scrollDir === 'up') e.target.classList.add('from-top');
        e.target.classList.add('in');
      } else {
        // reset whenever it leaves the screen (top OR bottom) so it animates again next time it enters
        e.target.classList.remove('in', 'from-top');
      }
    });
  }, { threshold: 0.12 });

  items.forEach((el, k) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (k % 3) * 80 + 'ms';
    io.observe(el);
  });
})();

// Community (orbit + podium) and map sections: count-up numbers, growing columns, flip cards
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nums = document.querySelectorAll('.qa-num[data-n]');
  const finalText = el => (+el.dataset.n).toLocaleString('en-US') + (el.dataset.s || '');
  function count(el) {
    if (reduce) { el.textContent = finalText(el); return; }
    const n = +el.dataset.n, t0 = performance.now();
    (function f(t) {
      const p = Math.min((t - t0) / 1700, 1);
      el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))).toLocaleString('en-US') + (p >= 1 ? (el.dataset.s || '') : '');
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }
  nums.forEach(el => { el.textContent = finalText(el); });           // readable without animation

  if ('IntersectionObserver' in window && !reduce) {
    // orbit: count up once on first entry
    const orbitIO = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('on');
      e.target.querySelectorAll('.qa-num[data-n]').forEach(count);
      orbitIO.unobserve(e.target);
    }), { threshold: 0.2 });
    document.querySelectorAll('.qa-io').forEach(el => orbitIO.observe(el));

    // podium: re-animate columns & re-count every time it enters the viewport
    const podiumIO = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) {
        // 1. strip the class so CSS resets heights to 0 immediately
        e.target.classList.remove('on');
        // 2. force a reflow so the browser registers the height:0 state
        e.target.querySelectorAll('.qa-pc').forEach(col => void col.offsetHeight);
        // 3. re-add 'on' in the next frame so the CSS transition fires
        requestAnimationFrame(() => {
          requestAnimationFrame(() => e.target.classList.add('on'));
        });
        e.target.querySelectorAll('.qa-num[data-n]').forEach(count);
      } else {
        // reset when it leaves the viewport so next entry re-animates
        e.target.classList.remove('on');
      }
    }), { threshold: 0.15 });
    document.querySelectorAll('.qa-pwrap').forEach(el => podiumIO.observe(el));
  } else {
    document.querySelectorAll('.qa-io,.qa-pwrap').forEach(el => el.classList.add('on'));
  }

  // flip cards: tap/click or Enter/Space
  document.querySelectorAll('.qa-fx').forEach(c => {
    c.addEventListener('click', () => c.classList.toggle('f'));
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.classList.toggle('f'); } });
  });

  // hovering an orbit card highlights its column
  document.querySelectorAll('.qa-nd[data-i]').forEach(nd => {
    const col = () => document.querySelector('.qa-pc[data-i="' + nd.dataset.i + '"]');
    ['mouseenter', 'focusin'].forEach(ev => nd.addEventListener(ev, () => col() && col().classList.add('hi')));
    ['mouseleave', 'focusout'].forEach(ev => nd.addEventListener(ev, () => col() && col().classList.remove('hi')));
  });
})();
// Feedback prompt: shows once, 1 second after the visitor reaches the bottom of the page
(function () {
  const box = document.getElementById('rt-box'); if (!box) return;
  const KEY = 'alqalam_rating_prompt';
  let seen = false;
  try { seen = !!localStorage.getItem(KEY); } catch (e) {}
  if (seen) return;

  const body = document.getElementById('rt-body'), stars = document.getElementById('rt-stars'),
        label = document.getElementById('rt-label'), btns = [...stars.querySelectorAll('.rt-star')],
        tg = box.querySelector('.rt-tg');
  const words = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  const WA = 'https://wa.me/923429664557?text=';
  // Ratings are posted to Netlify Forms. Skipped on local previews and GitHub Pages, which cannot accept form posts (they answer 405).
  const host = location.hostname;
  const CAN_SEND = !(location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.github.io'));
  let armed = false, chosen = 0, sent = 0, reply = null, closeTimer, sendTimer, replyTimer;

  function toEnd() { body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' }); }
  function say(html) { const m = document.createElement('div'); m.className = 'rt-msg'; m.innerHTML = html; body.appendChild(m); toEnd(); return m; }
  function typing(ms, then) {
    const t = document.createElement('div'); t.className = 'rt-msg rt-typing'; t.innerHTML = '<i></i><i></i><i></i>'; body.appendChild(t); toEnd();
    setTimeout(() => { t.remove(); then(); }, ms);
  }
  function paint(n) { btns.forEach((b, i) => b.classList.toggle('on', i < n)); label.textContent = n ? words[n - 1] : ''; }
  function flush() {
    clearTimeout(sendTimer);
    if (!chosen || sent === chosen) return;
    sent = chosen;
    if (!CAN_SEND) return;
    try {
      fetch('/', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 'form-name': 'website-rating', rating: String(chosen), page: location.pathname }).toString() }).catch(() => {});
    } catch (e) {}
  }
  function close() { flush(); clearTimeout(closeTimer); box.classList.remove('show'); setTimeout(() => { box.hidden = true; }, 600); }

  function open() {
    if (armed) return; armed = true;
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    box.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('show')));
    typing(900, () => {
      say('Thank you for visiting <b>Al-Qalam School &amp; College</b>.');
      typing(900, () => {
        say('We would be grateful if you could rate your experience of our website.');
        stars.hidden = false; toEnd();
      });
    });
  }

  // The rating can be changed freely; only the final choice is sent (2.5 s after the last click, or when the box closes).
  function choose(n) {
    chosen = n; paint(n);
    btns.forEach((b, i) => b.setAttribute('aria-checked', String(i === n - 1)));
    const b = btns[n - 1]; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    clearTimeout(closeTimer); clearTimeout(sendTimer); clearTimeout(replyTimer);
    sendTimer = setTimeout(flush, 2500);
    if (reply) { reply.remove(); reply = null; }
    replyTimer = setTimeout(() => {
      if (n >= 4) {
        reply = say('Thank you very much for your <b>' + n + '-star</b> rating. We are delighted that you enjoyed the website, and we look forward to welcoming you to our school.');
        closeTimer = setTimeout(close, 8000);
      } else {
        reply = say('Thank you for your honest feedback. We regret that the website did not fully meet your expectations, and we would value your suggestions for improvement.');
        const a = document.createElement('a'); a.className = 'rt-link'; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.href = WA + encodeURIComponent('Assalamualaikum, I rated the Al-Qalam School website ' + n + ' out of 5. My suggestion: ');
        a.textContent = 'Share a suggestion on WhatsApp';
        reply.appendChild(document.createElement('br')); reply.appendChild(a); toEnd();
      }
    }, 350);
  }

  btns.forEach((b, i) => {
    b.addEventListener('mouseenter', () => paint(i + 1));
    b.addEventListener('focus', () => paint(i + 1));
    b.addEventListener('blur', () => paint(chosen));
    b.addEventListener('click', () => choose(i + 1));
  });
  stars.addEventListener('mouseleave', () => paint(chosen));
  box.querySelector('.rt-x').addEventListener('click', close);
  tg.addEventListener('click', () => {
    const min = box.classList.toggle('min');
    tg.setAttribute('aria-expanded', String(!min));
    tg.setAttribute('aria-label', min ? 'Expand feedback' : 'Minimise feedback');
    if (!min) toEnd();
  });
  window.addEventListener('pagehide', flush);

  // trigger: map section comes into view, then wait 1 second
  function start() { if (armed) return; setTimeout(open, 1000); }
  const target = document.querySelector('.qa-map, .mapcard');
  if (target && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) { io.disconnect(); start(); }
    }, { threshold: 0.25 });
    io.observe(target);
  } else {
    const check = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80) {
        window.removeEventListener('scroll', check); start();
      }
    };
    window.addEventListener('scroll', check, { passive: true });
  }
})();