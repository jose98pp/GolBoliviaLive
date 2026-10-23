import { before, after, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const projectId = 'demo-golbolivia-rules';
let environment;
before(async () => {
  const endpoint = process.env.FIRESTORE_EMULATOR_HOST;
  if (!endpoint) throw new Error('Inicia estas pruebas con bun run test; requieren el emulador local.');
  const [host, port] = endpoint.split(':');
  if (!['127.0.0.1', 'localhost'].includes(host)) throw new Error('Solo se admite un emulador local.');
  environment = await initializeTestEnvironment({ projectId, firestore: { host, port: Number(port), rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'admins/backend-fixture'), {});
  });
});
after(async () => { await environment?.cleanup(); });
const anonymous = () => environment.unauthenticatedContext().firestore();
const visitor = () => environment.authenticatedContext('visitor-fixture').firestore();
const backend = () => environment.authenticatedContext('backend-fixture').firestore();

for (const collection of ['config', 'match', 'liveEvents', 'iptvCustomChannels', 'clubs', 'events', 'polls', 'confirmations']) {
  test(`${collection}: lectura pública, escritura exclusiva del backend`, async () => {
    const path = `${collection}/fixture`;
    const data = collection === 'iptvCustomChannels' ? { name: 'DSports fixture', sourceType: 'iframe', streamUrl: 'https://streamxhd.st/live1.php?stream=dsports' } : { title: 'fixture' };
    await assertFails(setDoc(doc(anonymous(), path), data));
    await assertFails(setDoc(doc(visitor(), path), data));
    await assertSucceeds(setDoc(doc(backend(), path), data));
    await assertSucceeds(getDoc(doc(anonymous(), path)));
    await assertFails(updateDoc(doc(visitor(), path), { name: 'intruso' }));
    await assertFails(deleteDoc(doc(anonymous(), path)));
    await assertFails(deleteDoc(doc(visitor(), path)));
    await assertSucceeds(updateDoc(doc(backend(), path), { name: 'actualizado' }));
    await assertSucceeds(deleteDoc(doc(backend(), path)));
  });
}
test('Nadie puede leer ni modificar admins ni darse privilegios', async () => {
  for (const db of [anonymous(), visitor(), backend()]) {
    await assertFails(getDoc(doc(db, 'admins/backend-fixture')));
    await assertFails(setDoc(doc(db, 'admins/visitor-fixture'), {}));
    await assertFails(deleteDoc(doc(db, 'admins/backend-fixture')));
  }
});
test('Auditoría: solo backend lee y crea; nadie modifica ni elimina', async () => {
  const path = 'audit_logs/fixture';
  await assertFails(setDoc(doc(anonymous(), path), { action: 'fixture' }));
  await assertFails(setDoc(doc(visitor(), path), { action: 'fixture' }));
  await assertSucceeds(setDoc(doc(backend(), path), { action: 'fixture' }));
  await assertFails(getDoc(doc(anonymous(), path)));
  await assertFails(getDoc(doc(visitor(), path)));
  await assertSucceeds(getDoc(doc(backend(), path)));
  await assertFails(updateDoc(doc(backend(), path), { action: 'editado' }));
  await assertFails(deleteDoc(doc(backend(), path)));
});
const message = { id: 'fixture', sender: 'Visitante', clubId: 'bolivar', text: 'Vamos equipo', timestamp: '12:00' };
test('Chat: mensaje válido público; solo backend modera', async () => {
  await assertSucceeds(setDoc(doc(anonymous(), 'chat/fixture'), message));
  await assertSucceeds(getDoc(doc(anonymous(), 'chat/fixture')));
  await assertFails(updateDoc(doc(visitor(), 'chat/fixture'), { text: 'editado' }));
  await assertFails(deleteDoc(doc(anonymous(), 'chat/fixture')));
  await assertSucceeds(updateDoc(doc(backend(), 'chat/fixture'), { text: 'moderado' }));
  await assertSucceeds(deleteDoc(doc(backend(), 'chat/fixture')));
});
for (const [name, change] of Object.entries({ id: { id: 'otro' }, textoVacio: { text: '' }, textoLargo: { text: 'x'.repeat(301) }, remitenteVacio: { sender: '' }, remitenteLargo: { sender: 'x'.repeat(41) }, campoExtra: { role: 'admin' }, vipInvalido: { isVip: 'yes' }, importeNegativo: { superChatAmount: -1 }, importeExcesivo: { superChatAmount: 1001 } })) {
  test(`Chat rechaza ${name}`, async () => { await assertFails(setDoc(doc(anonymous(), 'chat/fixture'), { ...message, ...change })); });
}
test('Las colecciones sin regla permanecen cerradas', async () => {
  for (const db of [anonymous(), visitor(), backend()]) {
    await assertFails(getDoc(doc(db, 'unknown/fixture')));
    await assertFails(setDoc(doc(db, 'unknown/fixture'), {}));
  }
});

test('Canal HLS: el backend guarda y el público consulta la URL persistida', async () => {
  const data = { name: 'HLS fixture', sourceType: 'hls', streamUrl: 'https://example.test/live.m3u8' };
  await assertSucceeds(setDoc(doc(backend(), 'iptvCustomChannels/hls-fixture'), data));
  const snapshot = await assertSucceeds(getDoc(doc(anonymous(), 'iptvCustomChannels/hls-fixture')));
  if (snapshot.data().streamUrl !== data.streamUrl) throw new Error('La señal no coincide');
});
test('Revocar admins/{UID} revoca las escrituras del backend', async () => {
  await environment.withSecurityRulesDisabled(async context => {
    await deleteDoc(doc(context.firestore(), 'admins/backend-fixture'));
  });
  await assertFails(setDoc(doc(backend(), 'iptvCustomChannels/revoked'), { name: 'Rechazado' }));
});

test('Audiencia: los visitantes no pueden leer registros ni alterar contadores directamente', async () => {
  for (const path of ['matchAnalytics/match-a', 'matchAnalytics/match-a/visitors/browser-a', 'matchAnalytics/match-a/plays/play-a']) {
    await assertFails(setDoc(doc(anonymous(), path), { uniqueVisitors: 999 }));
    await assertFails(getDoc(doc(anonymous(), path)));
    await assertSucceeds(setDoc(doc(backend(), path), { uniqueVisitors: 1 }));
    await assertSucceeds(getDoc(doc(backend(), path)));
  }
});
