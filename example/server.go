// to support deep links, the server must serve index.html for any path that could be
// internal to the browser. an example of this is the "/about" path in example.js.
// if the server receives a request for "/about", it must serve index.html,
// and the client is responsible for displaying the appropriate page to the user.
//
// the simple example server here serves index.html for all requested paths except the javascript bundle.
// a production server might partition the path space into client-side and server-side routes with
// a simple rule, like serving index.html for any route that begins with "/c/".
// if the client is served from a separate web server or CDN, the same mapping can be performed
// via whatever configuration files or scripts the web server or CDN supports.

package main

import (
	"net/http"
)

func main() {
	http.HandleFunc("/bundle.js", bundleHandler) // serve the javascript bundle
	http.HandleFunc("/", indexHandler)           // serve index.html for everything else
	http.ListenAndServe("localhost:8000", nil)
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./index.html")
}

func bundleHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./bundle.js")
}
