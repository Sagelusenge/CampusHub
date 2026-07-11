import { ErreurApi } from './erreur-api.js';

export function construireMiseAJour(donnees, correspondances) {
  const clauses = [];
  const valeurs = [];
  for (const [champApi, colonneSql] of Object.entries(correspondances)) {
    if (Object.hasOwn(donnees, champApi)) {
      clauses.push(`${colonneSql} = ?`);
      valeurs.push(donnees[champApi]);
    }
  }
  if (clauses.length === 0) throw new ErreurApi(400, 'Aucune donnée à modifier.');
  return { clause: clauses.join(', '), valeurs };
}

export function pagination(page = 1, limite = 20) {
  return {
    page,
    limite,
    decalage: (page - 1) * limite,
  };
}

export function metaPagination(total, page, limite) {
  return {
    page,
    limite,
    total,
    pages: Math.ceil(total / limite),
  };
}
