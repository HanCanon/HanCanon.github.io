(function () {
  var resizeTimer;

  function getSwiper(container) {
    return container.swiper || container.__butterflySwiper || null;
  }

  function refreshSwiper(container, swiper) {
    if (!swiper || swiper.destroyed) return;

    var realIndex = swiper.realIndex || 0;
    swiper.update();

    if (typeof swiper.slideToLoop === 'function') {
      swiper.slideToLoop(realIndex, 0, false);
    }
  }

  function bindImageRefresh(container, swiper) {
    container.querySelectorAll('img').forEach(function (img) {
      if (img.dataset.swiperRefreshBound === 'true') return;
      img.dataset.swiperRefreshBound = 'true';

      img.addEventListener('load', function () {
        refreshSwiper(container, swiper);
      }, { once: true });

      img.addEventListener('error', function () {
        refreshSwiper(container, swiper);
      }, { once: true });
    });
  }

  function toRootPath(path) {
    if (!path || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path)) return path;
    if (path.charAt(0) === '/') return path;
    return '/' + path.replace(/^\.?\//, '');
  }

  function normalizeArticleLinks(container) {
    container.querySelectorAll('.blog-slider__img, .blog-slider__title, .blog-slider__button').forEach(function (link) {
      var href = link.getAttribute('href');
      var onclick = link.getAttribute('onclick');

      if (href) link.setAttribute('href', toRootPath(href));

      if (onclick) {
        link.setAttribute('onclick', onclick.replace(/pjax\.loadUrl\((['"])(?!\/|[a-z][a-z0-9+.-]*:|\/\/|#)([^'"]+)\1\)/ig, function (_, quote, path) {
          return 'pjax.loadUrl(' + quote + toRootPath(path) + quote + ')';
        }));
      }
    });
  }

  function initButterflySwiper() {
    var container = document.getElementById('swiper_container');

    if (!container || typeof Swiper === 'undefined') return;

    normalizeArticleLinks(container);

    var existingSwiper = getSwiper(container);
    if (existingSwiper && !existingSwiper.destroyed) {
      refreshSwiper(container, existingSwiper);
      bindImageRefresh(container, existingSwiper);
      return;
    }

    var swiper = new Swiper(container, {
      passiveListeners: true,
      observer: true,
      observeParents: true,
      resizeObserver: true,
      watchSlidesProgress: true,
      spaceBetween: 0,
      effect: 'fade',
      fadeEffect: {
        crossFade: true
      },
      loop: true,
      autoplay: {
        disableOnInteraction: false,
        delay: 3000
      },
      pagination: {
        el: container.querySelector('.blog-slider__pagination'),
        clickable: true
      }
    });

    container.__butterflySwiper = swiper;

    requestAnimationFrame(function () {
      refreshSwiper(container, swiper);
    });

    bindImageRefresh(container, swiper);

    container.addEventListener('mouseenter', function () {
      if (swiper.autoplay) swiper.autoplay.stop();
    });

    container.addEventListener('mouseleave', function () {
      if (swiper.autoplay) swiper.autoplay.start();
    });
  }

  function refreshCurrentSwiper() {
    var container = document.getElementById('swiper_container');
    if (!container) return;
    refreshSwiper(container, getSwiper(container));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButterflySwiper);
  } else {
    initButterflySwiper();
  }

  window.addEventListener('load', refreshCurrentSwiper, { once: true });
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(refreshCurrentSwiper, 120);
  });

  document.addEventListener('pjax:complete', initButterflySwiper);
})();
