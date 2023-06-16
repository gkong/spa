/** @preserve
 *
 * @copyright   Copyright (C) 2017 George S. Kong, All Rights Reserved.
 * Use of this source code is governed by a license that can be found in the LICENSE.txt file.
 */

// spa - zero-dependency single-page-app front-end components
//
// Bring your own client-side router (e.g. github.com/chrisdavies/rlite, which is also zero-dependency).
// this module adds history and scroll position management and a simple XMLHttpRequest wrapper.

module.exports = { init, visit, replace, scrollTo, httpReqFunc };

const SCROLL_RETRY_MS = 50;      // interval between scroll retries
const SCROLL_TIMEOUT_MS = 5000;  // how long to try to scroll before giving up
const RS_MIN_IVL_MS = 100;       // for rate-limiting calls to scroll handler

var router;  // function to execute routes, will be called with a single path arg
var logging = false;

// var prevState = spa.init({
//     router: function(path) {},  // function to execute client-side routes
//     logging: boolean,           // send log messages via console.log()
// });
// 
// spa.init() makes sure the history stack contains at least one entry and that the
// current entry's path is set to the current value of window.location.pathname.
//
// if we have already loaded and rendered one or more pages, and the browser is now 
// re-starting us, spa.init() returns an object containing previously-saved scrollx
// and scrolly values, so we can restore the scroll state, otherwise, it returns null.

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

// visit a page, pushing it onto the history stack
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

// visit a page, replacing the current page in the history stack
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

// httpReqFunc() makes convenience HTTP request functions of the form:
//     function(url, data) { }
// which close over your custom middleware and return a promise whose
// success and error results are XMLHttpRequest objects.
//
// middleware callbacks can be undefined and have the form:
//     function cb(xhr, method, url) { }
//
// reqCB - called before every request
// respSuccessCB, respFailureCB - called after a response is received and before the handler is called
// respAfterCB = called after the handler returns

function httpReqFunc(method, urlPrefix, reqCB, respSuccessCB, respFailureCB, respAfterCB) {
	return function(url, data) {  // data arg is optional
		return new Promise(function(resolve, reject) {
			function respHandler() {
				if (this.readyState === this.DONE) {
					if (this.status >= 200  &&  this.status < 300) {
						if (respSuccessCB !== undefined)
							respSuccessCB(this, method, url);
						resolve(this);
					} else {
						if (respFailureCB !== undefined)
							respFailureCB(this, method, url);
						reject(this);
					}
					if (respAfterCB !== undefined)
						respAfterCB(this, method, url);
				}
			}

			var req = new XMLHttpRequest();
			req.open(method, urlPrefix + url);
			if (reqCB !== undefined)
				reqCB(req, method, url);
			req.onreadystatechange = respHandler;
			req.send(data);
		});
	}
}
