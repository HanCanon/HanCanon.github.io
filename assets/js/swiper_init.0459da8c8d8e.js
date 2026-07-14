(function () {
  var resizeTimer;
  var refreshFrame;
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

  function scheduleSwiperRefresh(container, swiper) {
    if (refreshFrame !== undefined) return;

    refreshFrame = requestAnimationFrame(function () {
      refreshFrame = undefined;
      refreshSwiper(container, swiper);
    });
  }

  function shouldMountCarousel(template) {
    var currentPage = location.pathname;
    var enabledPage = template.dataset.enablePage || 'all';
    var excludedPages = (template.dataset.exclude || '')
      .split(',')
      .map(function (page) { return page.trim(); })
      .filter(Boolean);
    var isExcluded = excludedPages.some(function (page) {
      return currentPage.includes(page);
    });

    return !isExcluded && (enabledPage === 'all' || enabledPage === currentPage);
  }

  function findMountTarget(template) {
    var layoutType = template.dataset.layoutType;
    var layoutName = template.dataset.layoutName;
    var layoutIndex = Number(template.dataset.layoutIndex || 0);

    if (!Number.isInteger(layoutIndex) || layoutIndex < 0 || !layoutName) return null;

    if (layoutType === 'class') {
      return document.getElementsByClassName(layoutName)[layoutIndex] || null;
    }

    if (layoutType === 'id') return document.getElementById(layoutName);
    return null;
  }

  function insertCarouselFragment(target, fragment, position) {
    if (position === 'beforebegin' && target.parentNode) {
      target.parentNode.insertBefore(fragment, target);
    } else if (position === 'afterend' && target.parentNode) {
      target.parentNode.insertBefore(fragment, target.nextSibling);
    } else if (position === 'beforeend') {
      target.appendChild(fragment);
    } else {
      target.insertBefore(fragment, target.firstChild);
    }
  }

  function bindCoverFallback(root) {
    root.querySelectorAll('img[data-error-src]').forEach(function (img) {
      img.addEventListener('error', function () {
        if (img.dataset.fallbackApplied === 'true') return;

        img.dataset.fallbackApplied = 'true';
        img.src = img.dataset.errorSrc;
      });
    });
  }

  function mountCarouselTemplate() {
    var template = document.getElementById('butterfly_swiper_template');
    if (!template) return;

    if (!shouldMountCarousel(template)) {
      template.remove();
      return;
    }

    var target = findMountTarget(template);
    if (!target) return;

    var fragment = template.content;
    bindCoverFallback(fragment);
    insertCarouselFragment(target, fragment, template.dataset.insertPosition);
    template.remove();
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
        scheduleSwiperRefresh(container, swiper);
      }, { once: true });

      img.addEventListener('error', function () {
        scheduleSwiperRefresh(container, swiper);
      }, { once: true });

      if (img.complete) scheduleSwiperRefresh(container, swiper);
    });
  }

  function initButterflySwiper() {
    mountCarouselTemplate();

    var container = document.getElementById('swiper_container');

    if (!container || typeof Swiper === 'undefined') return;

    var existingSwiper = getSwiper(container);
    if (existingSwiper && !existingSwiper.destroyed) {
      scheduleSwiperRefresh(container, existingSwiper);
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

    scheduleSwiperRefresh(container, swiper);

    bindImageRefresh(container, swiper);
    bindSwiperAccessibility(container, swiper);
    bindPaginationKeyboard(container);
    bindAutoplayPause(container, swiper);
  }

  function refreshCurrentSwiper() {
    var container = document.getElementById('swiper_container');
    if (!container) return;
    scheduleSwiperRefresh(container, getSwiper(container));
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
