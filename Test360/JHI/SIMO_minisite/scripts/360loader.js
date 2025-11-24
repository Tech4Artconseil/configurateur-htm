/* Simple 360 loader
   Usage: include this script from a product page and set data-code="PC146"
   Example: <script src="scripts/360loader.js" data-code="PC146"></script>
 */
(function(){
  function $(sel, ctx){ return (ctx||document).querySelector(sel); }
  var scriptTag = document.currentScript || (function(){var s=document.getElementsByTagName('script'); return s[s.length-1];})();
  var code = (scriptTag && scriptTag.getAttribute('data-code')) || '';
  var dataConfig = (scriptTag && scriptTag.getAttribute('data-config')) || '';
  var dataBase = (scriptTag && scriptTag.getAttribute('data-base')) || '';
  if(!code){
    var m = (location.pathname||'').match(/([^\\\/]+)\.html$/i);
    code = m?m[1]:'';
  }
  code = code.toUpperCase();
  if(!code) return;
  var base = dataBase || ('360/' + code + '/');

  function loadScript(src, cb){
    var s = document.createElement('script');
    s.src = base + src;
    s.async = true;
    s.onload = function(){ cb && cb(null); };
    s.onerror = function(e){ cb && cb(e); };
    document.head.appendChild(s);
  }

  function ensureContainer(){
    var c = document.getElementById('viewer360');
    if(!c){
      c = document.createElement('div');
      c.id = 'viewer360';
      c.style.width = '100%';
      c.style.height = '600px';
      c.innerHTML = 'Chargement 360...';
      var page = document.getElementById('page') || document.body;
      page.appendChild(c);
    }
    return c;
  }

  var container = ensureContainer();

  // load player then skin then config
  loadScript('object2vr_player.js', function(err){
    if(err){ console.error('Erreur chargement object2vr_player.js', err); container.innerHTML = 'Erreur chargement player.'; return; }
    loadScript('skin.js', function(err2){
      if(err2){ console.error('Erreur chargement skin.js', err2); container.innerHTML = 'Erreur chargement skin.'; return; }
      try{
        // instantiate player
        var obj = new window.object2vrPlayer(container.id);
        if(window.object2vrSkin) window.skin = new window.object2vrSkin(obj);
        var xml = dataConfig || (code + '_out.xml');
        if(typeof obj.readConfigUrl === 'function') obj.readConfigUrl(xml);
        else console.warn('readConfigUrl non disponible sur object2vrPlayer');
      }catch(e){
        console.error('Erreur initialisation player', e);
        container.innerHTML = 'Erreur initialisation 360.';
      }
    });
  });
})();
