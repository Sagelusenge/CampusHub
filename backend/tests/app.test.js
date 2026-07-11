import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';

test('GET / présente l’API', async () => {
  const reponse = await request(app).get('/').expect(200);
  assert.equal(reponse.body.succes, true);
  assert.equal(reponse.body.donnees.nom, 'API CampusHub');
});

test('une route inconnue retourne une erreur 404 uniforme', async () => {
  const reponse = await request(app).get('/api/v1/inconnue').expect(404);
  assert.equal(reponse.body.succes, false);
  assert.match(reponse.body.erreur.message, /Route introuvable/);
});

test('une inscription invalide est refusée avant le controller', async () => {
  const reponse = await request(app)
    .post('/api/v1/auth/inscription')
    .send({ email: 'adresse-invalide' })
    .expect(400);
  assert.equal(reponse.body.succes, false);
  assert.equal(reponse.body.erreur.message, 'Les données envoyées sont invalides.');
});
