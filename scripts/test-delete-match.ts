async function main() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1925', username: 'admin' }),
    });
    const loginData = await loginRes.json();
    console.log('[1] Login status:', loginRes.status, 'token exists:', !!loginData.token);
    const token = loginData.token;

    // 1. Obtener partidos iniciales
    const res1 = await fetch('http://localhost:3000/api/live-events');
    const d1 = await res1.json();
    console.log('[2] Partidos iniciales en servidor:', d1.events.map((e: any) => e.id));

    // 2. Crear partido temporal de prueba
    const createRes = await fetch('http://localhost:3000/api/live-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        id: 'partido-test-del',
        title: 'Partido de Prueba Eliminar',
        homeTeam: 'bolivar',
        awayTeam: 'strongest',
        tournamentName: 'Torneo Apertura',
        stadiumName: 'Hernando Siles',
        isLive: true,
        homeScore: 0,
        awayScore: 0,
        matchMinute: 0,
        period: '1T',
        primaryProvider: 'cloudflare',
      }),
    });
    const createData = await createRes.json();
    console.log('[3] Crear partido nuevo:', createRes.status, createData.success);

    // 3. Verificar que ahora hay 2 partidos
    const res2 = await fetch('http://localhost:3000/api/live-events');
    const d2 = await res2.json();
    console.log('[4] Partidos tras crear:', d2.events.map((e: any) => e.id));

    // 4. Eliminar el partido creado usando DELETE
    const delRes = await fetch('http://localhost:3000/api/live-events/partido-test-del', {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer ' + token,
      },
    });
    const delData = await delRes.json();
    console.log('[5] Eliminar partido DELETE:', delRes.status, delData.success, delData.message);

    // 5. Verificar que el partido se borró y sólo queda el original
    const res3 = await fetch('http://localhost:3000/api/live-events');
    const d3 = await res3.json();
    console.log('[6] Partidos tras eliminar:', d3.events.map((e: any) => e.id));

    if (!d3.events.some((e: any) => e.id === 'partido-test-del')) {
      console.log('✅ ÉXITO: El partido fue eliminado correctamente del servidor y memoria.');
    } else {
      console.error('❌ ERROR: El partido sigue existiendo en el servidor.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error durante la prueba:', err);
    process.exit(1);
  }
}

main();
