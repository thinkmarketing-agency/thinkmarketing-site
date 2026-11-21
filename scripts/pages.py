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
    about="""<section class="intro wrap about-intro">
        <p class="eyebrow">About Think Marketing</p>
        <h1>Websites and Marketing <br class="about-mobile-break">Shouldn’t Be Hard.</h1>
        <div class="about-profile">
            <img src="/assets/images/about-jacob-lake.jpg" width="1100" height="1100" alt="Jacob, Reilly, and their dog Trafford by the lake" decoding="async">
            <div>
                <h2>I’m Jacob, <br class="about-mobile-break">owner of Think Marketing.</h2>
                <p>I earned my BBA in Marketing from the University of Georgia (GO DAWGS!). I founded Think Marketing in 2016 with a simple idea. The kind of digital marketing big companies use should be accessible to businesses working with any budget.</p>
                <p>I’ve worked with business owners across different industries, with different budgets, goals, and ideas about what growth looks like. I build around what each business needs and agree with the owner on how we’ll measure whether the investment is paying off.</p>
            </div>
        </div>
    </section>"""
    about+=section('Two questions I ask about every website',
        '<ul><li><strong>Is your website an expert on everything you do?</strong></li><li><strong>Is your website your most valuable employee?</strong></li></ul>'
        '<p>If either answer is no, it might be time for a change.</p>')
    about+=section('Websites',
        '<p>A URL is like a plot of land. What do you want to do with it? Build a hotel? Grow crops? Construct a highway? What you build depends on what you need it to do.</p>'
        '<p>I think about websites the same way. Maybe you want a place to explain your services and take bookings. Maybe you have a bigger idea and aren’t sure what it would take to build. I want to hear the whole idea. At Think Marketing, I help you turn it into a plan that fits your budget, with a clear sense of what to build first and what can come later.</p>')
    about+=section('Digital marketing',
        '<p>One of the biggest complaints I hear from owners is, <strong>“I’m paying a lot, and I don’t know what I’m getting.”</strong> That’s a fair complaint. Digital marketing is just as customizable as a website, though some agencies prefer to sell it in fixed packages.</p>'
        '<p>You can build a strategy around $100 a month, $100,000 a month, or anything in between. What changes is what you can reasonably expect that budget to accomplish. I start with a website that works for you behind the scenes and gives search engines a clear path to find your pages. Then I look at what your customers are searching for, how and where you can serve them, and what you want them to do next.</p>'
        '<p>The tools we have today make it easier to show where the money went and what happened as a result. You should know what went to ads, what work I did, and what we can measure in calls, bookings, or inquiries. When the numbers point to a change, we talk through it and adjust.</p>')
    about+=section('AI',
        '<p>AI makes it easier to build a website yourself. In experienced hands, it can also help you get more out of the site you build. I use it in my work at Think Marketing, and <a href="/ask-jasper/">Jasper</a>, my AI assistant, is one example. You can give him a website to review, ask what a similar site might cost, or have him send me a summary when you’re ready to talk.</p>'
        '<p>I build websites so customers, search engines, and AI tools can understand what a business does. That starts with clear service pages, useful answers, and a site that’s easy to navigate and crawl. The industry is still learning how to respond to and work with AI (don’t let anyone tell you differently). I look at visits from AI tools, crawler activity, and whether AI answers cite the business. Those signals help me decide what to check or improve next.</p>')
    about+=section('A little about me',
        '<p>I’ve lived in Bend, Oregon, since 2013. When I’m away from my desk, I’m usually out exploring Oregon’s lakes, mountains, and rivers with my wife, Reilly, and our dog, Trafford (both pictured). If you drive past me running around Bend, I’m probably doing my part to keep the sidewalks from floating away.</p>'
        '<p>Have an idea or a question? <a href="sms:+15413160735">text me</a>, <a href="tel:+15413160735">give me a call</a>, or <a href="mailto:thinkmarketingbend@gmail.com">send me an email</a>. I’ll get back to you personally.</p>')
    faq=intro('FAQ','A few straight answers.','The practical details, when you need them.')
    faq+='<section class="section wrap faq" aria-label="Frequently asked questions">'+''.join(f'<details id="{escape(f.get("id", "question-"+str(n+1)))}"><summary>{escape(f["question"])}</summary><p>{f["answer"]}</p></details>' for n,f in enumerate(FAQ))+'</section>'+cta()
    marketing=(ROOT/'content/marketing.html').read_text()
    local=intro('Digital Marketing · Local SEO','Help nearby customers<br>find you.','Clear services, accurate business details, and the right geography. A useful local presence starts there.')
    local+=section('Match the search to your business.','<p>We review your Google Business Profile, business listings, and website around what customers need and where you work. Service information, hours, contact details, and the next step should agree.</p><p>Google Business Profile creation assistance is $200 for one profile. You keep control of the account; Google handles eligibility and verification. Existing-profile improvements and ongoing work receive a separate quote.</p>')
    local+=section('One connected presence.','<p>Local SEO and AI/search visibility share the same foundations: accurate information and useful answers. We identify the gaps and scope shared work once.</p><p>Review displays and genuine review-request workflows can be scoped. Review writing and response management are outside our services.</p><p><a href="/marketing/">Our approach to marketing</a> · <a href="/ai-search-visibility/">Explore the visibility review</a></p>')+cta()
    ai=intro('Digital Marketing · AI Discoverability','Make your expertise<br>easier to find.','Help people—and the search services they use—understand what your business does and who it helps.')
    ai+=section('Start with a clear picture.','<p>The $350 Search &amp; AI Visibility Review covers up to 10 website pages and five customer questions sampled across two agreed AI services. You receive a plain-English report and prioritized next steps.</p><p>We check page access, discovery signals, and whether your information answers useful customer questions. Findings include sources, dates, and limitations. Implementation is quoted separately.</p>')
    ai+=section('Useful information. Measured observations.','<p>We work from existing and client-supplied material. No special formula can guarantee a ranking or AI recommendation; sampled answers can change over time.</p><p><a href="/marketing/">Our approach to marketing</a> · <a href="/local-seo/">Explore local SEO</a></p>')+cta()
    portfolio=intro('Portfolio','Portfolio','Coming soon.')
    portfolio+='<section class="section wrap prose coming-soon"><h2>Our work, in one place.</h2><p>We’re putting together a selection of Think Marketing projects. In the meantime, tell us what you have in mind.</p><a class="button" href="/contact/">Contact Think Marketing</a></section>'
    jasper=(ROOT/'content/jasper.html').read_text()
    from pricing_reference import render_reference
    reference=render_reference(intro)
    return {'portfolio':('Portfolio',portfolio),'ask-jasper':('Ask Jasper',jasper),'websites':('Website pricing',websites),'about':('About Think Marketing',about),'faq':('Frequently asked questions',faq),'marketing':('Marketing services',marketing),'local-seo':('Local SEO',local),'ai-search-visibility':('AI & search visibility',ai),'estimate-reference':('Assistant reference',reference)}
