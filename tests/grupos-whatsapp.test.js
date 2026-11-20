import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.PASTA_DADOS = `/tmp/achadinhos-teste-grupos-${process.pid}`;
const { juntarGrupos } = await import('../src/destinos/whatsapp.js');

test('lista de grupos junta os do servidor com os já vistos (o servidor pode vir incompleto)', () => {
  const vistos = new Map([['1@g.us', 'Achadinhos da Ana'], ['2@g.us', '']]);
  const lista = juntarGrupos([{ id: '3@g.us', subject: 'Garimpando na shoppe' }, { id: '2@g.us', subject: 'Ofertas ML' }], vistos);
  assert.deepEqual(lista.map((g) => g.nome), ['Achadinhos da Ana', 'Garimpando na shoppe', 'Ofertas ML']);
});

test('grupo sem nome não quebra a lista', () => {
  const lista = juntarGrupos([{ id: '9@g.us' }, { id: '8@g.us', subject: 'B' }], new Map());
  assert.equal(lista.length, 2);
  assert.match(lista.find((g) => g.id === '9@g.us').nome, /sem nome/);
});
