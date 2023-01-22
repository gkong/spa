(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var rlite = require('rlite-router');
var spa = require('spa-components');

const page = document.getElementById('page');

const route = rlite(notFound, {
	'/':       homePage,
	'/about':  aboutPage,
});

var prevState = spa.init({ router: route });
route(window.location.pathname);
if (prevState != null)
	spa.scrollTo(prevState.scrollx, prevState.scrolly);

function homePage() {
	document.title = "home";
	page.innerHTML = `
		<h1>Home</h1>
		<a href="/about">About Page (via browser navigation)</a> <br/> <br/>
		<button id="aButton" type="button">About Page (via script)</button>
		`;
	document.getElementById('aButton').onclick = function() { spa.visit('/about'); };
}

function aboutPage() {
	document.title = "about";
	page.innerHTML = '<h1>About</h1> <a href="/">Home Page</a>';
}

function notFound() {
	document.title = "notfound";
	page.innerHTML = '<h1>404</h1>';
}

},{"rlite-router":2,"spa-components":3}],2:[function(require,module,exports){
// This library started as an experiment to see how small I could make
// a functional router. It has since been optimized (and thus grown).
// The redundancy and inelegance here is for the sake of either size
// or speed.
//
// That's why router params are marked with a single char: `~` and named params are denoted `:`
(function (root, factory) {
  var define = root && root.define;

  if (define && define.amd) {
    define('rlite', [], factory);
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Rlite = factory();
  }
}(this, function () {
  return function (notFound, routeDefinitions) {
    var routes = {};
    var decode = decodeURIComponent;

    init();

    return run;

    function init() {
      for (var key in routeDefinitions) {
        add(key, routeDefinitions[key]);
      }
    };

    function noop(s) { return s; }

    function sanitize(url) {
      ~url.indexOf('/?') && (url = url.replace('/?', '?'));
      url[0] == '/' && (url = url.slice(1));
      url[url.length - 1] == '/' && (url = url.slice(0, -1));

      return url;
    }

    // Recursively searches the route tree for a matching route
    // pieces: an array of url parts, ['users', '1', 'edit']
    // esc: the function used to url escape values
    // i: the index of the piece being processed
    // rules: the route tree
    // params: the computed route parameters (this is mutated), and is a stack since we don't have fast immutable datatypes
    //
    // This attempts to match the most specific route, but may end int a dead-end. We then attempt a less specific
    // route, following named route parameters. In searching this secondary branch, we need to make sure to clear
    // any route params that were generated during the search of the dead-end branch.
    function recurseUrl(pieces, esc, i, rules, params) {
      if (!rules) {
        return;
      }

      if (i >= pieces.length) {
        var cb = rules['@'];
        return cb && {
          cb: cb,
          params: params.reduce(function(h, kv) { h[kv[0]] = kv[1]; return h; }, {}),
        };
      }

      var piece = esc(pieces[i]);
      var paramLen = params.length;
      return recurseUrl(pieces, esc, i + 1, rules[piece.toLowerCase()], params)
        || recurseNamedUrl(pieces, esc, i + 1, rules, ':', piece, params, paramLen)
        || recurseNamedUrl(pieces, esc, pieces.length, rules, '*', pieces.slice(i).join('/'), params, paramLen);
    }

    // Recurses for a named route, where the name is looked up via key and associated with val
    function recurseNamedUrl(pieces, esc, i, rules, key, val, params, paramLen) {
      params.length = paramLen; // Reset any params generated in the unsuccessful search branch
      var subRules = rules[key];
      subRules && params.push([subRules['~'], val]);
      return recurseUrl(pieces, esc, i, subRules, params);
    }

    function processQuery(url, ctx, esc) {
      if (url && ctx.cb) {
        var hash = url.indexOf('#'),
            query = (hash < 0 ? url : url.slice(0, hash)).split('&');

        for (var i = 0; i < query.length; ++i) {
          var nameValue = query[i].split('=');

          ctx.params[nameValue[0]] = esc(nameValue[1]);
        }
      }

      return ctx;
    }

    function lookup(url) {
      var querySplit = sanitize(url).split('?');
      var esc = ~url.indexOf('%') ? decode : noop;

      return processQuery(querySplit[1], recurseUrl(querySplit[0].split('/'), esc, 0, routes, []) || {}, esc);
    }

    function add(route, handler) {
      var pieces = route.split('/');
      var rules = routes;

      for (var i = +(route[0] === '/'); i < pieces.length; ++i) {
        var piece = pieces[i];
        var name = piece[0] == ':' ? ':' : piece[0] == '*' ? '*' : piece.toLowerCase();

        rules = rules[name] || (rules[name] = {});

        (name == ':' || name == '*') && (rules['~'] = piece.slice(1));
      }

      rules['@'] = handler;
    }

    function run(url, arg) {
      var result = lookup(url);

      return (result.cb || notFound)(result.params, arg, url);
    };
  };
}));

},{}],3:[function(require,module,exports){
/** @preserve
 *
 * @copyright   Copyright (C) 2017 George S. Kong, All Rights Reserved.
 * Use of this source code is governed by a license that can be found in the LICENSE.txt file.
 */

// spa - zero-dependency single-page-app front-end components
//
// Bring your own client-side router (e.g. github.com/chrisdavies/rlite, which is also zero-dependency).
// this module adds history and scroll position management.

module.exports = { init, visit, replace, scrollTo };
// export default { init, visit, replace, scrollTo };

const SCROLL_RETRY_MS = 50;      // interval between scroll retries
const SCROLL_TIMEOUT_MS = 5000;  // how long to try to scroll before giving up
const RS_MIN_IVL_MS = 100;       // for rate-limiting calls to scroll handler

var router;  // function to execute routes, will be called with a single path arg
var logging = false;


// var prevState = spa.init({
//     router: function(pathString) {},  // function to execute client-side routes
//     logging: boolean,                 // send log messages via console.log()
// });
//
// it looks for an existing history stack entry and, if it finds one of its
// own making, returns it, otherwise it returns null.
//
// it makes sure the history stack contains at least one entry and that the
// current entry's path is set to the current value of window.location.pathname.

function init(params) {
	if (params.hasOwnProperty('logging'))
		logging = params.logging;

	if (logging)
		console.log("spa.init - " + window.location.pathname + "  --  " + JSON.stringify(history.state));

	router = params.router;

	window.onclick = spaClickHandler;
	window.onpopstate = spaPopHandler;
	window.onscroll = spaScrollHandler;

	var retVal;
	if (history.state != null && history.state.hasOwnProperty('path') && history.state.path === window.location.pathname) {
		// we are returning to a history entry that we made
		retVal = history.state;
	} else {
		// this is a fresh invocation. call replaceState, not pushState,
		// because we want to start with only one entry on the history stack.
		history.replaceState( {
			scrollx: window.scrollX,
			scrolly: window.scrollY,
			path: window.location.pathname,
		}, "", window.location.pathname);
		retVal = null;
	}

	return retVal;
}

// navigate to a client-side "page," pushing an entry onto the history stack.
function visit(path) {
	if (logging)
		console.log("spa.visit - " + path);

	saveScroll();

	history.pushState({
		scrollx: 0,
		scrolly: 0,
		path: path
	}, "", path);

	window.scrollTo(0,0);
	router(path);
}

// replace client-side "page," WITHOUT pushing anything onto the history stack.
function replace(path) {
	if (logging)
		console.log("spa.replace - " + path);

	history.replaceState( {
		scrollx: 0,
		scrolly: 0,
		path: path
	}, "", path);

	window.scrollTo(0,0);
	router(path);
}

// save current scroll position.
function saveScroll() {
	if (logging)
		console.log("spa.saveScroll - " + window.scrollY);

	history.replaceState( {
		scrollx: window.scrollX,
		scrolly: window.scrollY,
		path: history.state.path
	}, "", history.state.path);
}

// it's possible that not enough of the page has been rendered to scroll
// to the target location, so try repeatedly, until we get there or time out.
function scrollTo(targetx, targety) {
	if (logging)
		console.log("spa.scrollTo", targetx, targety);

	var started = Date.now();

	function scrollTry() {
		window.scrollTo(targetx, targety);
		if (window.scrollX === targetx  &&  window.scrollY === targety)
			return;
		if (Date.now() - started > SCROLL_TIMEOUT_MS)
			return;
		setTimeout(scrollTry, SCROLL_RETRY_MS);
	}

	scrollTry();
}

// scroll event handler
//
// there is no way to trigger a saveScroll when a user navigates away
// via browser forward or back button, so we must instead watch and
// save scroll position whenever the page is scrolled.
//
// it would be simpler just to call saveScroll for every scroll event,
// but frequent scroll events make iPhones misbehave.
// this band-aids that problem, by rate-limiting scroll events.
//
// when idle, handler sits ready to receive scroll events.
// when a scroll starts, handler unplugs itself and only re-plugs occasionally.
// need to make sure we save the final value after the scroll has completed.
// the last save happens at most one interval after the last scroll event.
//
// reference: brigade/delayed-scroll-restoration-polyfill
function spaScrollHandler() {
	if (logging)
		console.log("spa scroll event");

	window.onscroll = null;
	setTimeout(function() {
		saveScroll();
		window.onscroll = spaScrollHandler;
	}, RS_MIN_IVL_MS);
}

// history popState event handler
//
// note that popState is poorly named - it is called when the user hits
// either the forward or the back button, and it does not modify the history
// stack; it simply indicates you have changed position within the stack.
function spaPopHandler(e) {
	if (logging)
		console.log("spa pop event");

	// arg is an event, whose state property is a copy of the state object
	// that was given to pushState/replaceState.
	router(e.state.path);
	scrollTo(e.state.scrollx, e.state.scrolly);
}

// spaClickHandler, whichEvent, and sameOrigin are derived from page.js.
//
// spaClickHandler has been simplified somewhat.
// it does NOT support hashtags, query strings, or windows file: URLs.

// document click handler, for <a> elements referring to client routes
function spaClickHandler(e) {
	if (e.defaultPrevented)
		return;

	// only interested in plain left mouse clicks
	if (whichEvent(e) !== 1)
		return;
	if (e.metaKey || e.ctrlKey || e.shiftKey)
		return;

	// only interested in html anchor elements.
	var el = e.target;
	while (el && el.nodeName !== 'A')
		el = el.parentNode;
	if (!el || el.nodeName !== 'A')
		return;

	if (el.hasAttribute('download') || el.getAttribute('rel') === 'external')
		return;

	var link = el.getAttribute('href');
	if (link && link.indexOf('mailto:') > -1)
		return;

	// <a target="...">
	if (el.target)
		return;

	// href must exist and be same origin as window.location
	if (!sameOrigin(el.href))
		return;

	e.preventDefault();
	visit(el.pathname);
}

function whichEvent(e) {
	e = e || window.event;
	return e.which === null ? e.button : e.which;
}

function sameOrigin(href) {
	var origin = location.protocol + '//' + location.hostname;
	if (location.port)
		origin += ':' + location.port;
	return (href && (0 === href.indexOf(origin)));
}


},{}]},{},[1]);
