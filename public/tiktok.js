// TikTok's official profile embed for the account in ?u= (letters, digits, . and _ only).
(function () {
  var handle = new URLSearchParams(location.search).get('u') || '';
  if (!/^[A-Za-z0-9._]{2,30}$/.test(handle)) return;
  var url = 'https://www.tiktok.com/@' + handle;
  var quote = document.createElement('blockquote');
  quote.className = 'tiktok-embed';
  quote.setAttribute('cite', url);
  quote.setAttribute('data-unique-id', handle);
  quote.setAttribute('data-embed-type', 'creator');
  quote.style.cssText = 'max-width:780px;min-width:288px;margin:0';
  var section = document.createElement('section');
  var link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.textContent = '@' + handle;
  section.appendChild(link);
  quote.appendChild(section);
  document.body.appendChild(quote);
  var script = document.createElement('script');
  script.src = 'https://www.tiktok.com/embed.js';
  script.async = true;
  document.body.appendChild(script);
})();
