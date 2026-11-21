'''Readable catalog and a separate, local-only owner review. No external calls.'''
import json
from pathlib import Path
from html import escape as e
from collections import Counter
ROOT=Path(__file__).resolve().parents[1]
def data():
    return json.loads((ROOT/'content/catalog.json').read_text()),json.loads((ROOT/'content/capability-map.json').read_text())
def price(i):
    if i.get('available_for_new_projects') is False:return 'Legacy agreement only'
    if i['price_kind']=='custom':return 'Custom quote required'
    if i['price_kind']=='included':return 'Included within Essential scope'
    prefix='From ' if i['price_kind']=='from' else ''
    setup=f'{prefix}${i["setup"]:,} setup / one-time'
    monthly=f' + {prefix.lower()}${i["monthly"]:,}/month' if i['monthly'] else '; no recurring service included'
    if i['additional_setup'] is not None:setup+=f'; ${i["additional_setup"]:,} setup for each additional {i["unit"]}'
    return setup+monthly

def render_body():
    c,m=data();by_id={i['id']:i for i in c['items']}
    faq=json.loads((ROOT/'content/knowledge-faq.json').read_text())
    groups=list(dict.fromkeys(i['group'] for i in c['items']))
    out='<section class="section wrap reference-body"><nav class="reference-toc" aria-label="Reference contents">'+''.join(f'<a href="#{anchor}">{label}</a>' for anchor,label in [('business-facts','Business & approach'),('coverage','All website capabilities'),('catalog','Full pricing menu'),('policies','Terms & limits'),('estimating','Estimate rules'),('reference-faq','Detailed answers')])+'</nav>'
    out+='<section id="business-facts"><h2>Business facts &amp; approach</h2><p>Think Marketing · Bend, Oregon · Custom websites and digital marketing for small and medium-sized businesses in Central Oregon. Contact Jacob: thinkmarketingbend@gmail.com or (541) 316-0735.</p><p>A domain is like a plot of land; Think Marketing helps connect the starting point and the business’s vision. Two design goals: a website that is an expert on what the business does, and a website that works like a valuable employee. These are goals, not performance guarantees.</p><p>Digital marketing starts with customer intent, geography and useful next steps. Services include consulting, explanation of marketing reports, Local SEO, AI discoverability assessment, and Google Search PPC. No general content production or review responses. PPC campaign ad text is included in PPC.</p><p>Jasper uses the scope-checked pricing entries and selected routing rules. This is a local proposed catalog; new/unbuilt features require delivery and supplier-cost validation before acceptance. Fixed entries support scoped starting estimates, not binding contracts. All amounts are USD.</p></section>'
    out+='<section id="coverage"><h2>Every website capability has a pricing path</h2><p>Alternatives are not a bundle. Ask the clarification question, choose the matching scope, and avoid charging for something already included.</p><div class="reference-scroll"><table class="reference-menu"><thead><tr><th scope="col">Public capability</th><th scope="col">Pricing paths</th><th scope="col">Ask first</th></tr></thead><tbody>'
    for row in m['capabilities']:
        links='<br>'.join(f'<a href="#service-{id}">{e(by_id[id]["name"])}</a>' for id in row['service_ids'])
        out+=f'<tr><td>{e(row["label"])}</td><td>{links}</td><td>{e(row["question"])}</td></tr>'
    out+='</tbody></table></div></section><section id="catalog"><h2>Complete pricing menu</h2><p>Monthly fees include standard tools and infrastructure within the listed limits. Existing destination software is required for connection-only products; a managed platform is a different scope. Advertising spend, payment processing, taxes and agreed exceptional purchases remain separate.</p><p><a href="/estimate-reference/catalog.json">Pricing catalog JSON</a> · <a href="/estimate-reference/capability-map.json">Capability mapping JSON</a> · <a href="/estimate-reference/faq.json">Detailed FAQ JSON</a> · <a href="/estimate-reference/estimator.mjs">Estimate arithmetic</a></p>'
    for n,group in enumerate(groups):
        out+=f'<h3 id="group-{n}">{e(group)}</h3>'
        for i in (x for x in c['items'] if x['group']==group):
            action={'fixed':'Defined scope estimate','from':'Starting estimate; confirm requirements','custom':'Requirements brief and owner quote','included':'Included; no duplicate charge'}[i['price_kind']]
            out+=f'<article class="reference-service" id="service-{e(i["id"])}"><h4>{e(i["name"])}</h4><p><strong>{e(price(i))}</strong> · per {e(i["unit"])}</p><p>{e(i["scope"])}</p><p class="reference-model">{action}. {e(i["delivery"])}</p>'
            if i['requires_any']:out+='<p><strong>Requires:</strong> '+e('one applicable existing configuration: '+', '.join(by_id[id]['name'] for id in i['requires_any']))+'.</p>'
            if i['includes']:out+='<p><strong>Already covers:</strong> '+e(', '.join(by_id[id]['name'] for id in i['includes']))+' for the same workflow. Confirm overlap before adding fees.</p>'
            out+='<ul>'+''.join('<li>'+e(q)+'</li>' for q in i['questions'])+'</ul></article>'
    out+='</section><section id="policies"><h2>Terms, limits &amp; responsibilities</h2>'
    for k,v in c['rules'].items():
        if isinstance(v,list):v='; '.join(v)
        out+=f'<h3>{e(k.replace("_"," ").title())}</h3><p>{e(v)}</p>'
    out+='</section><section id="estimating"><h2>How to prepare an estimate</h2><ol><li>Choose the starting context: Essential, existing suitable website, standalone business tool, or Enterprise. Enterprise and bespoke systems require individual scoping.</li><li>Map the visitor’s request to a capability and ask the clarification question. Do not assume that “calendar” means paid booking or that “portal” means a simple editable page.</li><li>Use only listed numbers within the stated scope. First-seat setup differs from additional-seat setup where specified. Included functionality is not an extra.</li><li>Resolve prerequisites and overlaps. Never add fees for the same workflow twice. A report-review discussion, for example, is not a second consultation.</li><li>For off-menu work, gather systems, users, volume, data, requested behavior, timing and access constraints. A future server-side assistant receives separate private owner guidance; no internal rates are in this reference.</li><li>Show setup/build, recurring price, any commitment, scope, tool inclusion, applicable exceptions, assumptions and unresolved questions. From prices remain starting estimates. Missing supplier costs or unknown effort require referral, not invention.</li><li>Owner confirmation is required for final scope, readiness, timing, custom prices and discounts. No existing client agreement is changed by this menu.</li></ol><h3>Worked example</h3><p>Three inboxes: $150 setup + $30/month. Three public booking seats: $400 setup + $105/month. One basic admin: $750 setup + $65/month. Two eligible additional domains: $150 setup + $10/month. Total $1,450 setup + $210/month, excluding existing hosting and taxes. With Essential: $3,445 setup + $260/month. Remove scheduling if ordinary email calendars are all that is needed.</p><p>These examples demonstrate catalog arithmetic, not a guarantee of platform compatibility or final delivery.</p></section><section id="reference-faq"><h2>Detailed customer answers</h2>'
    for f in faq:out+=f'<h3>{e(f["question"])}</h3><p>{f["answer"]}</p>'
    out+='</section><p class="fine">Version '+e(c['version'])+'. This unlisted page is publicly readable if deployed. Noindex is not access control. No private rates, credentials, client data or supplier margins are included.</p></section>'
    return out

def render_reference(intro):
    c,m=data()
    return intro('Assistant reference · '+c['version'],'Think Marketing:<br>complete service reference.',f'{len(c["items"])} menu entries covering websites, business tools, visibility, consulting and paid search. Every public website capability is mapped. No live assistant is connected.')+render_body()

def write_owner_preview(output):
    guidance_path=ROOT/'work/internal-pricing.json'
    if not guidance_path.exists():return
    g=json.loads(guidance_path.read_text());c,m=data();counts=Counter(i['price_kind'] for i in c['items'])
    note=f'''<header class="owner-header"><p class="eyebrow">LOCAL OWNER REVIEW · NOT PUBLISHED</p><h1>Jasper’s complete pricing menu</h1><p>{len(c['items'])} service entries · {len(m['capabilities'])} mapped website capabilities · {counts['fixed']} defined-price entries · {counts['from']} starting-price entries · {counts['custom']} custom-quote paths · {counts['included']} included entry. Legacy Growth is retained only for existing agreements.</p><div class="internal-guide"><h2>Private effort guidance</h2><p class="owner-rate">${g['hourly_rate']}/hour reference · ${g['minimum_labor_charge']} minimum</p><p>For unusual work: max(minimum, defensible estimated hours × rate). A half-hour reference is ${max(g['minimum_labor_charge'],g['hourly_rate']*.5):g}; two hours is ${g['hourly_rate']*2:g}. Unknown tool costs and recurring support still require assessment.</p><ul>'''+''.join('<li>'+e(rule)+'</li>' for rule in g['rules'])+'''</ul><p>This guidance is stored in ignored local work files and is excluded from static deployment. Supply it through private server-side configuration when Jasper is built.</p></div><p><a href="/websites/">Review customer website page</a> · <a href="/estimate-reference/">Review public-safe assistant reference</a></p><p>All new rates below are proposed starting points pending implementation and supplier-cost validation. This review does not publish or connect Jasper.</p></header>'''
    page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Owner pricing review — Think Marketing</title><link rel="stylesheet" href="/styles.css"><style>body{font-family:Arial,sans-serif;margin:0;line-height:1.6}.owner-header{max-width:1050px;margin:auto;padding:36px 28px}.owner-header h1{font-size:clamp(30px,4vw,46px)}.internal-guide{border-left:4px solid #BA0C2F;background:#fff6f6;padding:24px;margin:24px 0}.owner-rate{font-size:25px;font-weight:700}.owner-header ul{padding-left:20px}.reference-body{max-width:1050px}.reference-body h4{font-size:20px;margin:0 0 10px}.reference-body h3{margin-top:24px}.reference-toc{position:relative}</style></head><body>'''+note+render_body()+'</body></html>'
    target=Path(output)/'work/pricing-review';target.mkdir(parents=True,exist_ok=True);(target/'index.html').write_text(page)
