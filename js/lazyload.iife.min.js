(function (root) {
  'use strict';

  function LazyLoad(options) {
    this.options = options || {};
    this.selector = this.options.elements_selector || 'img[loading="lazy"]';
    this.boundImages = new WeakSet();
    this.observer = null;
    this.init();
  }

  LazyLoad.prototype.markLoaded = function (element) {
    element.classList.remove('lazyload-pending', 'error');
    element.classList.add('loaded');
  };

  LazyLoad.prototype.markError = function (element) {
    element.classList.remove('lazyload-pending', 'loaded');
    element.classList.add('error');
  };

  LazyLoad.prototype.finishLoading = function (element) {
    var self = this;
    if (typeof element.decode !== 'function') {
      self.markLoaded(element);
      return;
    }

    element.decode()
      .catch(function () {})
      .then(function () { self.markLoaded(element); });
  };

  LazyLoad.prototype.register = function (element) {
    if (this.boundImages.has(element)) return;

    var self = this;
    this.boundImages.add(element);

    element.addEventListener('load', function () {
      self.finishLoading(element);
    });
    element.addEventListener('error', function () {
      self.markError(element);
    });

    if (element.complete) {
      if (element.naturalWidth > 0) this.finishLoading(element);
      else this.markError(element);
      return;
    }

    element.classList.add('lazyload-pending');
  };

  LazyLoad.prototype.update = function (context) {
    var target = context || document;
    if (target.nodeType === 1 && target.matches(this.selector)) this.register(target);
    target.querySelectorAll(this.selector).forEach(this.register.bind(this));
  };

  LazyLoad.prototype.init = function () {
    var self = this;
    this.update();

    if (typeof MutationObserver === 'function') {
      this.observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) self.update(node);
          });
        });
      });
      this.observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  };

  LazyLoad.prototype.destroy = function () {
    if (this.observer) this.observer.disconnect();
  };

  root.LazyLoad = LazyLoad;
  if (typeof globalThis !== 'undefined') globalThis.LazyLoad = LazyLoad;
})(typeof window !== 'undefined' ? window : globalThis);
