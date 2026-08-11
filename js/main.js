/* ==========================================================================
   davidlholland.com — shared behaviour for all pages.
   Everything here is progressive enhancement: with JS disabled the pages
   stay fully readable and navigable (see the .js scoping in style.css).
   ========================================================================== */
(function () {
    'use strict';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Mobile navigation ----------
       Toggles a class instead of writing inline styles, so the drawer's
       off-canvas offset lives in the stylesheet only. */
    const nav = document.querySelector('[data-nav]');

    if (nav) {
        const toggle = nav.querySelector('[data-nav-toggle]');
        const close = nav.querySelector('[data-nav-close]');
        const list = nav.querySelector('[data-nav-list]');
        const scrim = document.querySelector('[data-nav-scrim]');

        const setNav = (open) => {
            document.body.classList.toggle('nav-open', open);
            if (toggle) toggle.setAttribute('aria-expanded', String(open));
            // Keep the drawer out of the tab order while it is closed on mobile
            if (list) list.inert = open ? false : window.matchMedia('(max-width: 760px)').matches;
        };

        const openNav = () => {
            setNav(true);
            const firstLink = list && list.querySelector('a');
            if (firstLink) firstLink.focus();
        };

        const closeNav = ({ restoreFocus = true } = {}) => {
            setNav(false);
            if (restoreFocus && toggle) toggle.focus();
        };

        if (toggle) toggle.addEventListener('click', openNav);
        if (close) close.addEventListener('click', () => closeNav());
        if (scrim) scrim.addEventListener('click', () => closeNav());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
                closeNav();
            }
        });

        // Following an in-page link should dismiss the drawer
        if (list) {
            list.addEventListener('click', (e) => {
                if (e.target.closest('a') && document.body.classList.contains('nav-open')) {
                    closeNav({ restoreFocus: false });
                }
            });
        }

        // Reset state when crossing the breakpoint so the drawer never
        // stays inert (or open) on desktop
        const mq = window.matchMedia('(max-width: 760px)');
        const syncBreakpoint = () => {
            if (!mq.matches) {
                document.body.classList.remove('nav-open');
                if (toggle) toggle.setAttribute('aria-expanded', 'false');
                if (list) list.inert = false;
            } else if (!document.body.classList.contains('nav-open')) {
                if (list) list.inert = true;
            }
        };
        mq.addEventListener('change', syncBreakpoint);
        syncBreakpoint();
    }

    /* ---------- Scroll motion ----------
       Two effects off one passive listener:

       1. Each .scroll-fade element's opacity is bound continuously to its own
          centre, so it fades in on the way up the viewport and back out on the
          way down. Nothing latches.
       2. Each <section> carries a mask that is transparent at the top and bottom
          of the *viewport*; writing --mask-y = -rect.top each frame pins that
          mask to the screen rather than to the element, so content dissolves as
          it crosses either edge.

       Elements default to opacity 1 via var(--scroll-fade, 1), so with JS off or
       reduced motion on, everything is simply visible. */
    const FADE_START = 1.4;   // vh multiple: fade begins below the fold
    const FADE_END = 0.55;    // vh multiple: fully opaque just above centre

    const fadeEls = Array.from(document.querySelectorAll('.scroll-fade'));
    const maskEls = Array.from(document.querySelectorAll('[data-mask]'));

    // About rail: index links track whichever story block is currently active.
    const aboutIndex = document.querySelector('[data-about-index]');
    const indexLinks = aboutIndex ? Array.from(aboutIndex.querySelectorAll('a')) : [];
    const storyBlocks = indexLinks.map((a) => document.getElementById(a.hash.slice(1)));
    let activeIndex = -1;

    if (!reducedMotion && (fadeEls.length || maskEls.length || storyBlocks.length)) {
        let vh = window.innerHeight;
        let queued = false;

        const update = () => {
            queued = false;

            // Read every rect first, then write. Interleaving reads and writes
            // forces a synchronous layout per element and makes this janky.
            const fadeRects = fadeEls.map((el) => el.getBoundingClientRect());
            const maskRects = maskEls.map((el) => el.getBoundingClientRect());
            const storyRects = storyBlocks.map((el) => (el ? el.getBoundingClientRect() : null));

            const startLine = vh * FADE_START;
            const endLine = vh * FADE_END;
            const span = startLine - endLine;

            for (let i = 0; i < fadeEls.length; i++) {
                const r = fadeRects[i];
                const centre = r.top + r.height / 2;
                let p = (startLine - centre) / span;
                p = p < 0 ? 0 : p > 1 ? 1 : p;
                fadeEls[i].style.setProperty('--scroll-fade', p.toFixed(3));
            }

            for (let i = 0; i < maskEls.length; i++) {
                maskEls[i].style.setProperty('--mask-y', `${(-maskRects[i].top).toFixed(2)}px`);
            }

            // Active block = the last one whose top has crossed mid-screen.
            if (storyRects.length) {
                const line = vh * 0.5;
                let next = -1;
                for (let i = 0; i < storyRects.length; i++) {
                    const r = storyRects[i];
                    if (r && r.top <= line && r.bottom > 0) next = i;
                }
                if (next !== activeIndex) {
                    if (indexLinks[activeIndex]) indexLinks[activeIndex].removeAttribute('aria-current');
                    if (indexLinks[next]) indexLinks[next].setAttribute('aria-current', 'true');
                    activeIndex = next;
                }
            }

            document.documentElement.classList.toggle('has-scrolled', window.scrollY > 0);
        };

        const schedule = () => {
            if (!queued) {
                queued = true;
                requestAnimationFrame(update);
            }
        };

        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', () => {
            vh = window.innerHeight;
            schedule();
        }, { passive: true });

        // Run once before first paint so nothing flashes in at full opacity
        update();
    }


    /* ---------- Contact form -> Google Sheet (index only) ---------- */
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwe_V2vP355yYG-gwaCsPn1T8prIywnMrZDJxYcQJ9qAvdub3ZBO1XSL7Prgr9HZgMzdQ/exec';
    const form = document.querySelector('[data-contact-form]');

    if (form) {
        const status = form.querySelector('[data-form-status]');
        const submit = form.querySelector('button[type="submit"]');
        const submitLabel = submit ? submit.textContent : '';

        const setStatus = (message, state) => {
            if (!status) return;
            status.textContent = message;
            if (state) status.dataset.state = state;
            else delete status.dataset.state;
        };

        // Inline validation, reported next to the field rather than only at the top
        const validateField = (input) => {
            const errorEl = form.querySelector(`[data-error-for="${input.name}"]`);
            const valid = input.checkValidity();
            input.setAttribute('aria-invalid', String(!valid));
            if (errorEl) {
                errorEl.textContent = valid ? '' : (input.validationMessage || 'Please check this field.');
            }
            return valid;
        };

        form.querySelectorAll('input, textarea').forEach((input) => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => {
                if (input.getAttribute('aria-invalid') === 'true') validateField(input);
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const inputs = Array.from(form.querySelectorAll('input, textarea'));
            const firstInvalid = inputs.filter((i) => !validateField(i))[0];

            if (firstInvalid) {
                setStatus('Please fix the highlighted fields.', 'error');
                firstInvalid.focus();
                return;
            }

            if (submit) {
                submit.disabled = true;
                submit.textContent = 'Sending…';
            }
            setStatus('Sending your message…');

            fetch(SCRIPT_URL, { method: 'POST', body: new FormData(form) })
                .then((response) => {
                    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
                    setStatus("Message sent. Thanks, I'll get back to you soon.", 'ok');
                    form.reset();
                    inputs.forEach((i) => i.removeAttribute('aria-invalid'));
                    setTimeout(() => setStatus(''), 6000);
                })
                .catch((error) => {
                    setStatus('Something went wrong. Email me directly at davidlataneholland@gmail.com.', 'error');
                    console.error('Contact form error:', error.message);
                })
                .finally(() => {
                    if (submit) {
                        submit.disabled = false;
                        submit.textContent = submitLabel;
                    }
                });
        });
    }
})();
