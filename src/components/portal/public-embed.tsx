'use client';

import { useEffect, useRef, useState } from 'react';
import { LayoutPreview } from './layout-preview';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Configurator } from './configurator';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Configuration } from '@/server/portal/schemas';
import s from './portal.module.css';

type Product = { id: string; name: string; range_id: string; image: string };

export function PublicEmbed({ publicKey, name, ranges, products, trackViews = true, note, showHeader = true }: {
  publicKey: string;
  name: string;
  ranges: { id: string; name: string }[];
  products: Product[];
  trackViews?: boolean;
  note?: string;
  showHeader?: boolean;
}) {
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [step, setStep] = useState<'category' | 'layout' | 'questions'>('category');
  const stepHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { stepHeading.current?.focus(); }, [step]);
  const [range, setRange] = useState(ranges[0]?.id || '');
  const available = products.filter(p => p.range_id === range);
  const [selected, setSelected] = useState(products.find(p => p.range_id === range)?.id || '');
  const product = available.find(p => p.id === selected) || available[0];
  const session = useRef('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContainer, setDialogContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    let id = crypto.randomUUID() as string;
    try {
      const key = `frontage-session:${publicKey}`;
      id = sessionStorage.getItem(key) || id;
      sessionStorage.setItem(key, id);
    } catch {}
    session.current = id;
    if (!trackViews) return;
    void fetch(`/api/embed/${publicKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'view', session_id: id }),
    }).catch(() => {});
  }, [publicKey, trackViews]);

  async function submit(form: FormData) {
    if (!product || !configuration || pending || done) return;
    if (!session.current) session.current = crypto.randomUUID();
    setPending(true);
    setMessage('');
    try {
      const response = await fetch(`/api/embed/${publicKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'quote', session_id: session.current, layout_id: product.id,
          name: form.get('name'), email: form.get('email'), phone: form.get('phone') || '',
          message: form.get('message') || '', company: form.get('company') || '', configuration,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Your enquiry could not be sent.');
      }
      setDone(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Your enquiry could not be sent. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (!products.length) return <section className={s.empty}><h1>No products available</h1><p>Please contact the website owner for help.</p></section>;

  return (
    <Dialog open={dialogOpen} onOpenChange={open => {
      if (pending) return;
      setDialogOpen(open);
      if (open) setMessage('');
    }}>
      <div ref={setDialogContainer} className={step === 'questions' ? s.embedConfig : undefined}>
        {showHeader && <header className={s.pageHead}>
          <div><h1 className={s.title}>{name}</h1><p className={s.note}>{note || 'Explore the available products and send your selection to the team.'}</p></div>
        </header>}
        <div className={s.stack}>
          <nav className={s.embedSteps} aria-label="Configuration progress">
            {(['category', 'layout', 'questions'] as const).map((item, index) => (
              <span key={item} aria-current={step === item ? 'step' : undefined}>
                <span className={s.embedStepNumber}>{index + 1}</span>
                {item === 'category' ? 'Category' : item === 'layout' ? 'Layout' : 'Configure'}
              </span>
            ))}
          </nav>
          <section aria-labelledby="embed-step-heading">
            <div className={s.toolbar}>
              <div>
                <h2 id="embed-step-heading" ref={stepHeading} tabIndex={-1} className={s.embedHeading}>
                  {step === 'category' ? 'Choose your product range' : step === 'layout' ? 'Choose your layout' : 'Make it yours'}
                </h2>
                <p className={s.note}>{step === 'category' ? 'Select a category to explore the available layouts.' : step === 'layout' ? `${ranges.find(r => r.id === range)?.name || ''} · Select a layout to start designing.` : `${ranges.find(r => r.id === range)?.name || ''} · ${product?.name || ''}`}</p>
              </div>
              {step !== 'category' && <button type="button" className={s.btn} onClick={() => setStep(step === 'questions' ? 'layout' : 'category')}><ArrowLeft size={16} aria-hidden="true" />{step === 'questions' ? 'Change layout' : 'All categories'}</button>}
            </div>
            {step === 'category' && <div className={s.embedCategories}>
              {ranges.filter(r => products.some(p => p.range_id === r.id)).map(r => {
                const count = products.filter(p => p.range_id === r.id).length;
                return <button type="button" key={r.id} className={s.embedCategory} onClick={() => {
                  if (r.id !== range) { setConfiguration(null); setRange(r.id); setSelected(products.find(p => p.range_id === r.id)?.id || ''); }
                  setStep('layout');
                }}>
                  <span className={s.embedCategoryName}>{r.name}</span>
                  <span className={s.embedCategoryFoot}><span>{count} {count === 1 ? 'layout' : 'layouts'} available</span><ArrowRight size={22} aria-hidden="true" /></span>
                </button>;
              })}
            </div>}
            {step === 'layout' && <div className={s.embedLayouts}>
              {available.map(p => <button type="button" key={p.id} className={s.embedLayout} onClick={() => {
                if (selected !== p.id) { setConfiguration(null); setSelected(p.id); }
                setStep('questions');
              }}>
                <span className={s.embedLayoutImage}><LayoutPreview src={p.image} /></span>
                <span className={s.embedLayoutName}>{p.name}<ArrowRight size={18} aria-hidden="true" /></span>
              </button>)}
            </div>}
          </section>
          {step === 'questions' && product && <Configurator key={product.id} publicKey={publicKey} layoutId={product.id} onChange={setConfiguration}
            completionAction={<DialogTrigger asChild><button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={!configuration} data-test="submit-configuration">Submit</button></DialogTrigger>}
          />}
        </div>
        <p className={s.hint}>Powered by Vistara</p>
        <DialogContent container={dialogContainer} className={s.enquiryDialog} overlayClassName={s.enquiryOverlay} showCloseButton={!pending}
          onEscapeKeyDown={event => { if (pending) event.preventDefault(); }}
          onInteractOutside={event => { if (pending) event.preventDefault(); }}>
          <DialogHeader className={s.enquiryHeader}>
            <DialogTitle>{done ? 'Thank you for your enquiry' : 'Enquire about your configuration'}</DialogTitle>
            <DialogDescription>{done
              ? 'The team has your product selection and contact details. They’ll be in touch to discuss the next steps.'
              : 'Add your contact details so the team can follow up about your selected product.'}</DialogDescription>
          </DialogHeader>
          <div className={s.cardBody}>
            {done ? <div role="status" aria-live="polite">
              <p className={s.notice}>Your enquiry was sent successfully.</p>
              <DialogClose asChild><button type="button" className={`${s.btn} ${s.btnPrimary}`} data-test="close-enquiry-success">Done</button></DialogClose>
            </div> : <form onSubmit={event => { event.preventDefault(); void submit(new FormData(event.currentTarget)); }} aria-busy={pending}>
              <fieldset className={s.enquiryFields} disabled={pending}>
                <div className={s.field}><label className={s.label} htmlFor="contact-name">Your name</label><input className={s.input} id="contact-name" name="name" required maxLength={120} autoComplete="name" /></div>
                <div className={s.field}><label className={s.label} htmlFor="contact-email">Email address</label><input className={s.input} id="contact-email" name="email" type="email" required maxLength={254} autoComplete="email" /></div>
                <div className={s.field}><label className={s.label} htmlFor="contact-phone">Phone <span className={s.hint}>(optional)</span></label><input className={s.input} id="contact-phone" name="phone" type="tel" maxLength={50} autoComplete="tel" /></div>
                <div className={s.field}><label className={s.label} htmlFor="contact-message">Anything else? <span className={s.hint}>(optional)</span></label><textarea className={s.input} id="contact-message" name="message" maxLength={2000} rows={3} /></div>
                <div className={s.honeypot} aria-hidden="true"><label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
              </fieldset>
              <p className={s.hint}>By sending this enquiry, you agree that the team can contact you about your selected product.</p>
              {message && <p className={s.notice} data-error role="alert">{message}</p>}
              <div className={s.actions}><button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={pending || !configuration} data-test="send-quote-enquiry">{pending ? 'Sending…' : 'Send quote enquiry'}</button></div>
            </form>}
          </div>
        </DialogContent>
      </div>
    </Dialog>
  );
}
