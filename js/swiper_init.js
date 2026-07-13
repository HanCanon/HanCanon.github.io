(function () {
  var resizeTimer;
  var focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]';
  var managedTabIndexAttribute = 'data-swiper-tabindex-managed';
  var originalTabIndexAttribute = 'data-swiper-original-tabindex';

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

    syncSwiperAccessibility(container, swiper);
  }

  function escapeHtmlAttribute(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function disableFocusableElement(element) {
    if (!element.hasAttribute(managedTabIndexAttribute)) {
      element.setAttribute(managedTabIndexAttribute, 'true');
      if (element.hasAttribute('tabindex')) {
        element.setAttribute(originalTabIndexAttribute, element.getAttribute('tabindex'));
      }
    }

    element.setAttribute('tabindex', '-1');
  }

  function restoreFocusableElement(element) {
    if (!element.hasAttribute(managedTabIndexAttribute)) return;

    if (element.hasAttribute(originalTabIndexAttribute)) {
      element.setAttribute('tabindex', element.getAttribute(originalTabIndexAttribute));
    } else {
      element.removeAttribute('tabindex');
    }

    element.removeAttribute(managedTabIndexAttribute);
    element.removeAttribute(originalTabIndexAttribute);
  }

  function syncPaginationAccessibility(container, swiper) {
    var currentIndex = swiper && Number.isFinite(swiper.realIndex) ? swiper.realIndex : 0;

    container.querySelectorAll('.swiper-pagination-bullet').forEach(function (bullet, index) {
      if (index === currentIndex) {
        bullet.setAttribute('aria-current', 'true');
      } else {
        bullet.removeAttribute('aria-current');
      }
    });
  }

  function syncSwiperAccessibility(container, swiper) {
    if (!swiper || swiper.destroyed) return;

    container.querySelectorAll('.swiper-slide').forEach(function (slide) {
      var isActive = slide.classList.contains('swiper-slide-active');

      if (isActive) {
        slide.removeAttribute('aria-hidden');
        slide.removeAttribute('inert');
      } else {
        slide.setAttribute('aria-hidden', 'true');
        slide.setAttribute('inert', '');
      }

      slide.querySelectorAll(focusableSelector).forEach(isActive ? restoreFocusableElement : disableFocusableElement);
    });

    syncPaginationAccessibility(container, swiper);
  }

  function bindSwiperAccessibility(container, swiper) {
    function sync() {
      syncSwiperAccessibility(container, swiper);
    }

    swiper.on('transitionStart', sync);
    swiper.on('transitionEnd', sync);
    swiper.on('paginationUpdate', sync);
    sync();
  }

  function bindAutoplayPause(container, swiper) {
    var pointerInside = false;
    var focusInside = container.contains(document.activeElement);

    function updateAutoplay() {
      if (!swiper.autoplay || swiper.destroyed) return;

      if (pointerInside || focusInside) {
        if (swiper.autoplay.running) swiper.autoplay.stop();
      } else if (!swiper.autoplay.running) {
        swiper.autoplay.start();
      }
    }

    container.addEventListener('mouseenter', function () {
      pointerInside = true;
      updateAutoplay();
    });

    container.addEventListener('mouseleave', function () {
      pointerInside = false;
      updateAutoplay();
    });

    container.addEventListener('focusin', function () {
      focusInside = true;
      updateAutoplay();
    });

    container.addEventListener('focusout', function () {
      requestAnimationFrame(function () {
        focusInside = container.contains(document.activeElement);
        updateAutoplay();
      });
    });
  }

  function bindPaginationKeyboard(container) {
    var pagination = container.querySelector('.blog-slider__pagination');
    if (!pagination) return;

    pagination.addEventListener('keydown', function (event) {
      var bullet = event.target;
      var isActivationKey = event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';

      if (!isActivationKey || !bullet.matches('.swiper-pagination-bullet')) return;

      event.preventDefault();
      bullet.click();
    });
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

    var articleTitles = Array.prototype.map.call(
      container.querySelectorAll('.blog-slider__item:not(.swiper-slide-duplicate) .blog-slider__title'),
      function (title) {
        return title.textContent.trim();
      }
    );

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
        clickable: true,
        renderBullet: function (index, className) {
          var title = articleTitles[index] || ('第 ' + (index + 1) + ' 篇文章');
          var label = '切换到第 ' + (index + 1) + ' 篇轮播文章：《' + title + '》';
          return '<button type="button" class="' + className + '" aria-label="' + escapeHtmlAttribute(label) + '"></button>';
        }
      }
    });

    container.__butterflySwiper = swiper;

    requestAnimationFrame(function () {
      refreshSwiper(container, swiper);
    });

    bindImageRefresh(container, swiper);
    bindSwiperAccessibility(container, swiper);
    bindPaginationKeyboard(container);
    bindAutoplayPause(container, swiper);
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
