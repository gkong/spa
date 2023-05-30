// to support deep links, the server must serve index.html for any path that could be
// internal to the browser. an example of this is the "/about" path in example.js.
// if the server receives a request for "/about", it must serve index.html,
// and the client is responsible for displaying the "about" page to the user.
//
// the simple example server here serves index.html for all requested paths that it doesn't
// explicitly handle, assuming they must be deep links.
// a production server might partition the path space into client-side and server-side routes with
// a simple rule, like serving index.html for any route that begins with a given prefix, like "/c/".
// if the client is served from a separate web server or CDN, the same mapping can be performed
// via whatever configuration files or scripting the web server or CDN supports.
//
// a simple "ping" REST API endpoint, observes the client version and, if it's out of date,
// tells the client to update itself.

package main

import (
	"net/http"
	"strconv"
)

const minRequiredClientVersion = 1

func main() {
	http.HandleFunc("/bundle.js", bundleHandler) // serve the javascript bundle
	http.HandleFunc("/ping", pingHandler)        // example REST API endpoint
	http.HandleFunc("/", indexHandler)           // assume everything else is a deep link and serve index.html
	http.ListenAndServe("localhost:8000", nil)
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./index.html")
}

func bundleHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./bundle.js")
}

func pingHandler(w http.ResponseWriter, r *http.Request) {
	// if the client version is too old, tell the client to update itself
	version, _ := strconv.Atoi(r.Header.Get("Client-Version"))
	if version < minRequiredClientVersion {
		w.Header().Set("Client-Update-Required", "true")
	}
	// since we haven't indicated an error, a status code of 200 ("OK") will be returned
}
