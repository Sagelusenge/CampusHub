import { Check } from 'lucide-react';

export function PlanSelector({ plans, selected, onSelect }) {
  return <div className="plan-selector">
    {plans.map((plan, index) => <button type="button" className={selected === plan.code_plan ? 'pack-card pack-card--selected' : 'pack-card'} key={plan.code_plan} onClick={() => onSelect(plan.code_plan)}>
      {index === 1 && <small className="pack-popular">Populaire</small>}
      <span>{plan.nom}</span><strong>{Number(plan.prix_total)} $<small>/mois</small></strong>
      <ul>{(plan.avantages || []).map((item) => <li key={item}><Check />{item}</li>)}</ul>
    </button>)}
  </div>;
}
