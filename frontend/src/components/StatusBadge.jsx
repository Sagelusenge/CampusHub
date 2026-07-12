const labels = {
  EN_ATTENTE: 'En attente',
  ACTIF: 'Actif',
  SUSPENDU: 'Suspendu',
  VERIFIE: 'Vérifié',
  VERIFIEE: 'Vérifiée',
  REJETE: 'Rejeté',
  REJETEE: 'Rejetée',
  NON_VERIFIE: 'Non vérifié',
};

export function StatusBadge({ status }) {
  const normalized = status || 'EN_ATTENTE';
  return <span className={`status status--${normalized.toLowerCase()}`}>{labels[normalized] || normalized}</span>;
}
