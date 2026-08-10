const labels = {
  EN_ATTENTE: 'En attente',
  ACTIF: 'Actif',
  SUSPENDU: 'Suspendu',
  BLOQUE: 'Bloqué',
  RETIRE: 'Retiré',
  VERIFIE: 'Vérifié',
  VERIFIEE: 'Vérifiée',
  REJETE: 'Rejeté',
  REJETEE: 'Rejetée',
  VALIDE: 'Validé',
  ACCEPTEE: 'Acceptée',
  EXPIRE: 'Expiré',
  NON_VERIFIE: 'Non vérifié',
  OUVERT: 'Ouvert',
  EN_EXAMEN: 'En examen',
  RESOLU: 'Résolu',
  PUBLIEE: 'Publiée',
  BROUILLON: 'Brouillon',
  ARCHIVEE: 'Archivée',
};

export function StatusBadge({ status }) {
  const normalized = status || 'EN_ATTENTE';
  return <span className={`status status--${normalized.toLowerCase()}`}>{labels[normalized] || normalized}</span>;
}
