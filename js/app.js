import { state, speichern } from './store.js';
import { toast } from './ui.js';
import { ladeBilder } from './bilder.js';
import { pruefeAlarme, signalton, benachrichtige } from './brautag.js';
import { rezepteView } from './views/rezepte.js';
import { rezeptView } from './views/rezept.js';
import { sudeView } from './views/sude.js';
import { sudView } from './views/sud.js';
import { brautagView } from './views/brautag.js';
import { wasserView } from './views/wasser.js';
import { lagerView } from './views/lager.js';
import { kiView } from './views/ki.js';
import { einstellungenView, themeAnwenden } from './views/einstellungen.js';

const ROUTEN = [
  [/^#\/rezepte$/, rezepteView, 'rezepte'],
  [/^#\/rezept\/([\w-]+)$/, rezeptView, 'rezepte'],
  [/^#\/sude$/, sudeView, 'sude'],
  [/^#\/sud\/([\w-]+)$/, sudView, 'sude'],
  [/^#\/sud\/([\w-]+)\/brautag$/, brautagView, 'sude'],
  [/^#\/wasser(?:\/([\w-]+))?$/, wasserView, 'wasser'],
  [/^#\/lager$/, lagerView, 'lager'],
  [/^#\/ki$/, kiView, 'ki'],
  [/^#\/einstellungen$/, einstellungenView, 'einstellungen'],
];

const main = document.getElementById('main');
let aufraeumen = null;

function route() {
  aufraeumen?.();
  aufraeumen = null;
  const hash = location.hash || '#/rezepte';
  const treffer = ROUTEN.map(([re, view, nav]) => ({ m: hash.match(re), view, nav })).find((x) => x.m);
  if (!treffer) {
    location.replace('#/rezepte');
    return;
  }
  // Jede Ansicht bekommt ein frisches Element, damit keine alten Listener hängen bleiben.
  const el = document.createElement('div');
  el.className = 'view';
  main.replaceChildren(el);
  aufraeumen = treffer.view(el, ...treffer.m.slice(1)) || null;
  document.querySelectorAll('#nav a').forEach((a) => {
    const aktiv = a.dataset.nav === treffer.nav;
    a.classList.toggle('aktiv', aktiv);
    if (aktiv) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  scrollTo(0, 0);
}

// Timer-Alarme laufen unabhängig von der gerade geöffneten Ansicht.
setInterval(() => {
  for (const sud of state.sude) {
    if (sud.status !== 'brautag') continue;
    const meldungen = pruefeAlarme(sud);
    if (!meldungen.length) continue;
    speichern();
    signalton();
    for (const text of meldungen) {
      toast('⏰ ' + text, { dauer: 0, art: 'alarm' });
      benachrichtige(`Sud #${sud.nr} ${sud.name}`, text);
    }
  }
}, 1000);

themeAnwenden();
await ladeBilder();
addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  const registriere = () => navigator.serviceWorker.register('sw.js').catch(() => {});
  // Nach dem Laden der Bilder kann das load-Ereignis schon vorbei sein.
  if (document.readyState === 'complete') registriere();
  else addEventListener('load', registriere);
}
