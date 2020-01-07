class AppStorage {
	
	constructor () {
		this.storage = window.localStorage;

		this.enabled = this.storage != undefined;

		if (!this.enabled) {
			console.warn("LocalStorage Not Enabled");
		} else {
			console.log("LocalStorage Enabled");
		} 
	}

	setJSON(key, string) {
		return this.storage.setItem(key, JSON.stringify(string));
	}

	setString(key, string) {
		return this.storage.setItem(key, string);
	}

	removeItem (key) {
		return this.storage.removeItem(key);
	}

	hasKey (key) {
		return this.storage.getItem(key) != undefined;
	}

	getJSON(key) {
		return JSON.parse(this.storage.getItem(key));
	}

	getString(key) {
		return this.storage.getItem(key);
	}

}