class ApplicationStateManager {
	
	constructor (router) {
		this.loggedIn = false;
		this.token = undefined;
		this.profile = undefined;
		this.appStorage = undefined;

		this.homePage = new HomePage(this);
		this.profilePage = new ProfilePage(this);
		this.classPage = new ClassPage(this);
		this.chatManager = new ChatClient(this);

		this.pageRouter = this.createRouter();
		this.currentPage = "home";

		document.addEventListener("DOMContentLoaded", () => {
			this.intialiseModules();
			this.appStorage = new AppStorage();

			if (this.appStorage.hasKey("token")) {
				this.homePage.checkToken();
			}
		});
	}

	toast (msg) {
		M.toast({html: msg});
	};

	createRouter () {
		return new Router([
			this.homePage.route,
			this.profilePage.route,
			this.classPage.route,
			new Route("questions", "questions.html"),
			this.chatManager.route
		], this);
	}

	logIn () {

		this.loggedIn = true;
		window.location.hash = "profile";
		this.profilePage.fetchProfile().then(this.profilePage.refreshPage);
		Request.securityToken = this.appStorage.getString("token");

		M.toast({html: "Logged In"});
		$("#loggedIn")[0].innerHTML = `${this.profile.username}
			<a class="waves-effect waves-light btn-flat blue-grey lighten-1 white-text" onclick="asm.logOut()">Logout</a>`;

		$("#profileImage")[0].setAttribute("src", this.profile.picture);
		$("#tagLine")[0].innerText = "Logged In";

		$("#quickChatButton")[0].classList.remove("hidden");

		setTimeout(() => {
			this.chatManager.login();
		}, 100);
	}

	logOut () {
		this.loggedIn = false;
		this.profile = null;
		this.appStorage.removeItem("token");
		Request.securityToken = this.appStorage
		
		window.location.hash = "";

		this.chatManager.logout();

		M.toast({html: "Successfully Logged Out"});
		$("#loggedIn")[0].innerText = "Not Logged In";
		$("#profileImage")[0].setAttribute("src", "");
		$("#tagLine")[0].innerText = "---";

		$("#quickChatButton")[0].classList.add("hidden");
	}

	intialiseModules () {
		M.FloatingActionButton.init($(".fixed-action-btn"), {hoverEnabled: false});
		M.Sidenav.init($(".sidenav"), {});
		M.Tabs.init($(".tabs"), {});
		M.Dropdown.init($(".dropdown-trigger"), {});
	    M.Modal.init($(".modal"), {});
	    M.Datepicker.init($(".datepicker"), {format: "dd mmm yyyy", container: document.querySelector("body"), showClearBtn: true});
	}
}