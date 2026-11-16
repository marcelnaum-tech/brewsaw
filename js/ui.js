// Kleine Helfer für die Oberfläche.
import { num, platoToSg } from './calc.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const fmt = (x, n = 1) =>
  Number.isFinite(x)
    ? x.toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n })
    : '–';

/** Dichte (SG) zu einem Extraktwert in °P, z. B. „SG 1,055“. */
export const sg = (plato) => (Number.isFinite(plato) ? 'SG ' + fmt(platoToSg(plato), 3) : 'SG –');

export const datumDe = (iso) => {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '–';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

export function getPath(o, p) {
  return p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
}

export function setPath(o, p, v) {
  const ks = p.split('.');
  const last = ks.pop();
  const ziel = ks.reduce((a, k) => (a[k] ??= {}), o);
  ziel[last] = v;
}

/** Verbindet alle Eingabefelder mit data-f="pfad" unterhalb von root mit obj. */
export function bind(root, obj, onChange) {
  const h = (e) => {
    const el = e.target.closest?.('[data-f]');
    if (!el || !root.contains(el)) return;
    let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.type === 'number') v = el.value === '' ? '' : num(el.value);
    else v = el.value;
    setPath(obj, el.dataset.f, v);
    onChange?.(el.dataset.f, v, e.type, el);
  };
  root.addEventListener('input', h);
  root.addEventListener('change', h);
}

export function inp(label, path, value, o = {}) {
  const { type = 'number', step = 'any', unit = '', min = type === 'number' ? 0 : null, list, cls = '', ph = '' } = o;
  const attrs = [
    `data-f="${esc(path)}"`,
    `type="${type}"`,
    type === 'number' ? `step="${step}" inputmode="decimal"` : '',
    min != null ? `min="${min}"` : '',
    list ? `list="${list}"` : '',
    ph ? `placeholder="${esc(ph)}"` : '',
    `value="${esc(value ?? '')}"`,
  ].join(' ');
  return `<label class="fld ${cls}"><span>${esc(label)}${unit ? ` <em>${esc(unit)}</em>` : ''}</span><input ${attrs}></label>`;
}

export function sel(label, path, value, optionen, cls = '') {
  return `<label class="fld ${cls}"><span>${esc(label)}</span><select data-f="${esc(path)}">${optionen
    .map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`)
    .join('')}</select></label>`;
}

export function datalist(id, namen) {
  return `<datalist id="${id}">${[...new Set(namen)].map((n) => `<option value="${esc(n)}">`).join('')}</datalist>`;
}

export function kachel(label, wert, einheit = '', extra = '') {
  return `<div class="kz"><span class="kz-l">${esc(label)}</span><span class="kz-w">${wert}${einheit ? `<small> ${esc(einheit)}</small>` : ''}</span>${extra}</div>`;
}

export function toast(text, { dauer = 3500, art = '' } = {}) {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + art;
  t.setAttribute('role', 'status');
  t.textContent = text;
  if (!dauer) {
    const b = document.createElement('button');
    b.textContent = 'OK';
    b.className = 'btn small';
    b.onclick = () => t.remove();
    t.append(b);
  }
  box.append(t);
  if (dauer) setTimeout(() => t.remove(), dauer);
}

/** Modaler Dialog. Liefert das Dialog-Element bei Bestätigung, sonst null. */
export function dialog({ titel, html = '', ok = 'OK', abbrechen = 'Abbrechen', gefahr = false }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'dlg';
    d.innerHTML = `<form method="dialog"><h3>${esc(titel)}</h3><div class="dlg-body">${html}</div>
      <div class="dlg-actions">${abbrechen ? `<button type="button" class="btn ghost" data-x>${esc(abbrechen)}</button>` : ''}
      <button value="ok" class="btn ${gefahr ? 'danger' : 'primary'}">${esc(ok)}</button></div></form>`;
    document.body.append(d);
    d.querySelector('[data-x]')?.addEventListener('click', () => d.close('cancel'));
    d.addEventListener('close', () => {
      resolve(d.returnValue === 'ok' ? d : null);
      d.remove();
    });
    d.showModal();
  });
}

export const bestaetigen = (titel, text, ok = 'Löschen') =>
  dialog({ titel, html: `<p>${esc(text)}</p>`, ok, gefahr: true });

export function download(dateiname, text, typ = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: typ }));
  a.download = dateiname;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
