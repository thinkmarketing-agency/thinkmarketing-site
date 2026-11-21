// Pure estimate arithmetic. Catalog is the only source of prices.
export function estimate(catalog, selections) {
  const selected = new Map();
  for (const entry of selections) {
    const item = catalog.items.find(i => i.id === entry.id);
    if (!item) throw new Error(`Unknown service: ${entry.id}`);
    if(item.available_for_new_projects===false) throw new Error('Legacy package: unavailable for new projects.');
    if(item.price_kind==='custom') throw new Error('Custom project: individually scoped quote required.');
    const qty = entry.quantity;
    const fractional = entry.id === 'labor';
    if (!Number.isFinite(qty) || qty <= 0 || (fractional ? !Number.isInteger(qty * 2) : !Number.isInteger(qty))) throw new Error(`Invalid quantity for ${entry.id}`);
    if (selected.has(entry.id)) throw new Error(`Duplicate service: ${entry.id}`);
    selected.set(entry.id, {item, quantity:qty});
  }
  const warnings = [], questions = [], suppressed = new Set();
  if (['essential','growth','enterprise'].filter(id=>selected.has(id)).length>1) throw new Error('Choose one website package.');
  for (const id of ['essential','growth','enterprise','team_routing','audit','retainer','ppc','action_plan','portal_discovery']) {
    if (selected.has(id) && selected.get(id).quantity !== 1) throw new Error(`${id} requires one project per estimate.`);
  }
  for(const {item} of selected.values()){
    if(item.requires_any?.length && !item.requires_any.some(id=>selected.has(id))) questions.push(`${item.name}: confirm an existing prerequisite (${item.requires_any.join(', ')}) or add the required configuration.`);
    for(const child of item.includes||[]) if(selected.has(child)) questions.push(`${item.name} already includes ${child} for the same workflow; confirm overlap and remove duplicate fees before estimating.`);
    if(item.readiness==='proposed_scope_and_cost_validation_required') questions.push(`${item.name}: proposed entry; validate delivery and tool costs before a final quote.`);
  }
  if (selected.has('editable_section') && selected.has('admin')) questions.push('Use one editing option per workflow. Confirm separate needs before including both.');
  if (selected.has('existing_embed') && selected.has('scheduling')) questions.push('Confirm the embed and new booking setup cover distinct workflows before charging for both.');
  if (selected.has('local_seo')) {
    for (const id of ['gbp_care','monitoring']) if (selected.has(id)) {
      questions.push(`Confirm ${id} covers the same site/location as Local SEO before removing the overlapping fee.`);
    }
  }
  if (selected.has('ppc') && selected.has('analytics')) questions.push('PPC includes campaign conversion setup. Confirm analytics is additional work; otherwise remove the duplicate setup.');
  if (selected.has('team_routing')) {
    if (!selected.has('scheduling')) questions.push('Team routing requires staff scheduling seats.');
    else if(selected.get('scheduling').quantity > 3) questions.push('Team routing above 3 staff seats requires a custom bundled quote.');
  }
  if (selected.has('tracking_care') && !selected.has('analytics')) questions.push('Confirm existing conversion tracking before activating monthly checks.');
  if (selected.has('domain_transfer') && selected.has('domain')) questions.push('Confirm which domains are transfers. For each overlapping transfer, credit $75 domain setup; never charge both setup fees.');
  if (selected.has('chat') && selected.has('assistant')) questions.push('Confirm a separate chat widget is needed; AI assistant already includes its own interface.');
  if (selected.has('crm') && selected.has('automation')) questions.push('Confirm these are separate workflows; one workflow must not be billed twice.');
  if (selected.has('gbp_setup') && selected.has('gbp_care')) questions.push('For the same location, waive $100 GBP maintenance onboarding after profile setup. Owner must confirm the location match.');
  if (selected.has('audit') && selected.has('monitoring')) questions.push('If this review qualifies for monitoring onboarding, owner should apply the $150 onboarding waiver.');
  const websiteNeeded=['editable_section','existing_embed','admin','reviews','form','payment','page','landing','site_migration','analytics','store','membership','calculator','chat','assistant'];
  if (websiteNeeded.some(id=>selected.has(id)) && !selected.has('essential') && !selected.has('growth') && !selected.has('enterprise')) warnings.push('Website hosting is not included in this estimate. Confirm existing suitable hosting or add a website/hosting quote.');
  if (selected.has('domain')) warnings.push('Confirm the actual domains: each must qualify for standard managed-domain pricing. Specialty or premium domains need a confirmed bundled price before purchase.');
  if (selected.has('ppc')) warnings.push('Advertising spend is additional and paid to Google.');
  if (selected.has('payment') || selected.has('store') || selected.has('membership')) warnings.push('Payment processing and transaction fees are additional.');
  if (selected.has('scheduling') && selected.has('email')) warnings.push('Email includes its ordinary staff calendar; scheduling is the additional public booking service. Confirm the customer needs bookings, not only calendars.');
  const lines=[...selected.values()].filter(({item})=>!suppressed.has(item.id)).map(({item,quantity})=>({
    id:item.id,name:item.name,quantity,scope:item.scope,price_kind:item.price_kind,
    setup: item.additional_setup === null ? item.setup*quantity : item.setup+item.additional_setup*(quantity-1),
    monthly:item.monthly*quantity,annual:item.annual*quantity
  }));
  const setup=lines.reduce((s,l)=>s+l.setup,0),monthly=lines.reduce((s,l)=>s+l.monthly,0),annual=lines.reduce((s,l)=>s+l.annual,0);
  return {catalog_version:catalog.version,status:'Informational estimate; owner confirmation required',lines,setup,monthly,annual,
    twelve_recurring_payments_plus_setup:setup+monthly*12+annual,
    customer_estimate_ready:questions.length===0,starting_estimate:lines.some(l=>l.price_kind==='from'),requires_scope_review:questions.length>0,questions,warnings,
    commitments:[...selected.values()].filter(({item})=>item.commitment_months).map(({item,quantity})=>({id:item.id,months:item.commitment_months,total:item.monthly*quantity*item.commitment_months})),
    exclusions:catalog.rules.exceptions,discounts_applied:[],valid_days:30};
}


// Guidance must come from private configuration, never the public catalog.
export function estimateInternalWork(hours, guidance) {
  if(!Number.isFinite(hours)||hours<=0) throw new Error('A defensible positive effort estimate is required.');
  const {hourly_rate,minimum_labor_charge}=guidance||{};
  if(!Number.isFinite(hourly_rate)||hourly_rate<=0||!Number.isFinite(minimum_labor_charge)||minimum_labor_charge<0) throw new Error('Valid private pricing guidance is required.');
  return {internal_only:true,reference_amount:Math.round(Math.max(minimum_labor_charge,hours*hourly_rate)*100)/100,owner_confirmation_required:true};
}
