  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // splash intro: brief logo animation, then reveal the site
  try{
    var splash = document.getElementById('splash');
    if(splash){
      if(reduceMotion){
        splash.remove();
      } else {
        document.documentElement.style.overflow = 'hidden';
        setTimeout(function(){
          splash.classList.add('hide');
          document.documentElement.style.overflow = '';
          setTimeout(function(){ splash.remove(); }, 650);
        }, 1700);
      }
    }
  }catch(e){}

  // page-wide background: exact same connected-network motif as the splash screen, standardised so both use identical motion (only the dot colour is swapped so it reads against the light page instead of the splash's navy)
  try{
    var bgCanvas = document.getElementById('bgCanvas');
    if(bgCanvas && !reduceMotion){
      var bctx = bgCanvas.getContext('2d');
      var bw = 0, bh = 0, bdpr = Math.min(window.devicePixelRatio || 1, 2);
      var bpts = [];
      var BNUM = 70;
      var bRaf = null;

      function sizeBgCanvas(){
        bw = window.innerWidth; bh = window.innerHeight;
        bgCanvas.width = bw * bdpr; bgCanvas.height = bh * bdpr;
        bctx.setTransform(bdpr,0,0,bdpr,0,0);
      }
      function makeBgPts(){
        bpts = [];
        for(var i=0;i<BNUM;i++){
          bpts.push({
            x: Math.random()*bw, y: Math.random()*bh,
            vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5,
            r: 1.2 + Math.random()*1.8
          });
        }
      }
      function drawBgFrame(){
        bctx.clearRect(0,0,bw,bh);
        var linkDist = Math.min(150, bw*0.15);
        for(var i=0;i<bpts.length;i++){
          var p = bpts[i];
          p.x += p.vx; p.y += p.vy;
          if(p.x < 0 || p.x > bw) p.vx *= -1;
          if(p.y < 0 || p.y > bh) p.vy *= -1;
        }
        for(var i=0;i<bpts.length;i++){
          for(var j=i+1;j<bpts.length;j++){
            var a = bpts[i], b = bpts[j];
            var dx = a.x-b.x, dy = a.y-b.y;
            var d = Math.sqrt(dx*dx+dy*dy);
            if(d < linkDist){
              bctx.strokeStyle = 'rgba(240,125,30,' + (0.32 * (1 - d/linkDist)) + ')';
              bctx.lineWidth = 1;
              bctx.beginPath(); bctx.moveTo(a.x,a.y); bctx.lineTo(b.x,b.y); bctx.stroke();
            }
          }
        }
        bpts.forEach(function(p){
          bctx.beginPath(); bctx.arc(p.x,p.y,p.r,0,Math.PI*2);
          bctx.fillStyle = 'rgba(19,42,78,0.5)';
          bctx.fill();
        });
        bRaf = requestAnimationFrame(drawBgFrame);
      }
      sizeBgCanvas();
      makeBgPts();
      drawBgFrame();
      window.addEventListener('resize', function(){ sizeBgCanvas(); makeBgPts(); });
    }
  }catch(e){}

  // splash background: connected-network motif (same visual language as the hero), signalling IT/network services
  try{
    var splashCanvas = document.getElementById('splashCanvas');
    if(splashCanvas && !reduceMotion){
      var sctx = splashCanvas.getContext('2d');
      var sw = 0, sh = 0, sdpr = Math.min(window.devicePixelRatio || 1, 2);
      var spts = [];
      var SNUM = 70;
      var sRaf = null;

      function sizeSplashCanvas(){
        sw = window.innerWidth; sh = window.innerHeight;
        splashCanvas.width = sw * sdpr; splashCanvas.height = sh * sdpr;
        sctx.setTransform(sdpr,0,0,sdpr,0,0);
      }
      function makeSplashPts(){
        spts = [];
        for(var i=0;i<SNUM;i++){
          spts.push({
            x: Math.random()*sw, y: Math.random()*sh,
            vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5,
            r: 1.2 + Math.random()*1.8
          });
        }
      }
      function drawSplashFrame(){
        sctx.clearRect(0,0,sw,sh);
        var linkDist = Math.min(150, sw*0.15);
        for(var i=0;i<spts.length;i++){
          var p = spts[i];
          p.x += p.vx; p.y += p.vy;
          if(p.x < 0 || p.x > sw) p.vx *= -1;
          if(p.y < 0 || p.y > sh) p.vy *= -1;
        }
        for(var i=0;i<spts.length;i++){
          for(var j=i+1;j<spts.length;j++){
            var a = spts[i], b = spts[j];
            var dx = a.x-b.x, dy = a.y-b.y;
            var d = Math.sqrt(dx*dx+dy*dy);
            if(d < linkDist){
              sctx.strokeStyle = 'rgba(240,125,30,' + (0.32 * (1 - d/linkDist)) + ')';
              sctx.lineWidth = 1;
              sctx.beginPath(); sctx.moveTo(a.x,a.y); sctx.lineTo(b.x,b.y); sctx.stroke();
            }
          }
        }
        spts.forEach(function(p){
          sctx.beginPath(); sctx.arc(p.x,p.y,p.r,0,Math.PI*2);
          sctx.fillStyle = 'rgba(243,238,226,0.5)';
          sctx.fill();
        });
        sRaf = requestAnimationFrame(drawSplashFrame);
      }

      sizeSplashCanvas();
      makeSplashPts();
      drawSplashFrame();
      window.addEventListener('resize', sizeSplashCanvas);
      setTimeout(function(){ if(sRaf) cancelAnimationFrame(sRaf); }, 2400);
    }
  }catch(e){}

  // button ripple
  function ripple(e){
    if(reduceMotion) return;
    var btn = e.currentTarget;
    var circle = document.createElement('span');
    var d = Math.max(btn.clientWidth, btn.clientHeight);
    circle.className = 'ripple';
    circle.style.width = circle.style.height = d + 'px';
    var rect = btn.getBoundingClientRect();
    circle.style.left = (e.clientX - rect.left - d/2) + 'px';
    circle.style.top = (e.clientY - rect.top - d/2) + 'px';
    btn.appendChild(circle);
    setTimeout(function(){ circle.remove(); }, 700);
  }

  // scroll reveal
  try{
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
    }, {threshold:0.15});
    document.querySelectorAll('[data-reveal]').forEach(function(el){ io.observe(el); });
  }catch(e){}

  // nav scroll shadow + progress bar
  var nav = document.getElementById('nav');
  var progress = document.getElementById('progress');
  var ticking = false;
  function onScroll(){
    if(nav){ nav.classList.toggle('scrolled', window.scrollY > 8); }
    if(progress){
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? Math.min(window.scrollY / h, 1) : 0;
      progress.style.transform = 'scaleX(' + pct + ')';
    }
    ticking = false;
  }
  var heroMediaEl = document.querySelector('.hero-media');
  function onParallaxScroll(){
    if(heroMediaEl && !reduceMotion){
      heroMediaEl.style.transform = 'translateX(-50%) translateY(' + (window.scrollY * 0.15) + 'px)';
    }
  }
  window.addEventListener('scroll', function(){
    if(!ticking){ requestAnimationFrame(function(){ onScroll(); onParallaxScroll(); }); ticking = true; }
  });
  onScroll();

  // count-up stats
  try{
    var statsEl = document.getElementById('stats');
    var counted = false;
    function countUp(){
      if(counted) return; counted = true;
      statsEl.querySelectorAll('b[data-count]').forEach(function(b){
        var target = parseInt(b.getAttribute('data-count'), 10);
        var suffix = b.getAttribute('data-suffix') || '';
        if(reduceMotion){ b.textContent = target + suffix; return; }
        var start = null; var dur = 900;
        function step(ts){
          if(!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          b.textContent = Math.round(target * eased) + suffix;
          if(p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }
    var sIo = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ countUp(); sIo.unobserve(en.target); } });
    }, {threshold:0.4});
    if(statsEl) sIo.observe(statsEl);
  }catch(e){}

  // device tilt on mouse move
  try{
    if(!reduceMotion){
      var hero = document.getElementById('home');
      var rig = document.getElementById('rig');
      hero.addEventListener('mousemove', function(e){
        var r = hero.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        rig.style.transform = 'perspective(900px) rotateX(' + (5 + py * -8) + 'deg) rotateY(' + (-10 + px * 10) + 'deg)';
      });
      hero.addEventListener('mouseleave', function(){ rig.style.transform = 'perspective(900px) rotateX(5deg) rotateY(-10deg)'; });
    }
  }catch(e){}

  // 3D tilt for cards (services, why-us, work, clients, pricing factors) on hover
  try{
    if(!reduceMotion && window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches){
      var tiltCards = document.querySelectorAll('.svc-card, .why-card, .work-card, .pf');
      tiltCards.forEach(function(card){
        card.addEventListener('mousemove', function(e){
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty('--tx', (px * 9) + 'deg');
          card.style.setProperty('--ty', (py * -9) + 'deg');
        });
        card.addEventListener('mouseleave', function(){
          card.style.setProperty('--tx', '0deg');
          card.style.setProperty('--ty', '0deg');
        });
      });
    }
  }catch(e){}

  // hero "splash" animation: canvas particle network, standing in for real video footage
  try{
    var heroCanvas = document.getElementById('heroCanvas');
    var heroMedia = heroCanvas ? heroCanvas.closest('.hero-media') : null;
    if(heroCanvas && heroMedia){
      var hctx = heroCanvas.getContext('2d');
      var hw = 0, hh = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
      var pts = [];
      var NUM_PTS = 46;

      function sizeCanvas(){
        hw = heroMedia.clientWidth; hh = heroMedia.clientHeight;
        heroCanvas.width = hw * dpr; heroCanvas.height = hh * dpr;
        hctx.setTransform(dpr,0,0,dpr,0,0);
      }
      function makePoints(){
        pts = [];
        for(var i=0;i<NUM_PTS;i++){
          pts.push({
            x: Math.random()*hw, y: Math.random()*hh,
            vx: (Math.random()-0.5)*0.25, vy: (Math.random()-0.5)*0.25,
            r: 1.4 + Math.random()*1.6
          });
        }
      }
      function drawFrame(animate){
        hctx.clearRect(0,0,hw,hh);
        var linkDist = Math.min(150, hw*0.16);
        for(var i=0;i<pts.length;i++){
          var p = pts[i];
          if(animate){
            p.x += p.vx; p.y += p.vy;
            if(p.x < 0 || p.x > hw) p.vx *= -1;
            if(p.y < 0 || p.y > hh) p.vy *= -1;
          }
        }
        for(var i=0;i<pts.length;i++){
          for(var j=i+1;j<pts.length;j++){
            var a = pts[i], b = pts[j];
            var dx = a.x-b.x, dy = a.y-b.y;
            var d = Math.sqrt(dx*dx+dy*dy);
            if(d < linkDist){
              hctx.strokeStyle = 'rgba(140,155,180,' + (0.22 * (1 - d/linkDist)) + ')';
              hctx.lineWidth = 1;
              hctx.beginPath(); hctx.moveTo(a.x,a.y); hctx.lineTo(b.x,b.y); hctx.stroke();
            }
          }
        }
        pts.forEach(function(p){
          hctx.beginPath(); hctx.arc(p.x,p.y,p.r,0,Math.PI*2);
          hctx.fillStyle = 'rgba(240,125,30,0.55)';
          hctx.fill();
        });
      }
      sizeCanvas(); makePoints();
      if(reduceMotion){
        drawFrame(false);
      } else {
        (function loop(){ drawFrame(true); requestAnimationFrame(loop); })();
      }
      window.addEventListener('resize', function(){ sizeCanvas(); makePoints(); });
    }
  }catch(e){}

  // seamless marquee: duplicate content once for a clean loop
  try{
    var track = document.getElementById('marqueeTrack');
    if(track && !reduceMotion){ track.innerHTML += track.innerHTML; }
  }catch(e){}

  // seamless clients marquee: duplicate content once for a clean left-to-right loop
  try{
    var clientsTrack = document.getElementById('clientsTrack');
    if(clientsTrack && !reduceMotion){ clientsTrack.innerHTML += clientsTrack.innerHTML; }
  }catch(e){}

  // mobile menu
  try{
    var menuBtn = document.getElementById('menuBtn');
    var mobileMenu = document.getElementById('mobileMenu');
    var menuScrim = document.getElementById('menuScrim');
    function closeMenu(){
      menuBtn.classList.remove('open'); menuBtn.setAttribute('aria-expanded','false');
      mobileMenu.classList.remove('open'); menuScrim.classList.remove('open');
    }
    if(menuBtn){
      menuBtn.addEventListener('click', function(){
        var isOpen = !mobileMenu.classList.contains('open');
        menuBtn.classList.toggle('open', isOpen); menuBtn.setAttribute('aria-expanded', isOpen);
        mobileMenu.classList.toggle('open', isOpen); menuScrim.classList.toggle('open', isOpen);
      });
      menuScrim.addEventListener('click', closeMenu);
      mobileMenu.querySelectorAll('a,button').forEach(function(el){ el.addEventListener('click', closeMenu); });
    }
  }catch(e){}

  // scroll-spy active nav link
  try{
    var navLinks = document.querySelectorAll('.main-nav a');
    var spyMap = [];
    navLinks.forEach(function(a){
      var target = document.querySelector(a.getAttribute('href'));
      if(target) spyMap.push({link:a, section:target});
    });
    var spyIo = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){
          spyMap.forEach(function(m){ m.link.classList.toggle('active', m.section === en.target); });
        }
      });
    }, {rootMargin:'-45% 0px -50% 0px', threshold:0});
    spyMap.forEach(function(m){ spyIo.observe(m.section); });
  }catch(e){}

  // FAQ accordion
  try{
    document.querySelectorAll('.faq-q').forEach(function(btn){
      btn.addEventListener('click', function(){
        var item = btn.closest('.faq-item');
        var answer = item.querySelector('.faq-a');
        var isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(function(openItem){
          if(openItem !== item){
            openItem.classList.remove('open');
            openItem.querySelector('.faq-a').style.maxHeight = null;
            openItem.querySelector('.faq-q').setAttribute('aria-expanded','false');
          }
        });
        if(isOpen){
          item.classList.remove('open'); answer.style.maxHeight = null; btn.setAttribute('aria-expanded','false');
        }else{
          item.classList.add('open'); answer.style.maxHeight = answer.scrollHeight + 'px'; btn.setAttribute('aria-expanded','true');
        }
      });
    });
  }catch(e){}

  // floating support widget close
  try{
    var supportWidget = document.getElementById('supportWidget');
    var supportClose = document.getElementById('supportClose');
    if(supportClose){
      supportClose.addEventListener('click', function(){ supportWidget.classList.add('hidden'); });
    }
  }catch(e){}

  // contact form (Netlify-forms ready; shows a local success state in this preview)
  try{
    var contactForm = document.getElementById('contactForm');
    var contactSuccess = document.getElementById('contactSuccess');
    if(contactForm){
      contactForm.addEventListener('submit', function(e){
        e.preventDefault();
        contactForm.hidden = true;
        contactSuccess.hidden = false;
      });
    }
  }catch(e){}
