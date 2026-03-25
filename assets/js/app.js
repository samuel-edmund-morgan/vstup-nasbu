if ('scrollRestoration' in history){
  history.scrollRestoration = 'manual';
}
if (!location.hash){
  window.scrollTo(0, 0);
  window.addEventListener('load', () => window.scrollTo(0, 0));
}

document.getElementById('y')?.append(new Date().getFullYear());

const burger = document.querySelector('.burger');
const mobileNav = document.getElementById('mobileNav');
if (burger && mobileNav){
  burger.addEventListener('click', () => {
    const expanded = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!expanded));
    mobileNav.hidden = expanded;
  });
}

const header = document.querySelector('.site-header');
const scrollLinks = Array.from(document.querySelectorAll('a[data-scroll]'));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let hasInitialHashScroll = false;

const getHeaderHeight = () => header?.offsetHeight ?? 120;
const getNearTopThreshold = () => getHeaderHeight() * 1.05;
let suppressAutoHighlight = window.scrollY <= getNearTopThreshold() && !window.location.hash;

const blurNavLinks = () => {
  scrollLinks.forEach(link => {
    if (link instanceof HTMLElement){
      link.blur();
    }
  });
};

const normalizePath = path => {
  if (!path) return '/';
  const cleaned = path.replace(/\/index\.html$/i, '/');
  if (cleaned === '/') return '/';
  return cleaned.replace(/\/+$/, '');
};

const getSamePageHash = link => {
  const rawHref = link.getAttribute('href');
  if (!rawHref) return null;

  if (rawHref.startsWith('#')) return rawHref;

  try {
    const url = new URL(link.href, window.location.href);
    const sameOrigin = url.origin === window.location.origin;
    const samePath = normalizePath(url.pathname) === normalizePath(window.location.pathname);
    if (sameOrigin && samePath && url.hash) return url.hash;
  } catch {
    return null;
  }

  return null;
};


const resolveAnchorElement = target => {
  if (!target) return null;
  if (target.hasAttribute('data-anchor-target')) return target;
  return target.querySelector('[data-anchor-target], .section-head h1, h1, h2, h3');
};

const scrollToSection = (target, shouldSmooth = true) => {
  if (!target) return;
  const anchorElement = resolveAnchorElement(target) || target;
  const behavior = shouldSmooth && !prefersReducedMotion.matches ? 'smooth' : 'auto';
  anchorElement.scrollIntoView({ behavior, block: 'start' });
};

const closeMobileNav = () => {
  if (!mobileNav || mobileNav.hidden) return false;
  mobileNav.hidden = true;
  burger?.setAttribute('aria-expanded', 'false');
  blurNavLinks();
  return true;
};

scrollLinks.forEach(link => {
  link.addEventListener('click', event => {
    const hash = getSamePageHash(link);
    if (!hash) return;

    const targetId = hash.slice(1);
    const target = document.getElementById(targetId);
    if (!target) return;

    event.preventDefault();

    const performScroll = () => {
      scrollToSection(target, true);
      if (location.hash !== `#${targetId}`){
        history.pushState(null, '', `#${targetId}`);
      }
    };

    if (closeMobileNav()){
      requestAnimationFrame(performScroll);
    } else {
      performScroll();
    }

    if (link instanceof HTMLElement){
      link.blur();
    }
  });
});

const sectionTargets = scrollLinks
  .map(link => {
    const hash = getSamePageHash(link);
    if (!hash) return null;
    const section = document.getElementById(hash.slice(1));
    return section ? { link, section } : null;
  })
  .filter(Boolean);

let activeId = null;
const setActiveLink = id => {
  const normalizedId = id ?? null;
  if (normalizedId === null){
    activeId = null;
    scrollLinks.forEach(link => link.classList.remove('active'));
    return;
  }
  if (activeId === normalizedId) return;
  activeId = normalizedId;
  scrollLinks.forEach(link => {
    const hash = getSamePageHash(link);
    link.classList.toggle('active', !!hash && hash.slice(1) === normalizedId);
  });
};

const getHashTarget = () => {
  const { hash } = window.location;
  if (!hash || hash.length <= 1) return null;
  return document.getElementById(hash.slice(1));
};

const scrollToHashTarget = (shouldSmooth = false) => {
  const target = getHashTarget();
  if (!target) return false;
  if (!shouldSmooth && hasInitialHashScroll) return true;
  suppressAutoHighlight = false;
  scrollToSection(target, shouldSmooth);
  setActiveLink(target.id);
  if (!shouldSmooth) hasInitialHashScroll = true;
  return true;
};

if (sectionTargets.length && 'IntersectionObserver' in window){
  const observer = new IntersectionObserver(entries => {
    if (window.scrollY <= getNearTopThreshold() && !window.location.hash){
      suppressAutoHighlight = true;
      setActiveLink(null);
      return;
    }

    if (suppressAutoHighlight){
      suppressAutoHighlight = false;
    }

    const visible = entries.filter(entry => entry.isIntersecting);
    if (!visible.length) return;
    const topMost = visible.reduce((best, entry) => entry.intersectionRatio > best.intersectionRatio ? entry : best, visible[0]);
    setActiveLink(topMost.target.id);
  }, { rootMargin: '-55% 0px -35% 0px', threshold: [0, 0.25, 0.6] });

  sectionTargets.forEach(({ section }) => observer.observe(section));

  if (location.hash){
    scrollToHashTarget(false);
  }
}

if (!('IntersectionObserver' in window) && location.hash){
  scrollToHashTarget(false);
}

window.addEventListener('load', () => {
  if (!location.hash || hasInitialHashScroll) return;
  requestAnimationFrame(() => scrollToHashTarget(false));
});

window.addEventListener('hashchange', () => scrollToHashTarget(true));

const updateHeaderState = () => {
  if (!header) return;
  header.classList.toggle('compact', window.scrollY > 24);
};

updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });

const toTopButton = document.querySelector('.to-top');
if (toTopButton){
  const toggleToTop = () => {
    const threshold = getHeaderHeight();
    const isVisible = window.scrollY > threshold;
    toTopButton.classList.toggle('to-top--visible', isVisible);
    if (!isVisible){
      suppressAutoHighlight = true;
      setActiveLink(null);
    } else {
      suppressAutoHighlight = false;
    }
  };

  toggleToTop();
  window.addEventListener('scroll', toggleToTop, { passive: true });

  toTopButton.addEventListener('click', () => {
    const behavior = prefersReducedMotion.matches ? 'auto' : 'smooth';
    if (location.hash){
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
    suppressAutoHighlight = true;
    setActiveLink(null);
    blurNavLinks();
    window.scrollTo({ top: 0, left: 0, behavior });
  });
}

document.querySelectorAll('.hero-social').forEach(container => {
  const toggle = container.querySelector('.hero-social__toggle');
  const list = container.querySelector('.hero-social__list');
  if (!toggle || !list) return;

  toggle.addEventListener('click', () => {
    const isOpen = list.getAttribute('data-open') === 'true';
    const next = !isOpen;
    list.setAttribute('data-open', String(next));
    toggle.setAttribute('aria-expanded', String(next));
  });
});



const zayavaModal = document.querySelector('.zayava-modal');
const zayavaModalOpen = document.querySelector('.js-zayava-modal-open');
const zayavaModalClosers = document.querySelectorAll('.js-zayava-modal-close');

if (zayavaModal && zayavaModalOpen){
  const setModalState = isOpen => {
    zayavaModal.setAttribute('aria-hidden', String(!isOpen));
    document.body.classList.toggle('no-scroll', isOpen);
  };

  zayavaModalOpen.addEventListener('click', () => setModalState(true));
  zayavaModalClosers.forEach(el => el.addEventListener('click', () => setModalState(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setModalState(false);
  });
}
