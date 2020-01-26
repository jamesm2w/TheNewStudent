class ClassPage {
	constructor (asm) {
		this.stateManager = asm;
		this.route = new Route("class", "class.html", this.afterPageShow, this.beforePageShow);
	}

	afterPageShow () {}

	beforePageShow () {
		if (!this.stateManager.loggedIn) {
			this.stateManager.toast("You must be logged in to view this page");
			return false;
		}

		return true;
	}
}