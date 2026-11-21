'''Short public pages; comprehensive unlisted reference generated from shared facts.'''
import json
from html import escape
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CATALOG=json.loads((ROOT/'content/catalog.json').read_text())
FAQ=json.loads((ROOT/'content/faq.json').read_text())
KNOWLEDGE_FAQ=json.loads((ROOT/'content/knowledge-faq.json').read_text())

def section(title,text):
    return f'<section class="section wrap prose"><h2>{title}</h2>{text}</section>'

def custom_pages(intro,cta):
    essential=next(i for i in CATALOG['items'] if i['id']=='essential')
    booking=next(i for i in CATALOG['items'] if i['id']=='scheduling')
    admin=next(i for i in CATALOG['items'] if i['id']=='admin')
    def dollars(amount): return f'${amount:,}'
    values=dict(essential_build=dollars(essential['setup']),essential_monthly=dollars(essential['monthly']),booking_build=dollars(essential['setup']+booking['setup']),booking_monthly=dollars(essential['monthly']+booking['monthly']),admin_build=dollars(essential['setup']+admin['setup']),admin_monthly=dollars(essential['monthly']+admin['monthly']))
    websites=(ROOT/'content/websites.html').read_text().format(**values)
    about=intro('About Think Marketing','Good websites start<br>with good questions.','I’m Jacob. I build custom websites and help small and medium-sized businesses make practical marketing decisions. Think Marketing is based in Bend, Oregon.')
    about+=section('Your domain is the land.','<p>A domain gives you a place to build. What belongs there depends on your vision: a home for your expertise, a place to book appointments, or a tool that makes daily work easier.</p><p>Think Marketing helps bridge that starting point and what you want to create.</p>')
    about+='<section class="section wrap simple-questions"><h2>Two questions guide my work.</h2><div><h3>Is your website an expert on what you do?</h3><p>It should explain your services and answer the questions your customers ask.</p></div><div><h3>Is your website your most valuable employee?</h3><p>That’s the goal: a website that helps customers and takes useful work off your plate.</p></div></section>'
    about+=section('Let’s start with your business.','<p>Tell me what you do, who you serve, and what you want to improve. We’ll work out a sensible next step together.</p><a class="text-link" href="/contact/">Start a conversation ↗</a>')
    faq=intro('FAQ','A few straight answers.','The practical details, when you need them.')
    faq+='<section class="section wrap faq" aria-label="Frequently asked questions">'+''.join(f'<details id="{escape(f.get("id", "question-"+str(n+1)))}"><summary>{escape(f["question"])}</summary><p>{f["answer"]}</p></details>' for n,f in enumerate(FAQ))+'</section>'+cta()
    marketing=(ROOT/'content/marketing.html').read_text()
    local=intro('Digital Marketing · Local SEO','Help nearby customers<br>find you.','Clear services, accurate business details, and the right geography. A useful local presence starts there.')
    local+=section('Match the search to your business.','<p>We review your Google Business Profile, business listings, and website around what customers need and where you work. Service information, hours, contact details, and the next step should agree.</p><p>Google Business Profile creation assistance is $200 for one profile. You keep control of the account; Google handles eligibility and verification. Existing-profile improvements and ongoing work receive a separate quote.</p>')
    local+=section('One connected presence.','<p>Local SEO and AI/search visibility share the same foundations: accurate information and useful answers. We identify the gaps and scope shared work once.</p><p>Reviews displays and genuine review-request workflows can be scoped. Review writing and response management are outside our services.</p><p><a href="/marketing/">Our approach to marketing</a> · <a href="/ai-search-visibility/">Explore the visibility review</a></p>')+cta()
    ai=intro('Digital Marketing · AI Discoverability','Make your expertise<br>easier to find.','Help people—and the search services they use—understand what your business does and who it helps.')
    ai+=section('Start with a clear picture.','<p>The $350 Search &amp; AI Visibility Review covers up to 10 website pages and five customer questions sampled across two agreed AI services. You receive a plain-English report and prioritized next steps.</p><p>We check page access, discovery signals, and whether your information answers useful customer questions. Findings include sources, dates, and limitations. Implementation is quoted separately.</p>')
    ai+=section('Useful information. Measured observations.','<p>We work from existing and client-supplied material. No special formula can guarantee a ranking or AI recommendation; sampled answers can change over time.</p><p><a href="/marketing/">Our approach to marketing</a> · <a href="/local-seo/">Explore local SEO</a></p>')+cta()
    portfolio=intro('Portfolio','Portfolio','Coming soon.')
    portfolio+='<section class="section wrap prose coming-soon"><h2>Our work, in one place.</h2><p>We’re putting together a selection of Think Marketing projects. In the meantime, tell us what you have in mind.</p><a class="button" href="/contact/">Contact Think Marketing</a></section>'
    jasper=(ROOT/'content/jasper.html').read_text()
    from pricing_reference import render_reference
    reference=render_reference(intro)
    return {'portfolio':('Portfolio',portfolio),'ask-jasper':('Ask Jasper',jasper),'websites':('Website pricing',websites),'about':('About Think Marketing',about),'faq':('Frequently asked questions',faq),'marketing':('Marketing services',marketing),'local-seo':('Local SEO',local),'ai-search-visibility':('AI & search visibility',ai),'estimate-reference':('Assistant reference',reference)}
