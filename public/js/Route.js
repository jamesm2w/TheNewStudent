// Route JS
// Provides the Route class representing a route to a page in the application

class Route {
	
	constructor (name, htmlPath, afterShow = (() => {}), beforeShow = (() => true), defaultRoute = false) {
		
		try {
			if (!name || !htmlPath) throw "Missing required parameters";
			
			this.name = name;
			this.htmlPath = htmlPath;
			this.isDefault = defaultRoute;
			this.afterShow = afterShow;
			this.beforeShow = beforeShow;

			
		} catch (e) {
			console.error(e);
		}
	}
	
	isActive (currentHash) {
		return currentHash.replace("#", "") == this.name;
	}
	
}