import { Check } from 'lucide-react';

export function PlanSelector({ plans, selected, onSelect }) {
  const layoutClass = plans.length === 1 ? 'plan-selector--single' : plans.length === 2 ? 'plan-selector--compact' : '';
  return <div className={`plan-selector ${layoutClass}`}>
    {plans.map((plan) => <button type="button" className={selected === plan.code_plan ? 'pack-card pack-card--selected' : 'pack-card'} key={plan.code_plan} onClick={() => onSelect(plan.code_plan)}>
      <span>{plan.nom}</span><strong>{Number(plan.prix_total)} $<small>{plan.est_a_vie ? ' paiement unique' : '/an'}</small></strong>
      <ul>{(plan.avantages || []).map((item) => <li key={item}><Check />{item}</li>)}</ul>
    </button>)}
  </div>;
}
