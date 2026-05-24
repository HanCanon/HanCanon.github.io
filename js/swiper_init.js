(function () {
  function initButterflySwiper() {
    var container = document.getElementById('swiper_container');

    if (!container || container.dataset.swiperReady === 'true' || typeof Swiper === 'undefined') {
      return;
    }

    container.dataset.swiperReady = 'true';

    var swiper = new Swiper(container, {
      passiveListeners: true,
      observer: true,
      observeParents: true,
      resizeObserver: true,
      spaceBetween: 30,
      effect: 'fade',
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

    function updateSwiper() {
      if (!swiper || swiper.destroyed) return;
      swiper.update();
      swiper.slideToLoop(swiper.realIndex || 0, 0, false);
    }

    requestAnimationFrame(updateSwiper);
    window.addEventListener('load', updateSwiper, { once: true });
    window.addEventListener('resize', updateSwiper);

    container.querySelectorAll('img').forEach(function (img) {
      if (img.complete) return;
      img.addEventListener('load', updateSwiper, { once: true });
      img.addEventListener('error', updateSwiper, { once: true });
    });

    container.addEventListener('mouseenter', function () {
      if (swiper.autoplay) swiper.autoplay.stop();
    });

    container.addEventListener('mouseleave', function () {
      if (swiper.autoplay) swiper.autoplay.start();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButterflySwiper);
  } else {
    initButterflySwiper();
  }

  document.addEventListener('pjax:complete', initButterflySwiper);
})();
