// Router JS
// Manages the logic of the single page application

class Router {
	
	constructor (routes, stateManager) {
		try {
			if (!routes) {
				throw "routes parameter required";
			}
		
			this.routes = routes;
			this.element = document.getElementById("pageContent");
			this.initialiseListener();

			this.stateManager = stateManager;
		} catch (e) {
			console.error(e);
		}
	}
	
	initialiseListener () {
		((scope, r) => {
			window.addEventListener("hashchange", e => {
				scope.hashChanged(scope, r);
			})
		})(this, this.routes);
		
		this.hashChanged(this, this.routes);
	}
	
	hashChanged (router, routes) {
		if (window.location.hash.length > 0) {
			
			let hashString = window.location.hash.substr(1);
			
			for (let i = 0; i < routes.length; i++) {
				let route = routes[i];
				
				if (route.isActive(hashString)) {
					router.switchRoute(route);
				}
			}
			
		} else {
			
			for (let i = 0; i < routes.length; i++) {
				let route = routes[i];
				
				if (route.isDefault) {
					router.switchRoute(route);
				}
			}
		}
	}
	
	switchRoute (route) {
		(scope => {
			let uri = "views/" + route.htmlPath;
			let request = new XMLHttpRequest();
			
			request.open("GET", uri, true);
			
			request.onreadystatechange = function () {
				if(this.readyState === 4  && this.status === 200) {

					if (route.beforeShow.call({"stateManager": scope.stateManager})) {
						scope.element.innerHTML = this.responseText;
						scope.stateManager.currentPage = route.name;
						route.afterShow.call({"stateManager": scope.stateManager});
					} else {
						window.location.hash = scope.stateManager.currentPage; // Cancels the switch to the other page
					}
				}
			}
			
			request.send();
		})(this);
	}
}